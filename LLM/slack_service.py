import re

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


CHANNEL_NAME = re.compile(r"^[a-z0-9][a-z0-9_-]{0,79}$")


def validate_channel_name(name: str) -> str:
    cleaned = name.strip().lstrip("#").lower()
    if not CHANNEL_NAME.fullmatch(cleaned):
        raise RuntimeError(f"The selected channel name is invalid: {name!r}")
    return cleaned


def find_user_id(slack: WebClient, email: str) -> str | None:
    try:
        return slack.users_lookupByEmail(email=email)["user"]["id"]
    except SlackApiError as error:
        if error.response["error"] in {"users_not_found", "user_not_found"}:
            return None
        raise


def _channels(slack: WebClient, channel_type: str):
    cursor = None
    while True:
        try:
            result = slack.conversations_list(
                types=channel_type, limit=200, cursor=cursor, exclude_archived=True
            )
        except SlackApiError as error:
            if channel_type == "private_channel" and error.response["error"] == "missing_scope":
                return
            raise
        yield from result["channels"]
        cursor = result.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            return


def list_visible_channels(slack: WebClient) -> set[str]:
    channels: set[str] = set()
    for channel_type in ("public_channel", "private_channel"):
        channels.update(channel["name"] for channel in _channels(slack, channel_type))
    return channels


def find_channel_id(slack: WebClient, channel_name: str) -> str | None:
    wanted = validate_channel_name(channel_name)
    for channel_type in ("public_channel", "private_channel"):
        for channel in _channels(slack, channel_type):
            if channel["name"] == wanted:
                return channel["id"]
    return None


def ensure_channel(slack: WebClient, channel_name: str) -> str:
    """Return an existing channel or create a private designation channel."""
    wanted = validate_channel_name(channel_name)
    channel_id = find_channel_id(slack, wanted)
    if channel_id:
        return channel_id
    return slack.conversations_create(name=wanted, is_private=True)["channel"]["id"]


def add_user_to_channel(slack: WebClient, user_id: str, channel_name: str) -> str:
    channel_id = ensure_channel(slack, channel_name)
    try:
        slack.conversations_invite(channel=channel_id, users=user_id)
        return f"Added user to #{validate_channel_name(channel_name)}"
    except SlackApiError as error:
        if error.response["error"] == "already_in_channel":
            return f"User is already in #{validate_channel_name(channel_name)}"
        raise
