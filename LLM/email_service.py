import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import require_settings


def send_workspace_invite(recipient_email: str) -> None:
    require_settings("GMAIL_SENDER_EMAIL", "GMAIL_APP_PASSWORD", "SLACK_WORKSPACE_INVITE_URL")
    sender = os.environ["GMAIL_SENDER_EMAIL"]
    message = MIMEMultipart()
    message["Subject"] = "Welcome to the Team! Join our Slack Workspace"
    message["From"] = sender
    message["To"] = recipient_email
    message.attach(MIMEText(
        "Hi there,\n\nPlease join our Slack workspace using this link:\n\n"
        f"{os.environ['SLACK_WORKSPACE_INVITE_URL']}\n",
        "plain",
    ))
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender, os.environ["GMAIL_APP_PASSWORD"])
        server.sendmail(sender, recipient_email, message.as_string())


def send_work_account_activation(recipient_email: str, work_email: str, temporary_password: str) -> None:
    """Send first-sign-in instructions to an employee's personal address."""
    require_settings("GMAIL_SENDER_EMAIL", "GMAIL_APP_PASSWORD")
    sender = os.environ["GMAIL_SENDER_EMAIL"]
    message = MIMEMultipart()
    message["Subject"] = "Your Nigmafest work account"
    message["From"] = sender
    message["To"] = recipient_email
    message.attach(MIMEText(
        "Hi there,\n\n"
        "Your Nigmafest work account has been created.\n\n"
        f"Work email: {work_email}\n"
        f"Temporary password: {temporary_password}\n\n"
        "Sign in at https://accounts.google.com. You will be required to choose a new password.\n"
        "After you sign in, invitations to your work email will provide access to company tools.\n",
        "plain",
    ))
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender, os.environ["GMAIL_APP_PASSWORD"])
        server.sendmail(sender, recipient_email, message.as_string())
