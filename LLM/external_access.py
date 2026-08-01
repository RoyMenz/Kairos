"""GitHub and Jira invitations for approved employee roles."""

import os
import time
import hashlib
import logging
from requests.auth import HTTPBasicAuth

import jwt
import requests

from config import require_settings, resolve_file_path


ROLE_RESOURCES = {
    "backend": {"github_team": "backend", "github_repo": "backend-repo", "jira_project": "Backend", "jira_key": "BACK"},
    "frontend": {"github_team": "frontend", "github_repo": "frontend-repo", "jira_project": "Frontend", "jira_key": "FRONT"},
}

# Job titles sent by onboarding are mapped to the standard roles in the
# company-managed Kairos Jira project.  Unknown titles are developers by
# default so that a new employee never receives administrator access by
# accident.
ROLE_MAPPING = {
    "SQL Developer": "Developers",
    "Backend Developer": "Developers",
    "Frontend Developer": "Developers",
    "Database Engineer": "Developers",
    "Project Lead": "Administrators",
    "Admin": "Administrators",
}

LOGGER = logging.getLogger(__name__)


def role_resources(role: str) -> dict[str, str]:
    """Return fixed resources for known roles or safely derived resources for new roles."""
    if role in ROLE_RESOURCES:
        return ROLE_RESOURCES[role]
    letters = "".join(character for character in role.upper() if character.isalpha()) or "ROLE"
    project_key = (letters[:6] + hashlib.sha256(role.encode()).hexdigest()[:4].upper())[:10]
    return {
        "github_team": role,
        "github_repo": f"{role}-repo",
        "jira_project": role.replace("-", " ").title(),
        "jira_key": project_key,
    }


def _jira_headers() -> tuple[dict[str, str], HTTPBasicAuth]:
    require_settings("JIRA_BASE_URL", "JIRA_ADMIN_EMAIL", "JIRA_API_TOKEN")
    return ({"Accept": "application/json", "Content-Type": "application/json"}, HTTPBasicAuth(os.environ["JIRA_ADMIN_EMAIL"], os.environ["JIRA_API_TOKEN"]))


def _ensure_jira_project_and_group(role: str) -> tuple[str, str]:
    """Create the role project/group once and bind the group to Developers."""
    policy = role_resources(role)
    base = os.environ["JIRA_BASE_URL"].rstrip("/")
    headers, auth = _jira_headers()
    group_name = f"kairos-{role}-developers"
    project = requests.get(f"{base}/rest/api/3/project/{policy['jira_key']}", headers=headers, auth=auth, timeout=20)
    if project.status_code == 404:
        myself = requests.get(f"{base}/rest/api/3/myself", headers=headers, auth=auth, timeout=20)
        myself.raise_for_status()
        project = requests.post(
            f"{base}/rest/api/3/project", headers=headers, auth=auth, timeout=20,
            json={"key": policy["jira_key"], "name": policy["jira_project"], "projectTypeKey": "software", "projectTemplateKey": "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban", "leadAccountId": myself.json()["accountId"]},
        )
    project.raise_for_status()
    group = requests.post(f"{base}/rest/api/3/group", headers=headers, auth=auth, timeout=20, json={"name": group_name})
    if group.status_code not in {200, 201, 400}:
        group.raise_for_status()
    roles = requests.get(f"{base}/rest/api/3/project/{policy['jira_key']}/role", headers=headers, auth=auth, timeout=20)
    roles.raise_for_status()
    developer_url = roles.json().get("Developers") or roles.json().get("Member")
    if not developer_url:
        created_role = requests.post(
            f"{base}/rest/api/3/role", headers=headers, auth=auth, timeout=20,
            json={"name": "Developers", "description": "Kairos role-based developer access"},
        )
        if created_role.status_code not in {200, 201, 400}:
            created_role.raise_for_status()
        roles = requests.get(f"{base}/rest/api/3/project/{policy['jira_key']}/role", headers=headers, auth=auth, timeout=20)
        roles.raise_for_status()
        developer_url = roles.json().get("Developers") or roles.json().get("Member")
    if not developer_url:
        raise RuntimeError(f"Jira project {policy['jira_key']} has no Developers or Member role after setup.")
    assignment = requests.post(developer_url, headers=headers, auth=auth, timeout=20, json={"group": [group_name]})
    if assignment.status_code not in {200, 201, 400, 409}:
        assignment.raise_for_status()
    return group_name, developer_url


