"""Generate compact realistic MVP datasets for all DysLexAI modalities."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd

from src.utils.config import CONFIG
from src.utils.file_utils import ensure_directories
from src.utils.logger import get_logger

LOGGER = get_logger(__name__)


@dataclass(frozen=True)
class MVPDataPaths:
    """Paths for generated MVP feature tables."""

    reading: Path
    writing: Path
    typing: Path
    fusion: Path


class SyntheticMVPDataGenerator:
    """Create small, realistic, labeled feature datasets for MVP training."""

    def __init__(self, samples_per_modality: int = 240) -> None:
        """Initialize generator settings."""

        self.samples_per_modality = samples_per_modality
        self.rng = np.random.default_rng(CONFIG.random_seed)
        self.output_dir = CONFIG.datasets_dir / "processed"

    def generate_all(self) -> MVPDataPaths:
        """Generate reading, writing, typing, and fusion MVP datasets."""

        ensure_directories([self.output_dir])
        reading = self.generate_reading()
        writing = self.generate_writing()
        typing = self.generate_typing()
        fusion = self.generate_fusion(reading, writing, typing)

        paths = MVPDataPaths(
            reading=self.output_dir / "mvp_reading_features.csv",
            writing=self.output_dir / "mvp_writing_features.csv",
            typing=self.output_dir / "mvp_typing_features.csv",
            fusion=self.output_dir / "mvp_multimodal_features.csv",
        )
        reading.to_csv(paths.reading, index=False)
        writing.to_csv(paths.writing, index=False)
        typing.to_csv(paths.typing, index=False)
        fusion.to_csv(paths.fusion, index=False)
        LOGGER.info("Generated MVP datasets in %s", self.output_dir)
        return paths

    def generate_reading(self) -> pd.DataFrame:
        """Generate reading features with real ETDD70 labels as anchors."""

        label_frame = self._load_reading_labels()
        real_rows = min(len(label_frame), int(self.samples_per_modality * 0.40))
        real = label_frame.sample(
            n=real_rows,
            random_state=CONFIG.random_seed,
            replace=False,
        ).reset_index(drop=True)
        real_features = self._reading_features_for_labels(real["label_encoded"].to_numpy())
        real_features["subject_id"] = real["subject_id"].to_numpy()
        real_features["label"] = real["label_encoded"].to_numpy()
        real_features["data_source"] = "real_anchor"

        synthetic_rows = self.samples_per_modality - len(real_features)
        synthetic_labels = self._balanced_labels(synthetic_rows)
        synthetic = self._reading_features_for_labels(synthetic_labels)
        synthetic["subject_id"] = np.arange(10_000, 10_000 + synthetic_rows)
        synthetic["label"] = synthetic_labels
        synthetic["data_source"] = "synthetic"
        return pd.concat([real_features, synthetic], ignore_index=True)

    def generate_writing(self) -> pd.DataFrame:
        """Generate realistic handwriting feature rows for MVP training."""

        labels = self._balanced_labels(self.samples_per_modality)
        frame = pd.DataFrame(
            {
                "stroke_irregularity": self._normal_by_label(labels, 0.38, 0.58, 0.15),
                "letter_spacing_variance": self._normal_by_label(labels, 0.32, 0.53, 0.14),
                "baseline_drift": self._normal_by_label(labels, 0.28, 0.48, 0.14),
                "letter_reversal_count": self._poisson_by_label(labels, 0.8, 1.8),
                "word_alignment_error": self._normal_by_label(labels, 0.24, 0.40, 0.13),
                "pressure_variability": self._normal_by_label(labels, 0.34, 0.51, 0.14),
                "label": labels,
                "data_source": "synthetic",
            }
        )
        return self._clip_numeric(frame)

    def generate_typing(self) -> pd.DataFrame:
        """Generate realistic typing behavior feature rows for MVP training."""

        labels = self._balanced_labels(self.samples_per_modality)
        frame = pd.DataFrame(
            {
                "mean_hold_time_ms": self._normal_by_label(labels, 98, 122, 22),
                "mean_flight_time_ms": self._normal_by_label(labels, 130, 165, 34),
                "pause_rate": self._normal_by_label(labels, 0.13, 0.23, 0.07),
                "backspace_rate": self._normal_by_label(labels, 0.07, 0.13, 0.05),
                "typing_speed_wpm": self._normal_by_label(labels, 40, 31, 8),
                "latency_variability_ms": self._normal_by_label(labels, 48, 72, 22),
                "label": labels,
                "data_source": "synthetic",
            }
        )
        return self._clip_numeric(frame)

    def generate_fusion(
        self, reading: pd.DataFrame, writing: pd.DataFrame, typing: pd.DataFrame
    ) -> pd.DataFrame:
        """Create a subject-aligned fusion dataset from modality features."""

        length = min(len(reading), len(writing), len(typing))
        rows: List[Dict[str, float | int | str]] = []
        for index in range(length):
            label = int(
                round(
                    np.mean(
                        [
                            reading.loc[index, "label"],
                            writing.loc[index, "label"],
                            typing.loc[index, "label"],
                        ]
                    )
                )
            )
            rows.append(
                {
                    "participant_id": index + 1,
                    "reading_fixation_duration_mean": reading.loc[
                        index, "fixation_duration_mean"
                    ],
                    "reading_regression_count": reading.loc[index, "regression_count"],
                    "writing_stroke_irregularity": writing.loc[
                        index, "stroke_irregularity"
                    ],
                    "writing_letter_reversal_count": writing.loc[
                        index, "letter_reversal_count"
                    ],
                    "typing_pause_rate": typing.loc[index, "pause_rate"],
                    "typing_backspace_rate": typing.loc[index, "backspace_rate"],
                    "label": label,
                    "data_source": "mvp_mixed",
                }
            )
        return pd.DataFrame(rows)

    def _load_reading_labels(self) -> pd.DataFrame:
        """Load ETDD70 label anchors from the user's dataset folder."""

        candidates = sorted(CONFIG.datasets_dir.glob("reading/**/dyslexia_class_label.csv"))
        if not candidates:
            labels = self._balanced_labels(70)
            return pd.DataFrame(
                {
                    "subject_id": np.arange(1_000, 1_000 + len(labels)),
                    "label_encoded": labels,
                }
            )

        frame = pd.read_csv(candidates[0])
        subject_col = self._first_existing(frame, ["subject_id", "Subject", "subject"])
        label_col = self._first_existing(frame, ["label", "class", "class_id", "diagnosis"])
        if subject_col is None:
            frame["subject_id"] = np.arange(1_000, 1_000 + len(frame))
            subject_col = "subject_id"
        if label_col is None:
            raise ValueError("Could not find a label column in dyslexia_class_label.csv")

        encoded = frame[label_col].map(self._encode_label)
        return pd.DataFrame(
            {
                "subject_id": frame[subject_col].astype(int),
                "label_encoded": encoded.astype(int),
            }
        )

    def _reading_features_for_labels(self, labels: np.ndarray) -> pd.DataFrame:
        """Create reading behavior features conditioned on labels."""

        frame = pd.DataFrame(
            {
                "fixation_duration_mean": self._normal_by_label(labels, 235, 285, 55),
                "fixation_duration_std": self._normal_by_label(labels, 58, 82, 23),
                "fixation_count": self._normal_by_label(labels, 90, 115, 26),
                "saccade_length_mean": self._normal_by_label(labels, 7.3, 5.9, 1.7),
                "saccade_velocity_mean": self._normal_by_label(labels, 31, 26, 7),
                "regression_count": self._poisson_by_label(labels, 6.5, 10.5),
                "reading_time_seconds": self._normal_by_label(labels, 74, 96, 24),
                "blink_rate": self._normal_by_label(labels, 0.14, 0.18, 0.06),
            }
        )
        return self._clip_numeric(frame)

    def _balanced_labels(self, rows: int) -> np.ndarray:
        """Return shuffled balanced binary labels."""

        labels = np.array([0, 1] * ((rows + 1) // 2), dtype=int)[:rows]
        self.rng.shuffle(labels)
        return labels

    def _normal_by_label(
        self,
        labels: np.ndarray,
        control_mean: float,
        dyslexic_mean: float,
        std: float,
    ) -> np.ndarray:
        """Draw normally distributed values with class-specific means."""

        means = np.where(labels == 1, dyslexic_mean, control_mean)
        return self.rng.normal(means, std)

    def _poisson_by_label(
        self, labels: np.ndarray, control_rate: float, dyslexic_rate: float
    ) -> np.ndarray:
        """Draw Poisson counts with class-specific rates."""

        rates = np.where(labels == 1, dyslexic_rate, control_rate)
        return self.rng.poisson(rates)

    @staticmethod
    def _clip_numeric(frame: pd.DataFrame) -> pd.DataFrame:
        """Clip numeric feature values to valid non-negative ranges."""

        numeric_columns = frame.select_dtypes(include="number").columns
        feature_columns = [column for column in numeric_columns if column != "label"]
        frame[feature_columns] = frame[feature_columns].clip(lower=0)
        return frame

    @staticmethod
    def _first_existing(frame: pd.DataFrame, candidates: List[str]) -> str | None:
        """Return the first available column from candidates."""

        lower_map = {column.lower(): column for column in frame.columns}
        for candidate in candidates:
            if candidate.lower() in lower_map:
                return lower_map[candidate.lower()]
        return None

    @staticmethod
    def _encode_label(value: object) -> int:
        """Map common label forms to Control=0 and Dyslexic=1."""

        text = str(value).strip().lower()
        if text in {"1", "dyslexic", "dyslexia", "at_risk", "risk"}:
            return 1
        return 0
