"""
src/processing/pipeline.py
==========================
Orchestrator pipeline tying transcription and proxy mapping together.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Dict

from src.processing.transcriber import transcribe
from src.processing.reading_features import extract_reading_features


def extract_reading_features_from_audio(
    audio_path: str | Path, 
    reference_text: Optional[str] = None
) -> Dict[str, float]:
    """Transcribes an audio file and calculates its eye-tracking proxy feature map.

    Parameters
    ----------
    audio_path:
        Path to the target audio file.
    reference_text:
        Optional original text ground truth intended to be read by the participant.

    Returns
    -------
    Dict[str, float]
        The exact required payload structure matching the reading model feature contract.
    """
    # 1. Generate word-level timing schemas
    words = transcribe(audio_path=audio_path)

    # 2. Extract out proxy properties conforming to structural configurations
    feature_payload = extract_reading_features(words=words, reference_text=reference_text)

    return feature_payload