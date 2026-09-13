import os

# Read external service credentials from environment variables.
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
LOG_ANALYTICS_WORKSPACE_ID = os.environ.get("LOG_ANALYTICS_WORKSPACE_ID", "")

if not OPENAI_API_KEY or not LOG_ANALYTICS_WORKSPACE_ID:
    print(
        "[_keys] Warning: OPENAI_API_KEY and/or LOG_ANALYTICS_WORKSPACE_ID "
        "are not set. Copy backend/.env.example to backend/.env and fill "
        "them in, or requests will fail once they reach OpenAI/Azure."
    )
