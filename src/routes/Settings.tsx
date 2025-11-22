import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useState } from "react";
import DropJsonZone from "../components/DropJsonZone";
import threadRepo from "../managers/threadRepo";

export default function Settings() {
  const { t } = useTranslation();
  const [apiKey, setAPIKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<
    null | "valid" | "invalid" | "checking"
  >();

  const onCheck = async () => {
    setKeyStatus("checking");
    const res = await window.openaiAPI.checkAPIKeyValid(apiKey);
    if (res.ok) await window.keytarAPI.setAPIKey("openai", apiKey);
    setKeyStatus(res.ok ? "valid" : "invalid");
  };

  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <div>
        <button onClick={() => i18n.changeLanguage("ko")}>
          {t("settings.language.ko")}
        </button>
        <button onClick={() => i18n.changeLanguage("en")}>
          {t("settings.language.en")}
        </button>
        <button onClick={() => i18n.changeLanguage("zh")}>
          {t("settings.language.zh")}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setAPIKey(e.target.value)}
        />
        <button onClick={onCheck} disabled={keyStatus === "checking"}>
          {keyStatus === "checking" ? "Checking..." : "Check API Key"}
        </button>
      </div>
      {keyStatus === "valid" && (
        <p className="text-green-500">API Key is valid</p>
      )}
      {keyStatus === "invalid" && (
        <p className="text-red-500">API Key is invalid</p>
      )}
      {keyStatus === "checking" && (
        <p className="text-yellow-500">Checking...</p>
      )}
      <button
        onClick={async () => {
          const key = await window.keytarAPI.getAPIKey("openai");
          console.log(key);
        }}
      >
        Get API Key
      </button>
      <button
        onClick={async () => {
          await window.keytarAPI.deleteAPIKey("openai");
          console.log("deleted");
        }}
      >
        Delete API Key
      </button>
      <div className="h-10"></div>
      <DropJsonZone />
      <button
        onClick={async () => {
          await threadRepo.clearAll();
        }}
        className="bg-red-500 text-white px-4 py-2 rounded-md"
      >
        Clear All Threads
      </button>
    </div>
  );
}
