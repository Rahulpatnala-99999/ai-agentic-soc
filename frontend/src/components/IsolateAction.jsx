// Provide the confirmation flow for isolating a high-confidence host.
import { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, CircularProgress } from "@mui/material";
import { tokens } from "../theme";
import { isolateDevice } from "../api";
import PasswordField from "./PasswordField";

// Handle confirmation, password submission, and isolation status.
export default function IsolateAction({ deviceName, threatTitle }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Submit the confirmed isolation request and surface its status.
  async function handleConfirm() {
    const pw = password;
    setPassword("");
    setStatus("loading");
    try {
      const res = await isolateDevice(deviceName, pw);
      setResult(res);
      setStatus("done");
    } catch (e) {
      setError(e.unauthorized ? "Incorrect password." : e.message);
      setStatus("error");
    }
  }

  if (status === "done" && result) {
    return (
      <Box sx={{ mt: 1.5, fontSize: "0.85rem", color: result.isolated ? tokens.accent : tokens.sevMedium }}>
        {result.isolated ? (
          <>
            VM isolated. Remember to release it from isolation when appropriate at{" "}
            <a href={result.release_url} target="_blank" rel="noopener noreferrer" style={{ color: tokens.accent }}>
              security.microsoft.com
            </a>
            .
          </>
        ) : (
          "Isolation request completed but the API reported it did not isolate the machine."
        )}
      </Box>
    );
  }

  return (
    <>
      <Button
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          mt: 1.5,
          fontFamily: tokens.fontMono,
          fontSize: "0.78rem",
          color: tokens.sevHigh,
          border: `1px solid ${tokens.sevHigh}`,
          borderRadius: `${tokens.radius}px`,
          px: "10px",
          py: "4px",
          "&:hover": { bgcolor: "rgba(226,88,94,0.08)" },
        }}
      >
        Isolate this VM
      </Button>

      <Dialog open={open} onClose={() => status !== "loading" && setOpen(false)}>
        <DialogTitle sx={{ fontSize: "1rem" }}>Isolate {deviceName}?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.9rem", color: tokens.muted, mb: 1 }}>
            High confidence threat detected: <strong style={{ color: tokens.ink }}>{threatTitle}</strong>
          </Typography>
          <Typography sx={{ fontSize: "0.9rem", color: tokens.muted }}>
            This calls Microsoft Defender for Endpoint and puts <strong style={{ color: tokens.ink }}>{deviceName}</strong> into full network isolation immediately. This is a real, live action.
          </Typography>
          {status === "error" && (
            <Typography sx={{ fontSize: "0.85rem", color: tokens.sevHigh, mt: 1.5 }}>{error}</Typography>
          )}
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              width: "100%",
              mt: 2,
              border: `1px solid ${tokens.border2}`,
              borderRadius: `${tokens.radius}px`,
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={status === "loading"} sx={{ color: tokens.muted }}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={status === "loading"}
            variant="contained"
            sx={{ bgcolor: tokens.sevHigh, color: "#fff", "&:hover": { bgcolor: "#c94950" } }}
          >
            {status === "loading" ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Isolate VM"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
