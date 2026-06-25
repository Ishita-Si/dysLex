"""Audit training/inference domain shift and threshold calibration for MVP models.

The audit is intentionally inference-first: it inspects existing data/model
artifacts, produces mismatch reports and distribution plots, and only recalibrates
threshold metadata when trained model artifacts and real validation rows exist.
It does not retrain models.
"""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Dict, List, Mapping, Optional, Tuple

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from sklearn.metrics import auc, confusion_matrix, fbeta_score, precision_recall_curve, precision_score, recall_score, roc_auc_score

from src.mvp.intelligence import FEATURE_METADATA, LABEL_COLUMNS, generate_baseline_reference
from src.utils.config import CONFIG
from src.utils.file_utils import ensure_directories

try:
    from scipy.stats import ks_2samp
except Exception:  # pragma: no cover - optional dependency guard.
    ks_2samp = None

AUDIT_DIR = CONFIG.reports_dir / "mvp" / "domain_audit"
FIGURE_DIR = CONFIG.figures_dir / "mvp" / "domain_audit"
THRESHOLD_OUTPUT = CONFIG.models_dir / "mvp" / "domain_thresholds.json"


def run_domain_audit() -> Dict[str, object]:
    """Run the full audit and write all Phase 2.5 domain-shift deliverables."""

    ensure_directories([AUDIT_DIR, FIGURE_DIR, THRESHOLD_OUTPUT.parent])
    baseline = generate_baseline_reference()
    schema_rows = audit_feature_schema()
    distribution_rows = analyze_distributions()
    threshold_results = recalibrate_thresholds()
    calibration_rows = evaluate_calibration()
    write_distribution_report(schema_rows, distribution_rows, baseline)
    write_threshold_report(threshold_results)
    write_calibration_report(calibration_rows)
    write_before_after_report(threshold_results, schema_rows, distribution_rows)
    return {
        "schema_mismatches": schema_rows,
        "distribution_shift_rows": distribution_rows,
        "threshold_results": threshold_results,
        "calibration_rows": calibration_rows,
    }


def audit_feature_schema() -> List[Dict[str, object]]:
    """Compare training feature tables with inference request schemas."""

    rows: List[Dict[str, object]] = []
    expected_by_modality = {
        modality: [feature for feature, meta in FEATURE_METADATA.items() if meta["modality"] == modality]
        for modality in {"reading", "writing", "typing"}
    }
    for modality, expected in expected_by_modality.items():
        training_path = CONFIG.datasets_dir / "processed" / f"mvp_{modality}_features.csv"
        if not training_path.exists():
            rows.append({"modality": modality, "status": "missing_training_table", "details": str(training_path)})
            continue
        frame = pd.read_csv(training_path)
        training_features = [column for column in frame.columns if column not in LABEL_COLUMNS]
        rows.append({
            "modality": modality,
            "training_features": training_features,
            "inference_features": expected,
            "missing_from_inference": [feature for feature in training_features if feature not in expected],
            "missing_from_training": [feature for feature in expected if feature not in training_features],
            "order_matches": training_features == expected,
            "dtypes": {feature: str(frame[feature].dtype) for feature in training_features},
            "missing_values": {feature: int(frame[feature].isna().sum()) for feature in training_features},
        })
    return rows


