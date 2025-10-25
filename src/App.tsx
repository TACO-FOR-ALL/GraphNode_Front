import { MemoryRouter as Router, Routes, Route } from "react-router-dom";
import { WebAppFrameBar } from "./components/WebAppFrameBar";
import SideTabBar from "./components/SideTabBar";
import Home from "./routes/Home";
import Visualize from "./routes/Visualize";
import Settings from "./routes/Settings";
import Search from "./routes/Search";

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
              <Route path="/search" element={<Search />} />
              <Route path="/visualize" element={<Visualize />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
}
