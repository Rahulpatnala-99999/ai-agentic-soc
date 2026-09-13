// Render the primary application navigation.
import { NavLink } from "react-router-dom";
import { Box, Container } from "@mui/material";
import { tokens } from "../theme";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/history", label: "History" },
  { to: "/about", label: "About" },
];

// Render navigation links with the active route highlighted.
export default function Navbar() {
  return (
    <Box
      component="nav"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(13,15,18,0.88)",
        borderBottom: `1px solid ${tokens.border}`,
      }}
    >
      <Container maxWidth="md" disableGutters sx={{ maxWidth: "800px !important" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            px: 3,
            py: 2,
          }}
        >
          <Box
            component={NavLink}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              color: tokens.ink,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.92rem",
              letterSpacing: "-0.01em",
            }}
          >
            <Box component="span" sx={{ color: tokens.accent, fontSize: "0.7rem" }}>
              &#9642;
            </Box>
            threat-hunt
          </Box>

          <Box sx={{ display: "flex", gap: "22px" }}>
            {links.map((link) => (
              <Box
                key={link.to}
                component={NavLink}
                to={link.to}
                end={link.end}
                sx={{
                  color: tokens.muted,
                  textDecoration: "none",
                  fontFamily: tokens.fontMono,
                  fontSize: "0.82rem",
                  py: "4px",
                  borderBottom: "1px solid transparent",
                  transition: "color 0.15s ease, border-color 0.15s ease",
                  "&:hover": { color: tokens.ink },
                  "&.active": { color: tokens.accent, borderBottomColor: tokens.accent },
                }}
              >
                {link.label}
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
