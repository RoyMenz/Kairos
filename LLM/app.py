import os
import sys
from datetime import datetime, timezone

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from config import load_settings, require_settings
from email_service import send_workspace_invite
from pending_store import load_pending, save_pending
from role_router import choose_channel
from slack_service import add_user_to_channel, find_user_id, list_visible_channels


def select_channel(slack: WebClient, designation: str) -> str:
    channel = choose_channel(designation, list_visible_channels(slack))
    print(f"Designation {designation!r} mapped to #{channel}.")
    return channel


def start_onboarding(email: str, designation: str) -> None:
    require_settings("SLACK_BOT_TOKEN", "GEMINI_API_KEY")
    slack = WebClient(token=os.environ["SLACK_BOT_TOKEN"])
    channel = select_channel(slack, designation)
    user_id = find_user_id(slack, email)
    if user_id:
        print(add_user_to_channel(slack, user_id, channel))
        return
    pending = load_pending()
    key = email.lower()
    if pending.get(key, {}).get("invite_sent"):
        print(f"An invite has already been sent to {email}; waiting for their Slack join event.")
        return
    pending[key] = {
        "email": email,
        "designation": designation,
        "channel": channel,
        "invite_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_pending(pending)
    send_workspace_invite(email)
    pending[key]["invite_sent"] = True
    save_pending(pending)
    print(f"Workspace invitation emailed to {email}. They will be added to #{channel} after joining.")


def run_listener() -> None:
    require_settings("SLACK_BOT_TOKEN", "SLACK_APP_TOKEN")
    app = App(token=os.environ["SLACK_BOT_TOKEN"])

    @app.event("team_join")
    def finish_onboarding(event, logger):
        email = event["user"].get("profile", {}).get("email", "").lower()
        pending = load_pending()
        record = pending.get(email)
        if not email or not record or not record.get("invite_sent"):
            return
        try:
            slack = WebClient(token=os.environ["SLACK_BOT_TOKEN"])
            result = add_user_to_channel(slack, event["user"]["id"], record["channel"])
            print(f"{email}: {result}")
            del pending[email]
            save_pending(pending)
        except (SlackApiError, RuntimeError) as error:
            logger.exception("Could not finish onboarding for %s: %s", email, error)

    print("Listening for Slack team_join events. Press Ctrl+C to stop.")
    SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"]).start()


def main() -> None:
    load_settings()
    if len(sys.argv) == 2 and sys.argv[1] == "listen":
        run_listener()
    elif len(sys.argv) == 4 and sys.argv[1] == "onboard":
        start_onboarding(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit("Usage: python app.py listen | python app.py onboard EMAIL DESIGNATION")


if __name__ == "__main__":
    main()
