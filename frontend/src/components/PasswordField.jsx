// Reusable password input used by protected investigation actions.
import { TextField } from "@mui/material";
import { tokens } from "../theme";

// Render a consistent password input for protected actions.
export default function PasswordField({ value, onChange, sx = {} }) {
  return (
    <TextField
      type="password"
      variant="standard"
      placeholder="password"
      value={value}
      onChange={onChange}
      autoComplete="off"
      InputProps={{ disableUnderline: true }}
      sx={{
        "& .MuiInputBase-input": {
          fontFamily: tokens.fontMono,
          fontSize: "0.85rem",
          color: tokens.ink,
          padding: "13px 12px",
          "&::placeholder": { color: tokens.faint, opacity: 1 },
        },
        ...sx,
      }}
    />
  );
}
