"""Preprocessing helpers for future reading-behavior model development."""

from __future__ import annotations

from typing import List

import pandas as pd


class ReadingPreprocessor:
    """Prepare eye-tracking tables for analysis without training models."""

    def numeric_feature_names(self, frame: pd.DataFrame) -> List[str]:
        """Return names of numeric feature columns."""

        # Numeric columns are the safest candidates for Phase 1 statistics.
        return frame.select_dtypes(include="number").columns.tolist()

    def missing_value_summary(self, frame: pd.DataFrame) -> pd.Series:
        """Return missing-value counts by column."""

        return frame.isna().sum().sort_values(ascending=False)
