import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SoundState {
  newMessageSound: boolean;
  appNotificationSound: boolean;
  setNewMessageSound: (value: boolean) => void;
  setAppNotificationSound: (value: boolean) => void;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      newMessageSound: true,
      appNotificationSound: true,

      setNewMessageSound: (value) => set({ newMessageSound: value }),
      setAppNotificationSound: (value) => set({ appNotificationSound: value }),
    }),
    {
      name: "sound-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
