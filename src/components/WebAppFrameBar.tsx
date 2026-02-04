import { useState, useEffect } from "react";

// Electron 환경인지 확인 (preload에서 노출된 API 존재 여부로 판단)
function isElectron(): boolean {
  return typeof window !== "undefined" && typeof window.windowAPI !== "undefined";
}

export function WebAppFrameBar() {
  const [isElectronApp, setIsElectronApp] = useState(false);

  useEffect(() => {
    setIsElectronApp(isElectron());
  }, []);

  // 웹 브라우저에서는 프레임바를 표시하지 않음
  if (!isElectronApp) {
    return null;
  }

  const handleClose = () => window.windowAPI.close();
  const handleMinimize = () => window.windowAPI.minimize();
  const handleMaximize = () => window.windowAPI.maximize();

  return (
    <div className="drag-region flex h-7 px-4 items-center bg-frame-bar-background gap-2">
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-red cursor-pointer"
        onClick={handleClose}
      ></div>
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-yellow cursor-pointer"
        onClick={handleMinimize}
      ></div>
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-green cursor-pointer"
        onClick={handleMaximize}
      ></div>
    </div>
  );
}
