"""Zoho Workplace user provisioning for employee onboarding."""

import logging
import os
import re
import secrets
import string
import threading
import time
import json
import tempfile
from pathlib import Path

import requests

from config import require_settings


LOGGER = logging.getLogger(__name__)
LOCAL_PART = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
_TOKEN_LOCK = threading.Lock()
_ACCESS_TOKEN: str | None = None
_ACCESS_TOKEN_EXPIRES_AT = 0.0
_TOKEN_CACHE_FILE = Path(tempfile.gettempdir()) / "kairos_zoho_token_cache.json"


def _mail_api_base() -> str:
    return os.environ.get("ZOHO_MAIL_API_BASE", "https://mail.zoho.com").rstrip("/")


def _access_token() -> str:
    """Exchange the long-lived Zoho refresh token for a Mail API access token, caching to disk to avoid rate limits."""
    global _ACCESS_TOKEN, _ACCESS_TOKEN_EXPIRES_AT
    now = time.time()
    if _ACCESS_TOKEN and now < _ACCESS_TOKEN_EXPIRES_AT:
        return _ACCESS_TOKEN

    if _TOKEN_CACHE_FILE.exists():
        try:
            cache = json.loads(_TOKEN_CACHE_FILE.read_text(encoding="utf-8"))
            if cache.get("access_token") and now < cache.get("expires_at", 0):
                _ACCESS_TOKEN = cache["access_token"]
                _ACCESS_TOKEN_EXPIRES_AT = cache["expires_at"]
                return _ACCESS_TOKEN
        except Exception:
            pass

    require_settings("ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN")
    with _TOKEN_LOCK:
        if _TOKEN_CACHE_FILE.exists():
            try:
                cache = json.loads(_TOKEN_CACHE_FILE.read_text(encoding="utf-8"))
                if cache.get("access_token") and time.time() < cache.get("expires_at", 0):
                    _ACCESS_TOKEN = cache["access_token"]
                    _ACCESS_TOKEN_EXPIRES_AT = cache["expires_at"]
                    return _ACCESS_TOKEN
            except Exception:
                pass

        accounts_url = os.environ.get("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com").rstrip("/")
        response = requests.post(
            f"{accounts_url}/oauth/v2/token",
            data={
                "refresh_token": os.environ["ZOHO_REFRESH_TOKEN"],
                "client_id": os.environ["ZOHO_CLIENT_ID"],
                "client_secret": os.environ["ZOHO_CLIENT_SECRET"],
                "grant_type": "refresh_token",
            },
            timeout=20,
        )
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        if not response.ok or not payload.get("access_token"):
            raise RuntimeError(f"Could not obtain a Zoho access token: {payload or response.text}")
        _ACCESS_TOKEN = payload["access_token"]
        lifetime = max(int(payload.get("expires_in", 3600)) - 120, 60)
        _ACCESS_TOKEN_EXPIRES_AT = time.time() + lifetime
        try:
            _TOKEN_CACHE_FILE.write_text(
                json.dumps({"access_token": _ACCESS_TOKEN, "expires_at": _ACCESS_TOKEN_EXPIRES_AT}),
                encoding="utf-8",
            )
        except Exception:
            pass
        return _ACCESS_TOKEN


def _request(method: str, path: str, **kwargs) -> requests.Response:
    response = requests.request(
        method,
        f"{_mail_api_base()}{path}",
        headers={"Authorization": f"Zoho-oauthtoken {_access_token()}", "Accept": "application/json"},
        timeout=20,
        **kwargs,
    )
    return response


def make_local_part(first_name: str, last_name: str = "") -> str:
    """Return a normalized full-name local part, for example rishithshetty."""
    local_part = re.sub(r"[^a-z0-9]", "", f"{first_name}{last_name}".lower())
    if not local_part or not LOCAL_PART.fullmatch(local_part):
        raise ValueError("The employee name must produce a valid work-email address.")
    return local_part


