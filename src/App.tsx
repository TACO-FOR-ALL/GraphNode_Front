import { HashRouter as Router, Routes, Route } from "react-router-dom";
import SideTabBar from "./components/SideTabBar";
import { WebAppFrameBar } from "./components/WebAppFrameBar";
import Home from "./routes/Home";
import Visualize from "./routes/Visualize";
import Settings from "./routes/Settings";
import Login from "./routes/Login";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </Router>
  );
}

function MainLayout() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <WebAppFrameBar />
      <div
        style={{
          display: "flex",
          flex: 1,
          height: "calc(100vh - 48px)", // WebAppFrameBar 높이(48px) 빼기
          overflow: "hidden", // 전체 스크롤 방지
        }}
      >
        <SideTabBar />
        <div
          style={{
            flex: 1,
            overflow: "hidden", // 스크롤 방지
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/visualize" element={<Visualize />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
