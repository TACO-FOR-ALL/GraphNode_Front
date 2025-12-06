import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import SideTabBar from "./components/sidebar/SideTabBar";
import { WebAppFrameBar } from "./components/WebAppFrameBar";
import Home from "./routes/Home";
import Visualize from "./routes/Visualize";
import Settings from "./routes/Settings";
import Login from "./routes/Login";
import Notes from "./routes/Notes";
import Search from "./routes/Search";
import Chat from "./routes/Chat";
import { noteRepo } from "./managers/noteRepo";
import AgentToolTipButton from "./components/layout/AgentToolTipButton";
import AiToolTip from "./components/layout/AiToolTip";

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
  useEffect(() => {
    const FIRST_LAUNCH_KEY = "graphnode_first_launch";
    const hasLaunched = localStorage.getItem(FIRST_LAUNCH_KEY);

    if (!hasLaunched) {
      noteRepo.initializeDefaultNote().catch((err) => {
        console.error("Failed to initialize default note:", err);
      });
      localStorage.setItem(FIRST_LAUNCH_KEY, "true");
      console.log("Initialized default note");
    }
  }, []);

  const [openAgentTooltip, setOpenAgentTooltip] = useState(false);

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
            <Route path="/chat/:threadId?" element={<Chat />} />
            <Route path="/visualize" element={<Visualize />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notes/:noteId?" element={<Notes />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </div>
        <AgentToolTipButton setOpenAgentTooltip={setOpenAgentTooltip} />
        {openAgentTooltip && (
          <AiToolTip setOpenAgentTooltip={setOpenAgentTooltip} />
        )}
      </div>
    </div>
  );
}
