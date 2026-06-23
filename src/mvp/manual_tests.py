"""Create manual test inputs for the DysLexAI MVP API."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import pandas as pd

from src.utils.config import CONFIG
from src.utils.file_utils import ensure_directories
from src.utils.logger import get_logger

LOGGER = get_logger(__name__)


class ManualTestDataGenerator:
    """Generate small human-readable API test datasets."""

    def __init__(self) -> None:
        """Initialize output directory."""

        self.output_dir = CONFIG.datasets_dir / "manual_tests"

    def generate_all(self) -> List[Path]:
        """Generate CSV and JSON payload examples for each MVP endpoint."""

        ensure_directories([self.output_dir])
        generated: List[Path] = []
        for modality, rows in self._examples().items():
            csv_path = self.output_dir / f"{modality}_manual_tests.csv"
            json_path = self.output_dir / f"{modality}_payloads.json"
            pd.DataFrame(rows).to_csv(csv_path, index=False)
            json_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
            generated.extend([csv_path, json_path])
        LOGGER.info("Generated manual API test data in %s", self.output_dir)
        return generated

    @staticmethod
    def _examples() -> Dict[str, List[Dict[str, float | str]]]:
        """Return representative low, moderate, and high risk examples."""

        return {
            "reading": [
                {
                    "case_id": "reading_low_risk",
                    "fixation_duration_mean": 210,
                    "fixation_duration_std": 48,
                    "fixation_count": 78,
                    "saccade_length_mean": 8.2,
                    "saccade_velocity_mean": 35,
                    "regression_count": 4,
                    "reading_time_seconds": 62,
                    "blink_rate": 0.11,
                },
                {
                    "case_id": "reading_moderate_risk",
                    "fixation_duration_mean": 270,
                    "fixation_duration_std": 76,
                    "fixation_count": 108,
                    "saccade_length_mean": 6.2,
                    "saccade_velocity_mean": 27,
                    "regression_count": 9,
                    "reading_time_seconds": 92,
                    "blink_rate": 0.17,
                },
                {
                    "case_id": "reading_high_risk",
                    "fixation_duration_mean": 340,
                    "fixation_duration_std": 118,
                    "fixation_count": 145,
                    "saccade_length_mean": 4.8,
                    "saccade_velocity_mean": 19,
                    "regression_count": 17,
                    "reading_time_seconds": 132,
                    "blink_rate": 0.25,
                },
            ],
            "writing": [
                {
                    "case_id": "writing_low_risk",
                    "stroke_irregularity": 0.22,
                    "letter_spacing_variance": 0.20,
                    "baseline_drift": 0.15,
                    "letter_reversal_count": 0,
                    "word_alignment_error": 0.14,
                    "pressure_variability": 0.24,
                },
                {
                    "case_id": "writing_moderate_risk",
                    "stroke_irregularity": 0.50,
                    "letter_spacing_variance": 0.45,
                    "baseline_drift": 0.42,
                    "letter_reversal_count": 2,
                    "word_alignment_error": 0.36,
                    "pressure_variability": 0.48,
                },
                {
                    "case_id": "writing_high_risk",
                    "stroke_irregularity": 0.78,
                    "letter_spacing_variance": 0.74,
                    "baseline_drift": 0.68,
                    "letter_reversal_count": 5,
                    "word_alignment_error": 0.62,
                    "pressure_variability": 0.72,
                },
            ],
            "typing": [
                {
                    "case_id": "typing_low_risk",
                    "mean_hold_time_ms": 82,
                    "mean_flight_time_ms": 105,
                    "pause_rate": 0.07,
                    "backspace_rate": 0.03,
                    "typing_speed_wpm": 49,
                    "latency_variability_ms": 32,
                },
                {
                    "case_id": "typing_moderate_risk",
                    "mean_hold_time_ms": 118,
                    "mean_flight_time_ms": 158,
                    "pause_rate": 0.20,
                    "backspace_rate": 0.11,
                    "typing_speed_wpm": 33,
                    "latency_variability_ms": 70,
                },
                {
                    "case_id": "typing_high_risk",
                    "mean_hold_time_ms": 152,
                    "mean_flight_time_ms": 230,
                    "pause_rate": 0.36,
                    "backspace_rate": 0.22,
                    "typing_speed_wpm": 21,
                    "latency_variability_ms": 118,
                },
            ],
            "fusion": [
                {
                    "case_id": "fusion_low_risk",
                    "reading_probability": 0.08,
                    "writing_probability": 0.04,
                    "typing_probability": 0.06,
                },
                {
                    "case_id": "fusion_moderate_risk",
                    "reading_probability": 0.58,
                    "writing_probability": 0.42,
                    "typing_probability": 0.51,
                },
                {
                    "case_id": "fusion_high_risk",
                    "reading_probability": 0.92,
                    "writing_probability": 0.88,
                    "typing_probability": 0.95,
                },
            ],
            "full_assessment": [
                {
                    "case_id": "full_low_risk",
                    "reading": {
                        "fixation_duration_mean": 210,
                        "fixation_duration_std": 48,
                        "fixation_count": 78,
                        "saccade_length_mean": 8.2,
                        "saccade_velocity_mean": 35,
                        "regression_count": 4,
                        "reading_time_seconds": 62,
                        "blink_rate": 0.11,
                    },
                    "writing": {
                        "stroke_irregularity": 0.22,
                        "letter_spacing_variance": 0.20,
                        "baseline_drift": 0.15,
                        "letter_reversal_count": 0,
                        "word_alignment_error": 0.14,
                        "pressure_variability": 0.24,
                    },
                    "typing": {
                        "mean_hold_time_ms": 82,
                        "mean_flight_time_ms": 105,
                        "pause_rate": 0.07,
                        "backspace_rate": 0.03,
                        "typing_speed_wpm": 49,
                        "latency_variability_ms": 32,
                    },
                },
                {
                    "case_id": "full_moderate_risk",
                    "reading": {
                        "fixation_duration_mean": 270,
                        "fixation_duration_std": 76,
                        "fixation_count": 108,
                        "saccade_length_mean": 6.2,
                        "saccade_velocity_mean": 27,
                        "regression_count": 9,
                        "reading_time_seconds": 92,
                        "blink_rate": 0.17,
                    },
                    "writing": {
                        "stroke_irregularity": 0.50,
                        "letter_spacing_variance": 0.45,
                        "baseline_drift": 0.42,
                        "letter_reversal_count": 2,
                        "word_alignment_error": 0.36,
                        "pressure_variability": 0.48,
                    },
                    "typing": {
                        "mean_hold_time_ms": 118,
                        "mean_flight_time_ms": 158,
                        "pause_rate": 0.20,
                        "backspace_rate": 0.11,
                        "typing_speed_wpm": 33,
                        "latency_variability_ms": 70,
                    },
                },
                {
                    "case_id": "full_high_risk",
                    "reading": {
                        "fixation_duration_mean": 340,
                        "fixation_duration_std": 118,
                        "fixation_count": 145,
                        "saccade_length_mean": 4.8,
                        "saccade_velocity_mean": 19,
                        "regression_count": 17,
                        "reading_time_seconds": 132,
                        "blink_rate": 0.25,
                    },
                    "writing": {
                        "stroke_irregularity": 0.78,
                        "letter_spacing_variance": 0.74,
                        "baseline_drift": 0.68,
                        "letter_reversal_count": 5,
                        "word_alignment_error": 0.62,
                        "pressure_variability": 0.72,
                    },
                    "typing": {
                        "mean_hold_time_ms": 152,
                        "mean_flight_time_ms": 230,
                        "pause_rate": 0.36,
                        "backspace_rate": 0.22,
                        "typing_speed_wpm": 21,
                        "latency_variability_ms": 118,
                    },
                },
            ],
        }
