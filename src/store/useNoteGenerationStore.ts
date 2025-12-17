import { create } from "zustand";

type GenerationPhase =
  | "idle"
  | "analyzing"
  | "summarizing"
  | "writing"
  | "done"
  | "error";

interface NoteGenerationState {
  phase: GenerationPhase;
  message: string | null;
  setPhase: (phase: GenerationPhase, message?: string) => void;
  reset: () => void;
}

export const useNoteGenerationStore = create<NoteGenerationState>((set) => ({
  phase: "idle",
  message: null,

  setPhase: (phase, message = "") => set({ phase, message }),

  reset: () => set({ phase: "idle", message: null }),
}));
