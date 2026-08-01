import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import require_settings


def _send_message(recipient_email: str, message: MIMEMultipart) -> None:
    """Send onboarding mail through the organization Zoho mailbox."""
    require_settings("ZOHO_SMTP_SENDER_EMAIL", "ZOHO_SMTP_APP_PASSWORD", "ZOHO_SMTP_HOST")
    sender = os.environ["ZOHO_SMTP_SENDER_EMAIL"]
    message["From"] = sender
    message["To"] = recipient_email
    with smtplib.SMTP(os.environ["ZOHO_SMTP_HOST"], 587, timeout=20) as server:
        server.starttls()
        server.login(sender, os.environ["ZOHO_SMTP_APP_PASSWORD"])
        refused = server.sendmail(sender, [recipient_email], message.as_string())
    if refused:
        raise RuntimeError(f"Zoho SMTP rejected {recipient_email}: {refused}")


def send_workspace_invite(recipient_email: str) -> None:
    require_settings("SLACK_WORKSPACE_INVITE_URL")
    message = MIMEMultipart()
    message["Subject"] = "Welcome to the Team! Join our Slack Workspace"
    message.attach(MIMEText(
        "Hi there,\n\nPlease join our Slack workspace using this link:\n\n"
        f"{os.environ['SLACK_WORKSPACE_INVITE_URL']}\n",
        "plain",
    ))
    _send_message(recipient_email, message)


def send_work_account_activation(recipient_email: str, work_email: str, temporary_password: str) -> None:
    """Send first-sign-in instructions to an employee's personal address."""
    message = MIMEMultipart()
    message["Subject"] = "Your Nigmafest work account"
    message.attach(MIMEText(
        "Hi there,\n\n"
        "Your Nigmafest work account has been created.\n\n"
        f"Work email: {work_email}\n"
        f"Temporary password: {temporary_password}\n\n"
        "Sign in at https://mail.zoho.com. You will be required to choose a new password.\n"
        "After you sign in, invitations to your work email will provide access to company tools.\n",
        "plain",
    ))
    _send_message(recipient_email, message)
