"""Centralized logging setup for DysLexAI Phase 1 scripts."""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from src.utils.config import CONFIG


def get_logger(name: str) -> logging.Logger:
    """Create or return a configured logger.

    Args:
        name: Logger name, usually ``__name__``.

    Returns:
        A logger with console and rotating file handlers.
    """

    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    CONFIG.logs_dir.mkdir(parents=True, exist_ok=True)
    logger.setLevel(getattr(logging, CONFIG.log_level.upper(), logging.INFO))
    logger.propagate = False

    # One formatter keeps console and file logs comparable during debugging.
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    file_handler = RotatingFileHandler(
        Path(CONFIG.log_file),
        maxBytes=1_000_000,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger
