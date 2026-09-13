// Render one threat finding with evidence, classification, recommendations, and actions.
import { Box, Typography } from "@mui/material";
import { tokens, severityColor } from "../theme";
import IsolateAction from "./IsolateAction";

// Render the finding details and optional device isolation action.
export default function FindingCard({ finding, meta, canIsolate, deviceName }) {
  const level = (finding.confidence || "").toLowerCase();
  const color = severityColor(level);

  return (
    <Box
      component="article"
      sx={{
        bgcolor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: `${tokens.radius}px`,
        p: "18px 20px",
        mb: "14px",
      }}
    >
      {meta && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "16px",
            fontFamily: tokens.fontMono,
            fontSize: "0.76rem",
            color: tokens.faint,
            mb: "10px",
            pb: "10px",
            borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          {meta.timestamp && <span>{meta.timestamp}</span>}
          {meta.table_name && <span>{meta.table_name}</span>}
          {meta.question && (
            <Box component="span" sx={{ color: tokens.muted, fontFamily: tokens.fontUi }}>
              &ldquo;{meta.question}&rdquo;
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", mb: 1 }}>
        <Typography component="h3" sx={{ m: 0, fontSize: "1rem", fontWeight: 600 }}>
          {finding.title}
        </Typography>
        {finding.confidence && (
          <Box
            sx={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: tokens.fontMono,
              fontSize: "0.76rem",
              color,
              pt: "2px",
              whiteSpace: "nowrap",
              "&::before": { content: '""', width: 6, height: 6, borderRadius: "50%", bgcolor: color },
            }}
          >
            {finding.confidence}
          </Box>
        )}
      </Box>

      <Typography sx={{ color: tokens.muted, fontSize: "0.92rem", mb: "14px" }}>{finding.description}</Typography>

      {finding.mitre && (
        <Box
          sx={{
            display: "inline-block",
            fontFamily: tokens.fontMono,
            fontSize: "0.78rem",
            color: tokens.accent,
            border: `1px solid rgba(79,184,172,0.35)`,
            borderRadius: `${tokens.radius}px`,
            px: "8px",
            py: "3px",
            mb: "14px",
          }}
        >
          {finding.mitre.tactic} ({finding.mitre.id})
        </Box>
      )}

      {finding.recommendations?.length > 0 && (
        <Box sx={{ mb: "12px" }}>
          <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.72rem", color: tokens.faint, mb: "7px" }}>
            Recommendations
          </Typography>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {finding.recommendations.map((r, i) => (
              <Box
                key={i}
                component="li"
                sx={{ position: "relative", pl: "14px", fontSize: "0.86rem", color: tokens.muted, mb: "4px", "&::before": { content: '"\\2013"', position: "absolute", left: 0, color: tokens.faint } }}
              >
                {r}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {finding.indicators_of_compromise?.length > 0 && (
        <Box sx={{ mb: "12px" }}>
          <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.72rem", color: tokens.faint, mb: "7px" }}>
            Indicators of Compromise
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {finding.indicators_of_compromise.map((ioc, i) => (
              <Box
                key={i}
                sx={{ fontFamily: tokens.fontMono, fontSize: "0.8rem", bgcolor: tokens.bg, border: `1px solid ${tokens.border}`, color: tokens.ink, borderRadius: `${tokens.radius}px`, px: "8px", py: "3px" }}
              >
                {ioc}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {finding.notes && (
        <Typography sx={{ fontSize: "0.85rem", color: tokens.faint, pt: "10px", mt: "4px", borderTop: `1px solid ${tokens.border}` }}>
          {finding.notes}
        </Typography>
      )}

      {canIsolate && level === "high" && deviceName && (
        <IsolateAction deviceName={deviceName} threatTitle={finding.title} />
      )}
    </Box>
  );
}
