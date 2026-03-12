// Electron 환경인지 확인 (preload에서 노출된 API 존재 여부로 판단)
function isElectron(): boolean {
  return (
    typeof window !== "undefined" && typeof window.windowAPI !== "undefined"
  );
}

export function WebAppFrameBar() {
  if (!isElectron()) return null;

  switch (window.windowAPI.platform) {
    case "win32":
      return <WindowsFrameBar />;
    case "linux":
      return <LinuxFrameBar />;
    case "darwin":
    default:
      return <MacFrameBar />;
  }
}

// ── macOS ─────────────────────────────────────────────────────────────────────

function MacFrameBar() {
  return (
    <div className="drag-region flex h-7 px-4 items-center bg-frame-bar-background gap-2">
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-red cursor-pointer"
        onClick={() => window.windowAPI.close()}
      />
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-yellow cursor-pointer"
        onClick={() => window.windowAPI.minimize()}
      />
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-green cursor-pointer"
        onClick={() => window.windowAPI.maximize()}
      />
    </div>
  );
}

// ── Linux (GNOME style) ───────────────────────────────────────────────────────

function LinuxFrameBar() {
  return (
    <div className="drag-region flex h-8 items-center bg-frame-bar-background">
      <div className="flex-1" />
      <div className="no-drag flex items-center gap-1 pr-3">
        <LinuxButton
          onClick={() => window.windowAPI.minimize()}
          hoverClass="hover:bg-black/15 dark:hover:bg-white/15"
          title="최소화"
        >
          <MinimizeIcon />
        </LinuxButton>
        <LinuxButton
          onClick={() => window.windowAPI.maximize()}
          hoverClass="hover:bg-black/15 dark:hover:bg-white/15"
          title="최대화"
        >
          <MaximizeIcon />
        </LinuxButton>
        <LinuxButton
          onClick={() => window.windowAPI.close()}
          hoverClass="hover:bg-orange-500 hover:text-white"
          title="닫기"
        >
          <CloseIcon />
        </LinuxButton>
      </div>
    </div>
  );
}

function LinuxButton({
  onClick,
  hoverClass,
  title,
  children,
}: {
  onClick: () => void;
  hoverClass: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded-full text-text-secondary transition-colors duration-100 ${hoverClass}`}
    >
      {children}
    </button>
  );
}

// ── Windows ───────────────────────────────────────────────────────────────────

function WindowsFrameBar() {
  return (
    <div className="drag-region flex h-8 items-center bg-frame-bar-background">
      {/* 드래그 영역 (왼쪽) */}
      <div className="flex-1" />

      {/* 윈도우 컨트롤 버튼 (오른쪽) */}
      <div className="no-drag flex h-full">
        <WinButton
          onClick={() => window.windowAPI.minimize()}
          hoverClass="hover:bg-black/10 dark:hover:bg-white/10"
          title="최소화"
        >
          <MinimizeIcon />
        </WinButton>

        <WinButton
          onClick={() => window.windowAPI.maximize()}
          hoverClass="hover:bg-black/10 dark:hover:bg-white/10"
          title="최대화"
        >
          <MaximizeIcon />
        </WinButton>

        <WinButton
          onClick={() => window.windowAPI.close()}
          hoverClass="hover:bg-red-600 hover:text-white"
          title="닫기"
        >
          <CloseIcon />
        </WinButton>
      </div>
    </div>
  );
}

function WinButton({
  onClick,
  hoverClass,
  title,
  children,
}: {
  onClick: () => void;
  hoverClass: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-11 h-full text-text-secondary transition-colors duration-100 ${hoverClass}`}
    >
      {children}
    </button>
  );
}

function MinimizeIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
      <rect width="10" height="1" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <line x1="0" y1="0" x2="10" y2="10" />
      <line x1="10" y1="0" x2="0" y2="10" />
    </svg>
  );
}
