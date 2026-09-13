// Browse and search findings persisted by previous investigations.
import { useEffect, useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import { tokens } from "../theme";
import { fetchHistory } from "../api";
import FindingCard from "../components/FindingCard";

// Load and display persisted threat findings with optional search.
export default function HistoryPage() {
  // Search and loading state for persisted findings.
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load findings from the backend history endpoint.
  async function load(q) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHistory(q);
      setEntries(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("");
  }, []);

  // Apply the current search text.
  function handleSubmit(e) {
    e.preventDefault();
    load(query);
  }

  // Render the history search controls and finding cards.
  return (
    <Box>
      <Box component="header" sx={{ pb: "28px", mb: "4px", borderBottom: `1px solid ${tokens.border}` }}>
        <Typography component="h1" sx={{ m: 0, fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 600, color: tokens.ink }}>
          Threat Hunt History
        </Typography>
        <Typography sx={{ mt: "12px", fontSize: "0.95rem", color: tokens.muted }}>
          Every finding ever logged from a live investigation, newest first.
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", bgcolor: tokens.surface, border: `1px solid ${tokens.border2}`, borderRadius: `${tokens.radius}px`, my: "28px", mb: "10px" }}>
        <TextField
          fullWidth
          variant="standard"
          placeholder="Search titles, descriptions, hosts, tags, IOCs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ disableUnderline: true }}
          sx={{ flex: 1, "& .MuiInputBase-input": { fontFamily: tokens.fontUi, fontSize: "0.92rem", color: tokens.ink, padding: "13px 14px", "&::placeholder": { color: tokens.faint, opacity: 1 } } }}
        />
        <Button
          type="submit"
          sx={{ flexShrink: 0, borderLeft: `1px solid ${tokens.border2}`, borderRadius: `0 ${tokens.radius - 1}px ${tokens.radius - 1}px 0`, bgcolor: tokens.accent, color: tokens.accentInk, fontSize: "0.88rem", fontWeight: 600, px: "22px", "&:hover": { bgcolor: "#6ecabf" } }}
        >
          Search
        </Button>
      </Box>

      {!loading && !error && (
        <Typography sx={{ fontFamily: tokens.fontMono, fontSize: "0.82rem", color: tokens.faint, mt: "-8px", mb: "20px" }}>
          {entries.length} result{entries.length === 1 ? "" : "s"}
          {query ? ` for \u201c${query}\u201d` : ""}
        </Typography>
      )}

      {error && (
        <Typography sx={{ color: tokens.sevHigh, fontSize: "0.9rem" }}>{error}</Typography>
      )}

      {!loading && !error && entries.length === 0 && (
        <Box sx={{ color: tokens.muted, fontSize: "0.92rem", py: "20px" }}>
          {query ? "No logged findings match that search." : "Nothing logged yet \u2014 run an investigation first."}
        </Box>
      )}

      {entries.map((entry, i) => (
        <FindingCard
          key={i}
          finding={entry}
          meta={{ timestamp: entry.timestamp, table_name: entry.table_name, question: entry.question }}
          canIsolate={false}
        />
      ))}
    </Box>
  );
}
