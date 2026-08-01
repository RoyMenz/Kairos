"""GitHub and Jira invitations for approved employee roles."""

import os
import time
import hashlib
from requests.auth import HTTPBasicAuth

import jwt
import requests

from config import require_settings


ROLE_RESOURCES = {
    "backend": {"github_team": "backend", "github_repo": "backend-repo", "jira_project": "Backend", "jira_key": "BACK"},
    "frontend": {"github_team": "frontend", "github_repo": "frontend-repo", "jira_project": "Frontend", "jira_key": "FRONT"},
}


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


def _ensure_jira_project_and_group(role: str) -> str:
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
    return group_name


def _github_headers() -> dict[str, str]:
    require_settings("GITHUB_APP_ID", "GITHUB_APP_INSTALLATION_ID", "GITHUB_APP_PRIVATE_KEY_FILE")
    now = int(time.time())
    private_key = open(os.environ["GITHUB_APP_PRIVATE_KEY_FILE"], encoding="utf-8").read()
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
    group_name = _ensure_jira_project_and_group(role)
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
    if response.status_code in (200, 201):
        account_id = response.json().get("accountId")
        if account_id:
            membership = requests.post(
                f"{base}/rest/api/3/group/user",
                params={"groupname": group_name},
                headers=headers,
                auth=auth,
                json={"accountId": account_id},
                timeout=20,
            )
            if membership.status_code not in (200, 201, 400, 409):
                membership.raise_for_status()


def start_external_onboarding(work_email: str, role: str) -> None:
    invite_to_github(work_email, role)
    invite_to_jira(work_email, role)
