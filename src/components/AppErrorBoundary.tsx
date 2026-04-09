import React from "react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string | null;
};

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error("[AppErrorBoundary] Renderer crashed:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-primary text-text-primary px-6">
        <div className="w-full max-w-[420px] rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#17171c] p-6 shadow-xl">
          <p className="text-[22px] font-semibold">앱 화면을 불러오지 못했습니다</p>
          <p className="mt-3 text-[14px] text-text-secondary leading-relaxed break-words">
            {this.state.errorMessage ??
              "렌더러 초기화 중 오류가 발생했습니다."}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-white"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }
}
