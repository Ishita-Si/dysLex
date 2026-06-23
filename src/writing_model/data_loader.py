"""Data loading utilities for handwriting image datasets."""

from __future__ import annotations

from pathlib import Path
from typing import List

import cv2

from src.utils.config import CONFIG
from src.utils.file_utils import files_with_extensions
from src.utils.logger import get_logger
from src.writing_model.dataset import HandwritingImageRecord

LOGGER = get_logger(__name__)


class WritingDataLoader:
    """Discover handwriting images and collect image metadata."""

    def __init__(self, dataset_path: Path | None = None) -> None:
        """Initialize the loader."""

        self.dataset_path = dataset_path or CONFIG.dataset_configs()["writing"].path

    def discover_files(self) -> List[Path]:
        """Return supported handwriting image files."""

        image_extensions = [".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"]
        return files_with_extensions(self.dataset_path, image_extensions)

    def load_metadata(self) -> List[HandwritingImageRecord]:
        """Read image headers and return metadata records."""

        records: List[HandwritingImageRecord] = []
        for path in self.discover_files():
            # Class folders are the most common layout for image datasets.
            label = path.parent.name if path.parent != self.dataset_path else None
            image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
            if image is None:
                LOGGER.warning("Corrupted or unreadable image: %s", path)
                records.append(HandwritingImageRecord(path, label, None, None, True))
                continue

            height, width = image.shape[:2]
            channels = 1 if len(image.shape) == 2 else image.shape[2]
            records.append(
                HandwritingImageRecord(path, label, (width, height), channels, False)
            )
        return records
