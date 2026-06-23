"""Central configuration for DysLexAI Phase 1 workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List


@dataclass(frozen=True)
class DatasetConfig:
    """Configuration describing one dataset family."""

    name: str
    key: str
    purpose: str
    source: str
    path: Path
    expected_extensions: List[str]
    label_candidates: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class AppConfig:
    """Repository-wide configuration values."""

    project_name: str = "DysLexAI"
    random_seed: int = 42
    root_dir: Path = Path(__file__).resolve().parents[2]
    log_level: str = "INFO"

    @property
    def datasets_dir(self) -> Path:
        """Return the root dataset directory."""

        return self.root_dir / "datasets"

    @property
    def reports_dir(self) -> Path:
        """Return the report output directory."""

        return self.root_dir / "reports"

    @property
    def figures_dir(self) -> Path:
        """Return the figure output directory."""

        return self.reports_dir / "figures"

    @property
    def models_dir(self) -> Path:
        """Return the reserved model artifact directory."""

        return self.root_dir / "models"

    @property
    def logs_dir(self) -> Path:
        """Return the logging output directory."""

        return self.root_dir / "logs"

    @property
    def log_file(self) -> Path:
        """Return the default application log file path."""

        return self.logs_dir / "dyslexai_phase1.log"

    def dataset_configs(self) -> Dict[str, DatasetConfig]:
        """Return dataset configuration objects keyed by modality."""

        # Keeping dataset metadata centralized prevents path drift across scripts.
        return {
            "reading": DatasetConfig(
                name="ETDD70 Eye Tracking Dataset",
                key="reading",
                purpose="Reading Behavior Analysis",
                source="Place ETDD70 files under datasets/reading/",
                path=self.datasets_dir / "reading",
                expected_extensions=[
                    ".csv",
                    ".tsv",
                    ".xlsx",
                    ".xls",
                    ".json",
                    ".zip",
                ],
                label_candidates=["label", "class", "group", "diagnosis", "target"],
            ),
            "writing": DatasetConfig(
                name="Synthetic Dyslexia Handwriting Dataset",
                key="writing",
                purpose="Handwriting Analysis",
                source="Place handwriting image folders under datasets/writing/",
                path=self.datasets_dir / "writing",
                expected_extensions=[
                    ".png",
                    ".jpg",
                    ".jpeg",
                    ".bmp",
                    ".tif",
                    ".tiff",
                    ".zip",
                    ".rar",
                ],
                label_candidates=["label", "class", "group", "diagnosis", "target"],
            ),
            "typing": DatasetConfig(
                name="Typing Fluencies of Dyslexia Students and Peers",
                key="typing",
                purpose="Typing Behavior Analysis",
                source="Place keystroke logs under datasets/typing/",
                path=self.datasets_dir / "typing",
                expected_extensions=[".csv", ".tsv", ".xlsx", ".xls", ".json"],
                label_candidates=["label", "class", "group", "diagnosis", "target"],
            ),
        }


CONFIG = AppConfig()
