// Show the current stage of the investigation pipeline.
import { Box } from "@mui/material";
import { tokens } from "../theme";

export const FULL_STEPS = [
  { step: "context", label: "Deciding log search parameters..." },
  { step: "guardrails", label: "Validating tables and fields..." },
  { step: "query", label: "Querying Log Analytics workspace..." },
  { step: "prompt", label: "Building threat hunt prompt..." },
  { step: "hunt", label: "Running AI threat hunt..." },
];

export const PLAN_STEPS = FULL_STEPS.slice(0, 3);

// Render investigation stages as pending, active, or completed.
export default function ProgressSteps({ activeStep, complete, steps = FULL_STEPS }) {
  if (!activeStep && !complete) return null;

  const activeIndex = steps.findIndex((s) => s.step === activeStep);

  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mb: 3 }}>
      {steps.map((s, i) => {
        const isDone = complete || (activeIndex >= 0 && i < activeIndex);
        const isActive = !complete && i === activeIndex;
        const isPending = !isDone && !isActive;

        return (
          <Box
            key={s.step}
            component="li"
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: "10px",
              py: "6px",
              fontFamily: tokens.fontMono,
              fontSize: "0.86rem",
              color: isActive ? tokens.ink : isDone ? tokens.muted : tokens.faint,
              opacity: isPending ? 0.5 : 1,
              transition: "opacity 0.25s ease, color 0.15s ease",
            }}
          >
            <Box component="span" sx={{ color: tokens.border2 }}>
              {String(i + 1).padStart(2, "0")}
            </Box>
            <Box
              component="span"
              sx={{
                width: 14,
                textAlign: "center",
                color: isActive ? tokens.accent : isDone ? tokens.accent : tokens.border2,
                animation: isActive ? "step-pulse 0.9s ease-in-out infinite" : "none",
                "@keyframes step-pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.35 },
                },
              }}
            >
              {isActive ? "~" : isDone ? "\u2713" : "\u00b7"}
            </Box>
            <span>{s.label}</span>
          </Box>
        );
      })}
    </Box>
  );
}
