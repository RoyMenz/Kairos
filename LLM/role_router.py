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
