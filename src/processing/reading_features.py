"""
src/processing/reading_features.py
==================================
Extract eye-tracking proxy features from audio transcription and text alignment.
"""

from __future__ import annotations

import math
from typing import List, Optional, Dict
import jiwer
from rapidfuzz import fuzz

from src.processing.transcriber import WordTimestamp, get_transcript_text

# Hesitation filler words to look out for
FILLER_WORDS = {"um", "uh", "er", "ah", "like"}
HEAVY_PAUSE_THRESHOLD_SEC = 1.0


def extract_reading_features(
    words: List[WordTimestamp], 
    reference_text: Optional[str] = None
) -> Dict[str, float]:
    """Analyze transcription word timings and align with reference text 
    to extract proxy eye-tracking metrics.
    """
    # Fallback default dict if no words are detected
    default_payload = {
        "fixation_duration_mean": 0.0,
        "fixation_duration_std": 0.0,
        "fixation_count": 0.0,
        "saccade_length_mean": 0.0,
        "saccade_velocity_mean": 0.0,
        "regression_count": 0.0,
        "reading_time_seconds": 0.0,
        "blink_rate": 0.0,
    }

    if not words:
        return default_payload

    # 1. Timeline and Durations
    reading_time_seconds = max(0.0, words[-1].end - words[0].start)
    if reading_time_seconds <= 0:
        reading_time_seconds = sum(w.duration for w in words)

    # 2. Fixation Count (Proxy: word count)
    fixation_count = float(len(words))

    # 3. Fixation Durations (Proxy: internal pauses between words)
    pauses: List[float] = []
    for i in range(len(words) - 1):
        pause = words[i + 1].start - words[i].end
        pauses.append(max(0.0, pause))

    # Word durations in milliseconds — Whisper measures these accurately
    # even when inter-word gaps are too small to resolve.
    word_durations_ms: List[float] = [w.duration * 1000.0 for w in words]

    # If inter-word pauses are all near zero (timestamp resolution limit),
    # fall back to word duration as the fixation proxy.
    # Typical fluent reading: word duration 180-320ms.
    # Typical dyslexic reading: word duration 320-500ms.
    PAUSE_RESOLUTION_THRESHOLD = 0.020  # 20ms — below this, gaps are unreliable

    meaningful_pauses = [p for p in pauses if p > PAUSE_RESOLUTION_THRESHOLD]

    if meaningful_pauses:
        fixation_duration_mean = (sum(meaningful_pauses) / len(meaningful_pauses)) * 1000.0
        variance = sum(
            (p * 1000.0 - fixation_duration_mean) ** 2 for p in meaningful_pauses
        ) / len(meaningful_pauses)
        fixation_duration_std = math.sqrt(variance)
    else:
        # Fallback: use word duration in ms as fixation proxy
        fixation_duration_mean = sum(word_durations_ms) / len(word_durations_ms)
        variance = sum(
            (d - fixation_duration_mean) ** 2 for d in word_durations_ms
        ) / len(word_durations_ms)
        fixation_duration_std = math.sqrt(variance)

    # 4. Saccade Length (Proxy: character word length)
    saccade_length_mean = sum(len(w.word) for w in words) / len(words)

    # 5. Saccade Velocity (Proxy: words per minute)
    if reading_time_seconds > 0:
        saccade_velocity_mean = (fixation_count / reading_time_seconds) * 60.0
    else:
        saccade_velocity_mean = 0.0

    # 6. Regression Count (Proxy: immediate repetitions + alignment errors)
    local_repetitions = 0
    for i in range(len(words) - 1):
        if words[i].word.lower() == words[i+1].word.lower():
            local_repetitions += 1

    alignment_errors = 0
    transcript_text = get_transcript_text(words)

    if reference_text and reference_text.strip():
        ref_clean = reference_text.strip().lower()
        # Evaluate word-level distance metrics using jiwer
        try:
            # Fixed from process_words to process to match jiwer v3 API
            metrics = jiwer.process(ref_clean, transcript_text)
            # Insertions and substitutions represent backtracking/self-corrections
            alignment_errors = metrics.insertions + metrics.substitutions
        except Exception:
            # Fallback to token similarity metrics if jiwer string alignment fails
            if fuzz.ratio(ref_clean, transcript_text) < 70:
                alignment_errors = 2  # default penalty proxy

    regression_count = float(local_repetitions + alignment_errors)

    # 7. Blink Rate (Proxy: filler counts + heavy trailing pauses normalized by time)
    filler_count = sum(1 for w in words if w.word.lower() in FILLER_WORDS)
    heavy_pauses = sum(1 for p in pauses if p >= HEAVY_PAUSE_THRESHOLD_SEC)
    
    total_hesitations = filler_count + heavy_pauses
    if reading_time_seconds > 0:
        blink_rate = float(total_hesitations / reading_time_seconds)
    else:
        blink_rate = 0.0

    return {
        "fixation_duration_mean": float(fixation_duration_mean),
        "fixation_duration_std": float(fixation_duration_std),
        "fixation_count": float(fixation_count),
        "saccade_length_mean": float(saccade_length_mean),
        "saccade_velocity_mean": float(saccade_velocity_mean),
        "regression_count": float(regression_count),
        "reading_time_seconds": float(reading_time_seconds),
        "blink_rate": float(blink_rate),
    }