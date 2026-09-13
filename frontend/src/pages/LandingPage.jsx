// Present the two investigation modes and guide the user into the workflow.
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import { tokens } from "../theme";

// Describe the two investigation workflows offered by the application.
const MODES = [
  {
    key: "quick",
    icon: BoltOutlinedIcon,
    title: "Quick mode",
    subtitle: "One click, best model auto-picked",
    bullets: ["Ask in natural language", "Auto-picks the best model", "Results in one click"],
    cta: "Start Quick Hunt",
  },
  {
    key: "advanced",
    icon: TerminalOutlinedIcon,
    title: "Advanced mode",
    subtitle: "Full control, more steps",
    bullets: ["Review and edit generated KQL", "See records, choose the model", "Fully Flexible"],
    cta: "Start Advanced Hunt",
  },
];

// Render the landing page and investigation mode choices.
export default function LandingPage() {
  // Navigate into the selected investigation mode.
  const navigate = useNavigate();

  // Render the project introduction and mode selection cards.
  return (
    <Box sx={{ textAlign: "center", pt: "20px" }}>
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: tokens.fontMono, fontSize: "0.78rem", color: tokens.accent, mb: "14px" }}>
        <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: tokens.accent }} />
        Threat Hunting Agent
      </Box>

      <Typography component="h1" sx={{ m: 0, fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 600, letterSpacing: "-0.01em", color: tokens.ink, mb: "12px" }}>
        Agentic SOC Analyst
      </Typography>

      <Typography sx={{ maxWidth: 460, mx: "auto", fontSize: "0.95rem", lineHeight: 1.65, color: tokens.muted, mb: "36px" }}>
        Ask in{" "}
        <Box component="strong" sx={{ color: tokens.ink, fontWeight: 600 }}>
          natural language
        </Box>
        {" \u2014 it plans to KQL, runs it against Microsoft Defender telemetry, analyzes the results for signs of compromise, and can isolate affected devices when needed."}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: "16px", maxWidth: 560, mx: "auto", textAlign: "left" }}>
        {MODES.map((mode) => {
          const Icon = mode.icon;

          return (
            <Box
              key={mode.key}
              sx={{
                border: `1px solid ${tokens.border}`,
                bgcolor: "transparent",
                borderRadius: `${tokens.radius}px`,
                p: "22px 20px",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.15s ease, background-color 0.15s ease",
                "&:hover": {
                  borderColor: tokens.accent,
                  bgcolor: "rgba(79,184,172,0.06)",
                },
                "&:hover .mode-icon": {
                  bgcolor: "rgba(79,184,172,0.15)",
                },
                "&:hover .mode-icon svg": {
                  color: tokens.accent,
                },
              }}
            >
              <Box
                className="mode-icon"
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: `${tokens.radius}px`,
                  bgcolor: tokens.surface2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: "14px",
                  transition: "background-color 0.15s ease",
                }}
              >
                <Icon sx={{ fontSize: 18, color: tokens.muted, transition: "color 0.15s ease" }} />
              </Box>

              <Typography sx={{ fontSize: "0.92rem", fontWeight: 600, color: tokens.ink }}>
                {mode.title}
              </Typography>

              <Typography sx={{ fontSize: "0.76rem", color: tokens.muted, mb: "14px" }}>
                {mode.subtitle}
              </Typography>

              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mb: "16px", flex: 1 }}>
                {mode.bullets.map((b) => (
                  <Box
                    key={b}
                    component="li"
                    sx={{
                      fontSize: "0.78rem",
                      color: tokens.muted,
                      lineHeight: 2,
                      "&::before": {
                        content: '"\\00b7 "',
                        color: tokens.faint,
                        mr: "4px",
                      },
                    }}
                  >
                    {b}
                  </Box>
                ))}
              </Box>

              <Button
                onClick={() => navigate(`/${mode.key}`)}
                sx={{
                  fontFamily: tokens.fontUi,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  py: "9px",
                  bgcolor: tokens.accent,
                  color: tokens.accentInk,
                  border: "none",
                  "&:hover": { bgcolor: "#6ecabf" },
                }}
              >
                {mode.cta} &rarr;
              </Button>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ mt: "26px", fontSize: "0.78rem", color: tokens.faint }}>
        Same engine, two ways to work.
      </Typography>
    </Box>
  );
}