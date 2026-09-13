# AI Agentic SOC

An AI-assisted SOC threat hunting application that turns natural-language security questions into targeted KQL investigations against Microsoft Azure Log Analytics, then analyzes the returned telemetry for suspicious activity.

The project combines a React frontend with a FastAPI backend, OpenAI models for query planning and threat analysis, Azure Log Analytics for telemetry, and Microsoft Defender for Endpoint for host isolation actions.

## What it does

- Accepts threat-hunting questions in natural language.
- Selects a relevant Log Analytics table, fields, filters, and time range.
- Validates the generated query context against configured table and field allow-lists.
- Builds and executes KQL queries against Azure Log Analytics.
- Analyzes returned telemetry with a selected OpenAI model.
- Maps findings to MITRE ATT&CK techniques where applicable.
- Extracts indicators of compromise, confidence levels, and recommended actions.
- Stores findings locally in JSONL for browsing and searching.
- Provides an Advanced mode for reviewing/editing KQL and selecting the analysis model.
- Provides an optional Microsoft Defender device-isolation action for qualifying high-confidence host findings.

## Investigation flow

```text
Natural-language question
        │
        ▼
AI query planning
        │
        ▼
Table / field guardrails
        │
        ▼
KQL generation
        │
        ▼
Azure Log Analytics
        │
        ▼
Threat-hunt analysis
        │
        ▼
Findings + MITRE ATT&CK + IOCs
        │
        ▼
Local investigation history
```

Quick mode runs this workflow as a single investigation.

Advanced mode separates planning from analysis so the generated KQL can be reviewed and edited before the final analysis is run.

## Supported telemetry

The query-planning layer currently includes guidance for:

- `DeviceProcessEvents`
- `DeviceNetworkEvents`
- `DeviceLogonEvents`
- `DeviceFileEvents`
- `DeviceRegistryEvents`
- `AlertInfo`
- `AlertEvidence`
- `AzureNetworkAnalytics_CL`
- `AzureActivity`
- `SigninLogs`
- `AuditLogs`

The exact fields available to generated queries are controlled by `backend/core/GUARDRAILS.py`.

## Project structure

```text
ai-agentic-soc/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── core/
│       ├── EXECUTOR.py
│       ├── GUARDRAILS.py
│       ├── MODEL_MANAGEMENT.py
│       ├── PROMPT_MANAGEMENT.py
│       ├── UTILITIES.py
│       └── _keys.py
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── api.js
│       ├── App.jsx
│       ├── main.jsx
│       └── theme.js
│
└── .gitignore
```

## Backend configuration

Create `backend/.env` using `backend/.env.example` as the template.

Required values:

```env
OPENAI_API_KEY=your-openai-api-key
LOG_ANALYTICS_WORKSPACE_ID=your-workspace-id
HUNT_PASSWORD=your-access-password
```

The backend also uses Azure's default credential chain for Azure resources. Configure an Azure identity with permission to query the target Log Analytics workspace and, when using host isolation, the required Microsoft Defender API permissions.

## Frontend configuration

Create `frontend/.env` using `frontend/.env.example`.

```env
VITE_API_BASE_URL=""
```

When running the backend locally on port `8000`, the application uses `http://localhost:8000` as the default API base URL.

If the backend is hosted elsewhere, set `VITE_API_BASE_URL` to the backend's API base URL.

## Running the application

### Backend

From `backend/`:

```bash
python -m venv .venv
```

Activate the environment and install the dependencies:

```bash
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API exposes a health endpoint at:

```text
/api/health
```

### Frontend

From `frontend/`:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The Vite development server uses port `5173` by default.

## Application routes

| Route | Purpose |
|---|---|
| `/` | Project landing page |
| `/quick` | Quick investigation workflow |
| `/advanced` | Query planning, KQL editing, and model selection |
| `/history` | Search previously logged findings |
| `/about` | Project overview |

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/plan` | Stream query planning and Log Analytics results |
| `POST` | `/api/analyze` | Run an edited KQL query and analyze its results |
| `GET` | `/api/investigate` | Stream the complete Quick mode investigation |
| `GET` | `/api/history` | Retrieve and search persisted findings |
| `POST` | `/api/isolate` | Request Microsoft Defender device isolation |

Quick mode and planning use Server-Sent Events so the frontend can display each investigation stage as it progresses.

## Model selection

The project keeps model metadata in `backend/core/GUARDRAILS.py`, including:

- Supported models
- Input and output token limits
- Approximate input/output pricing
- Tier-based token-per-minute limits

`backend/core/MODEL_MANAGEMENT.py` uses this information to estimate usage and cost for Advanced mode.

The configured default model is:

```text
gpt-5-mini
```

## Finding format

Threat-hunt results follow a structured format containing fields such as:

```json
{
  "title": "Suspicious activity",
  "description": "Evidence-based explanation",
  "mitre": {
    "tactic": "Execution",
    "technique": "Command and Scripting Interpreter",
    "id": "T1059"
  },
  "confidence": "High",
  "recommendations": [
    "Investigate"
  ],
  "indicators_of_compromise": [
    "example.exe"
  ],
  "tags": [
    "unusual command"
  ],
  "notes": "Additional analyst context"
}
```

Findings are appended to `backend/_threats.jsonl` with the investigation timestamp, original question, and selected table.

That file is ignored by Git so local investigation history does not become part of the public repository.

## Security model

- API access for investigation, planning, and device isolation is protected by `HUNT_PASSWORD`.
- Password comparison is performed using a constant-time comparison.
- Generated table and field selections are checked against explicit allow-lists before querying Log Analytics.
- Secrets are supplied through environment variables rather than source files.
- The local findings history is excluded from version control.
- Device isolation requires an explicit confirmation flow in the frontend.

## Technology

### Frontend

- React
- Vite
- React Router
- Material UI
- Emotion

### Backend

- FastAPI
- Uvicorn
- OpenAI API
- Azure Identity
- Azure Monitor Query
- Pandas
- tiktoken
- Pydantic
- python-dotenv

## MITRE ATT&CK

The threat-analysis prompts are designed to identify and map suspicious behavior to MITRE ATT&CK tactics, techniques, and sub-techniques when the available evidence supports the mapping.