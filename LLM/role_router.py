import json
import logging
import os
import sys

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
        print(f"Gemini token usage [{operation}]: unavailable", file=sys.stderr)
        return
    prompt_tokens = getattr(usage, "prompt_token_count", None)
    output_tokens = getattr(usage, "candidates_token_count", None)
    total_tokens = getattr(usage, "total_token_count", None)
    cached_tokens = getattr(usage, "cached_content_token_count", None)
    thought_tokens = getattr(usage, "thoughts_token_count", None)
    LOGGER.info(
        "Gemini token usage [%s]: prompt=%s, output=%s, total=%s, cached=%s, thoughts=%s",
        operation,
        prompt_tokens,
        output_tokens,
        total_tokens,
        cached_tokens,
        thought_tokens,
    )
    print(
        f"Gemini token usage [{operation}]: input={prompt_tokens}, "
        f"output={output_tokens}, total={total_tokens}, "
        f"cached={cached_tokens}, thoughts={thought_tokens}",
        file=sys.stderr,
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

Return recommendations for exactly these systems. The displayed access value
must be the actual destination, not a permission level:
- jira: the Jira project name
- slack: the Slack channel name, without #
- git: the Git repository or team name

Do not grant access or describe steps to provision it. The review UI supports
only two actions for every suggested system: edit and remove. Never return an
admin access level. Prefer no-access when the tool is not required.

Return JSON only:
{{
  "designation": "<the supplied designation>",
  "access": {{"jira": "Frontend", "slack": "frontend-developers", "git": "frontend-repo"}},
  "resources": {{
    "jira": {{"project": "project-name"}},
    "slack": {{"channel": "channel-name-without-hash"}},
    "git": {{"repository": "repository-or-team-name"}}
  }},
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
        resources = suggestion["resources"]
    except (json.JSONDecodeError, KeyError, TypeError) as error:
        raise RuntimeError("Gemini did not return a valid access suggestion.") from error

    required_tools = {"jira", "slack", "git"}
    if not isinstance(access, dict) or set(access) != required_tools:
        raise RuntimeError("Gemini returned an incomplete access suggestion.")
    if not isinstance(resources, dict) or set(resources) != required_tools:
        raise RuntimeError("Gemini returned incomplete access resources.")
    resource_fields = {"jira": "project", "slack": "channel", "git": "repository"}
    normalized_resources: dict[str, dict[str, str]] = {}
    for tool, field in resource_fields.items():
        resource = resources.get(tool)
        value = resource.get(field) if isinstance(resource, dict) else None
        if not isinstance(value, str) or not value.strip() or len(value.strip()) > 120:
            raise RuntimeError("Gemini returned an invalid access resource.")
        value = value.strip().lstrip("#")
        if tool == "slack":
            value = validate_channel_name(value)
        if not isinstance(access.get(tool), str) or access[tool].strip().lstrip("#") != value:
            raise RuntimeError("Gemini returned mismatched access and resource values.")
        normalized_resources[tool] = {field: value}

    actions = suggestion.get("available_actions")
    if actions != ["edit", "remove"]:
        raise RuntimeError("Gemini returned unsupported review actions.")
    reason = suggestion.get("reason", "")
    if not isinstance(reason, str):
        raise RuntimeError("Gemini returned an invalid access-suggestion reason.")
    return {
        "designation": designation,
        "access": access,
        "resources": normalized_resources,
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
