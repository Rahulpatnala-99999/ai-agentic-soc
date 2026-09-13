from colorama import Fore, Style
import tiktoken
import GUARDRAILS

# Model service tier used for rate-limit estimates.
CURRENT_TIER = "4"
# Default model used by the application.
DEFAULT_MODEL = "gpt-5-mini"
# Usage threshold for warning messages.
WARNING_RATIO = 0.80

# Format an estimated USD cost for display.
def money(usd):
    return f"${usd:.6f}" if usd < 0.01 else f"${usd:.2f}"

# Choose terminal output styling based on usage against a limit.
def color_for_usage(used, limit):
    if limit is None:
        return Fore.LIGHTGREEN_EX
    if used > limit:
        return Fore.LIGHTRED_EX
    if used >= WARNING_RATIO * limit:
        return Fore.LIGHTYELLOW_EX
    return Fore.LIGHTGREEN_EX

# Format a usage value together with its limit.
def colorize(label, used, limit):
    col = color_for_usage(used, limit)
    lim = "∞" if limit is None else str(limit)
    return f"{label}: {col}{used}/{lim}{Style.RESET_ALL}"

# Estimate model cost from input and output token counts.
def estimate_cost(input_tokens, output_tokens, model_info):
    cin = input_tokens * model_info["cost_per_million_input"] / 1_000_000.0
    cout = output_tokens * model_info["cost_per_million_output"] / 1_000_000.0
    return cin + cout

# Display model limits, rate limits, and estimated costs.
def print_model_table(input_tokens, current_model, tier, assumed_output_tokens=500):
    print(f"Model limits and estimated total cost:{Fore.WHITE}\n")
    for name, info in GUARDRAILS.ALLOWED_MODELS.items():
        tpm_limit = info["tier"].get(tier)
        usage_text = colorize("input limit", input_tokens, info["max_input_tokens"])
        tpm_text = colorize("rate_limit", input_tokens, tpm_limit)
        est = estimate_cost(input_tokens, assumed_output_tokens, info)
        tag = f"{Fore.CYAN} <-- (current){Fore.WHITE}" if name == current_model else ""
        print(f"{name:<12} | {usage_text:<35} | {tpm_text:<32} | out_max: {info['max_output_tokens']:<6} | est_cost: {money(est)}{tag}")
    print("")

# Report whether a model's token usage fits its configured limits.
def assess_limits(model_name, input_tokens, tier):
    info = GUARDRAILS.ALLOWED_MODELS[model_name]
    msgs = []

    usage_txt = colorize("input limit", input_tokens, info["max_input_tokens"])
    if input_tokens > info["max_input_tokens"]:
        msgs.append(f"🚨 ERROR: {usage_txt} exceeds the input limit for {model_name}.")
    elif input_tokens >= WARNING_RATIO * info["max_input_tokens"]:
        msgs.append(f"⚠️ WARNING: {usage_txt} is at least 80% of the input limit for {model_name}.")
    else:
        msgs.append(f"✅ Safe: {usage_txt} is within the input limit for {model_name}.")

    tpm_limit = info["tier"].get(tier)
    tpm_txt = colorize("rate_limit", input_tokens, tpm_limit)
    if tpm_limit is not None:
        if input_tokens > tpm_limit:
            msgs.append(f"⚠️ WARNING: {tpm_txt} exceeds the TPM rate limit for {model_name} ({tpm_limit}) — may be too large.")
        elif input_tokens >= WARNING_RATIO * tpm_limit:
            msgs.append(f"⚠️ WARNING: {tpm_txt} is at least 80% of the TPM rate limit for {model_name}.")
        else:
            msgs.append(f"✅ Safe: {tpm_txt} is within the TPM rate limit for {model_name}.")
    else:
        msgs.append(f"ℹ️ No TPM tier limit known for {model_name} at tier '{tier}'.")

    if input_tokens > info["max_input_tokens"] or (tpm_limit is not None and input_tokens > tpm_limit):
        msgs += [
            "",
            "Try these to make it smaller:",
            " - Focus on one user or device",
            " - Use a shorter time range",
            " - Remove extra context you don't need",
        ]

    print("\n".join(msgs))
    print("")

# Present model choices and optionally let an interactive user select one.
def choose_model(model_name, input_tokens, tier=CURRENT_TIER, assumed_output_tokens=500, interactive=True):
    if model_name not in GUARDRAILS.ALLOWED_MODELS:
        print(Fore.LIGHTRED_EX + f"Unknown model '{model_name}'. Defaulting to {DEFAULT_MODEL}." + Style.RESET_ALL + Fore.RESET)
        model_name = DEFAULT_MODEL

    print_model_table(input_tokens, model_name, tier, assumed_output_tokens)
    assess_limits(model_name, input_tokens, tier)

    if not interactive:
        return model_name

    while True:
        prompt = f"{Fore.WHITE}Continue with '{model_name}'? (Enter to continue / type a model name / 'list'):{Fore.WHITE} "
        choice = input(prompt).strip()

        if choice == "" or choice.lower() in {"y", "yes", "continue", "c"}:
            info = GUARDRAILS.ALLOWED_MODELS[model_name]
            tpm_limit = info["tier"].get(tier)
            over_input = input_tokens > info["max_input_tokens"]
            over_tpm = (tpm_limit is not None) and (input_tokens > tpm_limit)

            if over_input or over_tpm:
                msg = "input limit" if over_input else "TPM rate limit"
                print(f"{Fore.YELLOW}⚠️ WARNING: input may exceed {model_name}'s {msg}.\n{Fore.WHITE}")

            return model_name

        if choice.lower() in {"list", "models"}:
            print("\nAvailable models: " + ", ".join(GUARDRAILS.ALLOWED_MODELS.keys()))
            continue

        if choice in GUARDRAILS.ALLOWED_MODELS:
            model_name = choice
            info = GUARDRAILS.ALLOWED_MODELS[model_name]
            print("")
            print(f"Switched to model: '{model_name}'.\n")

            assess_limits(model_name, input_tokens, tier)
            est = estimate_cost(input_tokens, assumed_output_tokens, info)
            print(f"estimated total cost: {money(est)}\n")
            continue

        print("Press Enter to continue, type a valid model name, or 'list' to see options.")

# Count message tokens using the model tokenizer with a general fallback.
def count_tokens(messages, model):
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")

    text = ""
    for m in messages:
        text += m.get("role", "") + " " + m.get("content", "") + "\n"
    return len(enc.encode(text))
