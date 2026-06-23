"""Exploratory data analysis routines for DysLexAI Phase 1."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from src.reading_model.data_loader import ReadingDataLoader
from src.typing_model.data_loader import TypingDataLoader
from src.utils.config import CONFIG
from src.utils.file_utils import ensure_directories
from src.utils.logger import get_logger
from src.writing_model.data_loader import WritingDataLoader

LOGGER = get_logger(__name__)
sns.set_theme(style="whitegrid")


@dataclass
class EDAResult:
    """Structured summary for one EDA workflow."""

    dataset_key: str
    sample_count: int = 0
    class_count: int = 0
    feature_names: List[str] = field(default_factory=list)
    missing_values: Dict[str, int] = field(default_factory=dict)
    class_distribution: Dict[str, int] = field(default_factory=dict)
    summary_statistics: pd.DataFrame = field(default_factory=pd.DataFrame)
    figures: List[Path] = field(default_factory=list)
    observations: List[str] = field(default_factory=list)


class EDAAnalyzer:
    """Run EDA for reading, writing, and typing datasets."""

    def run_all(self) -> Dict[str, EDAResult]:
        """Run all modality-specific analyses."""

        return {
            "reading": self.analyze_reading(),
            "writing": self.analyze_writing(),
            "typing": self.analyze_typing(),
        }

    def analyze_reading(self) -> EDAResult:
        """Analyze ETDD70 eye-tracking data."""

        frame = ReadingDataLoader().load()
        result = EDAResult(dataset_key="reading")
        output_dir = CONFIG.figures_dir / "reading"
        ensure_directories([output_dir])
        if frame.empty:
            result.observations.append(
                "The reading dataset folder is currently empty, so only placeholder figures were generated."
            )
            result.figures.append(self._placeholder_plot(output_dir / "reading_placeholder.png", "Reading dataset pending"))
            return result

        result.sample_count = len(frame)
        result.feature_names = frame.columns.tolist()
        result.missing_values = {
            column: int(count) for column, count in frame.isna().sum().items()
        }
        label_column = self._find_label_column(frame)
        if label_column:
            result.class_distribution = {
                str(label): int(count)
                for label, count in frame[label_column].value_counts().items()
            }
            result.class_count = len(result.class_distribution)
        numeric_frame = frame.select_dtypes(include="number")
        if not numeric_frame.empty:
            # Summary statistics are limited to numeric fields by design.
            result.summary_statistics = numeric_frame.describe().T[
                ["mean", "50%", "std", "min", "max"]
            ].rename(columns={"50%": "median"})
            result.figures.extend(self._reading_figures(numeric_frame, output_dir))
        result.observations.append(
            f"The reading dataset contains {result.sample_count} samples and {len(result.feature_names)} recorded fields."
        )
        return result

    def analyze_writing(self) -> EDAResult:
        """Analyze handwriting image metadata."""

        records = WritingDataLoader().load_metadata()
        result = EDAResult(dataset_key="writing", sample_count=len(records))
        output_dir = CONFIG.figures_dir / "writing"
        ensure_directories([output_dir])
        if not records:
            result.observations.append(
                "The handwriting dataset folder is currently empty, so only placeholder figures were generated."
            )
            result.figures.append(self._placeholder_plot(output_dir / "writing_placeholder.png", "Writing dataset pending"))
            return result

        labels = [record.label or "unlabeled" for record in records]
        result.class_distribution = dict(pd.Series(labels).value_counts())
        result.class_count = len(result.class_distribution)
        result.feature_names = ["label", "width", "height", "channels", "is_corrupted"]
        result.figures.extend(self._writing_figures(records, output_dir))
        result.observations.append(
            f"The handwriting dataset contains {len(records)} image files across {result.class_count} detected class folders."
        )
        return result

    def analyze_typing(self) -> EDAResult:
        """Analyze typing fluency and keystroke data."""

        frame = TypingDataLoader().load()
        result = EDAResult(dataset_key="typing")
        output_dir = CONFIG.figures_dir / "typing"
        ensure_directories([output_dir])
        if frame.empty:
            result.observations.append(
                "The typing dataset folder is currently empty, so only placeholder figures were generated."
            )
            result.figures.append(self._placeholder_plot(output_dir / "typing_placeholder.png", "Typing dataset pending"))
            return result

        result.sample_count = len(frame)
        result.feature_names = frame.columns.tolist()
        result.missing_values = {
            column: int(count) for column, count in frame.isna().sum().items()
        }
        label_column = self._find_label_column(frame)
        if label_column:
            result.class_distribution = {
                str(label): int(count)
                for label, count in frame[label_column].value_counts().items()
            }
            result.class_count = len(result.class_distribution)
        numeric_frame = frame.select_dtypes(include="number")
        if not numeric_frame.empty:
            result.summary_statistics = numeric_frame.describe().T[
                ["mean", "50%", "std", "min", "max"]
            ].rename(columns={"50%": "median"})
        result.figures.extend(self._typing_figures(frame, output_dir))
        result.observations.append(
            f"The typing dataset contains {result.sample_count} events or session-level rows."
        )
        return result

    def _reading_figures(self, numeric_frame: pd.DataFrame, output_dir: Path) -> List[Path]:
        """Create reading histograms, boxplots, heatmap, and missing matrix."""

        figures: List[Path] = []
        sample_columns = numeric_frame.columns[:8]
        plot_frame = self._sample_frame(numeric_frame[sample_columns], max_rows=50_000)
        hist_path = output_dir / "histograms.png"
        # Limit wide datasets to readable first-pass figures.
        plot_frame.hist(figsize=(12, 8), bins=20)
        plt.tight_layout()
        plt.savefig(hist_path, dpi=150)
        plt.close()
        figures.append(hist_path)

        box_path = output_dir / "boxplots.png"
        plt.figure(figsize=(12, 6))
        sns.boxplot(data=plot_frame, orient="h")
        plt.tight_layout()
        plt.savefig(box_path, dpi=150)
        plt.close()
        figures.append(box_path)

        heatmap_path = output_dir / "correlation_heatmap.png"
        plt.figure(figsize=(10, 8))
        corr_frame = self._sample_frame(numeric_frame, max_rows=100_000)
        sns.heatmap(corr_frame.corr(numeric_only=True), cmap="vlag", center=0)
        plt.tight_layout()
        plt.savefig(heatmap_path, dpi=150)
        plt.close()
        figures.append(heatmap_path)

        missing_path = output_dir / "missing_value_matrix.png"
        plt.figure(figsize=(12, 6))
        missing_frame = self._sample_frame(numeric_frame, max_rows=2_000).iloc[:, :30]
        sns.heatmap(missing_frame.isna(), cbar=False)
        plt.tight_layout()
        plt.savefig(missing_path, dpi=150)
        plt.close()
        figures.append(missing_path)
        return figures

    def _writing_figures(self, records: list, output_dir: Path) -> List[Path]:
        """Create handwriting class, sample, and resolution plots."""

        figures: List[Path] = []
        labels = [record.label or "unlabeled" for record in records]
        class_path = output_dir / "class_distribution.png"
        plt.figure(figsize=(10, 5))
        sns.countplot(x=labels)
        plt.xticks(rotation=30, ha="right")
        plt.tight_layout()
        plt.savefig(class_path, dpi=150)
        plt.close()
        figures.append(class_path)

        resolutions = [
            record.resolution[0] * record.resolution[1]
            for record in records
            if record.resolution is not None
        ]
        resolution_path = output_dir / "resolution_histogram.png"
        plt.figure(figsize=(10, 5))
        sns.histplot(resolutions, bins=20)
        plt.xlabel("Pixels per image")
        plt.tight_layout()
        plt.savefig(resolution_path, dpi=150)
        plt.close()
        figures.append(resolution_path)

        gallery_path = self._placeholder_plot(
            output_dir / "sample_image_gallery.png",
            "Sample gallery is generated after image thumbnails are reviewed",
        )
        figures.append(gallery_path)
        return figures

    def _typing_figures(self, frame: pd.DataFrame, output_dir: Path) -> List[Path]:
        """Create typing event, user, and duration plots."""

        figures: List[Path] = []
        event_column = self._first_matching_column(frame, ["event", "key", "action"])
        user_column = self._first_matching_column(frame, ["user", "participant", "subject"])
        duration_column = self._first_matching_column(frame, ["duration", "elapsed", "latency"])

        event_path = output_dir / "event_frequency.png"
        self._count_plot(frame, event_column, event_path, "Event Frequency")
        figures.append(event_path)

        user_path = output_dir / "user_distribution.png"
        self._count_plot(frame, user_column, user_path, "User Distribution")
        figures.append(user_path)

        duration_path = output_dir / "session_duration_histogram.png"
        if duration_column:
            plt.figure(figsize=(10, 5))
            sns.histplot(pd.to_numeric(frame[duration_column], errors="coerce").dropna(), bins=20)
            plt.tight_layout()
            plt.savefig(duration_path, dpi=150)
            plt.close()
        else:
            self._placeholder_plot(duration_path, "No session duration column detected")
        figures.append(duration_path)
        return figures

    def _count_plot(
        self, frame: pd.DataFrame, column: str | None, path: Path, title: str
    ) -> None:
        """Create a count plot or placeholder when the column is missing."""

        if column is None:
            self._placeholder_plot(path, f"{title}: column not detected")
            return
        plt.figure(figsize=(10, 5))
        order = frame[column].astype(str).value_counts().head(20).index
        sns.countplot(x=frame[column].astype(str), order=order)
        plt.title(title)
        plt.xticks(rotation=30, ha="right")
        plt.tight_layout()
        plt.savefig(path, dpi=150)
        plt.close()

    @staticmethod
    def _placeholder_plot(path: Path, message: str) -> Path:
        """Create a simple placeholder figure for pending datasets."""

        plt.figure(figsize=(8, 4))
        plt.text(0.5, 0.5, message, ha="center", va="center", fontsize=12)
        plt.axis("off")
        plt.tight_layout()
        plt.savefig(path, dpi=150)
        plt.close()
        return path

    @staticmethod
    def _sample_frame(frame: pd.DataFrame, max_rows: int) -> pd.DataFrame:
        """Return a deterministic row sample when a frame is very large."""

        if len(frame) <= max_rows:
            return frame
        return frame.sample(n=max_rows, random_state=CONFIG.random_seed)

    @staticmethod
    def _find_label_column(frame: pd.DataFrame) -> str | None:
        """Return the first likely class label column."""

        for column in frame.columns:
            if column.lower() in {"label", "class", "group", "diagnosis", "target"}:
                return column
        return None

    @staticmethod
    def _first_matching_column(frame: pd.DataFrame, tokens: List[str]) -> str | None:
        """Return the first column containing one of the supplied tokens."""

        for column in frame.columns:
            if any(token in column.lower() for token in tokens):
                return column
        return None
