"""Google Workspace user provisioning for employee onboarding."""

import os
import re
import secrets
import string

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config import require_settings, resolve_file_path


DIRECTORY_SCOPES = ("https://www.googleapis.com/auth/admin.directory.user",)
LOCAL_PART = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")


def _directory_client():
    require_settings("GOOGLE_ADMIN_EMAIL", "GOOGLE_SERVICE_ACCOUNT_FILE")
    sa_file = resolve_file_path(os.environ["GOOGLE_SERVICE_ACCOUNT_FILE"])
    credentials = service_account.Credentials.from_service_account_file(
        sa_file, scopes=DIRECTORY_SCOPES
    ).with_subject(os.environ["GOOGLE_ADMIN_EMAIL"])
    return build("admin", "directory_v1", credentials=credentials, cache_discovery=False)


def make_local_part(first_name: str) -> str:
    """Return the approved firstname local part for a work address."""
    first = re.sub(r"[^a-z0-9]", "", first_name.lower())
    if not first or not LOCAL_PART.fullmatch(first):
        raise ValueError("First name must produce a valid work-email address.")
    return first


def generate_temporary_password() -> str:
    """Generate a high-entropy password accepted by common Workspace policies."""
    alphabet = string.ascii_letters + string.digits + "!@#%_-"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(24))
        if any(char.islower() for char in password) and any(char.isupper() for char in password) and any(
            char.isdigit() for char in password
        ):
            return password


def create_work_account(first_name: str, last_name: str, role: str) -> tuple[str, str]:
    """Create a user that must change a generated password on first sign-in."""
    require_settings("GOOGLE_WORKSPACE_DOMAIN")
    local_part = make_local_part(first_name)
    work_email = f"{local_part}@{os.environ['GOOGLE_WORKSPACE_DOMAIN'].lower()}"
    directory = _directory_client()

    try:
        directory.users().get(userKey=work_email).execute()
    except HttpError as error:
        if error.resp.status != 404:
            raise RuntimeError(f"Could not check whether {work_email} exists.") from error
    else:
        raise RuntimeError(f"{work_email} already exists; refusing to reset its password.")

    temporary_password = generate_temporary_password()
    try:
        directory.users().insert(
            body={
                "primaryEmail": work_email,
                "name": {"givenName": first_name, "familyName": last_name},
                "password": temporary_password,
                "changePasswordAtNextLogin": True,
            }
        ).execute()
    except HttpError as error:
        raise RuntimeError(f"Could not create {work_email} in Google Workspace.") from error
    return work_email, temporary_password
