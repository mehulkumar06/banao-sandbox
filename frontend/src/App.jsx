import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SandboxPage from "./pages/SandboxPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home — list and create projects */}
        <Route path="/" element={<HomePage />} />

        {/* Sandbox — IDE for a specific project */}
        <Route path="/project/:id" element={<SandboxPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;