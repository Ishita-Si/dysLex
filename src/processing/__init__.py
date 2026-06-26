"""
src/processing
==============
Audio processing and feature extraction pipeline for DysLexAI.

Public surface
--------------
extract_reading_features_from_audio(audio_path, reference_text) -> dict

The returned dict satisfies the reading model feature contract:
    fixation_duration_mean, fixation_duration_std, fixation_count,
    saccade_length_mean, saccade_velocity_mean, regression_count,
    reading_time_seconds, blink_rate

This dict can be passed directly to the existing _predict("reading", payload)
without any modification to the MVP prediction pipeline.

Prototype note
--------------
Features are audio-derived proxies for gaze behaviour, not measured
eye-tracking data. This is appropriate for a prototype that has no
eye-tracking hardware. Each proxy is documented in reading_features.py.
"""

from src.processing.pipeline import extract_reading_features_from_audio

__all__ = ["extract_reading_features_from_audio"]