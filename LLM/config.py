import os
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
ENV_FILE = PROJECT_DIR / ".env"


def load_settings() -> None:
    """Load local settings without placing credentials in source code."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.strip().partition("=")
        if separator and key and value and not os.environ.get(key):
            os.environ[key] = value


def require_settings(*names: str) -> None:
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Add these values to {ENV_FILE.name}: {', '.join(missing)}")
