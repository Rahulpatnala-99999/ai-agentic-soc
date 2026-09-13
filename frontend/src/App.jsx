// Define application routes and the shared page shell.
import { Routes, Route } from "react-router-dom";
import { Box, Container } from "@mui/material";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import QuickModePage from "./pages/QuickModePage";
import AdvancedModePage from "./pages/AdvancedModePage";
import HistoryPage from "./pages/HistoryPage";
import AboutPage from "./pages/AboutPage";

// Render the shared layout and route-specific pages.
export default function App() {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="md" disableGutters sx={{ maxWidth: "800px !important", px: 3, py: "40px", pb: "96px" }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/quick" element={<QuickModePage />} />
          <Route path="/advanced" element={<AdvancedModePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Container>
    </Box>
  );
}
