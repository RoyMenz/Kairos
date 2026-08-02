import json
import logging
import os

from google import genai
from google.genai import types

from config import require_settings
from slack_service import validate_channel_name


LOGGER = logging.getLogger(__name__)


def _log_token_usage(operation: str, response) -> None:
    """Record Gemini usage metadata when it is supplied by the API."""
    usage = getattr(response, "usage_metadata", None)
    if usage is None:
        LOGGER.warning("Gemini did not return token usage for %s.", operation)
        return
    LOGGER.info(
        "Gemini token usage [%s]: prompt=%s, output=%s, total=%s, cached=%s, thoughts=%s",
        operation,
        getattr(usage, "prompt_token_count", None),
        getattr(usage, "candidates_token_count", None),
        getattr(usage, "total_token_count", None),
        getattr(usage, "cached_content_token_count", None),
        getattr(usage, "thoughts_token_count", None),
    )


def choose_workspace_role(designation: str) -> str:
    """Classify a designation into a normalized role key for resource provisioning."""
    require_settings("GEMINI_API_KEY")
    prompt = f"""
You classify employee designations for a company onboarding system.
Employee designation: {designation!r}
Return one concise role key based on the designation.
Return JSON only: {{"role": "backend-developer"}}.
Use lowercase letters, digits, and hyphens only. Do not return unknown.
""".strip()
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.0, response_mime_type="application/json"),
    )
    _log_token_usage("choose_workspace_role", response)
    try:
        role = json.loads(response.text)["role"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise RuntimeError("Gemini did not return a valid role decision.") from error
    normalized = validate_channel_name(role)
    return {"backend-developer": "backend", "frontend-developer": "frontend"}.get(normalized, normalized)


def suggest_access(designation: str) -> dict[str, object]:
    """Suggest reviewable Jira, Slack, and Git access without changing access.

    This is deliberately recommendation-only.  The UI can present the result in
    its review modal, and a separate approved action must perform provisioning.
    """
    require_settings("GEMINI_API_KEY")
    prompt = f"""
You recommend least-privilege access for an employee onboarding review.
Employee designation: {designation!r}

Return recommendations for exactly these systems:
- jira: no-access, view, or edit
- slack: no-access or member
- git: no-access, read, or write

Do not grant access or describe steps to provision it. The review UI supports
only two actions for every suggested system: edit and remove. Never return an
admin access level. Prefer no-access when the tool is not required.

Return JSON only:
{{
  "designation": "<the supplied designation>",
  "access": {{"jira": "edit", "slack": "member", "git": "write"}},
  "available_actions": ["edit", "remove"],
  "reason": "One concise explanation."
}}
""".strip()
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.0, response_mime_type="application/json"),
    )
    _log_token_usage("suggest_access", response)
    try:
        suggestion = json.loads(response.text)
        access = suggestion["access"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise RuntimeError("Gemini did not return a valid access suggestion.") from error

    permitted = {
        "jira": {"no-access", "view", "edit"},
        "slack": {"no-access", "member"},
        "git": {"no-access", "read", "write"},
    }
    if not isinstance(access, dict) or set(access) != set(permitted):
        raise RuntimeError("Gemini returned an incomplete access suggestion.")
    if any(access[tool] not in levels for tool, levels in permitted.items()):
        raise RuntimeError("Gemini returned an unsupported access level.")

    actions = suggestion.get("available_actions")
    if actions != ["edit", "remove"]:
        raise RuntimeError("Gemini returned unsupported review actions.")
    reason = suggestion.get("reason", "")
    if not isinstance(reason, str):
        raise RuntimeError("Gemini returned an invalid access-suggestion reason.")
    return {
        "designation": designation,
        "access": access,
        "available_actions": actions,
        "reason": reason.strip(),
    }


def revise_access_suggestion(
    designation: str, tool: str, requested_change: str, current_value: str = ""
) -> dict[str, str]:
    """Interpret an admin's Edit value for one suggested-access row.

    For example, an edit of Slack to ``java-developer`` is returned as the
    reviewable Slack channel ``java-developer``.  This function only prepares
    modal data; it never joins a channel or changes a permission.
    """
    normalized_tool = tool.strip().lower()
    if normalized_tool not in {"jira", "slack", "git"}:
        raise ValueError("tool must be jira, slack, or git")
    if not requested_change.strip():
        raise ValueError("An edited access value is required")

    require_settings("GEMINI_API_KEY")
    prompt = f"""
You update one review-only employee access suggestion after an administrator
clicks Edit. Do not perform, request, or describe real provisioning.

Employee designation: {designation!r}
Tool being edited: {normalized_tool!r}
Current suggested value: {current_value!r}
Administrator's replacement value: {requested_change!r}

Interpret the replacement value for the specified tool. For Slack, return a
concise channel name without #. For Jira, return the project or group name.
For Git, return the repository or team name. Keep the exact intended meaning
where practical. Do not return admin access.

Return JSON only:
{{
  "tool": "{normalized_tool}",
  "action": "edit",
  "value": "the revised channel, project/group, or repository/team",
  "reason": "One concise explanation."
}}
""".strip()
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.0, response_mime_type="application/json"),
    )
    _log_token_usage("revise_access_suggestion", response)
    try:
        revised = json.loads(response.text)
        value = revised["value"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise RuntimeError("Gemini did not return a valid edited access suggestion.") from error
    if revised.get("tool") != normalized_tool or revised.get("action") != "edit":
        raise RuntimeError("Gemini returned an invalid access-edit action.")
    if not isinstance(value, str) or not value.strip():
        raise RuntimeError("Gemini returned an invalid edited access value.")

    value = value.strip().lstrip("#")
    if normalized_tool == "slack":
        value = validate_channel_name(value)
    if len(value) > 120:
        raise RuntimeError("Gemini returned an edited access value that is too long.")
    reason = revised.get("reason", "")
    if not isinstance(reason, str):
        raise RuntimeError("Gemini returned an invalid access-edit reason.")
    return {"tool": normalized_tool, "action": "edit", "value": value, "reason": reason.strip()}


def choose_channel(designation: str, existing_channels: set[str]) -> str:
    """Use Gemini to choose an existing channel or a safe new channel name."""
    require_settings("GEMINI_API_KEY")
    channel_list = ", ".join(sorted(existing_channels)) or "(no visible channels)"
    prompt = f"""
You route employees to Slack channels.
Employee designation: {designation!r}
Visible existing channels: {channel_list}
Choose the best existing channel when one clearly matches the designation.
If none matches, propose one concise new private-channel name for that job function.
Return JSON only: {{"channel_name": "lowercase-slack-channel-name"}}.
The name may contain only lowercase letters, digits, hyphens, and underscores.
""".strip()
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    response = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.0, response_mime_type="application/json"),
    )
    _log_token_usage("choose_channel", response)
    try:
        return validate_channel_name(json.loads(response.text)["channel_name"])
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise RuntimeError("Gemini did not return a valid channel decision.") from error
