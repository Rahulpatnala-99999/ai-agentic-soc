// Provide the step-by-step investigation flow with editable KQL and model selection.
import { useState, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography, TextField, Button } from "@mui/material";
import { tokens } from "../theme";
import { planQuery, analyze } from "../api";
import ProgressSteps, { PLAN_STEPS } from "../components/ProgressSteps";
import ResultsSection from "../components/ResultsSection";
import ModeToggle from "../components/ModeToggle";
import PasswordField from "../components/PasswordField";

// Format estimated model cost for the model-selection UI.
function formatCost(usd) {
  if (usd == null) return "\u2014";
  return usd < 0.01 ? `$${usd.toFixed(6)}` : `$${usd.toFixed(2)}`;
}

// Format token counts for compact display.
function formatTokens(n) {
  if (n == null) return "\u2014";
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

// Convert query time metadata into a readable label.
function timeRangeLabel(ctx) {
  if (!ctx) return "";
  if (ctx.time_start && ctx.time_end) return `${ctx.time_start} to ${ctx.time_end}`;
  return `${ctx.time_range_hours}h`;
}

// Let long names wrap at word boundaries (e.g. "DeviceProcess" / "Events").
function softWrap(text) {
  return (text || "").replace(/([a-z])([A-Z])/g, "$1\u200B$2");
}

// Manage planning, KQL editing, model selection, and final analysis.
export default function AdvancedModePage() {
  // Planning, query-editing, model-selection, and analysis state.
  const [question, setQuestion] = useState("");
  const [planPassword, setPlanPassword] = useState("");
  const [planning, setPlanning] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [editedKql, setEditedKql] = useState("");
  const [selectedModel, setSelectedModel] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const sourceRef = useRef(null);

  // Request a query plan and populate the editable investigation context.
  // Run query planning and store the generated context for review.
  function handlePlan(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    const pw = planPassword;
    setPlanPassword("");

    if (sourceRef.current) sourceRef.current.close();
    setPlan(null);
    setPlanError(null);
    setResult(null);
    setActiveStep(null);
    setPlanning(true);

    sourceRef.current = planQuery(q, pw, {
      onProgress: (data) => setActiveStep(data.step),
      onResult: (data) => {
        setPlanning(false);
        if (data.error) {
          setPlanError(data.error);
          return;
        }
        setPlan(data);
        setEditedKql(data.kql_query || "");
        const models = data.models || [];
        setSelectedModel(models.find((m) => m.is_default)?.name || models[0]?.name || null);
      },
      onError: () => {
        setPlanning(false);
        setPlanError({ title: "Request Failed", message: "Either the password was wrong or the connection was interrupted. Check the server terminal and try again." });
      },
    });
  }

  // Execute the reviewed query and selected model to produce findings.
  async function handleAnalyze() {
    if (!plan || !selectedModel || analyzing) return;
    setAnalyzing(true);
    setResult(null);

    const data = await analyze({
      question: plan.question,
      tableName: plan.query_context.table_name,
      timerangeHours: plan.timerange_hours,
      kqlQuery: editedKql,
      model: selectedModel,
    });

    setAnalyzing(false);
    setResult(data.error ? data : { ...data, query_context: plan.query_context });
  }

  // Render the staged planning and analysis workflow.
  return (
    <Box>
      <Box component="header" sx={{ pb: "20px", mb: "4px" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", mb: "18px" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: tokens.fontMono, fontSize: "0.78rem", color: tokens.accent }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: tokens.accent }} />
            Threat Hunting Agent
            <Box component="span" sx={{ color: tokens.border2 }}>&middot;</Box>
            <Box component="span" sx={{ color: tokens.faint }}>Advanced mode</Box>
          </Box>
          <ModeToggle />
        </Box>

        <Typography component="h1" sx={{ m: 0, fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.01em", color: tokens.ink }}>
          Agentic SOC Analyst
        </Typography>

        <Typography sx={{ maxWidth: 800, mt: "12px", fontSize: "0.95rem", lineHeight: 1.65, color: tokens.muted }}>
          <Box component="strong" sx={{ color: tokens.ink, fontWeight: 600 }}>Investigate with full control.</Box>
          {" Review the generated "}
          <Box component="strong" sx={{ color: tokens.ink, fontWeight: 600 }}>KQL</Box>
          {", compare model "}
          <Box component="strong" sx={{ color: tokens.ink, fontWeight: 600 }}>capabilities and costs</Box>
          {", inspect the investigation plan, and execute the hunt when you're ready."}
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handlePlan}
        sx={{
          display: "flex",
          alignItems: "stretch",
          bgcolor: tokens.surface,
          border: `1px solid ${tokens.border2}`,
          borderRadius: `${tokens.radius}px`,
          my: "22px",
          mb: "14px",
        }}
      >
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", pl: "14px", fontFamily: tokens.fontMono, fontSize: "0.95rem", color: tokens.accent }}>
          &gt;
        </Box>
        <TextField
          autoFocus
          fullWidth
          variant="standard"
          placeholder="has windows-target-1 had any suspicious logons in the last 3 days?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          InputProps={{ disableUnderline: true }}
          sx={{
            flex: 1,
            "& .MuiInputBase-input": {
              fontFamily: tokens.fontMono,
              fontSize: "0.92rem",
              color: tokens.ink,
              padding: "13px 12px",
              "&::placeholder": { color: tokens.faint, opacity: 1 },
            },
          }}
        />
        <PasswordField value={planPassword} onChange={(e) => setPlanPassword(e.target.value)} sx={{ width: 130, flexShrink: 0, borderLeft: `1px solid ${tokens.border2}` }} />
        <Button
          type="submit"
          disabled={planning}
          sx={{
            flexShrink: 0,
            borderLeft: `1px solid ${tokens.border2}`,
            borderRadius: `0 ${tokens.radius - 1}px ${tokens.radius - 1}px 0`,
            bgcolor: planning ? tokens.border2 : tokens.accent,
            color: planning ? tokens.muted : tokens.accentInk,
            fontSize: "0.88rem",
            fontWeight: 600,
            px: "22px",
            "&:hover": { bgcolor: planning ? tokens.border2 : "#6ecabf" },
            "&.Mui-disabled": { color: tokens.muted },
          }}
        >
          {planning ? "Investigating\u2026" : "Investigate"}
        </Button>
      </Box>

      <Typography sx={{ color: tokens.faint, fontSize: "0.82rem", lineHeight: 1.6, mb: "32px" }}>
        {"This is a public demo \u2014 the AI query planning and threat-hunt analysis below are real (and run on the owner's OpenAI balance), against a live Log Analytics workspace. It's still password-protected to prevent abuse. Browse the "}
        <Box component={RouterLink} to="/history" sx={{ color: tokens.muted, textDecoration: "underline", textUnderlineOffset: "2px", "&:hover": { color: tokens.accent } }}>
          History
        </Box>
        {" page to see past findings."}
      </Typography>

      <ProgressSteps activeStep={activeStep} complete={Boolean(plan)} steps={PLAN_STEPS} />

      {planError && (
        <Box sx={{ bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "20px 22px", mb: "20px" }}>
          <Typography sx={{ color: tokens.sevHigh, fontSize: "1rem", fontWeight: 600, mb: 1 }}>{planError.title}</Typography>
          {planError.message && <Typography sx={{ color: tokens.muted, fontSize: "0.9rem" }}>{planError.message}</Typography>}
          {planError.detail && (
            <Box component="pre" sx={{ fontFamily: tokens.fontMono, fontSize: "0.8rem", color: tokens.muted, bgcolor: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "10px 12px", mt: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {planError.detail}
            </Box>
          )}
        </Box>
      )}

      {plan && !result && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "110px 1.3fr 1fr" },
            gap: "14px",
            mb: "24px",
          }}
        >
          <Box>
            <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.68rem", color: tokens.faint, mb: "8px" }}>context</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Box sx={{ fontFamily: tokens.fontMono, fontSize: "0.68rem", bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "5px 7px", color: tokens.muted, overflowWrap: "anywhere" }}>
                table<br /><Box component="span" sx={{ color: tokens.ink }}>{softWrap(plan.query_context?.table_name)}</Box>
              </Box>
              <Box sx={{ fontFamily: tokens.fontMono, fontSize: "0.68rem", bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "5px 7px", color: tokens.muted, overflowWrap: "anywhere" }}>
                range<br /><Box component="span" sx={{ color: tokens.ink }}>{timeRangeLabel(plan.query_context)}</Box>
              </Box>
              {plan.query_context?.device_name && (
                <Box sx={{ fontFamily: tokens.fontMono, fontSize: "0.68rem", bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "5px 7px", color: tokens.muted, overflowWrap: "anywhere" }}>
                  host<br /><Box component="span" sx={{ color: tokens.ink }}>{plan.query_context.device_name}</Box>
                </Box>
              )}
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.68rem", color: tokens.faint, mb: "8px" }}>query &mdash; editable</Typography>
            <Box
              component="textarea"
              value={editedKql}
              onChange={(e) => setEditedKql(e.target.value)}
              spellCheck={false}
              sx={{
                width: "100%",
                minHeight: 130,
                resize: "vertical",
                bgcolor: tokens.surface,
                border: `1px solid ${tokens.border2}`,
                borderRadius: `${tokens.radius}px`,
                p: "11px 13px",
                fontFamily: tokens.fontMono,
                fontSize: "0.72rem",
                lineHeight: 1.7,
                color: tokens.ink,
                outline: "none",
                "&:focus": { borderColor: tokens.accent },
              }}
            />
            <Typography sx={{ mt: "8px", fontFamily: tokens.fontMono, fontSize: "0.68rem", color: tokens.muted }}>
              {plan.number_of_records} record{plan.number_of_records === 1 ? "" : "s"}
              {editedKql !== plan.kql_query ? " \u00b7 edited, will re-run on Analyze" : ""}
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.68rem", color: tokens.faint, mb: "8px" }}>model</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "5px", mb: "12px" }}>
              {(plan.models || []).map((m) => {
                const active = m.name === selectedModel;
                const overLimit = m.over_input_limit || m.over_rate_limit;
  // Render the staged planning and analysis workflow.
                return (
                  <Box
                    key={m.name}
                    onClick={() => setSelectedModel(m.name)}
                    sx={{
                      cursor: "pointer",
                      border: `1px solid ${active ? tokens.accent : tokens.border}`,
                      bgcolor: active ? "rgba(79,184,172,0.08)" : "transparent",
                      borderRadius: `${tokens.radius}px`,
                      p: "7px 9px",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", fontFamily: tokens.fontMono, fontSize: "0.72rem" }}>
                      <Box component="span" sx={{ color: active ? tokens.accent : tokens.muted }}>{m.name}</Box>
                      <Box component="span" sx={{ color: overLimit ? tokens.sevHigh : tokens.ink }}>{formatCost(m.estimated_cost)}</Box>
                    </Box>
                    <Box sx={{ fontFamily: tokens.fontMono, fontSize: "0.64rem", color: tokens.faint, mt: "2px" }}>
                      {formatTokens(m.input_tokens)} / {formatTokens(m.max_input_tokens)} in &middot; {formatTokens(m.max_output_tokens)} out
                      {overLimit ? " \u00b7 over limit" : ""}
                    </Box>
                  </Box>
                );
              })}
            </Box>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !selectedModel}
              sx={{
                width: "100%",
                bgcolor: analyzing ? tokens.border2 : tokens.accent,
                color: analyzing ? tokens.muted : tokens.accentInk,
                fontSize: "0.78rem",
                fontWeight: 600,
                py: "8px",
                "&:hover": { bgcolor: analyzing ? tokens.border2 : "#6ecabf" },
                "&.Mui-disabled": { color: tokens.muted },
              }}
            >
              {analyzing ? "Analyzing\u2026" : `Analyze with ${selectedModel || "\u2026"}`}
            </Button>
          </Box>
        </Box>
      )}

      <ResultsSection result={result} />
    </Box>
  );
}