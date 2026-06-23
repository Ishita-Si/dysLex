"""Data loading utilities for reading behavior datasets."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import List
from zipfile import ZipFile

import pandas as pd

from src.utils.config import CONFIG
from src.utils.file_utils import files_with_extensions
from src.utils.logger import get_logger

LOGGER = get_logger(__name__)
_FRAME_CACHE: dict[str, pd.DataFrame] = {}


class ReadingDataLoader:
    """Load tabular eye-tracking files into pandas data frames."""

    def __init__(self, dataset_path: Path | None = None) -> None:
        """Initialize the loader."""

        self.dataset_path = dataset_path or CONFIG.dataset_configs()["reading"].path

    def discover_files(self) -> List[Path]:
        """Return supported reading dataset files."""

        config = CONFIG.dataset_configs()["reading"]
        files = files_with_extensions(self.dataset_path, config.expected_extensions)
        return [
            path
            for path in files
            if not (path.suffix.lower() == ".zip" and (path.parent / path.stem).is_dir())
        ]

    def load(self) -> pd.DataFrame:
        """Load all supported files and concatenate them.

        Returns:
            A data frame containing all readable records.
        """

        cache_key = str(self.dataset_path.resolve())
        if cache_key in _FRAME_CACHE:
            return _FRAME_CACHE[cache_key]

        frames: List[pd.DataFrame] = []
        for path in self.discover_files():
            try:
                # Preserve provenance so later reports can trace records to files.
                frame = self._read_file(path)
                frame["source_file"] = str(path.relative_to(CONFIG.root_dir))
                frames.append(frame)
            except Exception as exc:
                LOGGER.warning("Failed to load reading file %s: %s", path, exc)
        combined = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
        _FRAME_CACHE[cache_key] = combined
        return combined

    @staticmethod
    def _read_file(path: Path) -> pd.DataFrame:
        """Read a supported tabular file into a data frame."""

        suffix = path.suffix.lower()
        if suffix == ".csv":
            return pd.read_csv(path)
        if suffix == ".tsv":
            return pd.read_csv(path, sep="\t")
        if suffix in {".xlsx", ".xls"}:
            return pd.read_excel(path)
        if suffix == ".json":
            return pd.read_json(path)
        if suffix == ".zip":
            return ReadingDataLoader._read_zip_file(path)
        raise ValueError(f"Unsupported reading file extension: {suffix}")

    @staticmethod
    def _read_zip_file(path: Path) -> pd.DataFrame:
        """Read supported tabular files stored inside a ZIP archive."""

        frames: List[pd.DataFrame] = []
        with ZipFile(path) as archive:
            for member in archive.namelist():
                member_path = Path(member)
                if ReadingDataLoader._skip_archive_member(member):
                    continue
                try:
                    with archive.open(member) as handle:
                        data = handle.read()
                    frame = ReadingDataLoader._read_archive_bytes(
                        data,
                        member_path.suffix.lower(),
                    )
                    frame["archive_member"] = member
                    frames.append(frame)
                except Exception as exc:
                    LOGGER.warning(
                        "Failed to load %s inside %s: %s",
                        member,
                        path.name,
                        exc,
                    )
        return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

    @staticmethod
    def _read_archive_bytes(data: bytes, suffix: str) -> pd.DataFrame:
        """Read one archive member from bytes into a data frame."""

        buffer = BytesIO(data)
        if suffix == ".csv":
            return pd.read_csv(buffer)
        if suffix == ".tsv":
            return pd.read_csv(buffer, sep="\t")
        if suffix in {".xlsx", ".xls"}:
            return pd.read_excel(buffer)
        if suffix == ".json":
            return pd.read_json(buffer)
        raise ValueError(f"Unsupported archive member extension: {suffix}")

    @staticmethod
    def _skip_archive_member(member: str) -> bool:
        """Return whether a ZIP member should be ignored."""

        member_path = Path(member)
        suffix = member_path.suffix.lower()
        if member.endswith("/") or member.startswith("__MACOSX/"):
            return True
        if member_path.name.startswith("._"):
            return True
        return suffix not in {".csv", ".tsv", ".xlsx", ".xls", ".json"}
