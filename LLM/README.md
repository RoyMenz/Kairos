# Kairos employee onboarding

An employee-onboarding service for Zoho Workplace and Slack. Zoho Workplace
provisioning creates a work account with a temporary password, requires a
password change at first sign-in, and sends a Slack invitation to the new work
email. The Slack listener assigns a channel based on the employee's designation
after they join.

## Setup

1. Create and activate a virtual environment:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install dependencies:

   ```powershell
   python -m pip install -r requirements.txt
   ```

3. Configure the linked `.env` file with the required Slack, Gemini, and
   Zoho Workplace settings. Keep OAuth credentials private. Required Zoho settings:
   `ZOHO_WORKPLACE_DOMAIN`, `ZOHO_ORGANIZATION_ID`, `ZOHO_CLIENT_ID`,
   `ZOHO_CLIENT_SECRET`, and `ZOHO_REFRESH_TOKEN`. Set `ZOHO_MAIL_API_BASE` and
   `ZOHO_ACCOUNTS_URL` only when your Zoho account is outside the `.com` data center.
   Add `ZOHO_SMTP_SENDER_EMAIL`, `ZOHO_SMTP_APP_PASSWORD`, and
   `ZOHO_SMTP_HOST` to send onboarding messages from your Zoho admin mailbox.

4. Provision a work account:

   ```powershell
   python app.py provision-workspace PERSONAL_EMAIL FIRST_NAME LAST_NAME "DESIGNATION"
   ```

   Example:

   ```powershell
   python app.py provision-workspace person@gmail.com Abc Smith "Backend developer"
   ```

5. Run the Slack event listener:

   ```powershell
   python app.py listen
   ```

## How it works

The LLM maps a designation to an approved role (`backend` or `frontend`) for
later access assignment. The generated work address uses
`firstname@nigmafest.in`. The service never logs the temporary password.
