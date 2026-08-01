import json

from config import PROJECT_DIR


PENDING_FILE = PROJECT_DIR / "pending_onboarding.json"


def load_pending() -> dict[str, dict]:
    if not PENDING_FILE.exists():
        return {}
    return json.loads(PENDING_FILE.read_text(encoding="utf-8"))


def save_pending(pending: dict[str, dict]) -> None:
    temporary_file = PENDING_FILE.with_suffix(".tmp")
    temporary_file.write_text(json.dumps(pending, indent=2), encoding="utf-8")
    temporary_file.replace(PENDING_FILE)
