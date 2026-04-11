import React from "react";
import { FiAlertTriangle, FiRefreshCw, FiHome } from "react-icons/fi";
import i18n from "../i18n";

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

  private handleGoHome = () => {
    window.location.hash = "/";
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const t = i18n.t.bind(i18n);

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-primary text-text-primary px-6">
        <div className="w-full max-w-[400px] rounded-2xl border border-black/10 dark:border-white/10 bg-bg-secondary p-7 shadow-2xl flex flex-col items-center text-center gap-5">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30">
            <FiAlertTriangle className="text-2xl text-red-500 dark:text-red-400" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[18px] font-semibold text-text-primary">
              {t("errorBoundary.title")}
            </p>
            <p className="text-[13px] text-text-secondary leading-relaxed break-words">
              {this.state.errorMessage ?? t("errorBoundary.subtitle")}
            </p>
          </div>

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={this.handleGoHome}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg-tertiary hover:bg-bg-primary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors"
            >
              <FiHome className="text-base" />
              {t("errorBoundary.goHome")}
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:opacity-90 px-4 py-2.5 text-sm font-medium text-white transition-opacity"
            >
              <FiRefreshCw className="text-base" />
              {t("errorBoundary.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
