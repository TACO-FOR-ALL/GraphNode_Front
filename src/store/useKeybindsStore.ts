import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ModifierKey = "meta" | "ctrl" | "shift" | "alt";

export interface Keybind {
  id: string;
  name: string;
  key: string;
  modifiers: ModifierKey[];
}

export type KeybindId = "search" | "newNote" | "newFolder" | "newChat";

interface KeybindsState {
  keybinds: Record<KeybindId, Keybind>;
  updateKeybind: (id: KeybindId, key: string, modifiers: ModifierKey[]) => void;
  resetKeybind: (id: KeybindId) => void;
  resetAllKeybinds: () => void;
}

const defaultKeybinds: Record<KeybindId, Keybind> = {
  search: {
    id: "search",
    name: "검색 모달 열기",
    key: "f",
    modifiers: ["meta"],
  },
  newNote: {
    id: "newNote",
    name: "새 노트 생성",
    key: "n",
    modifiers: ["meta"],
  },
  newFolder: {
    id: "newFolder",
    name: "새 폴더 생성",
    key: "n",
    modifiers: ["meta", "shift"],
  },
  newChat: {
    id: "newChat",
    name: "새 채팅 생성",
    key: "j",
    modifiers: ["meta"],
  },
};

export const useKeybindsStore = create<KeybindsState>()(
  persist(
    (set) => ({
      keybinds: defaultKeybinds,
      updateKeybind: (id, key, modifiers) =>
        set((state) => ({
          keybinds: {
            ...state.keybinds,
            [id]: {
              ...state.keybinds[id],
              key: key.toLowerCase(),
              modifiers,
            },
          },
        })),
      resetKeybind: (id) =>
        set((state) => ({
          keybinds: {
            ...state.keybinds,
            [id]: defaultKeybinds[id],
          },
        })),
      resetAllKeybinds: () =>
        set(() => ({
          keybinds: defaultKeybinds,
        })),
    }),
    {
      name: "keybinds-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function matchesKeybind(
  e: KeyboardEvent,
  keybind: Keybind,
): boolean {
  const key = e.key.toLowerCase();
  if (key !== keybind.key) return false;

  const hasCtrl = keybind.modifiers.includes("ctrl");
  const hasMeta = keybind.modifiers.includes("meta");
  const hasShift = keybind.modifiers.includes("shift");
  const hasAlt = keybind.modifiers.includes("alt");

  // meta 또는 ctrl 중 하나라도 포함되어 있으면 둘 중 하나가 눌려야 함
  const needsMetaOrCtrl = hasMeta || hasCtrl;
  const metaOrCtrlPressed = e.metaKey || e.ctrlKey;

  if (needsMetaOrCtrl && !metaOrCtrlPressed) return false;
  if (!needsMetaOrCtrl && metaOrCtrlPressed) return false;

  if (hasShift !== e.shiftKey) return false;
  if (hasAlt !== e.altKey) return false;

  return true;
}

export function formatKeybind(keybind: Keybind): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const symbols: Record<ModifierKey, string> = {
    meta: isMac ? "⌘" : "Ctrl",
    ctrl: "Ctrl",
    shift: "⇧",
    alt: isMac ? "⌥" : "Alt",
  };

  const modifierOrder: ModifierKey[] = ["ctrl", "alt", "shift", "meta"];
  const sortedModifiers = keybind.modifiers
    .slice()
    .sort((a, b) => modifierOrder.indexOf(a) - modifierOrder.indexOf(b));

  const parts = sortedModifiers.map((mod) => symbols[mod]);
  parts.push(keybind.key.toUpperCase());

  return parts.join(" + ");
}
