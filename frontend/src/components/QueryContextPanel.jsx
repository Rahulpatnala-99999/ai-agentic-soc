// Display the selected telemetry scope and generated KQL query.
import { Box, Typography } from "@mui/material";
import { tokens } from "../theme";

// Render one query-context field label and value.
function Field({ label, children }) {
  return (
    <Box>
      <Typography
        sx={{ fontFamily: tokens.fontMono, fontSize: "0.72rem", color: tokens.faint, mb: "4px" }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.94rem", color: tokens.ink }}>{children}</Typography>
    </Box>
  );
}

function timeRangeLabel(ctx) {
  if (ctx.time_start && ctx.time_end) return `${ctx.time_start} to ${ctx.time_end}`;
  return `${ctx.time_range_hours} hour(s)`;
}

// Render query scope, rationale, and KQL.
export default function QueryContextPanel({ queryContext, kqlQuery }) {
  if (!queryContext) return null;
  const fields = (queryContext.fields || "").split(",").map((f) => f.trim()).filter(Boolean);

  return (
    <Box sx={{ bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "20px 22px", mb: "20px" }}>
      <Typography
        sx={{ fontFamily: tokens.fontMono, fontSize: "0.78rem", fontWeight: 500, color: tokens.muted, mb: 2 }}
      >
        Query Context
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px 24px" }}>
        <Field label="Table">
          <Box component="span" sx={{ fontFamily: tokens.fontMono, fontSize: "0.88rem" }}>
            {queryContext.table_name}
          </Box>
        </Field>
        <Field label="Time Range">{timeRangeLabel(queryContext)}</Field>
      </Box>

      {fields.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${tokens.border}` }}>
          <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.72rem", color: tokens.faint, mb: "6px" }}>
            Fields
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {fields.map((f) => (
              <Box
                key={f}
                sx={{
                  fontFamily: tokens.fontMono,
                  fontSize: "0.78rem",
                  bgcolor: tokens.bg,
                  border: `1px solid ${tokens.border}`,
                  color: tokens.muted,
                  borderRadius: `${tokens.radius}px`,
                  px: "8px",
                  py: "3px",
                }}
              >
                {f}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {queryContext.rationale && (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${tokens.border}`, color: tokens.muted, fontSize: "0.9rem" }}>
          <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.72rem", fontWeight: 500, color: tokens.faint, mb: "6px" }}>
            Rationale
          </Typography>
          {queryContext.rationale}
        </Box>
      )}

      {kqlQuery && (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${tokens.border}` }}>
          <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.72rem", color: tokens.faint, mb: "8px" }}>
            Constructed KQL Query
          </Typography>
          <Box
            component="pre"
            sx={{
              fontFamily: tokens.fontMono,
              fontSize: "0.82rem",
              lineHeight: 1.6,
              color: tokens.ink,
              bgcolor: tokens.bg,
              border: `1px solid ${tokens.border}`,
              borderRadius: `${tokens.radius}px`,
              p: "12px 14px",
              m: 0,
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            {kqlQuery}
          </Box>
        </Box>
      )}
    </Box>
  );
}
