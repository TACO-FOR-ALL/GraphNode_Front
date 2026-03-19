import { create } from "zustand";

export interface MicroscopeNode {
  id: string;
  name: string;
  type: string;
}

interface AgentToolBoxState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  response: string | null;
  setResponse: (response: string | null) => void;
  microscopeNodes: MicroscopeNode[] | null;
  setMicroscopeNodes: (nodes: MicroscopeNode[] | null) => void;
}

export const useAgentToolBoxStore = create<AgentToolBoxState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  response: null,
  setResponse: (response) => set({ response }),
  microscopeNodes: null,
  setMicroscopeNodes: (microscopeNodes) => set({ microscopeNodes }),
}));
