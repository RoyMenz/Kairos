# Kairos employee onboarding

An employee-onboarding service for Google Workspace and Slack. Google Workspace
provisioning creates a work account with a temporary password and requires a
password change at first sign-in. Slack onboarding then assigns a channel based
on the employee's designation.

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

3. Configure the linked `.env` file with the required Slack, Gemini, Gmail, and
   Google Workspace settings. Keep credentials and `service-account.json` private.

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
