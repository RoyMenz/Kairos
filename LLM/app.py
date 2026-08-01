"""Minimal command-line chat client using the OpenAI Responses API."""

import os

from dotenv import load_dotenv
from openai import OpenAI


def main() -> None:
    load_dotenv()

    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit(
            "OPENAI_API_KEY is missing. Copy .env.example to .env and add your key."
        )

    client = OpenAI()
    model = os.getenv("OPENAI_MODEL", "gpt-5.6-sol")

    print(f"Chatting with {model}. Type 'exit' to quit.\n")
    previous_response_id: str | None = None

    while True:
        try:
            prompt = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if prompt.lower() in {"exit", "quit"}:
            print("Goodbye!")
            break
        if not prompt:
            continue

        request = {
            "model": model,
            "instructions": "You are a helpful, concise assistant.",
            "input": prompt,
        }
        if previous_response_id:
            request["previous_response_id"] = previous_response_id

        try:
            response = client.responses.create(**request)
        except Exception as exc:
            print(f"\nError: {exc}\n")
            continue

        print(f"\nAssistant: {response.output_text}\n")
        previous_response_id = response.id


if __name__ == "__main__":
    main()