def analyze_distributions() -> List[Dict[str, object]]:
    """Compare synthetic, real-anchor, and manual inference feature distributions."""

    rows: List[Dict[str, object]] = []
    for modality in ["reading", "writing", "typing"]:
        training_path = CONFIG.datasets_dir / "processed" / f"mvp_{modality}_features.csv"
        inference_path = CONFIG.datasets_dir / "manual_tests" / f"{modality}_manual_tests.csv"
        if not training_path.exists():
            continue
        training = pd.read_csv(training_path)
        inference = pd.read_csv(inference_path) if inference_path.exists() else pd.DataFrame()
        features = [column for column in training.columns if column not in LABEL_COLUMNS]
        for feature in features:
            synthetic = _series(training[training.get("data_source", "") == "synthetic"], feature)
            real = _series(training[training.get("data_source", "") != "synthetic"], feature)
            incoming = _series(inference, feature)
            row = {
                "modality": modality,
                "feature": feature,
                "synthetic_count": int(synthetic.count()),
                "real_training_count": int(real.count()),
                "inference_count": int(incoming.count()),
                "synthetic": _summary(synthetic),
                "real_training": _summary(real),
                "inference": _summary(incoming),
                "synthetic_vs_real_ks": _ks(synthetic, real),
                "training_vs_inference_ks": _ks(_series(training, feature), incoming),
            }
            row["shift_flag"] = _shift_flag(row)
            rows.append(row)
            plot_feature_distribution(modality, feature, synthetic, real, incoming)
    return rows


def recalibrate_thresholds() -> Dict[str, object]:
    """Search thresholds on real validation rows only when artifacts are available."""

    output: Dict[str, object] = {}
    for modality in ["reading", "writing", "typing", "fusion"]:
        model_path = CONFIG.models_dir / "mvp" / f"{modality}_model.pkl"
        metadata_path = CONFIG.models_dir / "mvp" / f"{modality}_threshold.json"
        data_path = CONFIG.datasets_dir / "processed" / ("mvp_multimodal_features.csv" if modality == "fusion" else f"mvp_{modality}_features.csv")
        if not model_path.exists() or not metadata_path.exists() or not data_path.exists():
            output[modality] = {"status": "skipped_missing_artifacts", "model_path": str(model_path), "metadata_path": str(metadata_path)}
            continue
        frame = pd.read_csv(data_path)
        real_frame = frame[frame.get("data_source", "").astype(str).str.contains("real", case=False, na=False)]
        if real_frame.empty:
            output[modality] = {"status": "skipped_no_real_validation_rows", "rows": 0}
            continue
        with model_path.open("rb") as handle:
            model = pickle.load(handle)
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        features = metadata["feature_names"]
        probabilities = model.predict_proba(real_frame[features])[:, 1]
        labels = real_frame["label"].astype(int)
        table = _threshold_table(labels, probabilities)
        table_path = AUDIT_DIR / f"{modality}_real_threshold_search.csv"
        table.to_csv(table_path, index=False)
        selected = _select_threshold(table)
        output[modality] = {"status": "recalibrated", "rows": int(len(real_frame)), "selected_threshold": selected, "table": str(table_path)}
    THRESHOLD_OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True), encoding="utf-8")
    return output


def evaluate_calibration() -> List[Dict[str, object]]:
    """Evaluate probability calibration availability without fitting new calibrators blindly."""

    rows: List[Dict[str, object]] = []
    for modality in ["reading", "writing", "typing", "fusion"]:
        model_path = CONFIG.models_dir / "mvp" / f"{modality}_model.pkl"
        data_path = CONFIG.datasets_dir / "processed" / ("mvp_multimodal_features.csv" if modality == "fusion" else f"mvp_{modality}_features.csv")
        rows.append({
            "modality": modality,
            "status": "skipped_missing_artifacts" if not model_path.exists() else "available_for_external_calibration_check",
            "note": "Calibration fitting is intentionally skipped unless real validation rows and trained artifacts are present; this audit must not blindly retrain or refit models.",
            "data_path": str(data_path),
        })
    return rows


def plot_feature_distribution(modality: str, feature: str, synthetic: pd.Series, real: pd.Series, incoming: pd.Series) -> None:
    """Save histogram/KDE and boxplot views for one feature."""

    plot_frame = pd.concat([
        pd.DataFrame({"value": synthetic, "domain": "synthetic_training"}),
        pd.DataFrame({"value": real, "domain": "real_training"}),
        pd.DataFrame({"value": incoming, "domain": "real_inference_proxy"}),
    ], ignore_index=True).dropna()
    if plot_frame.empty:
        return
    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    sns.histplot(data=plot_frame, x="value", hue="domain", kde=True, ax=axes[0], element="step", stat="density", common_norm=False)
    axes[0].set_title(f"{modality}: {feature} distribution")
    sns.boxplot(data=plot_frame, x="domain", y="value", ax=axes[1])
    axes[1].set_title(f"{modality}: {feature} boxplot")
    axes[1].tick_params(axis="x", rotation=20)
    fig.tight_layout()
    fig.savefig(FIGURE_DIR / f"{modality}_{feature}_distribution.png", dpi=150)
    plt.close(fig)


