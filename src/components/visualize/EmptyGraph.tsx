import { useEffect, useState } from "react";
import { api } from "@/apiClient";
import { useTranslation } from "react-i18next";
import { useGraphGenerationStore } from "@/store/useGraphGenerationStore";
import { unwrapResponse } from "@/utils/httpResponse";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/lottie/loading.json";
import { useQueryClient } from "@tanstack/react-query";
import {
  ceilEtaMinutes,
  GRAPH_GENERATION_TOTAL_STEPS,
  type GraphGenerationStepKey,
  parseGraphGenerationStage,
} from "@/utils/graphGenerationProgress";

const GRAPH_GENERATION_STEP_KEYS: GraphGenerationStepKey[] = [
  "featureExtraction",
  "clustering",
  "edgeGeneration",
  "graphMerging",
  "clusterOptimization",
];

export default function EmptyGraph() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isGenerating = useGraphGenerationStore((state) => state.isGenerating);
  const progress = useGraphGenerationStore((state) => state.progress);
  const setGenerating = useGraphGenerationStore((state) => state.setGenerating);
  const resetGeneration = useGraphGenerationStore(
    (state) => state.resetGeneration,
  );
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const syncGraphStatus = async () => {
      try {
        const { status } = unwrapResponse(await api.graph.getStats());

        if (cancelled) {
          return;
        }

        if (status === "CREATING") {
          setGenerating(true);
          return;
        }

        resetGeneration();

        if (status === "CREATED" || status === "UPDATED") {
          queryClient.invalidateQueries({ queryKey: ["graphData"] });
        }
      } catch {
        // 상태 동기화 실패 시 기존 UI 상태를 유지합니다.
      } finally {
        if (!cancelled) {
          setIsCheckingStatus(false);
        }
      }
    };

    syncGraphStatus();

    return () => {
      cancelled = true;
    };
  }, [queryClient, resetGeneration, setGenerating]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setGenerating(true);
    try {
      await api.graphAi.generateGraph();
    } catch {
      resetGeneration();
    }
  };

  const stageInfo = parseGraphGenerationStage(progress.currentStage);
  const currentStepLabel = stageInfo.stepKey
    ? t(`visualize.empty.progress.steps.${stageInfo.stepKey}.title`)
    : t("visualize.empty.progress.pendingStage");
  const currentStageCardLabel = stageInfo.stepKey ? currentStepLabel : "-";
  const currentStageStatus = t(
    `visualize.empty.progress.status.${stageInfo.status}`,
  );
  const etaMinutes = ceilEtaMinutes(progress.etaSeconds);
  const etaLabel =
    etaMinutes !== null
      ? t("visualize.empty.progress.etaValue", {
          minutes: etaMinutes,
        })
      : t("visualize.empty.progress.etaPending");

  if (isCheckingStatus && !isGenerating) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-4 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Lottie
            animationData={loadingAnimation}
            loop={true}
            className="w-20 h-20"
          />
          <p className="text-sm text-text-secondary">{t("visualize.loading")}</p>
        </div>
      </div>
    );
  }

  // 생성 중일 때는 생성 중 화면만 표시
  if (isGenerating) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-4 p-6">
        <div className="flex flex-col items-center gap-5 max-w-xl text-center w-full">
          <div className="w-full rounded-2xl border border-base-border bg-bg-secondary/90 px-6 py-6 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <Lottie
                animationData={loadingAnimation}
                loop={true}
                className="w-24 h-24"
              />

              <div className="space-y-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    {t("visualize.empty.generating")}
                  </p>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    {t("visualize.empty.progress.stepCounter", {
                      current: stageInfo.displayStepNumber,
                      total: GRAPH_GENERATION_TOTAL_STEPS,
                    })}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-text-primary">
                  {currentStepLabel}
                </h2>
                <p className="text-sm text-text-secondary">
                  {t("visualize.empty.generatingNotice")}
                </p>
                <p className="text-xs font-medium text-text-tertiary">
                  {currentStageStatus}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-base-border bg-bg-tertiary/70 p-4 text-left">
              <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
                <span>{t("visualize.empty.progress.stageProgress")}</span>
                <span className="font-medium text-text-secondary">
                  {progress.progressPercent}%
                </span>
              </div>

              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-bg-primary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 rounded-lg border border-base-border bg-bg-secondary/80 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
                    {t("visualize.empty.progress.currentStage")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-primary">
                    {currentStageCardLabel}
                  </p>
                </div>

                <div className="flex-1 rounded-lg border border-base-border bg-bg-secondary/80 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
                    {t("visualize.empty.progress.eta")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-text-primary">
                    {etaLabel}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="grid grid-cols-9 items-end gap-x-1">
                  {GRAPH_GENERATION_STEP_KEYS.flatMap((stepKey, index) => {
                    const stepNumber = index + 1;
                    const isCompleted =
                      stepNumber < stageInfo.displayStepNumber ||
                      (stepNumber === stageInfo.displayStepNumber &&
                        stageInfo.status === "completed");
                    const isCurrent =
                      stepNumber === stageInfo.displayStepNumber &&
                      stageInfo.status !== "completed";
                    const titleToneClass = isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-text-primary"
                        : "text-text-tertiary";

                    return [
                      <div
                        key={`top-${stepKey}`}
                        className="flex min-h-12 items-end justify-center px-1"
                      >
                        {stepNumber % 2 === 0 ? (
                          <p
                            className={`text-center text-[11px] font-medium leading-snug [text-wrap:balance] break-words ${titleToneClass}`}
                          >
                            {t(`visualize.empty.progress.steps.${stepKey}.title`)}
                          </p>
                        ) : null}
                      </div>,
                      index < GRAPH_GENERATION_STEP_KEYS.length - 1 ? (
                        <div key={`top-gap-${stepKey}`} />
                      ) : null,
                    ].filter(Boolean);
                  })}
                </div>

                <div className="grid grid-cols-9 items-center gap-x-1">
                  {GRAPH_GENERATION_STEP_KEYS.flatMap((stepKey, index) => {
                    const stepNumber = index + 1;
                    const isCompleted =
                      stepNumber < stageInfo.displayStepNumber ||
                      (stepNumber === stageInfo.displayStepNumber &&
                        stageInfo.status === "completed");
                    const isCurrent =
                      stepNumber === stageInfo.displayStepNumber &&
                      stageInfo.status !== "completed";

                    const badgeClass = isCompleted
                      ? "border-primary bg-primary text-white"
                      : isCurrent
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-base-border bg-bg-primary text-text-tertiary";
                    const connectorClass = isCompleted
                      ? "bg-primary/70"
                      : isCurrent
                        ? "bg-gradient-to-r from-primary/60 to-base-border"
                        : "bg-base-border";

                    return [
                      <div key={`step-${stepKey}`} className="flex justify-center">
                        <div className="relative flex h-8 w-8 items-center justify-center">
                          {isCurrent ? (
                            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                          ) : null}
                          <span
                            className={`relative flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${badgeClass}`}
                          >
                            {stepNumber}
                          </span>
                        </div>
                      </div>,
                      index < GRAPH_GENERATION_STEP_KEYS.length - 1 ? (
                        <div key={`connector-${stepKey}`} className="px-1">
                          <div className={`h-px w-full rounded-full ${connectorClass}`} />
                        </div>
                      ) : null,
                    ].filter(Boolean);
                  })}
                </div>

                <div className="grid grid-cols-9 items-start gap-x-1">
                  {GRAPH_GENERATION_STEP_KEYS.flatMap((stepKey, index) => {
                    const stepNumber = index + 1;
                    const isCompleted =
                      stepNumber < stageInfo.displayStepNumber ||
                      (stepNumber === stageInfo.displayStepNumber &&
                        stageInfo.status === "completed");
                    const isCurrent =
                      stepNumber === stageInfo.displayStepNumber &&
                      stageInfo.status !== "completed";
                    const titleToneClass = isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-text-primary"
                        : "text-text-tertiary";

                    return [
                      <div
                        key={`bottom-${stepKey}`}
                        className="flex min-h-12 items-start justify-center px-1"
                      >
                        {stepNumber % 2 === 1 ? (
                          <p
                            className={`text-center text-[11px] font-medium leading-snug [text-wrap:balance] break-words ${titleToneClass}`}
                          >
                            {t(`visualize.empty.progress.steps.${stepKey}.title`)}
                          </p>
                        ) : null}
                      </div>,
                      index < GRAPH_GENERATION_STEP_KEYS.length - 1 ? (
                        <div key={`bottom-gap-${stepKey}`} />
                      ) : null,
                    ].filter(Boolean);
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full rounded-xl border border-base-border bg-bg-tertiary/70 p-4">
            <div className="flex items-start gap-3 text-left">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-text-tertiary"
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
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-primary">
                  {t("visualize.empty.generatingNotice")}
                </p>
                <p className="text-xs leading-relaxed text-text-tertiary">
                  {t("visualize.empty.generatingHelp")}
                </p>
              </div>
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