def generate_temporary_password() -> str:
    """Generate a high-entropy password accepted by Zoho password policies."""
    alphabet = string.ascii_letters + string.digits + "!@#%_-"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(24))
        if any(c.islower() for c in password) and any(c.isupper() for c in password) and any(c.isdigit() for c in password):
            return password


def find_work_account(organization_id: str, email: str) -> dict | None:
    """Return an organization account by email, or None if it is not present."""
    response = _request(
        "GET", f"/api/organization/{organization_id}/accounts", params={"start": 0, "limit": 200}
    )
    if not response.ok:
        raise RuntimeError(f"Could not fetch Zoho Workplace users: {response.text}")
    target = email.lower()
    for account in response.json().get("data", []):
        if account.get("primaryEmailAddress", "").lower() == target:
            return account
    return None


def _user_exists(organization_id: str, email: str) -> bool:
    return find_work_account(organization_id, email) is not None


def create_work_account(first_name: str, last_name: str, role: str) -> tuple[str, str, str, str]:
    """Create a Zoho Workplace account requiring a password change at first login."""
    require_settings("ZOHO_ORGANIZATION_ID", "ZOHO_WORKPLACE_DOMAIN")
    local_part = make_local_part(first_name, last_name)
    work_email = f"{local_part}@{os.environ['ZOHO_WORKPLACE_DOMAIN'].lower()}"
    organization_id = os.environ["ZOHO_ORGANIZATION_ID"]
    existing = find_work_account(organization_id, work_email)
    if existing:
        zuid = str(existing.get("zuid", ""))
        account_id = str(existing.get("accountId", existing.get("id", "")))
        raise RuntimeError(
            f"{work_email} already exists in Zoho Workplace (zuid: {zuid}). "
            "No activation email was sent because its temporary password is unknown."
        )

    temporary_password = generate_temporary_password()
    response = _request(
        "POST",
        f"/api/organization/{organization_id}/accounts",
        json={
            "primaryEmailAddress": work_email,
            "password": temporary_password,
            "firstName": first_name,
            "lastName": last_name,
            "displayName": f"{first_name} {last_name}".strip(),
            "role": "member",
            "oneTimePassword": True,
        },
    )
    if not response.ok:
        raise RuntimeError(f"Could not create {work_email} in Zoho Workplace: {response.text}")
    
    zuid = ""
    account_id = ""
    try:
        data = response.json().get("data", {})
        zuid = str(data.get("zuid", ""))
        account_id = str(data.get("accountId", data.get("id", "")))
    except Exception:
        pass

    if not zuid:
        acct = find_work_account(organization_id, work_email)
        if acct:
            zuid = str(acct.get("zuid", ""))
            account_id = str(acct.get("accountId", acct.get("id", "")))

    LOGGER.info("Created Zoho Workplace account %s (zuid: %s) with classified role %s", work_email, zuid, role)
    return work_email, temporary_password, zuid, account_id


def disable_work_account(work_email: str) -> bool:
    """Disable/suspend a Zoho Workplace account during employee offboarding."""
    require_settings("ZOHO_ORGANIZATION_ID")
    organization_id = os.environ["ZOHO_ORGANIZATION_ID"]
    account = find_work_account(organization_id, work_email)
    if not account:
        LOGGER.warning("Zoho account for %s not found during offboarding.", work_email)
        return False
    account_id = account.get("accountId", account.get("id"))
    if not account_id:
        LOGGER.warning("Zoho account ID missing for %s.", work_email)
        return False
    response = _request(
        "PUT",
        f"/api/organization/{organization_id}/accounts/{account_id}",
        json={"accountStatus": "disabled"},
    )
    if response.ok:
        LOGGER.info("Disabled Zoho account for %s", work_email)
        return True
    LOGGER.warning("Could not disable Zoho account for %s: %s", work_email, response.text)
    return False
