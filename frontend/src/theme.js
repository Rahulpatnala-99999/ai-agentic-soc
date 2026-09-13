// Keep the visual design tokens and Material UI theme in one place.
import { createTheme } from "@mui/material/styles";

export const tokens = {
  bg: "#0d0f12",
  surface: "#15181c",
  surface2: "#1b1f24",
  border: "#262b31",
  border2: "#333941",
  ink: "#e8e6e0",
  muted: "#868d96",
  faint: "#565c64",
  accent: "#4fb8ac",
  accentInk: "#06110f",
  sevHigh: "#e2585e",
  sevMedium: "#dc9a4c",
  sevLow: "#5f95d1",
  radius: 4,
  fontUi: '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  fontMono: '"IBM Plex Mono", ui-monospace, "Cascadia Code", Consolas, monospace',
};

export function severityColor(level) {
  switch ((level || "").toLowerCase()) {
    case "high":
      return tokens.sevHigh;
    case "medium":
      return tokens.sevMedium;
    case "low":
      return tokens.sevLow;
    default:
      return tokens.border2;
  }
}

const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: tokens.bg, paper: tokens.surface },
    text: { primary: tokens.ink, secondary: tokens.muted },
    primary: { main: tokens.accent, contrastText: tokens.accentInk },
    divider: tokens.border,
    error: { main: tokens.sevHigh },
    warning: { main: tokens.sevMedium },
    info: { main: tokens.sevLow },
  },
  shape: { borderRadius: tokens.radius },
  typography: {
    fontFamily: tokens.fontUi,
    fontSize: 15,
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.bg,
          color: tokens.ink,
        },
        a: { color: tokens.accent },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `1px solid ${tokens.border}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: tokens.radius },
      },
    },
  },
});

export default theme;