def _github_headers() -> dict[str, str]:
    require_settings("GITHUB_APP_ID", "GITHUB_APP_INSTALLATION_ID", "GITHUB_APP_PRIVATE_KEY_FILE")
    now = int(time.time())
    key_file = resolve_file_path(os.environ["GITHUB_APP_PRIVATE_KEY_FILE"])
    private_key = open(key_file, encoding="utf-8").read()
    app_jwt = jwt.encode({"iat": now - 60, "exp": now + 540, "iss": os.environ["GITHUB_APP_ID"]}, private_key, algorithm="RS256")
    token_response = requests.post(
        f"https://api.github.com/app/installations/{os.environ['GITHUB_APP_INSTALLATION_ID']}/access_tokens",
        headers={"Authorization": f"Bearer {app_jwt}", "Accept": "application/vnd.github+json"}, timeout=20,
    )
    token_response.raise_for_status()
    return {"Authorization": f"Bearer {token_response.json()['token']}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}


def invite_to_github(work_email: str, role: str) -> None:
    require_settings("GITHUB_ORG")
    policy = role_resources(role)
    headers = _github_headers()
    org = os.environ["GITHUB_ORG"]
    repo_url = f"https://api.github.com/repos/{org}/{policy['github_repo']}"
    response = requests.get(repo_url, headers=headers, timeout=20)
    if response.status_code == 404:
        response = requests.post(f"https://api.github.com/orgs/{org}/repos", headers=headers, json={"name": policy["github_repo"], "private": True}, timeout=20)
    response.raise_for_status()
    team_url = f"https://api.github.com/orgs/{org}/teams/{policy['github_team']}"
    team = requests.get(team_url, headers=headers, timeout=20)
    if team.status_code == 404:
        team = requests.post(f"https://api.github.com/orgs/{org}/teams", headers=headers, json={"name": policy["github_team"], "privacy": "closed"}, timeout=20)
    team.raise_for_status()
    team_data = team.json()
    requests.put(f"https://api.github.com/orgs/{org}/teams/{team_data['slug']}/repos/{org}/{policy['github_repo']}", headers=headers, json={"permission": "push"}, timeout=20).raise_for_status()
    invitation = requests.post(f"https://api.github.com/orgs/{org}/invitations", headers=headers, json={"email": work_email, "role": "direct_member", "team_ids": [team_data["id"]]}, timeout=20)
    if invitation.status_code not in {201, 422}:
        invitation.raise_for_status()


def invite_to_jira(work_email: str, role: str) -> None:
    base = os.environ["JIRA_BASE_URL"].rstrip("/")
    headers, auth = _jira_headers()
    response = requests.post(
        f"{base}/rest/api/3/user",
        headers=headers,
        auth=auth,
        json={"emailAddress": work_email, "products": ["jira-software"]},
        timeout=20,
    )

    print("\n========== ATLASSIAN RESPONSE ==========")
    print("Status Code:", response.status_code)
    print("Headers:", response.headers)
    print("Body:")
    print(response.text)
    print("========================================\n")

    if response.status_code not in (200, 201, 400):
        raise Exception(
            f"Jira User Invite Failed\n"
            f"Status: {response.status_code}\n"
            f"Response: {response.text}"
        )


def get_jira_account_id_by_email(work_email: str) -> str | None:
    """Find a Jira account ID without relying on an email field being visible."""
    base = os.environ["JIRA_BASE_URL"].rstrip("/")
    headers, auth = _jira_headers()
    users = requests.get(
        f"{base}/rest/api/3/user/search",
        params={"query": work_email},
        headers=headers,
        auth=auth,
        timeout=20,
    )
    users.raise_for_status()
    results = users.json()
    account_id = next(
        (user.get("accountId") for user in results if user.get("emailAddress", "").casefold() == work_email.casefold()),
        None,
    )
    # Jira may suppress emailAddress according to the user's profile privacy.
    # An exact email query that yields one user is still safe to use.
    if not account_id and len(results) == 1:
        account_id = results[0].get("accountId")
    return account_id


def assign_user_to_kairos_project(work_email: str, employee_role: str = "") -> bool:
    """Add an invited Jira user to the appropriate role in the Kairos project."""
    base = os.environ["JIRA_BASE_URL"].rstrip("/")
    project_key = os.getenv("JIRA_PROJECT_KEY", "KJ")
    headers, auth = _jira_headers()

    project_role = ROLE_MAPPING.get(employee_role)
    if project_role is None:
        project_role = "Developers"
        LOGGER.info(
            "No Jira role mapping for %r; assigning %s to %s as the safe default.",
            employee_role,
            project_role,
            project_key,
        )

    account_id = get_jira_account_id_by_email(work_email)
    if not account_id:
        LOGGER.warning(
            "[WARNING] Jira account for %s is not ready for KJ project assignment yet. User needs to accept invite first.",
            work_email,
        )
        return False

    roles = requests.get(
        f"{base}/rest/api/3/project/{project_key}/role",
        headers=headers,
        auth=auth,
        timeout=20,
    )
    roles.raise_for_status()
    role_url = roles.json().get(project_role)
    if not role_url:
        LOGGER.error("Jira project %s has no %s project role; %s was not assigned.", project_key, project_role, work_email)
        return False

    assignment = requests.post(
        role_url,
        headers=headers,
        auth=auth,
        json={"user": [account_id]},
        timeout=20,
    )
    if assignment.status_code not in (200, 201, 400, 409):
        assignment.raise_for_status()
    LOGGER.info("Assigned %s to Jira project %s with the %s role.", work_email, project_key, project_role)
    return True


def start_external_onboarding(work_email: str, role: str) -> None:
    invite_to_github(work_email, role)
    invite_to_jira(work_email, role)
    assign_user_to_kairos_project(work_email, role)
