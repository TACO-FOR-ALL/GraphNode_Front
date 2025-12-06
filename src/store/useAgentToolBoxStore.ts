import { create } from "zustand";

interface AgentToolBoxState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useAgentToolBoxStore = create<AgentToolBoxState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
