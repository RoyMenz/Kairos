import sys
import json
import os
import io
import contextlib

from config import load_settings
from role_router import choose_workspace_role, choose_channel
from app import provision_workspace_account, start_onboarding, release_password_changed_onboarding
from external_access import start_external_onboarding
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

        elif action == "provision":
            if len(sys.argv) < 6:
                raise ValueError("personal_email, first_name, last_name, and designation required")
            personal_email = sys.argv[2]
            first_name = sys.argv[3]
            last_name = sys.argv[4]
            designation = sys.argv[5]
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                provision_workspace_account(personal_email, first_name, last_name, designation)
            output = buf.getvalue().strip()
            print(json.dumps({"success": True, "output": output}))

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
                start_external_onboarding(work_email, role)
            output = buf.getvalue().strip()
            print(json.dumps({"success": True, "output": output}))

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
