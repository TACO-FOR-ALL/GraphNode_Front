import { api } from "@/apiClient";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// TODO: 로직 수정 (useState라 생성 중 유지가 안됨. 생성 중일 때 Lottie View 추가)
export default function EmptyGraph() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);

  const onRequestGenerate = async () => {
    await api.graphAi.generateGraph();
  };

  const handleGenerate = async () => {
    if (!onRequestGenerate || isGenerating) return;
    setIsGenerating(true);
    try {
      await onRequestGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full items-center justify-center gap-4 p-6">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        {/* 그래프 아이콘 */}
        <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
            />
          </svg>
        </div>

        {/* 메인 메시지 */}
        <h2 className="text-xl font-semibold text-text-primary">
          {t("visualize.empty.title")}
        </h2>
        <p className="text-sm text-text-secondary">
          {t("visualize.empty.description")}
        </p>

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t("visualize.empty.generating")}
            </>
          ) : (
            t("visualize.empty.generate")
          )}
        </button>

        {/* 생성 중 안내 메시지 */}
        {isGenerating && (
          <div className="mt-3 p-3 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30 w-full">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-primary flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-xs text-primary font-medium">
                {t("visualize.empty.generatingNotice")}
              </p>
            </div>
          </div>
        )}

        {/* 주의 메시지 */}
        <div className="mt-4 p-4 rounded-lg bg-bg-tertiary border border-base-border w-full">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-text-tertiary text-left leading-relaxed">
              {t("visualize.empty.notice")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
