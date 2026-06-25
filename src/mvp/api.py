"""FastAPI inference endpoints for the DysLexAI MVP models."""

from __future__ import annotations

import json
import pickle
from typing import Dict, List

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.utils.config import CONFIG
from src.mvp.intelligence import DetectionIntelligenceEngine, generate_baseline_reference

app = FastAPI(
    title="DysLexAI MVP API",
    description="Recall-first dyslexia risk screening MVP. Not a diagnostic system.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> Dict[str, object]:
    """Return a friendly API landing response."""

    return {
        "name": "DysLexAI MVP API",
        "status": "running",
        "docs": "/docs",
        "frontend": "Open frontend/index.html in your browser.",
        "endpoints": [
            "POST /predict-reading",
            "POST /predict-writing",
            "POST /predict-typing",
            "POST /predict-fusion",
            "POST /predict-full",
            "POST /learning-profile",
            "POST /baseline-reference/regenerate",
        ],
        "clinical_note": "Screening support only; not a medical diagnosis.",
    }


@app.get("/health")
def health() -> Dict[str, str]:
    """Return a lightweight health-check response."""

    return {"status": "ok"}


class ReadingInput(BaseModel):
    """Reading behavior feature request."""

    fixation_duration_mean: float = Field(..., ge=0)
    fixation_duration_std: float = Field(..., ge=0)
    fixation_count: float = Field(..., ge=0)
    saccade_length_mean: float = Field(..., ge=0)
    saccade_velocity_mean: float = Field(..., ge=0)
    regression_count: float = Field(..., ge=0)
    reading_time_seconds: float = Field(..., ge=0)
    blink_rate: float = Field(..., ge=0)


class WritingInput(BaseModel):
    """Handwriting feature request."""

    stroke_irregularity: float = Field(..., ge=0)
    letter_spacing_variance: float = Field(..., ge=0)
    baseline_drift: float = Field(..., ge=0)
    letter_reversal_count: float = Field(..., ge=0)
    word_alignment_error: float = Field(..., ge=0)
    pressure_variability: float = Field(..., ge=0)


class TypingInput(BaseModel):
    """Typing behavior feature request."""

    mean_hold_time_ms: float = Field(..., ge=0)
    mean_flight_time_ms: float = Field(..., ge=0)
    pause_rate: float = Field(..., ge=0)
    backspace_rate: float = Field(..., ge=0)
    typing_speed_wpm: float = Field(..., ge=0)
    latency_variability_ms: float = Field(..., ge=0)


class FusionInput(BaseModel):
    """Multimodal fusion request."""

    reading_probability: float = Field(..., ge=0, le=1)
    writing_probability: float = Field(..., ge=0, le=1)
    typing_probability: float = Field(..., ge=0, le=1)


class FullAssessmentInput(BaseModel):
    """Full three-modality assessment request."""

    reading: ReadingInput
    writing: WritingInput
    typing: TypingInput


def _predict(modality: str, payload: Dict[str, float]) -> Dict[str, object]:
    """Run one MVP model and return a risk response."""

    model, metadata = _load_model(modality)
    feature_names = metadata["feature_names"]
    frame = pd.DataFrame([{feature: payload[feature] for feature in feature_names}])
    probability = float(model.predict_proba(frame)[:, 1][0])
    threshold = float(metadata["threshold"])
    at_risk = probability >= threshold
    confidence = probability if at_risk else 1.0 - probability
    risk_band = _risk_band(probability)
    return {
        "risk_probability": round(probability, 4),
        "risk_prediction": "At Risk" if at_risk else "Low Risk",
        "risk_band": risk_band,
        "threshold": round(threshold, 4),
        "confidence": round(confidence, 4),
        "top_factors": _top_factors(modality, payload),
        "evidence_level": metadata.get("evidence_level", "MVP prototype"),
        "data_provenance": metadata.get("data_provenance", {}),
        "accountability_note": metadata.get(
            "accountability_note",
            "Prototype output based partly on synthetic data. Use for workflow demonstration only.",
        ),
        "clinical_note": "Screening support only; not a medical diagnosis.",
    }


def _predict_probability(modality: str, payload: Dict[str, float]) -> float:
    """Return only the positive-class probability for one modality."""

    model, metadata = _load_model(modality)
    feature_names = metadata["feature_names"]
    frame = pd.DataFrame([{feature: payload[feature] for feature in feature_names}])
    return float(model.predict_proba(frame)[:, 1][0])


def _load_model(modality: str) -> tuple[object, Dict[str, object]]:
    """Load a serialized model and metadata."""

    base = CONFIG.models_dir / "mvp"
    model_path = base / f"{modality}_model.pkl"
    metadata_path = base / f"{modality}_threshold.json"
    if not model_path.exists() or not metadata_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"{modality} MVP model is not trained. Run python -m src.mvp.training first.",
        )
    with model_path.open("rb") as handle:
        model = pickle.load(handle)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    return model, metadata


