"""Detection intelligence layer for trained DysLexAI MVP models.

This module never trains models. It loads existing inference artifacts, validates
real assessment features before prediction, compares assessments with
non-dyslexic reference baselines, derives interpretable weaknesses, and returns
dashboard-ready learning profiles.
"""

from __future__ import annotations

import json
import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Mapping, Tuple

import pandas as pd

from src.utils.config import CONFIG
from src.utils.file_utils import ensure_directories

try:  # SHAP is optional at runtime; raw values are never exposed to end users.
    import shap  # noqa: F401
except Exception:  # pragma: no cover - import guard for lean deployments.
    shap = None


LABEL_COLUMNS = {"label", "data_source", "subject_id", "participant_id"}
BASELINE_PATH = CONFIG.models_dir / "mvp" / "baseline_reference.json"

FEATURE_METADATA: Dict[str, Dict[str, object]] = {
    "fixation_duration_mean": {"plain": "average visual fixation duration", "direction": "higher", "weakness": "phonological_processing", "modality": "reading"},
    "fixation_duration_std": {"plain": "variation in visual fixation duration", "direction": "higher", "weakness": "phonological_processing", "modality": "reading"},
    "fixation_count": {"plain": "number of visual fixations", "direction": "higher", "weakness": "reading_fluency", "modality": "reading"},
    "saccade_length_mean": {"plain": "eye movement span between words", "direction": "lower", "weakness": "reading_fluency", "modality": "reading"},
    "saccade_velocity_mean": {"plain": "eye movement speed between words", "direction": "lower", "weakness": "reading_fluency", "modality": "reading"},
    "regression_count": {"plain": "backward eye movements while reading", "direction": "higher", "weakness": "reading_fluency", "modality": "reading"},
    "reading_time_seconds": {"plain": "reading completion time", "direction": "higher", "weakness": "reading_fluency", "modality": "reading"},
    "blink_rate": {"plain": "blink rate during reading", "direction": "higher", "weakness": "phonological_processing", "modality": "reading"},
    "stroke_irregularity": {"plain": "handwriting stroke irregularity", "direction": "higher", "weakness": "spelling_accuracy", "modality": "writing"},
    "letter_spacing_variance": {"plain": "letter spacing inconsistency", "direction": "higher", "weakness": "spelling_accuracy", "modality": "writing"},
    "baseline_drift": {"plain": "handwriting baseline drift", "direction": "higher", "weakness": "spelling_accuracy", "modality": "writing"},
    "letter_reversal_count": {"plain": "letter reversals", "direction": "higher", "weakness": "letter_reversal", "modality": "writing"},
    "word_alignment_error": {"plain": "word alignment errors", "direction": "higher", "weakness": "spelling_accuracy", "modality": "writing"},
    "pressure_variability": {"plain": "writing pressure variability", "direction": "higher", "weakness": "spelling_accuracy", "modality": "writing"},
    "mean_hold_time_ms": {"plain": "key hold duration", "direction": "higher", "weakness": "typing_accuracy", "modality": "typing"},
    "mean_flight_time_ms": {"plain": "time between keystrokes", "direction": "higher", "weakness": "typing_accuracy", "modality": "typing"},
    "pause_rate": {"plain": "typing pause rate", "direction": "higher", "weakness": "typing_accuracy", "modality": "typing"},
    "backspace_rate": {"plain": "typing correction rate", "direction": "higher", "weakness": "typing_accuracy", "modality": "typing"},
    "typing_speed_wpm": {"plain": "typing speed", "direction": "lower", "weakness": "typing_accuracy", "modality": "typing"},
    "latency_variability_ms": {"plain": "keystroke timing variability", "direction": "higher", "weakness": "typing_accuracy", "modality": "typing"},
}

RECOMMENDATION_MAP = {
    "reading_fluency": "reading_fluency_training",
    "letter_reversal": "letter_reversal_training",
    "spelling_accuracy": "spelling_practice",
    "typing_accuracy": "typing_practice",
    "phonological_processing": "phonics_training",
}


@dataclass(frozen=True)
class ModelArtifact:
    """Loaded model pipeline and metadata for one modality."""

    model: object
    metadata: Dict[str, object]


