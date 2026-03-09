import { api } from "@/apiClient";
import { useTranslation } from "react-i18next";
import { useGraphGenerationStore } from "@/store/useGraphGenerationStore";
import { useToastStore } from "@/store/useToastStore";
import { unwrapResponse } from "@/utils/httpResponse";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/lottie/loading.json";

export default function EmptyGraph() {
  const { t } = useTranslation();
  const isGenerating = useGraphGenerationStore((state) => state.isGenerating);
  const setGenerating = useGraphGenerationStore((state) => state.setGenerating);
  const addToast = useToastStore((state) => state.addToast);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setGenerating(true);
    try {
      await api.graphAi.generateGraph();
    } catch {
      setGenerating(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      const { status } = unwrapResponse(await api.graph.getStats());
      addToast({
        message: t(`visualize.empty.status.${status}`),
        type:
          status === "CREATING" || status === "UPDATING" ? "info" : "success",
      });
    } catch {
      addToast({
        message: t("visualize.empty.status.error"),
        type: "error",
      });
    }
  };

  const handleRetry = async () => {
    setGenerating(false);
    // 약간의 딜레이 후 재요청
    setTimeout(() => {
      handleGenerate();
    }, 100);
  };

  // 생성 중일 때는 생성 중 화면만 표시
  if (isGenerating) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-4 p-6">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          {/* 생성 중 안내 메시지 */}
          <div className="p-4 rounded-lg bg-primary/10 dark:bg-primary/20 border border-primary/30 w-full">
            <div className="flex flex-col items-center gap-2">
              <Lottie
                animationData={loadingAnimation}
                loop={true}
                className="w-24 h-24"
              />
              <p className="text-sm text-primary font-medium">
                {t("visualize.empty.generatingNotice")}
              </p>
            </div>
          </div>

          {/* 주의 메시지 */}
          <div className="mt-2 p-4 rounded-lg bg-bg-tertiary border border-base-border w-full">
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
                {t("visualize.empty.generatingHelp")}
              </p>
            </div>
            {/* 텍스트 버튼들 */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                onClick={handleCheckStatus}
                className="text-xs text-primary hover:underline"
              >
                {t("visualize.empty.checkStatus")}
              </button>
              <span className="text-text-tertiary">|</span>
              <button
                onClick={handleRetry}
                className="text-xs text-primary hover:underline"
              >
                {t("visualize.empty.retryGenerate")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          data-onboarding="generate-graph-button"
          className="mt-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
        >
          {t("visualize.empty.generate")}
        </button>

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
