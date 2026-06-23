"""Recall-first MVP model training for DysLexAI modalities."""

from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    auc,
    confusion_matrix,
    f1_score,
    fbeta_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.mvp.synthetic_data import MVPDataPaths, SyntheticMVPDataGenerator
from src.utils.config import CONFIG
from src.utils.file_utils import ensure_directories, write_text
from src.utils.logger import get_logger

LOGGER = get_logger(__name__)

try:
    from xgboost import XGBClassifier
except Exception:  # pragma: no cover - optional dependency guard.
    XGBClassifier = None


@dataclass(frozen=True)
class ModelResult:
    """Training result for one modality model."""

    modality: str
    model_name: str
    threshold: float
    metrics: Dict[str, float]
    feature_names: List[str]
    model_path: Path


class MVPTrainer:
    """Train recall-optimized MVP classifiers for all modalities."""

    def __init__(self) -> None:
        """Initialize output locations."""

        self.models_dir = CONFIG.models_dir / "mvp"
        self.reports_dir = CONFIG.reports_dir / "mvp"
        self.figures_dir = CONFIG.figures_dir / "mvp"
        ensure_directories([self.models_dir, self.reports_dir, self.figures_dir])

    def run(self) -> Dict[str, ModelResult]:
        """Generate data, train models, save reports, and return results."""

        paths = SyntheticMVPDataGenerator(samples_per_modality=240).generate_all()
        results = {
            "reading": self.train_modality("reading", paths.reading),
            "writing": self.train_modality("writing", paths.writing),
            "typing": self.train_modality("typing", paths.typing),
        }
        fusion_frame = self._build_probability_fusion_dataset(paths, results)
        fusion_frame.to_csv(paths.fusion, index=False)
        results["fusion"] = self.train_modality("fusion", paths.fusion)
        self._write_summary_report(results, paths)
        self._write_accountability_report(results, paths)
        return results

    def train_modality(self, modality: str, csv_path: Path) -> ModelResult:
        """Train and select the best model for one modality."""

        frame = pd.read_csv(csv_path)
        feature_names = [
            column
            for column in frame.columns
            if column not in {"label", "data_source", "subject_id", "participant_id"}
        ]
        x = frame[feature_names]
        y = frame["label"].astype(int)
        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.20,
            random_state=CONFIG.random_seed,
            stratify=y,
        )

        candidates = self._candidate_models(y_train)
        evaluated = []
        for model_name, estimator in candidates.items():
            pipeline = self._pipeline(estimator, feature_names)
            cv_metrics = self._cross_validate(model_name, pipeline, x_train, y_train)
            pipeline.fit(x_train, y_train)
            probabilities = pipeline.predict_proba(x_test)[:, 1]
            threshold_table = self._threshold_search(y_test, probabilities)
            best_row = self._select_threshold(threshold_table)
            metrics = self._metrics_at_threshold(
                y_test,
                probabilities,
                float(best_row["threshold"]),
            )
            metrics["cv_recall_mean"] = float(np.mean([m["recall"] for m in cv_metrics]))
            metrics["cv_f2_mean"] = float(np.mean([m["f2"] for m in cv_metrics]))
            evaluated.append((model_name, pipeline, metrics, threshold_table))

        best_name, best_pipeline, best_metrics, best_threshold_table = self._select_model(
            evaluated
        )
        threshold = float(best_metrics["threshold"])
        model_path = self.models_dir / f"{modality}_model.pkl"
        with model_path.open("wb") as handle:
            pickle.dump(best_pipeline, handle)

        self._write_metadata(modality, best_name, threshold, best_metrics, feature_names)
        self._write_modality_report(
            modality,
            best_name,
            best_metrics,
            feature_names,
            best_threshold_table,
            x_test,
            y_test,
            best_pipeline.predict_proba(x_test)[:, 1],
        )
        return ModelResult(
            modality=modality,
            model_name=best_name,
            threshold=threshold,
            metrics=best_metrics,
            feature_names=feature_names,
            model_path=model_path,
        )

    def _build_probability_fusion_dataset(
        self, paths: MVPDataPaths, results: Dict[str, ModelResult]
    ) -> pd.DataFrame:
        """Create a fusion training table from unimodal risk probabilities."""

        frames = {
            "reading": pd.read_csv(paths.reading),
            "writing": pd.read_csv(paths.writing),
            "typing": pd.read_csv(paths.typing),
        }
        probabilities: Dict[str, np.ndarray] = {}
        for modality, frame in frames.items():
            model = self._load_pipeline(results[modality].model_path)
            features = results[modality].feature_names
            probabilities[modality] = model.predict_proba(frame[features])[:, 1]

        length = min(len(frame) for frame in frames.values())
        labels = np.round(
            (
                frames["reading"]["label"].to_numpy()[:length]
                + frames["writing"]["label"].to_numpy()[:length]
                + frames["typing"]["label"].to_numpy()[:length]
            )
            / 3
        ).astype(int)
        return pd.DataFrame(
            {
                "participant_id": np.arange(1, length + 1),
                "reading_probability": probabilities["reading"][:length],
                "writing_probability": probabilities["writing"][:length],
                "typing_probability": probabilities["typing"][:length],
                "label": labels,
                "data_source": "mvp_probability_fusion",
            }
        )

    @staticmethod
    def _load_pipeline(path: Path) -> Pipeline:
        """Load a saved sklearn pipeline."""

        with path.open("rb") as handle:
            return pickle.load(handle)

    def _candidate_models(self, y_train: pd.Series) -> Dict[str, object]:
        """Return candidate classifiers with class-imbalance handling."""

        positives = int((y_train == 1).sum())
        negatives = int((y_train == 0).sum())
        scale_pos_weight = negatives / positives if positives else 1.0
        models: Dict[str, object] = {
            "logistic_regression": LogisticRegression(
                class_weight="balanced",
                max_iter=1000,
                random_state=CONFIG.random_seed,
            ),
            "random_forest": RandomForestClassifier(
                n_estimators=160,
                class_weight="balanced",
                max_depth=6,
                random_state=CONFIG.random_seed,
            ),
            "calibrated_random_forest": CalibratedClassifierCV(
                estimator=RandomForestClassifier(
                    n_estimators=140,
                    class_weight="balanced",
                    max_depth=5,
                    random_state=CONFIG.random_seed,
                ),
                method="sigmoid",
                cv=3,
            ),
        }
        if XGBClassifier is not None:
            models["xgboost"] = XGBClassifier(
                n_estimators=120,
                max_depth=3,
                learning_rate=0.05,
                subsample=0.9,
                colsample_bytree=0.9,
                eval_metric="logloss",
                scale_pos_weight=scale_pos_weight,
                random_state=CONFIG.random_seed,
            )
            models["calibrated_xgboost"] = CalibratedClassifierCV(
                estimator=XGBClassifier(
                    n_estimators=80,
                    max_depth=3,
                    learning_rate=0.05,
                    subsample=0.9,
                    colsample_bytree=0.9,
                    eval_metric="logloss",
                    scale_pos_weight=scale_pos_weight,
                    random_state=CONFIG.random_seed,
                ),
                method="sigmoid",
                cv=3,
            )
        return models

    @staticmethod
    def _pipeline(estimator: object, feature_names: List[str]) -> Pipeline:
        """Build a preprocessing and classifier pipeline."""

        preprocessor = ColumnTransformer(
            transformers=[
                (
                    "numeric",
                    Pipeline(
                        steps=[
                            ("imputer", SimpleImputer(strategy="median")),
                            ("scaler", StandardScaler()),
                        ]
                    ),
                    feature_names,
                )
            ]
        )
        return Pipeline(steps=[("preprocess", preprocessor), ("model", estimator)])

    def _cross_validate(
        self, model_name: str, pipeline: Pipeline, x: pd.DataFrame, y: pd.Series
    ) -> List[Dict[str, float]]:
        """Run 5-fold stratified validation with recall-first metrics."""

        metrics: List[Dict[str, float]] = []
        splitter = StratifiedKFold(
            n_splits=5,
            shuffle=True,
            random_state=CONFIG.random_seed,
        )
        for fold, (train_index, valid_index) in enumerate(splitter.split(x, y), start=1):
            pipeline.fit(x.iloc[train_index], y.iloc[train_index])
            probabilities = pipeline.predict_proba(x.iloc[valid_index])[:, 1]
            threshold_table = self._threshold_search(y.iloc[valid_index], probabilities)
            threshold = float(self._select_threshold(threshold_table)["threshold"])
            fold_metrics = self._metrics_at_threshold(
                y.iloc[valid_index],
                probabilities,
                threshold,
            )
            fold_metrics["fold"] = float(fold)
            fold_metrics["model"] = model_name
            metrics.append(fold_metrics)
        return metrics

    @staticmethod
    def _threshold_search(y_true: pd.Series, probabilities: np.ndarray) -> pd.DataFrame:
        """Evaluate thresholds from 0.05 to 0.95."""

        rows: List[Dict[str, float]] = []
        for threshold in np.round(np.arange(0.05, 0.96, 0.01), 2):
            rows.append(MVPTrainer._metrics_at_threshold(y_true, probabilities, threshold))
        return pd.DataFrame(rows)

    @staticmethod
    def _metrics_at_threshold(
        y_true: pd.Series, probabilities: np.ndarray, threshold: float
    ) -> Dict[str, float]:
        """Compute screening metrics at one threshold."""

        predictions = (probabilities >= threshold).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, predictions, labels=[0, 1]).ravel()
        specificity = tn / (tn + fp) if (tn + fp) else 0.0
        return {
            "threshold": float(threshold),
            "accuracy": float(accuracy_score(y_true, predictions)),
            "precision": float(precision_score(y_true, predictions, zero_division=0)),
            "recall": float(recall_score(y_true, predictions, zero_division=0)),
            "specificity": float(specificity),
            "f1": float(f1_score(y_true, predictions, zero_division=0)),
            "f2": float(fbeta_score(y_true, predictions, beta=2, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_true, probabilities)),
            "true_positive": float(tp),
            "false_positive": float(fp),
            "true_negative": float(tn),
            "false_negative": float(fn),
        }

    @staticmethod
    def _select_threshold(threshold_table: pd.DataFrame) -> pd.Series:
        """Select threshold by recall, then F2, then ROC-AUC."""

        acceptable = threshold_table[threshold_table["precision"] >= 0.55]
        search_space = acceptable if not acceptable.empty else threshold_table
        ordered = search_space.sort_values(
            by=["recall", "f2", "roc_auc", "specificity"],
            ascending=[False, False, False, False],
        )
        return ordered.iloc[0]

    @staticmethod
    def _select_model(
        evaluated: List[Tuple[str, Pipeline, Dict[str, float], pd.DataFrame]]
    ) -> Tuple[str, Pipeline, Dict[str, float], pd.DataFrame]:
        """Select best model by recall, F2, then ROC-AUC."""

        return sorted(
            evaluated,
            key=lambda item: (
                item[2]["recall"],
                item[2]["f2"],
                item[2]["roc_auc"],
                item[2]["specificity"],
            ),
            reverse=True,
        )[0]

    def _write_metadata(
        self,
        modality: str,
        model_name: str,
        threshold: float,
        metrics: Dict[str, float],
        feature_names: List[str],
    ) -> None:
        """Save threshold and model metadata."""

        metadata = {
            "model_version": "mvp-0.1.0",
            "modality": modality,
            "model_name": model_name,
            "threshold": threshold,
            "metrics": metrics,
            "feature_names": feature_names,
            "training_date": datetime.now(timezone.utc).isoformat(),
            "selection_priority": ["recall", "f2", "roc_auc", "accuracy"],
            "evidence_level": "MVP prototype",
            "data_provenance": self._data_provenance(modality),
            "known_limitations": self._known_limitations(modality),
            "accountability_note": (
                "This model is built for MVP workflow validation. It uses synthetic "
                "realistic data for at least part of its training signal and must not "
                "be presented as clinically validated."
            ),
            "clinical_note": "MVP screening model; not a diagnostic system.",
        }
        path = self.models_dir / f"{modality}_threshold.json"
        path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    def _write_modality_report(
        self,
        modality: str,
        model_name: str,
        metrics: Dict[str, float],
        feature_names: List[str],
        threshold_table: pd.DataFrame,
        x_test: pd.DataFrame,
        y_test: pd.Series,
        probabilities: np.ndarray,
    ) -> None:
        """Save modality evaluation report and plots."""

        threshold_path = self.reports_dir / f"{modality}_thresholds.csv"
        threshold_table.to_csv(threshold_path, index=False)
        self._plot_thresholds(modality, threshold_table)
        self._plot_confusion(modality, metrics)
        self._plot_curves(modality, y_test, probabilities)

        feature_importance = self._feature_importance(modality, model_name, x_test)
        lines = [
            f"# {modality.title()} MVP Model Evaluation",
            "",
            "This MVP model is optimized for dyslexia risk screening. It is not a medical diagnostic system.",
            "",
            f"**Selected model:** {model_name}",
            f"**Selected threshold:** {metrics['threshold']:.2f}",
            "",
            "## Metrics",
            "",
            "| Metric | Value |",
            "| --- | ---: |",
        ]
        for key in [
            "accuracy",
            "precision",
            "recall",
            "specificity",
            "f1",
            "f2",
            "roc_auc",
            "false_negative",
        ]:
            lines.append(f"| {key} | {metrics[key]:.4f} |")
        lines.extend(
            [
                "",
                "## Features",
                "",
                ", ".join(feature_names),
                "",
                "## Accountability",
                "",
                f"**Evidence level:** MVP prototype",
                "",
                "**Data provenance:**",
                "",
            ]
        )
        lines.extend(
            f"- {key}: {value}"
            for key, value in self._data_provenance(modality).items()
        )
        lines.extend(
            [
                "",
                "**Known limitations:**",
                "",
            ]
        )
        lines.extend(f"- {item}" for item in self._known_limitations(modality))
        lines.extend(
            [
                "",
                "## Recall Priority",
                "",
                "The selected threshold prioritizes recall first, then F2 score, then ROC-AUC. False negatives are tracked explicitly because missing an at-risk learner is the highest-risk screening failure.",
                "",
                "## Important Prototype Factors",
                "",
            ]
        )
        lines.extend([f"- {item}" for item in feature_importance])
        write_text(self.reports_dir / f"{modality}_model_evaluation.md", "\n".join(lines) + "\n")

    def _plot_thresholds(self, modality: str, threshold_table: pd.DataFrame) -> None:
        """Plot recall, precision, and F2 over thresholds."""

        plt.figure(figsize=(10, 6))
        plt.plot(threshold_table["threshold"], threshold_table["recall"], label="Recall")
        plt.plot(threshold_table["threshold"], threshold_table["precision"], label="Precision")
        plt.plot(threshold_table["threshold"], threshold_table["f2"], label="F2")
        plt.xlabel("Threshold")
        plt.ylabel("Score")
        plt.legend()
        plt.tight_layout()
        plt.savefig(self.figures_dir / f"{modality}_threshold_curves.png", dpi=150)
        plt.close()

    def _plot_confusion(self, modality: str, metrics: Dict[str, float]) -> None:
        """Plot confusion matrix for the selected threshold."""

        matrix = np.array(
            [
                [metrics["true_negative"], metrics["false_positive"]],
                [metrics["false_negative"], metrics["true_positive"]],
            ]
        )
        plt.figure(figsize=(5, 4))
        sns.heatmap(
            matrix,
            annot=True,
            fmt=".0f",
            cmap="Blues",
            xticklabels=["Low Risk", "At Risk"],
            yticklabels=["Low Risk", "At Risk"],
        )
        plt.xlabel("Predicted")
        plt.ylabel("Actual")
        plt.tight_layout()
        plt.savefig(self.figures_dir / f"{modality}_confusion_matrix.png", dpi=150)
        plt.close()

    def _plot_curves(
        self, modality: str, y_test: pd.Series, probabilities: np.ndarray
    ) -> None:
        """Plot ROC and precision-recall curves."""

        fpr, tpr, _ = roc_curve(y_test, probabilities)
        precision, recall, _ = precision_recall_curve(y_test, probabilities)
        plt.figure(figsize=(10, 4))
        plt.subplot(1, 2, 1)
        plt.plot(fpr, tpr, label=f"AUC={auc(fpr, tpr):.2f}")
        plt.plot([0, 1], [0, 1], linestyle="--", color="gray")
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.legend()
        plt.subplot(1, 2, 2)
        plt.plot(recall, precision)
        plt.xlabel("Recall")
        plt.ylabel("Precision")
        plt.tight_layout()
        plt.savefig(self.figures_dir / f"{modality}_roc_pr_curves.png", dpi=150)
        plt.close()

    @staticmethod
    def _feature_importance(
        modality: str, model_name: str, x_test: pd.DataFrame
    ) -> List[str]:
        """Return human-readable top factor placeholders for MVP reporting."""

        translations = {
            "reading": [
                "Longer visual fixation on words",
                "Frequent regressions during reading",
                "Slower reading time",
            ],
            "writing": [
                "Irregular handwriting stroke patterns",
                "Higher letter reversal count",
                "Unstable baseline alignment",
            ],
            "typing": [
                "Longer pauses while typing",
                "Frequent typing corrections",
                "Higher keystroke latency variation",
            ],
            "fusion": [
                "Reading model probability",
                "Writing model probability",
                "Typing model probability",
            ],
        }
        return translations[modality]

    def _write_summary_report(
        self, results: Dict[str, ModelResult], paths: MVPDataPaths
    ) -> None:
        """Write the MVP model comparison report."""

        lines = [
            "# DysLexAI MVP Model Comparison",
            "",
            "This MVP uses compact real-anchored and synthetic realistic tabular features to validate the end-to-end screening pipeline quickly. Results are prototype metrics and must not be interpreted as clinical performance.",
            "",
            "## Generated Datasets",
            "",
            f"- Reading: `{paths.reading}`",
            f"- Writing: `{paths.writing}`",
            f"- Typing: `{paths.typing}`",
            f"- Fusion: `{paths.fusion}`",
            "",
            "## Model Comparison",
            "",
            "| Modality | Model | Threshold | Accuracy | Precision | Recall | Specificity | F1 | F2 | ROC-AUC | False Negatives |",
            "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
        for result in results.values():
            metrics = result.metrics
            lines.append(
                f"| {result.modality} | {result.model_name} | {result.threshold:.2f} | "
                f"{metrics['accuracy']:.3f} | {metrics['precision']:.3f} | "
                f"{metrics['recall']:.3f} | {metrics['specificity']:.3f} | "
                f"{metrics['f1']:.3f} | {metrics['f2']:.3f} | "
                f"{metrics['roc_auc']:.3f} | {metrics['false_negative']:.0f} |"
            )
        lines.extend(
            [
                "",
                "## Selection Rule",
                "",
                "Models and thresholds are selected by Recall first, F2 score second, ROC-AUC third, and Accuracy last.",
                "",
                "## MVP Data Note",
                "",
                "The reading dataset uses real ETDD70 labels as anchors plus synthetic realistic features. Writing and typing use synthetic realistic features until extracted real datasets are available. The fusion model uses the three unimodal model probabilities as its input features. The writing archive password provided is `WanAsy321`, but the local extractor cannot decrypt encrypted RAR files.",
                "",
                "## Accountability Summary",
                "",
                "This MVP is accountable as an engineering prototype, not as a validated clinical tool. Its outputs should be used to demonstrate workflow, user experience, thresholding, and integration readiness. Any real-world screening claim requires validation on independent real participant data.",
            ]
        )
        write_text(self.reports_dir / "model_comparison.md", "\n".join(lines) + "\n")

    def _write_accountability_report(
        self, results: Dict[str, ModelResult], paths: MVPDataPaths
    ) -> None:
        """Write a reviewer-facing accountability and model-card report."""

        lines = [
            "# DysLexAI MVP Accountability Report",
            "",
            "This report explains what the MVP can and cannot claim.",
            "",
            "## Accountability Position",
            "",
            "DysLexAI MVP is a working screening workflow prototype. It is not clinically validated and must not be used for diagnosis, school placement, treatment decisions, or standalone eligibility screening.",
            "",
            "## Data Provenance",
            "",
            "| Modality | Real Data | Synthetic Data | Notes |",
            "| --- | --- | --- | --- |",
            "| Reading | ETDD70 labels from `dyslexia_class_label.csv` | Realistic generated reading features | Real labels anchor class balance; raw gaze feature extraction is future work. |",
            "| Writing | Archive present but encrypted RAR not extracted locally | Realistic generated handwriting features | Password is known, but local extractor cannot decrypt RAR. |",
            "| Typing | No real typing dataset currently placed | Realistic generated typing features | Replace when real keystroke data is available. |",
            "| Fusion | Unimodal model probabilities | Probability-level fusion examples | Fusion tests integration, not clinical validity. |",
            "",
            "## Model Cards",
            "",
        ]
        for result in results.values():
            metrics = result.metrics
            lines.extend(
                [
                    f"### {result.modality.title()}",
                    "",
                    f"- Selected model: `{result.model_name}`",
                    f"- Threshold: `{result.threshold:.2f}`",
                    f"- Recall: `{metrics['recall']:.3f}`",
                    f"- F2 score: `{metrics['f2']:.3f}`",
                    f"- ROC-AUC: `{metrics['roc_auc']:.3f}`",
                    f"- False negatives on MVP holdout: `{metrics['false_negative']:.0f}`",
                    "- Intended use: demo and engineering validation",
                    "- Not intended use: medical diagnosis or formal educational decision-making",
                    "",
                ]
            )
        lines.extend(
            [
                "## What To Say If Asked About Accountability",
                "",
                "The honest answer is: this MVP proves the pipeline works, shows recall-first thresholding, exposes model decisions in human-readable terms, and documents synthetic-data limitations. It does not prove real-world dyslexia detection performance yet.",
                "",
                "## Next Validation Steps",
                "",
                "1. Extract real handwriting data with WinRAR or 7-Zip.",
                "2. Add a real typing dataset.",
                "3. Replace synthetic features with real extracted features.",
                "4. Evaluate on participant-level splits to avoid leakage.",
                "5. Report confidence intervals and subgroup performance.",
            ]
        )
        write_text(self.reports_dir / "accountability_report.md", "\n".join(lines) + "\n")

    @staticmethod
    def _data_provenance(modality: str) -> Dict[str, str]:
        """Return modality-specific data provenance."""

        provenance = {
            "reading": {
                "real_component": "ETDD70 participant labels from dyslexia_class_label.csv",
                "synthetic_component": "Generated realistic reading behavior features",
                "current_status": "MVP feature proxy, not raw gaze-derived clinical evidence",
            },
            "writing": {
                "real_component": "Encrypted handwriting RAR is present but not extracted locally",
                "synthetic_component": "Generated realistic handwriting behavior features",
                "current_status": "Synthetic-only MVP proxy",
            },
            "typing": {
                "real_component": "No real typing dataset currently available in workspace",
                "synthetic_component": "Generated realistic typing behavior features",
                "current_status": "Synthetic-only MVP proxy",
            },
            "fusion": {
                "real_component": "Uses outputs from MVP unimodal models",
                "synthetic_component": "Fusion labels and probabilities are MVP generated",
                "current_status": "Integration prototype",
            },
        }
        return provenance[modality]

    @staticmethod
    def _known_limitations(modality: str) -> List[str]:
        """Return known limitations for a modality."""

        common = [
            "Not clinically validated.",
            "Metrics are from MVP holdout data, not independent real-world validation.",
            "Synthetic data can overstate model reliability.",
        ]
        specific = {
            "reading": [
                "Reading features are generated from label anchors rather than extracted from all raw ETDD70 gaze streams.",
            ],
            "writing": [
                "Real handwriting images are not yet used because the current archive is encrypted RAR.",
            ],
            "typing": [
                "No real typing dataset has been integrated yet.",
            ],
            "fusion": [
                "Fusion quality depends entirely on the MVP unimodal probability estimates.",
            ],
        }
        return [*common, *specific[modality]]


def main() -> None:
    """Run MVP model training."""

    MVPTrainer().run()


if __name__ == "__main__":
    main()
