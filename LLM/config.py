import os
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
ENV_FILE = PROJECT_DIR.parent / ".env"
if not ENV_FILE.exists():
    ENV_FILE = PROJECT_DIR / ".env"


def resolve_file_path(path_str: str) -> str:
    """Resolve file path dynamically (handles relative paths like LLM/service-account.json)."""
    if not path_str:
        return path_str
    p = Path(path_str)
    if p.is_absolute() and p.exists():
        return str(p)
    if p.exists():
        return str(p.resolve())
    root_file = PROJECT_DIR.parent / path_str
    if root_file.exists():
        return str(root_file.resolve())
    llm_file = PROJECT_DIR / p.name
    if llm_file.exists():
        return str(llm_file.resolve())
    return str(p.resolve())


def load_settings() -> None:
    """Load local settings without placing credentials in source code."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if separator and key:
            key = key.strip()
            value = value.strip().strip("'\"")
            if key.endswith("_FILE"):
                value = resolve_file_path(value)
            os.environ[key] = value


def require_settings(*names: str) -> None:
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Add these values to {ENV_FILE.name}: {', '.join(missing)}")
