import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import { WebAppFrameBar } from "./components/WebAppFrameBar";
import SideTabBar from "./components/SideTabBar";
import Home from "./routes/Home";
import Visualize from "./routes/Visualize";
import Settings from "./routes/Settings";

export default function App() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <WebAppFrameBar />
      <Router>
        <div style={{ display: "flex", flex: 1 }}>
          <SideTabBar />
          <div style={{ flex: 1, overflow: "auto" }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/visualize" element={<Visualize />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
}
