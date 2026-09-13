// Explain the project's purpose, workflow, and supported capabilities.
import { Box, Typography } from "@mui/material";
import { tokens } from "../theme";

function Panel({ title, children }) {
  return (
    <Box component="section" sx={{ bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "20px 22px", mb: "20px" }}>
      <Typography component="h2" sx={{ fontSize: "1.05rem", fontWeight: 600, color: tokens.ink, mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

const pipeline = [
  "Natural language question comes in",
  "The model plans a table, fields, and time range",
  "Guardrails validate the plan against an allow-list",
  "The KQL query runs against Log Analytics",
  "The model analyzes results for threats",
];

// Render the project overview and capability summary.
export default function AboutPage() {
  return (
    <Box>
      <Box component="header" sx={{ pb: "28px", mb: "4px", borderBottom: `1px solid ${tokens.border}` }}>
        <Typography component="h1" sx={{ m: 0, fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 600, color: tokens.ink }}>
          About This Project
        </Typography>
        <Typography sx={{ mt: "12px", fontSize: "0.95rem", color: tokens.muted }}>
          An AI-assisted threat hunting assistant for Microsoft Defender &amp; Azure Log Analytics.
        </Typography>
      </Box>

      <Box sx={{ mt: "28px" }}>
        <Panel title="What It Does">
          <Typography sx={{ color: tokens.muted, fontSize: "0.95rem", mb: "12px" }}>
            Ask security questions in plain English, such as:
          </Typography>

          <Box
            sx={{
              fontFamily: tokens.fontMono,
              fontSize: "0.88rem",
              color: tokens.ink,
              bgcolor: tokens.bg,
              border: `1px solid ${tokens.border}`,
              borderLeft: `2px solid ${tokens.accent}`,
              borderRadius: `${tokens.radius}px`,
              p: "12px 16px",
              mb: "20px",
              "&::before": { content: '"> "', color: tokens.accent },
            }}
          >
            &ldquo;Has windows-target-1 had any suspicious logons in the last 3 days?&rdquo;
          </Box>

          <Box component="ol" sx={{ listStyle: "none", counterReset: "pipelinenum", m: "0 0 20px", p: 0 }}>
            {pipeline.map((step, i) => (
              <Box
                key={step}
                component="li"
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "12px",
                  py: "7px",
                  borderBottom: i < pipeline.length - 1 ? `1px solid ${tokens.border}` : "none",
                  fontSize: "0.9rem",
                  color: tokens.ink,
                }}
              >
                <Box component="span" sx={{ fontFamily: tokens.fontMono, fontSize: "0.78rem", color: tokens.faint, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </Box>
                {step}
              </Box>
            ))}
          </Box>

          <Typography sx={{ color: tokens.muted, fontSize: "0.95rem", mb: "12px" }}>
            The agent determines which Log Analytics table, fields, and time range are relevant. Those choices are
            validated against an allow-list before the generated KQL query is allowed to run.
          </Typography>

          <Typography sx={{ color: tokens.muted, fontSize: "0.95rem" }}>
            The returned logs are then analyzed for suspicious activity, mapped to MITRE ATT&amp;CK, assigned a
            confidence level, and summarized with indicators of compromise and recommended actions. High-confidence
            findings about a specific host can trigger a live VM isolation action in Microsoft Defender, always
            behind an explicit confirmation step.
          </Typography>
        </Panel>
      </Box>
    </Box>
  );
}
