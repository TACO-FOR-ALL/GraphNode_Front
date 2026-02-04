import { useTranslation } from "react-i18next";

interface ErrorScreenProps {
  onRetry?: () => void;
}

export default function ErrorScreen({ onRetry }: ErrorScreenProps) {
  const { t } = useTranslation();

  const handleOpenStatus = () => {
    window.systemAPI.openExternal("https://www.graphnode.site/dev/status");
  };

  return (
    <div className="flex flex-col w-full h-full items-center justify-center gap-4 p-6">
      <div className="flex flex-col items-center gap-3 max-w-md text-center">
        {/* 에러 아이콘 */}
        <div className="w-16 h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* 에러 메시지 */}
        <h2 className="text-lg font-semibold text-text-primary">
          {t("visualize.error.title")}
        </h2>
        <p className="text-sm text-text-secondary">
          {t("visualize.error.description")}
        </p>

        {/* 에러 상세 (개발용) */}
        {/* <div className="mt-2 p-3 rounded-lg bg-bg-tertiary border border-base-border w-full">
            <p className="text-xs text-text-tertiary font-mono break-all">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div> */}

        {/* 재시도 버튼 */}
        <button
          onClick={onRetry}
          className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {t("visualize.error.retry")}
        </button>

        {/* 서버 상태 확인 링크 */}
        <p className="mt-3 text-xs text-text-tertiary">
          {t("visualize.error.persistentHint")}{" "}
          <button
            onClick={handleOpenStatus}
            className="text-primary hover:underline"
          >
            {t("visualize.error.checkStatus")}
          </button>
        </p>
      </div>
    </div>
  );
}
