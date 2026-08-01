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
