"""Detect first Zoho Workplace sign-ins and release pending invitations."""

from datetime import datetime, timezone
import os

from workspace_service import find_work_account
from config import require_settings


def password_was_changed(work_email: str, created_at: str) -> bool:
    """A one-time Zoho password can only be cleared during the user's first sign-in."""
    require_settings("ZOHO_ORGANIZATION_ID")
    data = find_work_account(os.environ["ZOHO_ORGANIZATION_ID"], work_email)
    if data is None:
        return False
    last_login = data.get("lastLogin", -1)
    if not isinstance(last_login, (int, float)) or last_login < 0:
        return False
    created_timestamp = datetime.fromisoformat(created_at).astimezone(timezone.utc).timestamp() * 1000
    return last_login >= created_timestamp
