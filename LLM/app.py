import os
import sys
import threading
import time
import logging
from datetime import datetime, timezone

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from config import load_settings, require_settings
from email_service import send_work_account_activation, send_workspace_invite
from external_access import start_external_onboarding
from activation_watcher import password_was_changed
from pending_store import load_pending, save_pending
from role_router import choose_channel, choose_workspace_role
from slack_service import add_user_to_channel, find_user_id, list_visible_channels
from workspace_service import create_work_account


LOGGER = logging.getLogger("kairos.onboarding")


def configure_logging() -> None:
    if LOGGER.handlers:
        return
    LOGGER.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    file_handler = logging.FileHandler("onboarding.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    LOGGER.addHandler(console)
    LOGGER.addHandler(file_handler)


def select_channel(slack: WebClient, designation: str) -> str:
    channel = choose_channel(designation, list_visible_channels(slack))
    print(f"Designation {designation!r} mapped to #{channel}.")
    return channel


def start_onboarding(email: str, designation: str, role: str | None = None) -> None:
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
        "role": role,
        "channel": channel,
        "invite_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_pending(pending)
    send_workspace_invite(email)
    pending[key]["invite_sent"] = True
    save_pending(pending)
    print(f"Workspace invitation emailed to {email}. They will be added to #{channel} after joining.")


def provision_workspace_account(
    personal_email: str, first_name: str, last_name: str, designation: str
) -> None:
    role = choose_workspace_role(designation)
    work_email, temporary_password = create_work_account(first_name, last_name, role)
    send_work_account_activation(personal_email, work_email, temporary_password)
    pending = load_pending()
    pending[work_email.lower()] = {
        "email": work_email,
        "designation": designation,
        "role": role,
        "awaiting_password_change": True,
        "invite_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    save_pending(pending)
    print(
        f"Classified {designation!r} as {role}. Created {work_email}, sent first-sign-in "
        f"instructions to {personal_email}, and is waiting for the required password change."
    )


def release_password_changed_onboarding() -> None:
    """Send all platform invitations once Zoho confirms the first sign-in."""
    pending = load_pending()
    for email, record in list(pending.items()):
        if not record.get("awaiting_password_change") or record.get("external_invites_sent"):
            continue
        if not password_was_changed(email, record["created_at"]):
            continue
        if not record.get("invite_sent"):
            start_onboarding(email, record["designation"], record["role"])
        github_sent, jira_sent = start_external_onboarding(email, record["role"])
        pending = load_pending()
        pending[email]["external_invites_sent"] = True
        pending[email]["awaiting_password_change"] = False
        save_pending(pending)
        if github_sent and jira_sent:
            LOGGER.info("%s: password changed; Slack, GitHub, and Jira invitations sent.", email)
        elif jira_sent:
            LOGGER.info("%s: password changed; Slack and Jira invitations sent; GitHub not required.", email)
        else:
            LOGGER.info("%s: password changed; Slack onboarding sent; GitHub and Jira not required.", email)


def reconcile_pending_slack_memberships() -> None:
    """Finish channel assignments when a Slack join event was missed while offline."""
    pending = load_pending()
    candidates = [
        (email, record)
        for email, record in pending.items()
        if record.get("invite_sent") and record.get("channel")
    ]
    if not candidates:
        return
    require_settings("SLACK_BOT_TOKEN")
    slack = WebClient(token=os.environ["SLACK_BOT_TOKEN"])
    for email, record in candidates:
        user_id = find_user_id(slack, email)
        if not user_id:
            continue
        result = add_user_to_channel(slack, user_id, record["channel"])
        LOGGER.info("%s: %s", email, result)
        pending = load_pending()
        if email in pending:
            del pending[email]
            save_pending(pending)


def run_activation_watcher() -> None:
    while True:
        try:
            release_password_changed_onboarding()
            reconcile_pending_slack_memberships()
        except Exception as error:
            LOGGER.exception("Password-change watcher error: %s", error)
        time.sleep(60)


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
            LOGGER.info("%s: %s", email, result)
            del pending[email]
            save_pending(pending)
        except (SlackApiError, RuntimeError) as error:
            logger.exception("Could not finish onboarding for %s: %s", email, error)

    threading.Thread(target=run_activation_watcher, daemon=True).start()
    LOGGER.info("Listening for password changes and Slack team_join events. Press Ctrl+C to stop.")
    SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"]).start()


def main() -> None:
    load_settings()
    configure_logging()
    if len(sys.argv) == 2 and sys.argv[1] == "listen":
        run_listener()
    elif len(sys.argv) == 4 and sys.argv[1] == "onboard":
        start_onboarding(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 6 and sys.argv[1] == "provision-workspace":
        provision_workspace_account(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
    else:
        raise SystemExit(
            "Usage: python app.py listen | python app.py onboard EMAIL DESIGNATION | "
            "python app.py provision-workspace PERSONAL_EMAIL FIRST_NAME LAST_NAME DESIGNATION"
        )


if __name__ == "__main__":
    main()
