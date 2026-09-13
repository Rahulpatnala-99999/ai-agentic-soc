// Provide the one-step investigation experience with streamed progress.
import { useState, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Typography, TextField, Button } from "@mui/material";
import { tokens } from "../theme";
import { investigate } from "../api";
import ProgressSteps from "../components/ProgressSteps";
import ResultsSection from "../components/ResultsSection";
import ModeToggle from "../components/ModeToggle";
import PasswordField from "../components/PasswordField";

// Manage a complete investigation from question submission to findings.
export default function QuickModePage() {
  // Investigation form and streamed workflow state.
  const [question, setQuestion] = useState("");
  const [password, setPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState(null);
  const sourceRef = useRef(null);

  // Start a new streamed investigation and update the UI from server events.
  function handleSubmit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    const pw = password;
    setPassword("");

    if (sourceRef.current) sourceRef.current.close();

    setResult(null);
    setComplete(false);
    setActiveStep(null);
    setRunning(true);

    sourceRef.current = investigate(q, pw, {
      onProgress: (data) => setActiveStep(data.step),
      onResult: (data) => {
        setResult(data);
        setComplete(true);
        setRunning(false);
      },
      onError: () => {
        setResult({
          error: {
            title: "Request Failed",
            message:
              "Either the password was wrong or the connection was interrupted. Check the server terminal and try again.",
          },
        });
        setRunning(false);
      },
    });
  }

  // Render the question form, progress tracker, and investigation results.
  return (
    <Box>
      <Box component="header" sx={{ pb: "20px", mb: "4px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            mb: "18px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: tokens.fontMono,
              fontSize: "0.78rem",
              color: tokens.accent,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                bgcolor: tokens.accent,
              }}
            />

            Threat Hunting Agent

            <Box component="span" sx={{ color: tokens.border2 }}>
              &middot;
            </Box>

            <Box component="span" sx={{ color: tokens.faint }}>
              Quick mode
            </Box>
          </Box>

          <ModeToggle />
        </Box>

        <Typography
          component="h1"
          sx={{
            m: 0,
            fontSize: "clamp(28px, 4vw, 36px)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: tokens.ink,
          }}
        >
          Agentic SOC Analyst
        </Typography>

        <Typography
          sx={{
            maxWidth: 560,
            mt: "12px",
            fontSize: "0.95rem",
            lineHeight: 1.65,
            color: tokens.muted,
          }}
        >
          <Box
            component="strong"
            sx={{ color: tokens.ink, fontWeight: 600 }}
          >
            Investigate faster.
          </Box>{" "}
          Let the agent handle query planning, model selection, and threat
          analysis automatically.
        </Typography>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
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
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            pl: "14px",
            fontFamily: tokens.fontMono,
            fontSize: "0.95rem",
            color: tokens.accent,
          }}
        >
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
              "&::placeholder": {
                color: tokens.faint,
                opacity: 1,
              },
            },
          }}
        />

        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{
            width: 130,
            flexShrink: 0,
            borderLeft: `1px solid ${tokens.border2}`,
          }}
        />

        <Button
          type="submit"
          disabled={running}
          sx={{
            flexShrink: 0,
            borderLeft: `1px solid ${tokens.border2}`,
            borderRadius: `0 ${tokens.radius - 1}px ${
              tokens.radius - 1
            }px 0`,
            bgcolor: running ? tokens.border2 : tokens.accent,
            color: running ? tokens.muted : tokens.accentInk,
            fontSize: "0.88rem",
            fontWeight: 600,
            px: "22px",
            "&:hover": {
              bgcolor: running ? tokens.border2 : "#6ecabf",
            },
            "&.Mui-disabled": {
              color: tokens.muted,
            },
          }}
        >
          {running ? "Investigating\u2026" : "Investigate"}
        </Button>
      </Box>

      <Typography
        sx={{
          color: tokens.faint,
          fontSize: "0.82rem",
          lineHeight: 1.6,
          mb: "32px",
        }}
      >
        {
          "This is a public demo \u2014 the AI query planning and threat-hunt analysis below are real (and run on the owner's OpenAI balance), against a live Log Analytics workspace. It's still password-protected to prevent abuse. Browse the "
        }

        <Box
          component={RouterLink}
          to="/history"
          sx={{
            color: tokens.muted,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            "&:hover": {
              color: tokens.accent,
            },
          }}
        >
          History
        </Box>

        {" page to see past findings."}
      </Typography>

      <ProgressSteps
        activeStep={activeStep}
        complete={complete}
      />

      <ResultsSection result={result} />
    </Box>
  );
}