def _top_factors(modality: str, payload: Dict[str, float]) -> List[str]:
    """Translate feature values into human-readable factors."""

    translations = {
        "reading": [
            ("fixation_duration_mean", 235, 340, "Long visual focus on words"),
            ("regression_count", 6, 18, "Frequent line regressions during reading"),
            ("reading_time_seconds", 70, 135, "Slower reading completion time"),
            ("fixation_count", 85, 145, "High number of visual fixations"),
            ("saccade_velocity_mean", 34, 18, "Slower eye movement between words"),
        ],
        "writing": [
            ("stroke_irregularity", 0.30, 0.80, "Irregular handwriting stroke patterns"),
            ("letter_reversal_count", 0, 5, "Frequent letter reversals"),
            ("baseline_drift", 0.20, 0.70, "Unstable writing baseline"),
            ("letter_spacing_variance", 0.25, 0.75, "Inconsistent letter spacing"),
        ],
        "typing": [
            ("pause_rate", 0.08, 0.36, "Frequent typing pauses"),
            ("backspace_rate", 0.04, 0.22, "Frequent typing corrections"),
            ("latency_variability_ms", 35, 120, "Irregular keystroke timing"),
            ("typing_speed_wpm", 48, 20, "Slower typing speed"),
        ],
        "fusion": [
            ("reading_probability", 0.25, 0.90, "Reading model risk signal"),
            ("writing_probability", 0.25, 0.90, "Writing model risk signal"),
            ("typing_probability", 0.25, 0.90, "Typing model risk signal"),
        ],
    }
    scored = [
        (_risk_score(float(payload.get(feature, 0)), low, high), description)
        for feature, low, high, description in translations[modality]
    ]
    ranked = sorted(scored, key=lambda item: item[0], reverse=True)
    positive = [description for score, description in ranked if score > 0.20]
    if positive:
        return positive[:3]
    return ["No strong risk-driving factor was detected in this MVP input."]


def _risk_score(value: float, low_reference: float, high_reference: float) -> float:
    """Normalize one feature into a 0-1 risk contribution score."""

    span = high_reference - low_reference
    if span == 0:
        return 0.0
    score = (value - low_reference) / span
    return max(0.0, min(1.0, score))


def _risk_band(probability: float) -> str:
    """Convert a probability into a user-facing risk band."""

    if probability >= 0.70:
        return "High Risk"
    if probability >= 0.35:
        return "Moderate Risk"
    return "Low Risk"


@app.post("/predict-reading")
def predict_reading(request: ReadingInput) -> Dict[str, object]:
    """Predict reading-based dyslexia risk."""

    return _predict("reading", _request_dict(request))


@app.post("/predict-writing")
def predict_writing(request: WritingInput) -> Dict[str, object]:
    """Predict writing-based dyslexia risk."""

    return _predict("writing", _request_dict(request))


@app.post("/predict-typing")
def predict_typing(request: TypingInput) -> Dict[str, object]:
    """Predict typing-based dyslexia risk."""

    return _predict("typing", _request_dict(request))


@app.post("/predict-fusion")
def predict_fusion(request: FusionInput) -> Dict[str, object]:
    """Predict multimodal fused dyslexia risk."""

    return _predict("fusion", _request_dict(request))


@app.post("/predict-full")
def predict_full(request: FullAssessmentInput) -> Dict[str, object]:
    """Run the complete detection intelligence layer for one assessment."""

    return _learning_profile_response(request)


@app.post("/learning-profile")
def learning_profile(request: FullAssessmentInput) -> Dict[str, object]:
    """Return explainable, intervention-ready learning profile output."""

    return _learning_profile_response(request)


@app.post("/baseline-reference/regenerate")
def regenerate_baseline_reference() -> Dict[str, object]:
    """Regenerate non-dyslexic reference statistics from processed datasets."""

    baseline = generate_baseline_reference()
    return {"feature_count": len(baseline), "baseline_reference": baseline}


def _learning_profile_response(request: FullAssessmentInput) -> Dict[str, object]:
    """Build the final Phase 2.5 dashboard response object."""

    try:
        engine = DetectionIntelligenceEngine()
        return engine.predict_full(
            _request_dict(request.reading),
            _request_dict(request.writing),
            _request_dict(request.typing),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _request_dict(request: BaseModel) -> Dict[str, float]:
    """Return request data for Pydantic v1 and v2."""

    if hasattr(request, "model_dump"):
        return request.model_dump()
    return request.dict()
