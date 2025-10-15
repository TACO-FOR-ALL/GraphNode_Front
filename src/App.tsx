import { useTranslation } from "react-i18next";
import { WebAppFrameBar } from "./components/WebAppFrameBar";
import i18n from "./i18n";

export default function App() {
  const { t } = useTranslation();

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <WebAppFrameBar />
      <div style={{ flex: 1, padding: 24 }}>
        <h1>{t("welcome")}</h1>
        <p>Electron + React + TypeScript + Vite</p>
        <button onClick={() => i18n.changeLanguage("ko")}>한국어</button>
      </div>
    </div>
  );
}
