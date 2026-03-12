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
import { trashRepo } from "./managers/trashRepo";
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
import { useToastStore } from "./store/useToastStore";
import { useNotificationConnection } from "./hooks/useNotification";
import { useSettingsStore } from "./store/useSettingsStore";
import { useFirstRunStorage } from "./store/useFirtstRunStore";
import { api } from "./apiClient";
import i18n, { getSavedLanguage } from "./i18n";
import { loadAndApplyGraphColors } from "./utils/graphColors";
import { pullOnce } from "./managers/pullWorker";
import { useChangelogStore } from "./store/useChangelogStore";
import ChangelogModal from "./components/changelog/ChangelogModal";
import { useOnboardingStore } from "./store/useOnboardingStore";
import Onboarding from "./components/onboarding/Onboarding";

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

  // Changelog 모달 상태
  const { lastSeenVersion, setModalOpen } = useChangelogStore();

  // 온보딩 상태
  const { hasCompletedOnboarding, startOnboarding } = useOnboardingStore();

  // 설정 로드
  useEffect(() => {
    useSettingsStore.getState().loadSettings();
    loadAndApplyGraphColors(); // 커스텀 그래프 색상 로드

    // 언어 백엔드 동기화
    // - auto 모드(savedLang=null): 시스템 언어가 변경될 수 있으므로 매번 동기화
    // - 수동 설정: 최초 1회만 동기화 (이후 변경은 LanguageTimePanel에서 처리)
    const { languageSynced, setLanguageSynced } = useFirstRunStorage.getState();
    const isAutoMode = getSavedLanguage() === null;

    if (isAutoMode || !languageSynced) {
      const lang = i18n.language.split("-")[0];
      api.me
        .updatePreferredLanguage(lang)
        .then(() => {
          if (!languageSynced) setLanguageSynced(true);
        })
        .catch(() => {});
    }
  }, []);

  // 온보딩이 완료되지 않은 경우 자동 시작
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      startOnboarding();
    }
  }, [hasCompletedOnboarding, startOnboarding]);

  // 버전 체크 및 Changelog 모달 표시
  useEffect(() => {
    const currentVersion = __APP_VERSION__;
    // 온보딩이 완료되지 않았으면 Changelog 모달 표시하지 않음
    if (hasCompletedOnboarding && lastSeenVersion !== currentVersion) {
      setModalOpen(true);
    }
  }, [lastSeenVersion, setModalOpen, hasCompletedOnboarding]);

  // 휴지통 만료 항목 정리
  useEffect(() => {
    trashRepo.cleanupExpiredItems().catch((err) => {
      console.error("Failed to cleanup expired trash items:", err);
    });
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

  // 앱 시작 시 서버 최신 데이터 pull (notes, folders, conversations)
  useEffect(() => {
    pullOnce().catch((err) => {
      console.error("Initial sync pull failed:", err);
      useToastStore.getState().addToast({
        type: "error",
        message: t("sync.pullFailed"),
      });
    });
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
            <Route
              path="/visualize/detail/:nodeId"
              element={<VisualizeDetail />}
            />
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
        <ChangelogModal />
        <Onboarding />
      </div>
    </div>
  );
}
