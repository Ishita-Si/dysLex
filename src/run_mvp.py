"""One-command DysLexAI MVP data generation and training runner."""

from __future__ import annotations

from src.mvp.manual_tests import ManualTestDataGenerator
from src.mvp.training import MVPTrainer
from src.utils.logger import get_logger

LOGGER = get_logger(__name__)


def main() -> None:
    """Train all MVP modality models and write reports."""

    LOGGER.info("Starting DysLexAI MVP training pipeline.")
    MVPTrainer().run()
    ManualTestDataGenerator().generate_all()
    LOGGER.info("DysLexAI MVP training pipeline completed.")


if __name__ == "__main__":
    main()
