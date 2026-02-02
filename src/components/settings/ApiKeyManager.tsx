import { api } from "@/apiClient";
import { AiProvider } from "@/types/AiProvider";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoCheckmarkCircle, IoTrash, IoEye, IoEyeOff } from "react-icons/io5";

export default function ApiKeyManager({
  id,
  logo,
  title,
  isVerified,
  setIsVerified,
}: {
  id: AiProvider;
  logo: string;
  title: string;
  isVerified: boolean;
  setIsVerified: (apiKey: boolean) => void;
}) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    try {
      await api.me.updateApiKey(id, apiKey);
      setIsVerified(true);
      setApiKey("");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.me.deleteApiKey(id);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && apiKey.trim()) {
      handleSubmit();
    }
  };

  return (
    <div
      className={`
        flex w-full justify-between items-center p-4 rounded-xl
        bg-bg-secondary border transition-all duration-200
        ${isVerified ? "border-green-500/30 dark:border-green-500/20" : "border-transparent hover:border-text-tertiary/30"}
      `}
    >
      {/* Left: Logo & Input */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
            ${isVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-bg-tertiary"}
          `}
        >
          <img src={logo} alt={title} className="w-7 h-7 object-contain" />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{title}</p>
            {isVerified && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <IoCheckmarkCircle className="text-green-600 dark:text-green-400 text-xs" />
                <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                  {t("settings.my.api.connected")}
                </span>
              </div>
            )}
          </div>

          {isVerified ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-8 flex items-center px-3 bg-bg-tertiary rounded-lg">
                <span className="text-xs text-text-secondary tracking-widest">
                  {"•".repeat(32)}
                </span>
              </div>
            </div>
          ) : (
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                placeholder={t("settings.my.api.placeholder", { provider: title })}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                className="
                  w-full h-8 px-3 pr-10 text-sm
                  bg-bg-tertiary border border-transparent rounded-lg
                  focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  placeholder:text-text-placeholder text-text-primary
                  disabled:opacity-50 transition-all duration-200
                "
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showKey ? (
                  <IoEyeOff className="text-sm" />
                ) : (
                  <IoEye className="text-sm" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-4">
        {!isVerified && (
          <button
            onClick={handleSubmit}
            disabled={loading || !apiKey.trim()}
            className="
              px-4 py-1.5 text-sm font-medium rounded-lg
              bg-primary text-white
              hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {loading ? t("settings.my.api.saving") : t("settings.my.api.save")}
          </button>
        )}
        {isVerified && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="
              flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
              text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
              hover:bg-red-100 dark:hover:bg-red-900/30
              disabled:opacity-50 transition-all duration-200
            "
          >
            <IoTrash className="text-sm" />
            {t("settings.my.api.remove")}
          </button>
        )}
      </div>
    </div>
  );
}
