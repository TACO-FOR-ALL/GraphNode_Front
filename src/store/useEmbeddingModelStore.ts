import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EmbeddingModelState {
  // persisted: 설치된 모델 이름 기억
  installedModelName: string | null;
  setInstalledModelName: (name: string | null) => void;

  // runtime: 다운로드 진행 상태 (persist 불필요)
  isDownloading: boolean;
  setIsDownloading: (v: boolean) => void;
  downloadProgress: number; // 0–100
  setDownloadProgress: (n: number) => void;
  downloadFile: string; // 현재 다운로드 중인 파일명
  setDownloadFile: (f: string) => void;
}

export const useEmbeddingModelStore = create<EmbeddingModelState>()(
  persist(
    (set) => ({
      installedModelName: null,
      setInstalledModelName: (installedModelName) =>
        set({ installedModelName }),

      isDownloading: false,
      setIsDownloading: (isDownloading) => set({ isDownloading }),

      downloadProgress: 0,
      setDownloadProgress: (downloadProgress) => set({ downloadProgress }),

      downloadFile: "",
      setDownloadFile: (downloadFile) => set({ downloadFile }),
    }),
    {
      name: "embedding-model-state",
      // installedModelName만 persist, runtime state는 제외
      partialize: (state) => ({
        installedModelName: state.installedModelName,
      }),
    },
  ),
);
