"""Command-line entry point for DysLexAI Phase 1."""

from __future__ import annotations

from pathlib import Path

from src.eda import EDAAnalyzer
from src.reporting import ReportGenerator
from src.utils.config import CONFIG
from src.utils.file_utils import ensure_directories
from src.utils.logger import get_logger
from src.validation import DatasetValidator

LOGGER = get_logger(__name__)


class PhaseOnePipeline:
    """Run dataset validation, EDA, and documentation generation."""

    def __init__(self) -> None:
        """Initialize the Phase 1 pipeline."""

        self.validator = DatasetValidator()
        self.eda_analyzer = EDAAnalyzer()

    def run(self) -> None:
        """Execute the complete Phase 1 workflow."""

        self._prepare_directories()
        LOGGER.info("Starting DysLexAI Phase 1 pipeline.")
        # Validation is run before EDA so report warnings reflect raw data state.
        validation_results = self.validator.validate_all()
        validation_path = self.validator.save_report(validation_results)
        eda_results = self.eda_analyzer.run_all()
        report_paths = ReportGenerator(validation_results, eda_results).generate_all()
        LOGGER.info("Validation report: %s", validation_path)
        for path in report_paths:
            LOGGER.info("Generated report: %s", path)
        LOGGER.info("DysLexAI Phase 1 pipeline completed.")

    @staticmethod
    def _prepare_directories() -> None:
        """Ensure required repository directories exist."""

        dataset_dirs = [config.path for config in CONFIG.dataset_configs().values()]
        figure_dirs = [
            CONFIG.figures_dir / "reading",
            CONFIG.figures_dir / "writing",
            CONFIG.figures_dir / "typing",
        ]
        other_dirs = [
            CONFIG.reports_dir,
            CONFIG.models_dir,
            CONFIG.root_dir / "notebooks",
            CONFIG.root_dir / "frontend",
            CONFIG.logs_dir,
        ]
        ensure_directories([*dataset_dirs, *figure_dirs, *other_dirs])


def main() -> None:
    """Run the Phase 1 command-line workflow."""

    PhaseOnePipeline().run()


if __name__ == "__main__":
    main()
