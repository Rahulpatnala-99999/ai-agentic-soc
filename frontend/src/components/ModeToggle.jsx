// Switch between Quick and Advanced investigation workflows.
import { useNavigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import { tokens } from "../theme";

const MODES = [
  { key: "quick", label: "Quick" },
  { key: "advanced", label: "Advanced" },
];

// Render the Quick and Advanced mode switcher.
export default function ModeToggle() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname.startsWith("/advanced") ? "advanced" : "quick";

  return (
    <Box
      sx={{
        display: "inline-flex",
        border: `1px solid ${tokens.border2}`,
        borderRadius: `${tokens.radius}px`,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {MODES.map((mode) => (
        <Box
          key={mode.key}
          component="button"
          type="button"
          onClick={() => mode.key !== active && navigate(`/${mode.key}`)}
          sx={{
            border: "none",
            cursor: "pointer",
            fontFamily: tokens.fontMono,
            fontSize: "0.76rem",
            padding: "5px 14px",
            bgcolor: active === mode.key ? tokens.accent : "transparent",
            color: active === mode.key ? tokens.accentInk : tokens.faint,
            fontWeight: active === mode.key ? 500 : 400,
            transition: "background-color 0.15s ease, color 0.15s ease",
            "&:hover": active === mode.key ? {} : { color: tokens.ink },
          }}
        >
          {mode.label}
        </Box>
      ))}
    </Box>
  );
}
