import hmac
import json
import os
import sys
import time

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient

load_dotenv()

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "core"))

import _keys
import EXECUTOR
import GUARDRAILS
import MODEL_MANAGEMENT
import PROMPT_MANAGEMENT
import UTILITIES

# Backend-local paths and authentication configuration.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
THREATS_JSONL_PATH = os.path.join(BACKEND_DIR, "_threats.jsonl")

HUNT_PASSWORD = os.environ.get("HUNT_PASSWORD", "")

# Validate the shared access password before protected operations.
def check_password(password: str):
    if not HUNT_PASSWORD:
        raise HTTPException(status_code=500, detail="Server has no HUNT_PASSWORD configured — set it in backend/.env.")
    if not hmac.compare_digest(password or "", HUNT_PASSWORD):
        raise HTTPException(status_code=401, detail="Incorrect password.")

# Create the API application and configure browser access.
app = FastAPI(title="Threat Hunt UI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients for Azure Log Analytics and OpenAI-backed analysis.
law_client = LogsQueryClient(credential=DefaultAzureCredential())

openai_client = OpenAI(api_key=_keys.OPENAI_API_KEY or "sk-not-configured")
model = MODEL_MANAGEMENT.DEFAULT_MODEL

# Format a server-sent event payload for the frontend progress stream.
def sse_pack(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"

# Run the complete natural-language threat hunting workflow from planning through AI analysis.
def run_investigation(question: str):

    user_message = PROMPT_MANAGEMENT.get_user_message(question)

    yield sse_pack("progress", {"step": "context", "label": "Deciding log search parameters..."})
    try:
        raw_query_context = EXECUTOR.get_query_context(openai_client, user_message, model)
        query_context = UTILITIES.sanitize_query_context(raw_query_context)
    except Exception as e:
        yield sse_pack("result", {
            "question": question,
            "error": {
                "title": "Couldn't Plan This Query",
                "message": "The model call to decide search parameters failed.",
                "detail": str(e),
            },
        })
        return

    yield sse_pack("progress", {"step": "guardrails", "label": "Validating tables and fields..."})
    try:
        GUARDRAILS.validate_tables_and_fields(query_context["table_name"], query_context["fields"])
    except ValueError as e:
        yield sse_pack("result", {
            "question": question,
            "query_context": query_context,
            "error": {
                "title": "Guardrail Blocked This Query",
                "message": "The AI selected a table or field that isn't in the allowed list, so nothing was queried. Try rephrasing your question.",
                "detail": str(e),
            },
        })
        return

    yield sse_pack("progress", {"step": "query", "label": "Querying Log Analytics workspace..."})
    try:
        law_query_results = EXECUTOR.query_log_analytics(
            log_analytics_client=law_client,
            workspace_id=_keys.LOG_ANALYTICS_WORKSPACE_ID,
            timerange_hours=query_context["time_range_hours"],
            table_name=query_context["table_name"],
            device_name=query_context["device_name"],
            fields=query_context["fields"],
            caller=query_context["caller"],
            user_principal_name=query_context["user_principal_name"],
            time_start=query_context.get("time_start", ""),
            time_end=query_context.get("time_end", ""),
        )
    except Exception as e:
        yield sse_pack("result", {
            "question": question,
            "query_context": query_context,
            "error": {
                "title": "Log Analytics Query Failed",
                "message": "The query against Log Analytics didn't complete. Check the server terminal for details.",
                "detail": str(e),
            },
        })
        return

    number_of_records = law_query_results["count"]
    kql_query = law_query_results.get("query")

    if number_of_records == 0:
        yield sse_pack("result", {
            "question": question,
            "query_context": query_context,
            "kql_query": kql_query,
            "number_of_records": 0,
        })
        return

    yield sse_pack("progress", {"step": "prompt", "label": "Building threat hunt prompt..."})
    threat_hunt_user_message = PROMPT_MANAGEMENT.build_threat_hunt_prompt(
        user_prompt=user_message["content"],
        table_name=query_context["table_name"],
        log_data=law_query_results["records"],
    )

    yield sse_pack("progress", {"step": "hunt", "label": "Running AI threat hunt..."})
    hunt_results = EXECUTOR.hunt(
        openai_client=openai_client,
        threat_hunt_system_message=PROMPT_MANAGEMENT.SYSTEM_PROMPT_THREAT_HUNT,
        threat_hunt_user_message=threat_hunt_user_message,
        openai_model=model,
    )

    if not hunt_results:
        yield sse_pack("result", {
            "question": question,
            "query_context": query_context,
            "kql_query": kql_query,
            "number_of_records": number_of_records,
            "error": {
                "title": "Threat Analysis Failed",
                "message": "The AI analysis call failed (rate limit or API error). Check the server terminal for details.",
            },
        })
        return

    findings = hunt_results.get("findings", [])
    UTILITIES.append_threats_to_jsonl(
        findings,
        question=question,
        table_name=query_context["table_name"],
        filename=THREATS_JSONL_PATH,
    )

    yield sse_pack("result", {
        "question": question,
        "query_context": query_context,
        "kql_query": kql_query,
        "number_of_records": number_of_records,
        "findings": findings,
    })

# Estimate token usage, model limits, and approximate analysis cost for Advanced mode.
def compute_model_estimates(threat_hunt_user_message: dict):
    messages = [PROMPT_MANAGEMENT.SYSTEM_PROMPT_THREAT_HUNT, threat_hunt_user_message]
    tier = MODEL_MANAGEMENT.CURRENT_TIER
    estimates = []
    for name, info in GUARDRAILS.ALLOWED_MODELS.items():
        try:
            input_tokens = MODEL_MANAGEMENT.count_tokens(messages, name)
        except Exception:

            text_len = sum(len(m.get("content", "")) for m in messages)
            input_tokens = max(1, text_len // 4)
        rate_limit_tpm = info["tier"].get(tier)
        estimated_cost = MODEL_MANAGEMENT.estimate_cost(input_tokens, 500, info)
        estimates.append({
            "name": name,
            "input_tokens": input_tokens,
            "max_input_tokens": info["max_input_tokens"],
            "max_output_tokens": info["max_output_tokens"],
            "rate_limit_tpm": rate_limit_tpm,
            "estimated_cost": round(estimated_cost, 6),
            "over_input_limit": input_tokens > info["max_input_tokens"],
            "over_rate_limit": rate_limit_tpm is not None and input_tokens > rate_limit_tpm,
            "is_default": name == MODEL_MANAGEMENT.DEFAULT_MODEL,
        })
    return estimates

# Run the planning and query stage used by Advanced mode.
def run_plan(question: str):

    user_message = PROMPT_MANAGEMENT.get_user_message(question)

    yield sse_pack("progress", {"step": "context", "label": "Deciding log search parameters..."})
    try:
        raw_query_context = EXECUTOR.get_query_context(openai_client, user_message, model)
        query_context = UTILITIES.sanitize_query_context(raw_query_context)
    except Exception as e:
        yield sse_pack("result", {
            "question": question,
            "error": {
                "title": "Couldn't Plan This Query",
                "message": "The model call to decide search parameters failed.",
                "detail": str(e),
            },
        })
        return

    yield sse_pack("progress", {"step": "guardrails", "label": "Validating tables and fields..."})
    try:
        GUARDRAILS.validate_tables_and_fields(query_context["table_name"], query_context["fields"])
    except ValueError as e:
        yield sse_pack("result", {
            "question": question,
            "query_context": query_context,
            "error": {
                "title": "Guardrail Blocked This Query",
                "message": "The AI selected a table or field that isn't in the allowed list, so nothing was queried. Try rephrasing your question.",
                "detail": str(e),
            },
        })
        return

    yield sse_pack("progress", {"step": "query", "label": "Querying Log Analytics workspace..."})
    try:
        law_query_results = EXECUTOR.query_log_analytics(
            log_analytics_client=law_client,
            workspace_id=_keys.LOG_ANALYTICS_WORKSPACE_ID,
            timerange_hours=query_context["time_range_hours"],
            table_name=query_context["table_name"],
            device_name=query_context["device_name"],
            fields=query_context["fields"],
            caller=query_context["caller"],
            user_principal_name=query_context["user_principal_name"],
            time_start=query_context.get("time_start", ""),
            time_end=query_context.get("time_end", ""),
        )
    except Exception as e:
        yield sse_pack("result", {
            "question": question,
            "query_context": query_context,
            "error": {
                "title": "Log Analytics Query Failed",
                "message": "The query against Log Analytics didn't complete. Check the server terminal for details.",
                "detail": str(e),
            },
        })
        return

    number_of_records = law_query_results["count"]
    kql_query = law_query_results.get("query")

    base_result = {
        "question": question,
        "query_context": query_context,
        "kql_query": kql_query,
        "number_of_records": number_of_records,
        "timerange_hours": query_context.get("time_range_hours"),
    }

    if number_of_records == 0:
        yield sse_pack("result", {**base_result, "models": []})
        return

    threat_hunt_user_message = PROMPT_MANAGEMENT.build_threat_hunt_prompt(
        user_prompt=user_message["content"],
        table_name=query_context["table_name"],
        log_data=law_query_results["records"],
    )
    models = compute_model_estimates(threat_hunt_user_message)

    yield sse_pack("result", {**base_result, "models": models})

@app.get("/api/health")
# Expose a lightweight API health check.
def health():
    return {"status": "ok"}

@app.get("/api/plan")
# Stream the query plan and query results for Advanced mode.
def plan(question: str = "", password: str = Query(default="")):
    check_password(password)
    question = question.strip()
    if not question:
        def empty():
            yield sse_pack("result", {"error": {"title": "No Question Provided", "message": "Type a question first."}})
        return StreamingResponse(empty(), media_type="text/event-stream")

    return StreamingResponse(run_plan(question), media_type="text/event-stream")

# Request body for Advanced mode analysis.
class AnalyzeRequest(BaseModel):
    question: str
    table_name: str
    timerange_hours: int = 72
    kql_query: str
    model: str

@app.post("/api/analyze")
# Execute an edited KQL query and analyze the returned telemetry with the selected model.
def analyze(body: AnalyzeRequest):
    question = body.question.strip()
    kql_query = body.kql_query.strip()
    if not question or not kql_query:
        raise HTTPException(status_code=400, detail="question and kql_query are required")

    try:
        GUARDRAILS.validate_model(body.model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        law_query_results = EXECUTOR.query_log_analytics_raw(
            log_analytics_client=law_client,
            workspace_id=_keys.LOG_ANALYTICS_WORKSPACE_ID,
            kql_query=kql_query,
            timerange_hours=body.timerange_hours,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Log Analytics query failed: {e}")

    number_of_records = law_query_results["count"]
    if number_of_records == 0:
        return {
            "question": question,
            "kql_query": kql_query,
            "number_of_records": 0,
        }

    threat_hunt_user_message = PROMPT_MANAGEMENT.build_threat_hunt_prompt(
        user_prompt=question,
        table_name=body.table_name,
        log_data=law_query_results["records"],
    )

    hunt_results = EXECUTOR.hunt(
        openai_client=openai_client,
        threat_hunt_system_message=PROMPT_MANAGEMENT.SYSTEM_PROMPT_THREAT_HUNT,
        threat_hunt_user_message=threat_hunt_user_message,
        openai_model=body.model,
    )

    if not hunt_results:
        return {
            "question": question,
            "kql_query": kql_query,
            "number_of_records": number_of_records,
            "error": {
                "title": "Threat Analysis Failed",
                "message": "The AI analysis call failed (rate limit or API error). Check the server terminal for details.",
            },
        }

    findings = hunt_results.get("findings", [])
    UTILITIES.append_threats_to_jsonl(
        findings,
        question=question,
        table_name=body.table_name,
        filename=THREATS_JSONL_PATH,
    )

    return {
        "question": question,
        "kql_query": kql_query,
        "number_of_records": number_of_records,
        "findings": findings,
    }

@app.get("/api/investigate")
# Stream the complete investigation workflow for Quick mode.
def investigate(question: str = "", password: str = Query(default="")):
    check_password(password)
    question = question.strip()
    if not question:
        def empty():
            yield sse_pack("result", {"error": {"title": "No Question Provided", "message": "Type a question first."}})
        return StreamingResponse(empty(), media_type="text/event-stream")

    return StreamingResponse(run_investigation(question), media_type="text/event-stream")

@app.get("/api/history")
# Return logged findings, optionally filtered by a search term.
def history(q: str = ""):
    return {"entries": UTILITIES.fetch_threats_from_jsonl(query=q, filename=THREATS_JSONL_PATH)}

# Request body for Defender device isolation.
class IsolateRequest(BaseModel):
    device_name: str
    password: str = ""

@app.post("/api/isolate")
# Request isolation of a selected device through Microsoft Defender.
def isolate(body: IsolateRequest):
    check_password(body.password)
    device_name = body.device_name.strip()
    if not device_name:
        raise HTTPException(status_code=400, detail="device_name is required")

    try:
        token = EXECUTOR.get_bearer_token()
        machine_id = EXECUTOR.get_mde_workstation_id_from_name(token=token, device_name=device_name)
        isolated = EXECUTOR.quarantine_virtual_machine(token=token, machine_id=machine_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "isolated": bool(isolated),
        "device_name": device_name,
        "machine_id": machine_id,
        "release_url": "https://security.microsoft.com/",
    }

# Start the development server when this module is run directly.
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
