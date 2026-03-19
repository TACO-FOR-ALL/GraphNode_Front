import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConversationUpdateState {
  isUpdating: boolean;
  setUpdating: (isUpdating: boolean) => void;
}

export const useConversationUpdateStore = create<ConversationUpdateState>()(
  persist(
    (set) => ({
      isUpdating: false,
      setUpdating: (isUpdating) => set({ isUpdating }),
    }),
    {
      name: "conversation-update-state",
    },
  ),
);
