from datetime import timedelta, datetime, timezone
import json

import pandas as pd
from colorama import Fore, Style
from openai import RateLimitError, OpenAIError
from azure.identity import DefaultAzureCredential
import requests, urllib.parse

import PROMPT_MANAGEMENT

# Acquire an Azure access token for Microsoft Defender API operations.
def get_bearer_token():
    credential = DefaultAzureCredential()
    token = credential.get_token("https://api.securitycenter.microsoft.com/.default")
    return token

# Resolve a Defender device name to its machine identifier.
def get_mde_workstation_id_from_name(token, device_name):
    headers = {"Authorization": f"Bearer {token.token}"}

    filter_q = urllib.parse.quote(f"startswith(computerDnsName,'{device_name}')")
    url = f"https://api.securitycenter.microsoft.com/api/machines?$filter={filter_q}"

    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()

    machines = resp.json().get("value", [])
    if not machines:
        raise Exception(f"No machine found starting with {device_name}")

    machine_id = machines[0]["id"]
    return machine_id

# Send the device isolation request to Microsoft Defender.
def quarantine_virtual_machine(token, machine_id):

    headers = {
        "Authorization": f"Bearer {token.token}",
        "Content-Type": "application/json"
    }

    payload = {
        "Comment": "Isolation via Python Agentic AI using DefaultAzureCredential",
        "IsolationType": "Full"
    }

    resp = requests.post(
        f"https://api.securitycenter.microsoft.com/api/machines/{machine_id}/isolate",
        headers=headers,
        json=payload,
        timeout=30
    )

    if resp.status_code in (200, 201):
        return True
    return False

# Run the threat-hunt analysis model against the queried telemetry and parse its structured findings.
def hunt(openai_client, threat_hunt_system_message, threat_hunt_user_message, openai_model):

    results = []

    messages = [
        threat_hunt_system_message,
        threat_hunt_user_message
    ]

    try:
        response = openai_client.chat.completions.create(
            model=openai_model,
            messages=messages,
            response_format={"type": "json_object"}
        )

        results = json.loads(response.choices[0].message.content)
        return results

    except RateLimitError as e:
        error_msg = str(e)

        print(f"{Fore.LIGHTRED_EX}{Style.BRIGHT}🚨ERROR: Rate limit or token overage detected!{Style.RESET_ALL}")
        print(f"{Fore.LIGHTRED_EX}{Style.BRIGHT}The input was too large for this model or hit rate limits.")
        print(f"{Style.RESET_ALL}——————————\nRaw Error:\n{error_msg}\n——————————")
        print(f"{Fore.WHITE}Suggestions:")
        print(f"- Use fewer logs or reduce input size.")
        print(f"- Switch to a model with a larger context window.")
        print(f"- Retry later if rate-limited.\n")

        return None

    except OpenAIError as e:
        print(f"{Fore.RED}Unexpected OpenAI API error:\n{e}")
        return None

# Ask the model to select the Log Analytics table, fields, filters, and time range.
def get_query_context(openai_client, user_message, model):

    print(f"{Fore.LIGHTGREEN_EX}\nDeciding log search parameters based on user request...\n")

    system_message = PROMPT_MANAGEMENT.SYSTEM_PROMPT_TOOL_SELECTION

    response = openai_client.chat.completions.create(
        model=model,
        messages=[system_message, user_message],
        tools=PROMPT_MANAGEMENT.TOOLS,
        tool_choice="required"
    )

    function_call = response.choices[0].message.tool_calls[0]
    args = json.loads(function_call.function.arguments)

    return args

# Build and execute a constrained KQL query against the Log Analytics workspace.
def query_log_analytics(log_analytics_client, workspace_id, timerange_hours, table_name, device_name, fields, caller, user_principal_name, time_start="", time_end=""):
    try:
        timerange_hours = int(timerange_hours)
    except (TypeError, ValueError):
        timerange_hours = 72
    timerange_hours = max(1, timerange_hours)

    if time_start and time_end:
        time_filter = f'| where TimeGenerated between (datetime("{time_start}") .. datetime("{time_end}"))'

        try:
            start_dt = datetime.fromisoformat(time_start.replace("Z", "+00:00"))
            now_utc = datetime.now(timezone.utc)
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            query_timespan = max(timedelta(seconds=1), now_utc - start_dt.astimezone(timezone.utc))
        except (TypeError, ValueError):
            query_timespan = timedelta(hours=timerange_hours)
        displayed_range = f"{time_start} to {time_end}"
    else:
        time_filter = f"| where TimeGenerated >= ago({timerange_hours}h)"
        query_timespan = timedelta(hours=timerange_hours)
        displayed_range = f"last {timerange_hours} hour(s)"

    if table_name == "AzureNetworkAnalytics_CL":
        user_query = f"""{table_name}
{time_filter}
| where FlowType_s == "MaliciousFlow"
| project {fields}
| take 5000"""
    elif table_name == "AzureActivity":
        user_query = f"""{table_name}
{time_filter}
| where isnotempty(Caller) and Caller !in ("d37a587a-4ef3-464f-a288-445e60ed248c","ef669d55-9245-4118-8ba7-f78e3e7d0212","3e4fe3d2-24ff-4972-92b3-35518d6e6462")
| where Caller startswith "{caller}"
| project {fields}
| take 5000"""
    elif table_name == "SigninLogs":
        user_filter = (
            f'| where UserPrincipalName startswith "{user_principal_name}"'
            if user_principal_name else ""
        )
        user_query = f"""{table_name}
{time_filter}
{user_filter}
| project {fields}
| take 5000"""
    else:
        user_query = f"""{table_name}
{time_filter}
| where DeviceName startswith "{device_name}"
| project {fields}
| take 5000"""

    print(f"{Fore.LIGHTGREEN_EX}Time filter: {displayed_range}")
    print(f"{Fore.LIGHTGREEN_EX}Constructed KQL Query:")
    print(f"{Fore.WHITE}{user_query}\n")
    print(f"{Fore.LIGHTGREEN_EX}Querying Log Analytics Workspace ID: '{workspace_id}'...")

    response = log_analytics_client.query_workspace(
        workspace_id=workspace_id,
        query=user_query,
        timespan=query_timespan
    )

    if len(response.tables[0].rows) == 0:
        print(f"{Fore.WHITE}No data returned from Log Analytics.")
        return {"records": "", "count": 0, "query": user_query}

    table = response.tables[0]
    record_count = len(table.rows)
    df = pd.DataFrame(table.rows, columns=table.columns)
    records = df.to_csv(index=False)
    return {"records": records, "count": record_count, "query": user_query}

# Execute a user-edited KQL query and return its results as CSV text.
def query_log_analytics_raw(log_analytics_client, workspace_id, kql_query, timerange_hours=72):
    try:
        timerange_hours = int(timerange_hours)
    except (TypeError, ValueError):
        timerange_hours = 72
    timerange_hours = max(1, timerange_hours)

    response = log_analytics_client.query_workspace(
        workspace_id=workspace_id,
        query=kql_query,
        timespan=timedelta(hours=timerange_hours)
    )

    if len(response.tables[0].rows) == 0:
        return {"records": "", "count": 0, "query": kql_query}

    table = response.tables[0]
    record_count = len(table.rows)
    df = pd.DataFrame(table.rows, columns=table.columns)
    records = df.to_csv(index=False)
    return {"records": records, "count": record_count, "query": kql_query}
