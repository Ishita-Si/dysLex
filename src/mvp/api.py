"""FastAPI inference endpoints for the DysLexAI MVP models."""

from __future__ import annotations

import json
import pickle
import tempfile
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.utils.config import CONFIG
from src.processing.pipeline import extract_reading_features_from_audio
from src.processing.typing_features import extract_typing_features
from src.processing.writing_features import extract_writing_features

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
            "POST /predict-reading-audio",
            "POST /predict-typing-keystrokes",
            "POST /predict-writing-image",
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

class KeystrokeInput(BaseModel):
    """Keystroke event stream request."""

    events: List[Dict[str, object]]

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
    """Run reading, writing, typing, and probability-based fusion."""

    reading_payload = _request_dict(request.reading)
    writing_payload = _request_dict(request.writing)
    typing_payload = _request_dict(request.typing)

    reading = _predict("reading", reading_payload)
    writing = _predict("writing", writing_payload)
    typing = _predict("typing", typing_payload)
    fusion_payload = {
        "reading_probability": float(reading["risk_probability"]),
        "writing_probability": float(writing["risk_probability"]),
        "typing_probability": float(typing["risk_probability"]),
    }
    fusion = _predict("fusion", fusion_payload)
    return {
        "final_risk_probability": fusion["risk_probability"],
        "final_risk_prediction": fusion["risk_prediction"],
        "final_risk_band": fusion["risk_band"],
        "threshold": fusion["threshold"],
        "confidence": fusion["confidence"],
        "modality_scores": {
            "reading": reading,
            "writing": writing,
            "typing": typing,
        },
        "fusion_factors": fusion["top_factors"],
        "accountability": {
            "evidence_level": "MVP prototype",
            "data_basis": "Reading uses ETDD70 label anchors plus synthetic realistic features; writing and typing are synthetic realistic MVP features.",
            "not_validated_for": "Medical diagnosis, school placement decisions, or standalone clinical screening.",
            "recommended_use": "Demo, engineering validation, and future data collection planning.",
        },
        "clinical_note": "Screening support only; not a medical diagnosis.",
    }

@app.post("/predict-typing-keystrokes")
async def predict_typing_keystrokes(
    request: KeystrokeInput,
) -> Dict[str, object]:
    """Predict typing-based dyslexia risk from raw keystroke events."""

    if not request.events:
        raise HTTPException(status_code=400, detail="No keystroke events provided.")

    try:
        feature_payload = extract_typing_features(request.events)
        return _predict("typing", feature_payload)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Keystroke feature extraction failed: {exc}",
        ) from exc
        
@app.post("/predict-reading-audio")
async def predict_reading_audio(
    file: UploadFile = File(...),
    reference_text: Optional[str] = Form(None),
) -> Dict[str, object]:
    """Predict reading dyslexia risk from an uploaded audio file.

    Transcribes the audio with Whisper, extracts gaze proxy features,
    and passes them to the existing reading XGBoost model unchanged.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    suffix = Path(file.filename).suffix.lower()
    allowed = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm", ".aac", ".mp4"}
    if suffix not in allowed:
        allowed_list = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Allowed: {allowed_list}",
        )

    tmp_path: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = Path(tmp.name)

        feature_payload = extract_reading_features_from_audio(
            audio_path=tmp_path,
            reference_text=reference_text,
        )
        return _predict("reading", feature_payload)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Audio processing failed: {exc}",
        ) from exc
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink()

@app.post("/predict-writing-image")
async def predict_writing_image(
    image_b64: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
) -> Dict[str, object]:
    """Predict writing dyslexia risk from a canvas drawing or uploaded image.

    Accepts either:
    - A base64 PNG string from canvas.toDataURL() via form field image_b64
    - A PNG/JPG file upload via multipart form
    """
    import base64 as b64lib

    if not image_b64 and not file:
        raise HTTPException(
            status_code=400,
            detail="Provide either image_b64 or a file upload.",
        )

    try:
        if file:
            # Handle file upload
            allowed = {".png", ".jpg", ".jpeg"}
            suffix = Path(file.filename).suffix.lower()
            if suffix not in allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type '{suffix}'. Allowed: {allowed}",
                )
            contents = await file.read()
            image_b64 = b64lib.b64encode(contents).decode("utf-8")

        feature_payload = extract_writing_features(image_b64)
        return _predict("writing", feature_payload)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Writing feature extraction failed: {exc}",
        ) from exc
    
def _request_dict(request: BaseModel) -> Dict[str, float]:
    """Return request data for Pydantic v1 and v2."""

    if hasattr(request, "model_dump"):
        return request.model_dump()
    return request.dict()

