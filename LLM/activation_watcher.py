"""Detect first password changes and release pending onboarding invitations."""

import os
from datetime import datetime, timezone

from google.oauth2 import service_account
from googleapiclient.discovery import build

from config import require_settings


REPORTS_SCOPE = "https://www.googleapis.com/auth/admin.reports.audit.readonly"


def password_was_changed(work_email: str, created_at: str) -> bool:
    require_settings("GOOGLE_ADMIN_EMAIL", "GOOGLE_SERVICE_ACCOUNT_FILE")
    credentials = service_account.Credentials.from_service_account_file(
        os.environ["GOOGLE_SERVICE_ACCOUNT_FILE"],
        scopes=[REPORTS_SCOPE, "https://www.googleapis.com/auth/admin.directory.user"],
    ).with_subject(os.environ["GOOGLE_ADMIN_EMAIL"])
    directory = build("admin", "directory_v1", credentials=credentials, cache_discovery=False)
    user = directory.users().get(userKey=work_email, projection="basic").execute()
    if not user.get("changePasswordAtNextLogin", False):
        return True
    reports = build("admin", "reports_v1", credentials=credentials, cache_discovery=False)
    start_time = datetime.fromisoformat(created_at).astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    result = reports.activities().list(
        userKey=work_email, applicationName="login", eventName="password_edit", startTime=start_time
    ).execute()
    return bool(result.get("items"))
