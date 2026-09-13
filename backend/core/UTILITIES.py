import json
import os
from datetime import datetime, timezone
from colorama import Fore, Style, init

# Print the selected query context and filters for terminal users.
def display_query_context(query_context):
    print(f"{Fore.LIGHTGREEN_EX}Query context and metadata:")
    print(f"{Fore.WHITE}Table Name:   {query_context['table_name']}")
    hours = query_context['time_range_hours']
    if hours % 24 == 0:
        time_display = f"{hours // 24} day(s) ({hours} hour(s))"
    else:
        time_display = f"{hours} hour(s)"
    if query_context.get("time_start") and query_context.get("time_end"):
        print(f"{Fore.WHITE}Time Range:   {query_context['time_start']} to {query_context['time_end']}")
    else:
        print(f"{Fore.WHITE}Time Range:   Last {time_display}")
    print(f"{Fore.WHITE}Fields:       {query_context['fields']}")
    if query_context['device_name'] != "":
        print(f"{Fore.WHITE}Device:       {query_context['device_name']}")
    if query_context['caller'] != "":
        print(f"{Fore.WHITE}Caller:       {query_context['caller']}")
    if query_context['user_principal_name'] != "":
        print(f"{Fore.WHITE}Username:     {query_context['user_principal_name']}")
    print(f"{Fore.WHITE}User Related: {query_context['about_individual_user']}")
    print(f"{Fore.WHITE}Host Related: {query_context['about_individual_host']}")
    print(f"{Fore.WHITE}NSG Related:  {query_context['about_network_security_group']}")
    print(f"{Fore.WHITE}Rationale:\n{query_context['rationale']}\n")

# Render findings in the terminal and persist them to the local findings log.
def display_threats(threat_list, question="", table_name=""):
    count = 0
    for threat in threat_list:
        count += 1
        print(f"\n=============== Potential Threat #{count} ===============\n")
        print(f"{Fore.LIGHTCYAN_EX}Title: {threat.get('title')}{Fore.RESET}\n")
        print(f"Description: {threat.get('description')}\n")

        init(autoreset=True)

        confidence = threat.get('confidence', '').lower()

        if confidence == 'high':
            color = Fore.LIGHTRED_EX
        elif confidence == 'medium':
            color = Fore.LIGHTYELLOW_EX
        elif confidence == 'low':
            color = Fore.LIGHTBLUE_EX
        else:
            color = Style.RESET_ALL

        print(f"{color}Confidence Level: {threat.get('confidence')}")
        print("\nMITRE ATT&CK Info:")
        mitre = threat.get('mitre', {})
        print(f"  Tactic: {mitre.get('tactic')}")
        print(f"  Technique: {mitre.get('technique')}")
        print(f"  Sub-technique: {mitre.get('sub_technique')}")
        print(f"  ID: {mitre.get('id')}")
        print(f"  Description: {mitre.get('description')}")

        print("\nLog Lines:")
        for log in threat.get('log_lines', []):
            print(f"  - {log}")

        print("\nIndicators of Compromise:")
        for ioc in threat.get('indicators_of_compromise', []):
            print(f"  - {ioc}")

        print("\nTags:")
        for tag in threat.get('tags', []):
            print(f"  - {tag}")

        print("\nRecommendations:")
        for rec in threat.get('recommendations', []):
            print(f"  - {rec}")

        print(f"\nNotes: {threat.get('notes')}")

        print("=" * 51)

    append_threats_to_jsonl(threat_list=threat_list, question=question, table_name=table_name)

# Append structured findings with investigation metadata to the JSONL history file.
def append_threats_to_jsonl(threat_list, question="", table_name="", filename="_threats.jsonl"):
    count = 0
    timestamp = datetime.now(timezone.utc).isoformat()
    with open(filename, "a", encoding="utf-8") as f:
        for threat in threat_list:
            entry = dict(threat)
            entry["timestamp"] = timestamp
            entry["question"] = question
            entry["table_name"] = table_name
            json_line = json.dumps(entry, ensure_ascii=False)
            f.write(json_line + "\n")
            count += 1
        print(f"{Fore.LIGHTBLUE_EX}\nLogged {count} threats to {filename}.\n")

# Load, reverse, and optionally search the local finding history.
def fetch_threats_from_jsonl(query="", filename="_threats.jsonl"):
    entries = []
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    entries.reverse()

    query = (query or "").strip().lower()
    if not query:
        return entries

    def matches(entry):
        haystack = " ".join([
            str(entry.get("title", "")),
            str(entry.get("description", "")),
            str(entry.get("question", "")),
            str(entry.get("table_name", "")),
            " ".join(entry.get("tags", []) or []),
            " ".join(entry.get("indicators_of_compromise", []) or []),
        ]).lower()
        return query in haystack

    return [e for e in entries if matches(e)]

# Strip characters that could interfere with literal query values.
def sanitize_literal(s: str) -> str:
    return str(s).replace("|", " ").replace("\n", " ").replace(";", " ")

# Normalize model-generated query parameters before they reach query execution.
def sanitize_query_context(query_context):
    if 'caller' not in query_context:
        query_context['caller'] = ''

    if 'device_name' not in query_context:
        query_context['device_name'] = ''

    if 'user_principal_name' not in query_context:
        query_context['user_principal_name'] = ''
    if 'time_start' not in query_context:
        query_context['time_start'] = ''
    if 'time_end' not in query_context:
        query_context['time_end'] = ''

    if 'device_name' in query_context:
        query_context['device_name'] = sanitize_literal(query_context['device_name'])

    if 'caller' in query_context:
        query_context['caller'] = sanitize_literal(query_context['caller'])

    if "user_principal_name" in query_context:
        query_context['user_principal_name'] = sanitize_literal(query_context['user_principal_name'])

    try:
        query_context["time_range_hours"] = int(query_context.get("time_range_hours", 72))
    except (TypeError, ValueError):
        query_context["time_range_hours"] = 72
    if query_context["time_range_hours"] < 1:
        query_context["time_range_hours"] = 72

    query_context["time_start"] = sanitize_literal(query_context.get("time_start", "")).strip()
    query_context["time_end"] = sanitize_literal(query_context.get("time_end", "")).strip()
    if bool(query_context["time_start"]) != bool(query_context["time_end"]):
        query_context["time_start"] = ""
        query_context["time_end"] = ""

    query_context["fields"] = ', '.join(query_context["fields"])

    return query_context
