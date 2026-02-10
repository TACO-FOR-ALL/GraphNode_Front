import {
  HashRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SideTabBar from "./components/sidebar/SideTabBar";
import { WebAppFrameBar } from "./components/WebAppFrameBar";
import Home from "./routes/Home";
import Visualize from "./routes/Visualize";
import Settings from "./routes/Settings";
import Login from "./routes/Login";
import Chat from "./routes/Chat";
import { noteRepo } from "./managers/noteRepo";
import { folderRepo } from "./managers/folderRepo";
import SearchModal from "./components/search/SearchModal";
import AgentToolTipButton from "./components/layout/AgentToolTipButton";
import { Me } from "./types/Me";
import Note from "./routes/Note";
import VisualizeDetail from "./routes/VisualizeDetail";
import { useAgentToolBoxStore } from "./store/useAgentToolBoxStore";
import AiAgentChatBox from "./components/layout/AiAgentChatBox";
import { useThemeStore } from "./store/useThemeStore";
import { useKeybindsStore, matchesKeybind } from "./store/useKeybindsStore";
import { useTranslation } from "react-i18next";
import Toaster from "./components/Toaster";
import { useNotificationConnection } from "./hooks/useNotification";
import { useSettingsStore } from "./store/useSettingsStore";

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
  const { theme } = useThemeStore();
  const { keybinds } = useKeybindsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // SSE 알림 연결
  useNotificationConnection();

  // 설정 로드
  useEffect(() => {
    useSettingsStore.getState().loadSettings();
  }, []);

  // Visualize 페이지에서는 AgentToolTipButton 안 보이기
  const isVisualizePage = location.pathname.startsWith("/visualize");

  const { t } = useTranslation();

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
  }, []);

  // 키바인드 단축키 처리
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Escape 키로 검색 모달 닫기
      if (e.key === "Escape") {
        setOpenSearch(false);
        return;
      }

      // 검색 모달 열기
      if (matchesKeybind(e, keybinds.search)) {
        e.preventDefault();
        setOpenSearch(true);
        return;
      }

      // 새 폴더 생성 (shift가 포함되어 있으므로 newNote보다 먼저 체크)
      if (matchesKeybind(e, keybinds.newFolder)) {
        e.preventDefault();
        folderRepo.create(t("notes.newFolder")).then(() => {
          queryClient.invalidateQueries({ queryKey: ["folders"] });
        });
        return;
      }

      // 새 노트 생성
      if (matchesKeybind(e, keybinds.newNote)) {
        e.preventDefault();
        navigate("/note");
        return;
      }

      // 새 채팅 생성
      if (matchesKeybind(e, keybinds.newChat)) {
        e.preventDefault();
        navigate("/chat");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [keybinds, navigate, queryClient]);

  // GET APP THEME
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
    }
  }, [theme]);

  // GET USER INFO
  useEffect(() => {
    (async () => {
      const me = await window.keytarAPI.getMe();
      setMe(me as Me);
    })();
  }, []);

  const { isOpen, setIsOpen } = useAgentToolBoxStore();

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
          minHeight: 0, // flex 컨테이너에서 overflow 동작을 위해 필요
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
            <Route
              path="/chat/:threadId?"
              element={<Chat avatarUrl={me?.profile?.avatarUrl ?? null} />}
            />
            <Route path="/visualize" element={<Visualize />} />
            <Route path="/visualize/:nodeId" element={<VisualizeDetail />} />
            <Route
              path="/settings"
              element={<Settings userInfo={me as Me} />}
            />
            <Route path="/note/:noteId?" element={<Note />} />
            {/* <Route path="/test-graph" element={<TestPaperGraphPage />} /> */}
          </Routes>
        </div>
        {openSearch && <SearchModal setOpenSearch={setOpenSearch} />}
        {!isVisualizePage && <AgentToolTipButton setIsOpen={setIsOpen} />}
        {isOpen && <AiAgentChatBox setIsOpen={setIsOpen} />}
        <Toaster />
      </div>
    </div>
  );
}