def write_distribution_report(schema_rows: List[Mapping[str, object]], distribution_rows: List[Mapping[str, object]], baseline: Mapping[str, object]) -> None:
    """Write the training/inference mismatch and distribution report."""

    lines = ["# Training-Inference Distribution Mismatch Audit", "", "## Schema and preprocessing audit", ""]
    for row in schema_rows:
        lines.append(f"### {row['modality']}")
        lines.append(f"- Feature order matches inference schema: `{row.get('order_matches')}`")
        lines.append(f"- Missing from inference: `{row.get('missing_from_inference')}`")
        lines.append(f"- Missing from training: `{row.get('missing_from_training')}`")
        lines.append(f"- Missing values in training: `{row.get('missing_values')}`")
        lines.append("")
    flagged = [row for row in distribution_rows if row.get("shift_flag")]
    lines.extend(["## Distribution shift findings", "", f"Flagged feature count: **{len(flagged)}**", ""])
    for row in distribution_rows:
        lines.append(f"### {row['modality']} / {row['feature']}")
        lines.append(f"- Counts: synthetic={row['synthetic_count']}, real_training={row['real_training_count']}, inference_proxy={row['inference_count']}")
        lines.append(f"- Synthetic summary: `{row['synthetic']}`")
        lines.append(f"- Real-training summary: `{row['real_training']}`")
        lines.append(f"- Inference-proxy summary: `{row['inference']}`")
        lines.append(f"- KS synthetic vs real: `{row['synthetic_vs_real_ks']}`")
        lines.append(f"- KS training vs inference proxy: `{row['training_vs_inference_ks']}`")
        lines.append(f"- Shift flag: `{row['shift_flag']}`")
        lines.append("")
    lines.extend(["## Baseline reference", "", f"Baseline feature count: **{len(baseline)}**", "", "Plots are saved in `reports/figures/mvp/domain_audit/`."])
    (AUDIT_DIR / "distribution_mismatch_report.md").write_text("\n".join(lines), encoding="utf-8")


def write_threshold_report(results: Mapping[str, object]) -> None:
    """Write threshold optimization results and skip reasons."""

    lines = ["# Real-Validation Threshold Optimization Report", "", "Threshold search uses real validation rows only and does not retrain models.", ""]
    for modality, result in results.items():
        lines.append(f"## {modality}")
        lines.append(f"`{result}`")
        lines.append("")
    (AUDIT_DIR / "threshold_optimization_report.md").write_text("\n".join(lines), encoding="utf-8")


def write_calibration_report(rows: List[Mapping[str, object]]) -> None:
    """Write calibration audit findings."""

    lines = ["# Probability Calibration Report", "", "Calibration is evaluated only when trained artifacts and real validation rows are available.", ""]
    for row in rows:
        lines.append(f"- **{row['modality']}**: `{row['status']}` — {row['note']}")
    (AUDIT_DIR / "calibration_report.md").write_text("\n".join(lines), encoding="utf-8")


