import { create } from "zustand";

interface AgentToolBoxState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  response: string | null;
  setResponse: (response: string | null) => void;
}

export const useAgentToolBoxStore = create<AgentToolBoxState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  response: null,
  setResponse: (response) => set({ response }),
}));
