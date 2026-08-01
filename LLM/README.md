# Simple Python LLM Setup

A minimal interactive chat program built with Python and the OpenAI Responses API.

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

3. Copy the environment template and add your OpenAI API key:

   ```powershell
   Copy-Item .env.example .env
   ```

   Edit `.env` and replace `your_api_key_here`. Keep this file private; it is
   excluded from Git.

4. Start chatting:

   ```powershell
   python app.py
   ```

Type `exit` or `quit` to stop. Set `OPENAI_MODEL` in `.env` to use a different
model.

## How it works

Each prompt is sent through the Responses API. The preceding response ID is
included on later turns so the model retains the conversation context.