class DetectionIntelligenceEngine:
    """Build learning profiles from trained model predictions and baselines."""

    def __init__(self, baseline_path: Path = BASELINE_PATH) -> None:
        """Load baseline statistics and prepare the inference engine."""

        self.baseline_path = baseline_path
        self.baseline = load_or_create_baseline(baseline_path)

    def predict_full(self, reading: Mapping[str, float], writing: Mapping[str, float], typing: Mapping[str, float]) -> Dict[str, object]:
        """Return the complete dashboard-ready learning profile response."""

        sanitized_reading, reading_warnings = validate_and_sanitize_features("reading", reading, self.baseline)
        sanitized_writing, writing_warnings = validate_and_sanitize_features("writing", writing, self.baseline)
        sanitized_typing, typing_warnings = validate_and_sanitize_features("typing", typing, self.baseline)
        modality_probs = {
            "reading": predict_probability("reading", sanitized_reading),
            "writing": predict_probability("writing", sanitized_writing),
            "typing": predict_probability("typing", sanitized_typing),
        }
        fusion_payload = {
            "reading_probability": modality_probs["reading"],
            "writing_probability": modality_probs["writing"],
            "typing_probability": modality_probs["typing"],
        }
        overall_score = predict_probability("fusion", fusion_payload)
        comparison = compare_with_baseline({**sanitized_reading, **sanitized_writing, **sanitized_typing}, self.baseline)
        profile = infer_learning_profile(comparison, modality_probs)
        return {
            "overall_risk": {
                "score": round(overall_score, 4),
                "level": risk_level(overall_score),
                "confidence": round(confidence_from_probability(overall_score), 4),
            },
            "modality_scores": {key: round(value, 4) for key, value in modality_probs.items()},
            "baseline_comparison": comparison,
            "learning_profile": profile,
            "top_contributing_factors": explain_prediction(comparison),
            "recommended_modules": map_recommendations(profile),
            "feature_validation": reading_warnings + writing_warnings + typing_warnings,
            "clinical_note": "Screening support only; not a medical diagnosis.",
        }

_MODEL_ARTIFACT_CACHE: Dict[str, ModelArtifact] = {}


def load_model_artifact(modality: str) -> ModelArtifact:
    """Load a trained model and threshold metadata without retraining."""

    cached = _MODEL_ARTIFACT_CACHE.get(modality)
    if cached is not None:
        return cached

    base = CONFIG.models_dir / "mvp"
    model_path = base / f"{modality}_model.pkl"
    metadata_path = base / f"{modality}_threshold.json"
    if not model_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(
            f"Missing trained {modality} artifact in {base}. Run training outside inference before using this endpoint."
        )
    with model_path.open("rb") as handle:
        model = pickle.load(handle)
    artifact = ModelArtifact(model=model, metadata=json.loads(metadata_path.read_text(encoding="utf-8")))
    _MODEL_ARTIFACT_CACHE[modality] = artifact
    return artifact


def predict_probability(modality: str, payload: Mapping[str, float]) -> float:
    """Run one existing trained model and return its dyslexia-risk probability."""

    artifact = load_model_artifact(modality)
    feature_names = artifact.metadata["feature_names"]
    frame = pd.DataFrame([{feature: float(payload[feature]) for feature in feature_names}])
    return float(artifact.model.predict_proba(frame)[:, 1][0])


def generate_baseline_reference(output_path: Path = BASELINE_PATH) -> Dict[str, Dict[str, float]]:
    """Calculate non-dyslexic mean, spread, percentiles, and normal range."""

    ensure_directories([output_path.parent])
    baseline: Dict[str, Dict[str, float]] = {}
    for csv_path in sorted((CONFIG.datasets_dir / "processed").glob("mvp_*_features.csv")):
        frame = pd.read_csv(csv_path)
        if "label" not in frame.columns:
            continue
        controls = frame[frame["label"].astype(int) == 0]
        for feature in [c for c in controls.columns if c not in LABEL_COLUMNS]:
            if not pd.api.types.is_numeric_dtype(controls[feature]):
                continue
            values = controls[feature].dropna().astype(float)
            if values.empty:
                continue
            mean = float(values.mean())
            std = float(values.std(ddof=0))
            p01 = float(values.quantile(0.01))
            p05 = float(values.quantile(0.05))
            p95 = float(values.quantile(0.95))
            p99 = float(values.quantile(0.99))
            baseline[feature] = {
                "mean": round(mean, 6),
                "median": round(float(values.median()), 6),
                "std": round(std, 6),
                "min": round(float(values.min()), 6),
                "max": round(float(values.max()), 6),
                "p01": round(p01, 6),
                "p05": round(p05, 6),
                "p95": round(p95, 6),
                "p99": round(p99, 6),
                "normal_range": [round(mean - (2 * std), 6), round(mean + (2 * std), 6)],
                "validation_range": [round(p01, 6), round(p99, 6)],
            }
    output_path.write_text(json.dumps(baseline, indent=2, sort_keys=True), encoding="utf-8")
    return baseline


def load_or_create_baseline(path: Path = BASELINE_PATH) -> Dict[str, Dict[str, float]]:
    """Load the stored reference baseline or create it from processed datasets."""

    if path.exists():
        baseline = json.loads(path.read_text(encoding="utf-8"))
        if baseline and "normal_range" in next(iter(baseline.values())):
            return baseline
    return generate_baseline_reference(path)


