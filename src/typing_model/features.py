"""Typing feature helpers reserved for Phase 2 model development."""

from __future__ import annotations

from typing import List

import pandas as pd


class TypingFeatureInspector:
    """Inspect typing columns without creating model-training features."""

    def timestamp_columns(self, frame: pd.DataFrame) -> List[str]:
        """Return likely timestamp columns based on column names."""

        # Phase 1 uses conservative name matching before schema finalization.
        return [
            column
            for column in frame.columns
            if any(token in column.lower() for token in ["time", "timestamp", "date"])
        ]

    def event_columns(self, frame: pd.DataFrame) -> List[str]:
        """Return likely event-type columns based on column names."""

        return [
            column
            for column in frame.columns
            if any(token in column.lower() for token in ["event", "key", "action"])
        ]
