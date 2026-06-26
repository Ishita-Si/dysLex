"""
src/processing/transcriber.py
==============================
Whisper-based speech-to-text with word-level timestamps.

Responsibilities
----------------
- Load the faster-whisper model once (module-level singleton).
- Transcribe an audio file and return a list of WordTimestamp objects.
- Normalise audio to the format faster-whisper expects.
- Surface clear errors when the model or audio file is unavailable.

This module has NO dependency on the reading feature contract.
It only knows about audio in and words+timestamps out.
Swap this file for a cloud ASR later without touching anything else.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

# Public data contract

@dataclass(frozen=True)
class WordTimestamp:
    """One recognised word with its temporal boundaries.

    Attributes
    ----------
    word:
        The recognised word, stripped of leading/trailing whitespace.
    start:
        Start time in seconds from the beginning of the audio.
    end:
        End time in seconds from the beginning of the audio.
    probability:
        Whisper's confidence score for this word (0.0 – 1.0).
    """

    word: str
    start: float
    end: float
    probability: float

    @property
    def duration(self) -> float:
        """Duration of this word in seconds."""
        return self.end - self.start

# Model singleton

# Module-level cache so the model is loaded once per process,
# not once per request. Loading takes ~1-2 seconds on first call.
_MODEL_CACHE: dict = {}

_DEFAULT_MODEL_SIZE = "tiny"
_DEFAULT_DEVICE = "cpu"
_DEFAULT_COMPUTE_TYPE = "int8"  # int8 is fastest on CPU with no quality loss for tiny


def _get_model(
    model_size: str = _DEFAULT_MODEL_SIZE,
    device: str = _DEFAULT_DEVICE,
    compute_type: str = _DEFAULT_COMPUTE_TYPE,
):
    """Return a cached WhisperModel, loading it on first call.

    Parameters
    ----------
    model_size:
        faster-whisper model size: "tiny", "base", "small", "medium".
        "tiny" (~75 MB) is recommended for CPU-only prototype use.
    device:
        "cpu" or "cuda". Auto-detected is not used here — we default
        to cpu explicitly because the target machine has no discrete GPU.
    compute_type:
        Quantisation level. "int8" is fastest on CPU.
    """

    cache_key = (model_size, device, compute_type)
    if cache_key not in _MODEL_CACHE:
        try:
            from faster_whisper import WhisperModel  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "faster-whisper is not installed. "
                "Run: pip install faster-whisper"
            ) from exc

        # Suppress verbose CTranslate2 / HuggingFace download logs
        # unless the user explicitly set a log level.
        if "CT2_VERBOSE" not in os.environ:
            os.environ.setdefault("CT2_VERBOSE", "0")

        _MODEL_CACHE[cache_key] = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )

    return _MODEL_CACHE[cache_key]


# Public transcription function

def transcribe(
    audio_path: str | Path,
    language: str = "en",
    model_size: str = _DEFAULT_MODEL_SIZE,
) -> List[WordTimestamp]:
    """Transcribe an audio file and return word-level timestamps.

    Parameters
    ----------
    audio_path:
        Path to any audio format supported by ffmpeg:
        .wav, .mp3, .m4a, .ogg, .flac, etc.
    language:
        BCP-47 language code. Default "en" (English).
        Pass None to let Whisper auto-detect (slower).
    model_size:
        faster-whisper model size. Default "tiny".

    Returns
    -------
    List[WordTimestamp]
        One entry per recognised word, in temporal order.
        Empty list if the audio contains no recognisable speech.

    Raises
    ------
    FileNotFoundError
        If audio_path does not exist.
    RuntimeError
        If faster-whisper is not installed or transcription fails.
    """

    audio_path = Path(audio_path)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = _get_model(model_size=model_size)

    try:
        segments, _info = model.transcribe(
            str(audio_path),
            language=language,
            word_timestamps=True,   # essential — we need per-word timing
            vad_filter=True,        # skip silence; reduces hallucinations
            vad_parameters={
                "min_silence_duration_ms": 300,  # pauses < 300ms are not silence
            },
        )
    except Exception as exc:
        raise RuntimeError(
            f"Transcription failed for {audio_path.name}: {exc}"
        ) from exc

    words: List[WordTimestamp] = []
    for segment in segments:
        if segment.words is None:
            continue
        for w in segment.words:
            cleaned = w.word.strip()
            if not cleaned:
                continue
            words.append(
                WordTimestamp(
                    word=cleaned,
                    start=float(w.start),
                    end=float(w.end),
                    probability=float(w.probability),
                )
            )

    return words

# Convenience helper used by reading_features.py

def get_transcript_text(words: List[WordTimestamp]) -> str:
    """Join word list into a single normalised transcript string.

    Lowercased, whitespace-normalised. Suitable for jiwer / RapidFuzz.
    """
    return " ".join(w.word.lower() for w in words)