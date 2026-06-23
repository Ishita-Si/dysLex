"""Markdown report generation for DysLexAI Phase 1."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Iterable, List

from src.eda import EDAResult
from src.utils.config import CONFIG
from src.utils.file_utils import write_text
from src.utils.logger import get_logger
from src.validation import DatasetValidationResult

LOGGER = get_logger(__name__)


class ReportGenerator:
    """Generate research-grade markdown reports from validation and EDA."""

    def __init__(
        self,
        validation_results: Dict[str, DatasetValidationResult],
        eda_results: Dict[str, EDAResult],
    ) -> None:
        """Initialize report generator inputs."""

        self.validation_results = validation_results
        self.eda_results = eda_results
        self.dataset_configs = CONFIG.dataset_configs()

    def generate_all(self) -> List[Path]:
        """Generate every Phase 1 markdown report."""

        return [
            self.generate_dataset_overview(),
            self.generate_research_journal(),
        ]

    def generate_dataset_overview(self) -> Path:
        """Create the dataset overview report."""

        path = CONFIG.reports_dir / "dataset_overview.md"
        lines = [
            "# DysLexAI Dataset Overview",
            "",
            "DysLexAI is a multimodal dyslexia screening prototype. Phase 1 "
            "focuses on dataset ingestion, validation, exploratory analysis, "
            "and documentation. No machine learning models are trained in this "
            "phase.",
            "",
            "## Dataset Summary",
            "",
            "| Dataset | Purpose | Samples | Classes | Missing Values |",
            "| --- | --- | ---: | ---: | ---: |",
        ]

        # The summary table is intentionally compact for quick project review.
        for key, dataset_config in self.dataset_configs.items():
            eda = self.eda_results[key]
            missing_total = sum(eda.missing_values.values())
            lines.append(
                f"| {dataset_config.name} | {dataset_config.purpose} | "
                f"{eda.sample_count} | {eda.class_count} | {missing_total} |"
            )

        for key, dataset_config in self.dataset_configs.items():
            # Each modality receives the same sections for research consistency.
            eda = self.eda_results[key]
            validation = self.validation_results[key]
            lines.extend(
                [
                    "",
                    f"## {dataset_config.name}",
                    "",
                    f"**Purpose:** {dataset_config.purpose}",
                    "",
                    f"**Source:** {dataset_config.source}",
                    "",
                    "### Class Distribution",
                    "",
                ]
            )
            lines.extend(self._class_distribution_table(eda.class_distribution))
            lines.extend(
                [
                    "",
                    "### Feature Description",
                    "",
                    self._feature_description(eda.feature_names),
                    "",
                    "### Potential Predictive Features",
                    "",
                    self._predictive_features(key),
                    "",
                    "### Data Quality Observations",
                    "",
                ]
            )
            lines.extend(self._validation_issue_lines(validation))
            lines.extend(["", "### Figures", ""])
            lines.extend(self._figure_links(eda.figures))

            if not eda.summary_statistics.empty:
                lines.extend(["", "### Summary Statistics", ""])
                lines.extend(self._dataframe_to_markdown(eda.summary_statistics))

            lines.extend(["", "### Interpretation", ""])
            lines.append(self._interpretation(key, eda, validation))

        write_text(path, "\n".join(lines) + "\n")
        LOGGER.info("Dataset overview report saved to %s", path)
        return path

    def generate_research_journal(self) -> Path:
        """Create the natural-language research journal."""

        path = CONFIG.reports_dir / "research_journal.md"
        lines = [
            "# DysLexAI Research Journal",
            "",
            "This journal records Phase 1 dataset observations, data-quality "
            "risks, and future engineering ideas for the DysLexAI research "
            "prototype.",
            "",
        ]

        for key, dataset_config in self.dataset_configs.items():
            eda = self.eda_results[key]
            validation = self.validation_results[key]
            lines.extend(
                [
                    f"## {dataset_config.name}",
                    "",
                    f"**Purpose:** {dataset_config.purpose}",
                    "",
                    f"**Source:** {dataset_config.source}",
                    "",
                    "### Observations",
                    "",
                ]
            )
            lines.extend(self._journal_observations(key, eda))
            lines.extend(["", "### Problems Found", ""])
            lines.extend(self._validation_issue_lines(validation))
            lines.extend(["", "### Data Quality Issues", ""])
            lines.extend(self._quality_issue_sentences(validation))
            lines.extend(["", "### Potential Risks", ""])
            lines.extend(self._risk_sentences(key, validation))
            lines.extend(["", "### Cleaning Strategies", ""])
            lines.extend(self._cleaning_strategy_sentences(key))
            lines.extend(["", "### Future Feature Engineering Ideas", ""])
            lines.extend(self._feature_idea_sentences(key))
            lines.append("")

        write_text(path, "\n".join(lines) + "\n")
        LOGGER.info("Research journal saved to %s", path)
        return path

    @staticmethod
    def _class_distribution_table(distribution: Dict[str, int]) -> List[str]:
        """Return a markdown class-distribution table."""

        if not distribution:
            return ["No class labels were detected for this dataset."]
        lines = ["| Class | Count |", "| --- | ---: |"]
        lines.extend(f"| {label} | {count} |" for label, count in distribution.items())
        return lines

    @staticmethod
    def _dataframe_to_markdown(frame: object) -> List[str]:
        """Render a pandas data frame as markdown without optional dependencies."""

        columns = ["feature", *[str(column) for column in frame.columns]]
        lines = [
            "| " + " | ".join(columns) + " |",
            "| " + " | ".join(["---", *["---:" for _ in frame.columns]]) + " |",
        ]
        for index, row in frame.iterrows():
            values = [str(index)]
            for value in row:
                if isinstance(value, float):
                    values.append(f"{value:.4f}")
                else:
                    values.append(str(value))
            lines.append("| " + " | ".join(values) + " |")
        return lines

    @staticmethod
    def _figure_links(figures: Iterable[Path]) -> List[str]:
        """Return markdown image links relative to the reports directory."""

        output: List[str] = []
        for figure in figures:
            relative = figure.relative_to(CONFIG.reports_dir).as_posix()
            output.append(f"![{figure.stem}]({relative})")
        return output or ["No figures were generated for this dataset."]

    @staticmethod
    def _feature_description(feature_names: List[str]) -> str:
        """Return a compact feature description sentence."""

        if not feature_names:
            return "Feature names are unavailable until dataset files are added."
        preview = ", ".join(feature_names[:12])
        suffix = "..." if len(feature_names) > 12 else ""
        return f"Detected fields include: {preview}{suffix}."

    @staticmethod
    def _validation_issue_lines(result: DatasetValidationResult) -> List[str]:
        """Format validation issues as human-readable bullets."""

        if not result.issues:
            return ["- No validation problems were detected."]
        return [f"- {issue.message}" for issue in result.issues]

    @staticmethod
    def _quality_issue_sentences(result: DatasetValidationResult) -> List[str]:
        """Return natural-language data-quality issue descriptions."""

        if not result.issues:
            return ["- The dataset currently passes the configured quality checks."]
        return [
            f"- The {issue.dataset} dataset requires attention because {issue.message.lower()}"
            for issue in result.issues
        ]

    @staticmethod
    def _predictive_features(dataset_key: str) -> str:
        """Return candidate predictive feature families by modality."""

        ideas = {
            "reading": (
                "Fixation duration, saccade amplitude, regressions, gaze path "
                "stability, reading time, and blink-related features may become "
                "predictive indicators."
            ),
            "writing": (
                "Stroke shape, character spacing, slant, baseline drift, symbol "
                "deformation, and texture descriptors may become predictive "
                "image features."
            ),
            "typing": (
                "Key hold time, flight time, pause duration, correction rate, "
                "session duration, and event rhythm may become predictive "
                "behavioral features."
            ),
        }
        return ideas[dataset_key]

    @staticmethod
    def _interpretation(
        dataset_key: str,
        eda: EDAResult,
        validation: DatasetValidationResult,
    ) -> str:
        """Return a short interpretation of the current dataset state."""

        if eda.sample_count == 0:
            return (
                "The dataset has not yet been placed in the repository. The "
                "pipeline is ready to validate and analyze it once files are "
                "added to the configured folder."
            )
        warning_count = len(validation.issues)
        return (
            f"The {dataset_key} dataset contains {eda.sample_count} samples. "
            f"The Phase 1 checks produced {warning_count} warning(s), which "
            "should be reviewed before model development begins."
        )

    @staticmethod
    def _journal_observations(dataset_key: str, eda: EDAResult) -> List[str]:
        """Return natural-language observations for the research journal."""

        if eda.observations:
            return [f"- {observation}" for observation in eda.observations]
        fallback = {
            "reading": (
                "The reading dataset will support analysis of eye movement "
                "patterns that may reveal differences in reading fluency."
            ),
            "writing": (
                "The handwriting dataset will support visual analysis of "
                "letter formation, spacing, and written-symbol consistency."
            ),
            "typing": (
                "The typing dataset may contain significant variation in pause "
                "durations, which may become an informative behavioral feature "
                "during model development."
            ),
        }
        return [f"- {fallback[dataset_key]}"]

    @staticmethod
    def _risk_sentences(
        dataset_key: str, validation: DatasetValidationResult
    ) -> List[str]:
        """Return modality-specific risk statements."""

        common = (
            "Small or imbalanced samples may lead to unstable conclusions if "
            "they are used for later supervised learning."
        )
        risks = {
            "reading": (
                "Eye-tracking features can be sensitive to device calibration, "
                "screen distance, and task protocol differences."
            ),
            "writing": (
                "Handwriting images can encode scanner, camera, or paper "
                "artifacts that are unrelated to dyslexia risk."
            ),
            "typing": (
                "Typing behavior can be affected by keyboard layout, fatigue, "
                "language familiarity, and device latency."
            ),
        }
        return [f"- {risks[dataset_key]}", f"- {common}"]

    @staticmethod
    def _cleaning_strategy_sentences(dataset_key: str) -> List[str]:
        """Return cleaning strategies for one modality."""

        strategies = {
            "reading": [
                "Standardize column names and units before feature extraction.",
                "Remove impossible negative duration values and document every threshold.",
                "Keep participant identifiers separate from model-ready features.",
            ],
            "writing": [
                "Remove unreadable image files and normalize image orientation.",
                "Resize images only after preserving original resolution metadata.",
                "Audit labels derived from folder names before training data is created.",
            ],
            "typing": [
                "Sort typing events by participant, session, and timestamp.",
                "Remove impossible negative latencies after preserving raw records.",
                "Normalize event names across files before aggregating sessions.",
            ],
        }
        return [f"- {sentence}" for sentence in strategies[dataset_key]]

    @staticmethod
    def _feature_idea_sentences(dataset_key: str) -> List[str]:
        """Return future feature-engineering ideas."""

        ideas = {
            "reading": [
                "Compute fixation-duration summaries for each reading passage.",
                "Estimate regression frequency and gaze transition stability.",
                "Create passage-normalized reading time features.",
            ],
            "writing": [
                "Extract connected-component statistics from handwritten symbols.",
                "Measure spacing regularity and baseline drift across text lines.",
                "Compare texture descriptors across dyslexic and non-dyslexic classes.",
            ],
            "typing": [
                "Aggregate key hold times and key flight times by session.",
                "Measure long-pause frequency and correction behavior.",
                "Create participant-level rhythm features across repeated sessions.",
            ],
        }
        return [f"- {sentence}" for sentence in ideas[dataset_key]]
