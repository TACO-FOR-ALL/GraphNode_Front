import { useTranslation } from "react-i18next";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import { useState } from "react";

export default function Home() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  return (
    <div>
      <h1>{t("home.title")}</h1>
      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr",
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            minHeight: 0,
          }}
        >
          <ChatList selectedId={selectedId} onSelect={setSelectedId} />
          <ChatWindow threadId={selectedId} />
        </div>
      </div>
    </div>
  );
}
