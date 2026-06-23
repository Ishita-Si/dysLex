"""Reusable file-system helpers for dataset discovery and reporting."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Iterable, List, Sequence


def ensure_directories(paths: Iterable[Path]) -> None:
    """Create directories if they do not already exist."""

    for path in paths:
        path.mkdir(parents=True, exist_ok=True)


def list_files(root: Path) -> List[Path]:
    """Recursively list files under a directory.

    Args:
        root: Directory to scan.

    Returns:
        Sorted list of files. Returns an empty list when the directory is absent.
    """

    if not root.exists():
        return []
    # Placeholder files preserve the scaffold but should not count as data.
    ignored_names = {".gitkeep", ".gitignore"}
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.name not in ignored_names
    )


def files_with_extensions(root: Path, extensions: Sequence[str]) -> List[Path]:
    """Return files whose suffix is included in ``extensions``."""

    normalized = {extension.lower() for extension in extensions}
    return [path for path in list_files(root) if path.suffix.lower() in normalized]


def hash_file(path: Path, chunk_size: int = 8192) -> str:
    """Return a SHA-256 hash for a file."""

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_empty_file(path: Path) -> bool:
    """Return whether a file has zero bytes."""

    return path.stat().st_size == 0


def write_text(path: Path, content: str) -> None:
    """Write UTF-8 text after ensuring the parent directory exists."""

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
