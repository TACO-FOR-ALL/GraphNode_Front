import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GraphGenerationProgress {
  taskId: string | null;
  currentStage: string | null;
  progressPercent: number;
  etaSeconds: number | null;
  lastUpdatedAt: string | null;
}

interface GraphGenerationState {
  isGenerating: boolean;
  progress: GraphGenerationProgress;
  lastTerminalTaskId: string | null;
  lastTerminalTimestamp: string | null;
  setGenerating: (isGenerating: boolean) => void;
  markRequested: (payload?: { taskId?: string; timestamp?: string }) => void;
  updateProgress: (payload: {
    taskId?: string;
    currentStage: string;
    progressPercent: number;
    etaSeconds: number | null;
    timestamp: string;
  }) => void;
  resetGeneration: (payload?: { taskId?: string; timestamp?: string }) => void;
}

const initialProgressState: GraphGenerationProgress = {
  taskId: null,
  currentStage: null,
  progressPercent: 0,
  etaSeconds: null,
  lastUpdatedAt: null,
};

function compareIsoTimestamps(a: string, b: string): number {
  const left = Date.parse(a);
  const right = Date.parse(b);

  if (Number.isFinite(left) && Number.isFinite(right)) {
    return left - right;
  }

  return a.localeCompare(b);
}

function isOlderTimestamp(candidate: string, reference: string): boolean {
  return compareIsoTimestamps(candidate, reference) < 0;
}

export const useGraphGenerationStore = create<GraphGenerationState>()(
  persist(
    (set) => ({
      isGenerating: false,
      progress: initialProgressState,
      lastTerminalTaskId: null,
      lastTerminalTimestamp: null,
      setGenerating: (isGenerating) =>
        set((state) => {
          if (isGenerating) {
            if (state.isGenerating) {
              return state;
            }

            return {
              isGenerating: true,
              progress: initialProgressState,
            };
          }

          return {
            isGenerating: false,
            progress: initialProgressState,
          };
        }),
      markRequested: (payload) =>
        set((state) => {
          const nextTaskId = payload?.taskId ?? null;
          const nextTimestamp = payload?.timestamp ?? null;

          if (
            nextTimestamp &&
            state.progress.lastUpdatedAt &&
            isOlderTimestamp(nextTimestamp, state.progress.lastUpdatedAt)
          ) {
            return state;
          }

          if (
            nextTimestamp &&
            nextTaskId &&
            state.lastTerminalTaskId === nextTaskId &&
            state.lastTerminalTimestamp &&
            compareIsoTimestamps(nextTimestamp, state.lastTerminalTimestamp) <= 0
          ) {
            return state;
          }

          return {
            isGenerating: true,
            progress: {
              taskId: nextTaskId,
              currentStage: null,
              progressPercent: 0,
              etaSeconds: null,
              lastUpdatedAt: nextTimestamp,
            },
          };
        }),
      updateProgress: (payload) =>
        set((state) => {
          const { progress } = state;
          const nextTaskId = payload.taskId ?? progress.taskId;

          if (
            nextTaskId &&
            state.lastTerminalTaskId === nextTaskId &&
            state.lastTerminalTimestamp &&
            compareIsoTimestamps(payload.timestamp, state.lastTerminalTimestamp) <= 0
          ) {
            return state;
          }

          if (
            state.isGenerating &&
            progress.taskId &&
            payload.taskId &&
            progress.taskId !== payload.taskId
          ) {
            return state;
          }

          if (
            progress.lastUpdatedAt &&
            isOlderTimestamp(payload.timestamp, progress.lastUpdatedAt)
          ) {
            return state;
          }

          return {
            isGenerating: true,
            progress: {
              taskId: nextTaskId,
              currentStage: payload.currentStage,
              progressPercent: Math.max(
                0,
                Math.min(100, Math.floor(payload.progressPercent)),
              ),
              etaSeconds:
                typeof payload.etaSeconds === "number" &&
                Number.isFinite(payload.etaSeconds)
                  ? Math.max(0, Math.floor(payload.etaSeconds))
                  : null,
              lastUpdatedAt: payload.timestamp,
            },
          };
        }),
      resetGeneration: (payload) =>
        set((state) => {
          const nextTaskId = payload?.taskId ?? state.progress.taskId ?? null;
          const nextTimestamp =
            payload?.timestamp ??
            state.progress.lastUpdatedAt ??
            state.lastTerminalTimestamp;

          if (
            payload?.taskId &&
            state.isGenerating &&
            state.progress.taskId &&
            state.progress.taskId !== payload.taskId
          ) {
            return state;
          }

          if (
            payload?.timestamp &&
            state.progress.lastUpdatedAt &&
            payload.taskId === state.progress.taskId &&
            isOlderTimestamp(payload.timestamp, state.progress.lastUpdatedAt)
          ) {
            return state;
          }

          return {
            isGenerating: false,
            progress: {
              ...initialProgressState,
              taskId: nextTaskId,
              lastUpdatedAt: nextTimestamp,
            },
            lastTerminalTaskId: nextTaskId,
            lastTerminalTimestamp: nextTimestamp,
          };
        }),
    }),
    {
      name: "graph-generation-state",
    },
  ),
);
