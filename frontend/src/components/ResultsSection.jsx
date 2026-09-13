// Present query results, findings, and investigation errors.
import { Box, Typography } from "@mui/material";
import { tokens } from "../theme";
import QueryContextPanel from "./QueryContextPanel";
import FindingCard from "./FindingCard";

// Render query metadata, record counts, findings, and errors.
export default function ResultsSection({ result }) {
  if (!result) return null;

  const canIsolate = Boolean(result.query_context?.about_individual_host && result.query_context?.device_name);

  if (result.error) {
    return (
      <Box sx={{ bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "20px 22px", mb: "20px" }}>
        <Typography sx={{ color: tokens.sevHigh, fontSize: "1rem", fontWeight: 600, mb: 1 }}>{result.error.title}</Typography>
        {result.error.message && <Typography sx={{ color: tokens.muted, fontSize: "0.9rem" }}>{result.error.message}</Typography>}
        {result.error.detail && (
          <Box component="pre" sx={{ fontFamily: tokens.fontMono, fontSize: "0.8rem", color: tokens.muted, bgcolor: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "10px 12px", mt: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {result.error.detail}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <>
      <QueryContextPanel queryContext={result.query_context} kqlQuery={result.kql_query} />

      {result.number_of_records !== undefined && result.number_of_records > 0 && (
        <Box sx={{ bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, p: "20px 22px", mb: "20px" }}>
          <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.78rem", fontWeight: 500, color: tokens.muted, mb: 2 }}>
            Query Results
          </Typography>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "2rem", fontWeight: 500, color: tokens.ink }}>
              {result.number_of_records}
            </Typography>
            <Typography sx={{ color: tokens.muted, fontSize: "0.92rem" }}>
              record{result.number_of_records === 1 ? "" : "s"} found
            </Typography>
          </Box>
        </Box>
      )}

      {result.number_of_records === 0 && (
        <Box sx={{ color: tokens.muted, fontSize: "0.92rem", py: "20px", bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, px: "22px" }}>
          {"No log records matched \u2014 nothing to analyze."}
        </Box>
      )}

      {result.findings && (
        <Box component="section">
          <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: "14px" }}>
            <Typography component="h2" sx={{ m: 0, fontSize: "1.05rem", color: tokens.ink }}>
              Threat Hunt Findings
            </Typography>
            <Typography sx={{ fontFamily: tokens.fontMono, color: tokens.faint, fontSize: "0.82rem" }}>
              {result.findings.length} finding{result.findings.length === 1 ? "" : "s"}
            </Typography>
          </Box>

          {result.findings.length === 0 ? (
            <Box sx={{ color: tokens.muted, fontSize: "0.92rem", py: "20px", bgcolor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: `${tokens.radius}px`, px: "22px" }}>
              No threats detected in the searched logs.
            </Box>
          ) : (
            result.findings.map((finding, i) => (
              <FindingCard
                key={i}
                finding={finding}
                canIsolate={canIsolate}
                deviceName={result.query_context?.device_name}
              />
            ))
          )}
        </Box>
      )}
    </>
  );
}