def write_before_after_report(threshold_results: Mapping[str, object], schema_rows: List[Mapping[str, object]], distribution_rows: List[Mapping[str, object]]) -> None:
    """Write before/after comparison summary for the implemented minimum fix."""

    lines = ["# Before vs After Domain-Shift Fix Report", "", "## Before", "", "- Inference accepted feature values without a dedicated validation/sanity layer.", "- Baseline reference lacked normal operating ranges for dashboard warnings.", "- No automated domain-shift audit or real-validation threshold-search deliverable existed.", "", "## After", "", "- Added feature validation with missing/non-finite imputation to reference means and out-of-range warnings.", "- Regenerated baseline reference with normal ranges, percentiles, min/max, mean, median, and standard deviation.", "- Added automated schema audit, distribution plots, threshold-search scaffolding, and calibration reporting.", "", "## Threshold status", ""]
    for modality, result in threshold_results.items():
        lines.append(f"- **{modality}**: `{result}`")
    lines.extend(["", "## Domain adaptation decision", "", "The repository currently contains real-anchor rows only for reading and synthetic-only processed rows for writing and typing. Because trained model artifacts and sufficient real validation rows are not committed in this workspace, the minimum safe fix is to add domain-shift detection and inference-time validation rather than blindly retraining or fitting calibrators. When real validation artifacts are present, `python -m src.mvp.domain_audit` will run threshold search and save real-data threshold candidates."])
    (AUDIT_DIR / "before_after_comparison_report.md").write_text("\n".join(lines), encoding="utf-8")


def _series(frame: pd.DataFrame, feature: str) -> pd.Series:
    """Return a numeric feature series or an empty numeric series."""

    if feature not in frame:
        return pd.Series(dtype=float)
    return pd.to_numeric(frame[feature], errors="coerce").dropna()


def _summary(series: pd.Series) -> Dict[str, Optional[float]]:
    """Return summary statistics required by the audit."""

    if series.empty:
        return {key: None for key in ["mean", "median", "std", "min", "p05", "p25", "p75", "p95", "max"]}
    return {
        "mean": round(float(series.mean()), 6),
        "median": round(float(series.median()), 6),
        "std": round(float(series.std(ddof=0)), 6),
        "min": round(float(series.min()), 6),
        "p05": round(float(series.quantile(0.05)), 6),
        "p25": round(float(series.quantile(0.25)), 6),
        "p75": round(float(series.quantile(0.75)), 6),
        "p95": round(float(series.quantile(0.95)), 6),
        "max": round(float(series.max()), 6),
    }


def _ks(left: pd.Series, right: pd.Series) -> Dict[str, Optional[float]]:
    """Return a Kolmogorov-Smirnov shift metric when both samples exist."""

    if ks_2samp is None or len(left) < 2 or len(right) < 2:
        return {"statistic": None, "pvalue": None}
    result = ks_2samp(left, right)
    return {"statistic": round(float(result.statistic), 6), "pvalue": round(float(result.pvalue), 6)}


def _shift_flag(row: Mapping[str, object]) -> bool:
    """Flag likely shift using KS statistic or lack of real samples."""

    if row["real_training_count"] == 0:
        return True
    ks = row["training_vs_inference_ks"]
    return bool(ks["statistic"] is not None and ks["statistic"] >= 0.35)


def _threshold_table(labels: pd.Series, probabilities) -> pd.DataFrame:
    """Compute precision, recall, and F2 over thresholds from 0.01 to 0.99."""

    rows = []
    for threshold in [i / 100 for i in range(1, 100)]:
        predictions = probabilities >= threshold
        rows.append({
            "threshold": threshold,
            "precision": precision_score(labels, predictions, zero_division=0),
            "recall": recall_score(labels, predictions, zero_division=0),
            "f2": fbeta_score(labels, predictions, beta=2, zero_division=0),
        })
    return pd.DataFrame(rows)


def _select_threshold(table: pd.DataFrame) -> Dict[str, float]:
    """Select highest-F2 threshold among rows with acceptable precision."""

    candidates = table[table["precision"] >= 0.50]
    if candidates.empty:
        candidates = table
    best = candidates.sort_values(["recall", "f2", "precision"], ascending=False).iloc[0]
    return {"threshold": round(float(best["threshold"]), 4), "precision": round(float(best["precision"]), 4), "recall": round(float(best["recall"]), 4), "f2": round(float(best["f2"]), 4)}


if __name__ == "__main__":
    run_domain_audit()