def validate_and_sanitize_features(modality: str, payload: Mapping[str, float], baseline: Mapping[str, Mapping[str, float]]) -> Tuple[Dict[str, float], List[Dict[str, object]]]:
    """Validate inference features and impute only non-finite values to avoid crashes."""

    expected = [feature for feature, meta in FEATURE_METADATA.items() if meta.get("modality") == modality]
    sanitized: Dict[str, float] = {}
    warnings: List[Dict[str, object]] = []
    for feature in expected:
        raw_value = payload.get(feature)
        if raw_value is None:
            fill_value = float(baseline.get(feature, {}).get("mean", 0.0))
            sanitized[feature] = fill_value
            warnings.append({"modality": modality, "feature": feature, "issue": "missing", "action": "imputed_reference_mean", "value": fill_value})
            continue
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            fill_value = float(baseline.get(feature, {}).get("mean", 0.0))
            sanitized[feature] = fill_value
            warnings.append({"modality": modality, "feature": feature, "issue": "non_numeric", "action": "imputed_reference_mean", "value": fill_value})
            continue
        if pd.isna(value) or value in {float("inf"), float("-inf")}:
            fill_value = float(baseline.get(feature, {}).get("mean", 0.0))
            sanitized[feature] = fill_value
            warnings.append({"modality": modality, "feature": feature, "issue": "non_finite", "action": "imputed_reference_mean", "value": fill_value})
            continue
        sanitized[feature] = value
        validation_range = baseline.get(feature, {}).get("validation_range")
        if validation_range and (value < float(validation_range[0]) or value > float(validation_range[1])):
            warnings.append({"modality": modality, "feature": feature, "issue": "outside_reference_validation_range", "action": "warn_only_no_clip", "value": round(value, 4), "validation_range": validation_range})
    return sanitized, warnings


def compare_with_baseline(payload: Mapping[str, float], baseline: Mapping[str, Mapping[str, float]]) -> Dict[str, Dict[str, object]]:
    """Compare user features against reference means and assign severity."""

    comparison: Dict[str, Dict[str, object]] = {}
    for feature, user_value in payload.items():
        if feature not in baseline:
            continue
        stats = baseline[feature]
        reference = float(stats["mean"])
        std = max(float(stats.get("std", 0.0)), 1e-6)
        difference = float(user_value) - reference
        z_score = difference / std
        comparison[feature] = {
            "user": round(float(user_value), 4),
            "reference_mean": round(reference, 4),
            "reference_median": round(float(stats["median"]), 4),
            "normal_range": stats.get("normal_range"),
            "difference": round(difference, 4),
            "severity": severity_for_feature(feature, z_score),
        }
    return comparison


def severity_for_feature(feature: str, z_score: float) -> str:
    """Convert a feature z-score into Low, Moderate, or High clinical severity."""

    direction = FEATURE_METADATA.get(feature, {}).get("direction", "higher")
    risk_z = -z_score if direction == "lower" else z_score
    if risk_z >= 2.0:
        return "High"
    if risk_z >= 1.0:
        return "Moderate"
    return "Low"


def infer_learning_profile(comparison: Mapping[str, Mapping[str, object]], probabilities: Mapping[str, float]) -> Dict[str, str]:
    """Infer learning weaknesses from baseline deviations and model signals."""

    score = {key: 0 for key in RECOMMENDATION_MAP}
    weights = {"Low": 0, "Moderate": 1, "High": 2}
    for feature, details in comparison.items():
        weakness = FEATURE_METADATA.get(feature, {}).get("weakness")
        if weakness:
            score[str(weakness)] += weights[str(details["severity"])]
    for modality, probability in probabilities.items():
        boost = 2 if probability >= 0.70 else 1 if probability >= 0.35 else 0
        for meta in FEATURE_METADATA.values():
            if meta.get("modality") == modality:
                score[str(meta["weakness"])] += boost
    return {weakness: weakness_level(value) for weakness, value in score.items()}


def weakness_level(score: int) -> str:
    """Convert accumulated weakness evidence into a profile level."""

    if score >= 4:
        return "High"
    if score >= 2:
        return "Moderate"
    return "Low"


def explain_prediction(comparison: Mapping[str, Mapping[str, object]]) -> List[str]:
    """Generate the top five plain-English contributing factors."""

    explanations: List[Tuple[int, str]] = []
    severity_weight = {"High": 3, "Moderate": 2, "Low": 1}
    for feature, details in comparison.items():
        if details["severity"] == "Low":
            continue
        plain = FEATURE_METADATA.get(feature, {}).get("plain", feature.replace("_", " "))
        direction = "above" if float(details["difference"]) > 0 else "below"
        explanations.append((severity_weight[str(details["severity"])], f"{str(plain).capitalize()} is {direction} the reference baseline."))
    ranked = [text for _, text in sorted(explanations, key=lambda item: item[0], reverse=True)]
    return ranked[:5] or ["No major feature deviation from the reference baseline was detected."]


def map_recommendations(profile: Mapping[str, str]) -> List[str]:
    """Map moderate and high weaknesses to intervention category identifiers."""

    return [module for weakness, module in RECOMMENDATION_MAP.items() if profile.get(weakness) in {"Moderate", "High"}]


def risk_level(probability: float) -> str:
    """Map probability to Low, Moderate, or High risk."""

    if probability >= 0.70:
        return "High"
    if probability >= 0.35:
        return "Moderate"
    return "Low"


def confidence_from_probability(probability: float) -> float:
    """Estimate confidence as distance from the binary decision boundary."""

    return max(probability, 1.0 - probability)


if __name__ == "__main__":
    generate_baseline_reference()
