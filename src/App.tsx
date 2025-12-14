import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import SideTabBar from "./components/sidebar/SideTabBar";
import { WebAppFrameBar } from "./components/WebAppFrameBar";
import Home from "./routes/Home";
import Visualize from "./routes/Visualize";
import Settings from "./routes/Settings";
import Login from "./routes/Login";
import Chat from "./routes/Chat";
import { noteRepo } from "./managers/noteRepo";
import SearchModal from "./components/search/SearchModal";
import Note from "./routes/Note";
import { Me } from "./types/Me";

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
  const [openSearch, setOpenSearch] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    // 최초 실행 시 기본 노트 추가
    const FIRST_LAUNCH_KEY = "graphnode_first_launch";
    const hasLaunched = localStorage.getItem(FIRST_LAUNCH_KEY);

    if (!hasLaunched) {
      noteRepo.initializeDefaultNote().catch((err) => {
        console.error("Failed to initialize default note:", err);
      });
      localStorage.setItem(FIRST_LAUNCH_KEY, "true");
      console.log("Initialized default note");
    }

    // 검색 단축키 감지 (Search 단축키)
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLocaleLowerCase() === "f") {
        e.preventDefault();
        setOpenSearch(true);
      }

      if (e.key === "Escape") {
        setOpenSearch(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const me = await window.keytarAPI.getMe();
      setMe(me as Me);
    })();
  }, []);

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
        <SideTabBar
          setOpenSearch={setOpenSearch}
          avatarUrl={me?.profile?.avatarUrl ?? null}
        />
        <div
          style={{
            flex: 1,
            overflow: "hidden", // 스크롤 방지
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Routes>
            <Route
              path="/"
              element={<Home username={me?.profile?.displayName ?? "Guest"} />}
            />
            <Route path="/chat/:threadId?" element={<Chat />} />
            <Route path="/visualize" element={<Visualize />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/note/:noteId?" element={<Note />} />
          </Routes>
        </div>
        {openSearch && <SearchModal setOpenSearch={setOpenSearch} />}
      </div>
    </div>
  );
}
