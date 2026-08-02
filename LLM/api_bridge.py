import sys
import json
import os
import io
import contextlib

from config import load_settings
from role_router import choose_workspace_role, choose_channel, revise_access_suggestion, suggest_access
from app import provision_workspace_account, start_onboarding, release_password_changed_onboarding
from external_access import start_external_onboarding, remove_from_github, revoke_jira_access
from workspace_service import create_work_account, disable_work_account, find_work_account, make_local_part
from slack_service import remove_user_from_channels, find_user_id, WebClient
from pending_store import load_pending


def main():
    load_settings()
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No action specified"}))
        sys.exit(1)

    action = sys.argv[1]

    try:
        if action == "classify-role":
            if len(sys.argv) < 3:
                raise ValueError("Designation required")
            designation = sys.argv[2]
            role = choose_workspace_role(designation)
            print(json.dumps({"success": True, "designation": designation, "role": role}))

        elif action == "choose-channel":
            if len(sys.argv) < 3:
                raise ValueError("Designation required")
            designation = sys.argv[2]
            channels = set(json.loads(sys.argv[3])) if len(sys.argv) >= 4 and sys.argv[3] else set()
            channel = choose_channel(designation, channels)
            print(json.dumps({"success": True, "designation": designation, "channel": channel}))

        elif action == "suggest-access":
            if len(sys.argv) < 3:
                raise ValueError("Designation required")
            print(json.dumps({"success": True, **suggest_access(sys.argv[2])}))

        elif action == "revise-access":
            if len(sys.argv) < 5:
                raise ValueError("designation, tool, and requested_change required")
            current_value = sys.argv[5] if len(sys.argv) >= 6 else ""
            revision = revise_access_suggestion(sys.argv[2], sys.argv[3], sys.argv[4], current_value)
            print(json.dumps({"success": True, **revision}))

        elif action == "provision":
            if len(sys.argv) < 6:
                raise ValueError("personal_email, first_name, last_name, and designation required")
            personal_email = sys.argv[2]
            first_name = sys.argv[3]
            last_name = sys.argv[4]
            designation = sys.argv[5]
            buf = io.StringIO()
            zuid = ""
            account_id = ""
            with contextlib.redirect_stdout(buf):
                provision_workspace_account(personal_email, first_name, last_name, designation)
            output = buf.getvalue().strip()
            domain = os.environ.get("ZOHO_WORKPLACE_DOMAIN", "nigmafest.in").lower()
            work_email = f"{make_local_part(first_name, last_name)}@{domain}"
            org_id = os.environ.get("ZOHO_ORGANIZATION_ID")
            if org_id:
                acct = find_work_account(org_id, work_email)
                if acct:
                    zuid = str(acct.get("zuid", ""))
                    account_id = str(acct.get("accountId", acct.get("id", "")))
            print(json.dumps({"success": True, "work_email": work_email, "zoho_zuid": zuid, "zoho_account_id": account_id, "output": output}))

        elif action == "onboard":
            if len(sys.argv) < 4:
                raise ValueError("email and designation required")
            email = sys.argv[2]
            designation = sys.argv[3]
            role = sys.argv[4] if len(sys.argv) >= 5 and sys.argv[4] != "" else None
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                start_onboarding(email, designation, role)
            output = buf.getvalue().strip()
            print(json.dumps({"success": True, "output": output}))

        elif action == "external":
            if len(sys.argv) < 4:
                raise ValueError("work_email and role required")
            work_email = sys.argv[2]
            role = sys.argv[3]
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                technical, jira_required, github_invitation_id, jira_account_id = start_external_onboarding(work_email, role)
            output = buf.getvalue().strip()
            print(json.dumps({
                "success": True,
                "technical": technical,
                "jira_required": jira_required,
                "github_invitation_id": github_invitation_id,
                "jira_account_id": jira_account_id,
                "output": output
            }))

        elif action == "disable-zoho":
            if len(sys.argv) < 3:
                raise ValueError("work_email required")
            work_email = sys.argv[2]
            result = disable_work_account(work_email)
            print(json.dumps({"success": True, "disabled": result}))

        elif action == "remove-github":
            if len(sys.argv) < 3:
                raise ValueError("username_or_email required")
            username_or_email = sys.argv[2]
            invitation_id = sys.argv[3] if len(sys.argv) >= 4 else ""
            result = remove_from_github(username_or_email, invitation_id)
            print(json.dumps({"success": True, "removed": result}))

        elif action == "revoke-jira":
            if len(sys.argv) < 3:
                raise ValueError("account_id_or_email required")
            account_id_or_email = sys.argv[2]
            result = revoke_jira_access(account_id_or_email)
            print(json.dumps({"success": True, "revoked": result}))

        elif action == "remove-slack-user":
            if len(sys.argv) < 3:
                raise ValueError("user_id or email required")
            target = sys.argv[2]
            token = os.environ.get("SLACK_BOT_TOKEN")
            removed = False
            if token:
                slack = WebClient(token=token)
                user_id = target if not "@" in target else find_user_id(slack, target)
                if user_id:
                    removed = remove_user_from_channels(slack, user_id)
            print(json.dumps({"success": True, "removed": removed}))

        elif action == "get-pending":
            pending = load_pending()
            print(json.dumps({"success": True, "pending": pending}))

        elif action == "check-activation":
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                release_password_changed_onboarding()
            output = buf.getvalue().strip()
            print(json.dumps({"success": True, "output": output}))

        else:
            raise ValueError(f"Unknown action: {action}")

    except Exception as error:
        print(json.dumps({"success": False, "error": str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
