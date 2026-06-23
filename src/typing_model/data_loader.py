"""Data loading utilities for typing fluency datasets."""

from __future__ import annotations

from pathlib import Path
from typing import List

import pandas as pd

from src.utils.config import CONFIG
from src.utils.file_utils import files_with_extensions
from src.utils.logger import get_logger

LOGGER = get_logger(__name__)
_FRAME_CACHE: dict[str, pd.DataFrame] = {}


class TypingDataLoader:
    """Load tabular keystroke and typing-session records."""

    def __init__(self, dataset_path: Path | None = None) -> None:
        """Initialize the loader."""

        self.dataset_path = dataset_path or CONFIG.dataset_configs()["typing"].path

    def discover_files(self) -> List[Path]:
        """Return supported typing dataset files."""

        config = CONFIG.dataset_configs()["typing"]
        return files_with_extensions(self.dataset_path, config.expected_extensions)

    def load(self) -> pd.DataFrame:
        """Load all supported typing files into one data frame."""

        cache_key = str(self.dataset_path.resolve())
        if cache_key in _FRAME_CACHE:
            return _FRAME_CACHE[cache_key]

        frames: List[pd.DataFrame] = []
        for path in self.discover_files():
            try:
                # File provenance is useful when inconsistent logs are discovered.
                frame = self._read_file(path)
                frame["source_file"] = str(path.relative_to(CONFIG.root_dir))
                frames.append(frame)
            except Exception as exc:
                LOGGER.warning("Failed to load typing file %s: %s", path, exc)
        combined = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
        _FRAME_CACHE[cache_key] = combined
        return combined

    @staticmethod
    def _read_file(path: Path) -> pd.DataFrame:
        """Read a supported typing data file into a data frame."""

        suffix = path.suffix.lower()
        if suffix == ".csv":
            return pd.read_csv(path)
        if suffix == ".tsv":
            return pd.read_csv(path, sep="\t")
        if suffix in {".xlsx", ".xls"}:
            return pd.read_excel(path)
        if suffix == ".json":
            return pd.read_json(path)
        raise ValueError(f"Unsupported typing file extension: {suffix}")
