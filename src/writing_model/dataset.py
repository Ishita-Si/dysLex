"""Dataset abstraction for handwriting image metadata."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple


@dataclass(frozen=True)
class HandwritingImageRecord:
    """Metadata for one handwriting image."""

    # Labels are inferred from folders during Phase 1 and audited in reports.
    path: Path
    label: Optional[str]
    resolution: Optional[Tuple[int, int]]
    channels: Optional[int]
    is_corrupted: bool
