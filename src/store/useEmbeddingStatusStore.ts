import { create } from "zustand";

type EmbeddingStatusState = {
  isProcessing: boolean;
  pendingCount: number;
  embeddingCount: number;
  modelLoaded: boolean;
  currentModel: string;
  downloadProgress: { file: string; progress: number } | null;
  setStatus: (status: {
    isProcessing: boolean;
    pendingCount: number;
    embeddingCount: number;
    modelLoaded: boolean;
    currentModel: string;
    downloadProgress?: { file: string; progress: number } | null;
  }) => void;
};

export const useEmbeddingStatusStore = create<EmbeddingStatusState>((set) => ({
  isProcessing: false,
  pendingCount: 0,
  embeddingCount: 0,
  modelLoaded: false,
  currentModel: "",
  downloadProgress: null,
  setStatus: (status) => set({ ...status, downloadProgress: status.downloadProgress ?? null }),
}));
