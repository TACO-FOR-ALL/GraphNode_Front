import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  useKeybindsStore,
  formatKeybind,
  ModifierKey,
  KeybindId,
} from "@/store/useKeybindsStore";
import SettingsPanelLayout from "./SettingsPanelLayout";

export default function KeybindsPanel() {
  const { t } = useTranslation();
  const { keybinds, updateKeybind, resetKeybind, resetAllKeybinds } =
    useKeybindsStore();
  const [editingId, setEditingId] = useState<KeybindId | null>(null);
  const [recordedKey, setRecordedKey] = useState<string | null>(null);
  const [recordedModifiers, setRecordedModifiers] = useState<ModifierKey[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editingId) return;

      e.preventDefault();
      e.stopPropagation();

      // 수정자 키만 누른 경우 무시
      if (["Meta", "Control", "Shift", "Alt"].includes(e.key)) {
        return;
      }

      // ⌘+A, ⌘+C, ⌘+V는 제외
      const key = e.key.toLowerCase();
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        ["a", "c", "v"].includes(key)
      ) {
        return;
      }

      const modifiers: ModifierKey[] = [];
      if (e.metaKey) modifiers.push("meta");
      if (e.ctrlKey && !e.metaKey) modifiers.push("ctrl");
      if (e.shiftKey) modifiers.push("shift");
      if (e.altKey) modifiers.push("alt");

      // 최소 하나의 수정자 키가 필요
      if (modifiers.length === 0) {
        return;
      }

      setRecordedKey(key);
      setRecordedModifiers(modifiers);
    },
    [editingId],
  );

  useEffect(() => {
    if (editingId) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [editingId, handleKeyDown]);

  const startEditing = (id: KeybindId) => {
    setEditingId(id);
    setRecordedKey(null);
    setRecordedModifiers([]);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setRecordedKey(null);
    setRecordedModifiers([]);
  };

  const saveKeybind = () => {
    if (editingId && recordedKey && recordedModifiers.length > 0) {
      updateKeybind(editingId, recordedKey, recordedModifiers);
    }
    cancelEditing();
  };

  const keybindList: KeybindId[] = [
    "search",
    "newNote",
    "newFolder",
    "newChat",
  ];

  return (
    <SettingsPanelLayout>
      <div className="flex items-center justify-between gap-x-4">
        <h2 className="text-xl font-semibold text-text-primary">
          {t("settings.keybindsPanel.title")}
        </h2>
        <button
          onClick={resetAllKeybinds}
          className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-colors"
        >
          {t("settings.keybindsPanel.resetAll")}
        </button>
      </div>

      <p className="text-sm text-text-secondary mb-6">
        {t("settings.keybindsPanel.description")}
      </p>

      <div className="space-y-3 w-full">
        {keybindList.map((id) => {
          const keybind = keybinds[id];
          const isEditing = editingId === id;

          return (
            <div
              key={id}
              className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg w-full"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {t(`settings.keybindsPanel.actions.${id}`)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <div className="min-w-[120px] h-9 flex items-center justify-center px-3 bg-bg-tertiary border-2 border-accent-primary rounded-md">
                      {recordedKey ? (
                        <span className="text-sm font-mono text-text-primary">
                          {formatKeybind({
                            ...keybind,
                            key: recordedKey,
                            modifiers: recordedModifiers,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-text-placeholder animate-pulse">
                          {t("settings.keybindsPanel.waitingForKey")}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={saveKeybind}
                      disabled={!recordedKey}
                      className="px-3 py-1.5 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {t("settings.keybindsPanel.save")}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
                    >
                      {t("settings.keybindsPanel.cancel")}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(id)}
                      className="min-w-[100px] h-9 flex items-center justify-center px-3 bg-bg-tertiary hover:bg-bg-primary rounded-md transition-colors"
                    >
                      <span className="text-sm font-mono text-text-primary">
                        {formatKeybind(keybind)}
                      </span>
                    </button>
                    <button
                      onClick={() => resetKeybind(id)}
                      className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
                      title={t("settings.keybindsPanel.resetToDefault")}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-bg-secondary rounded-lg w-full">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          {t("settings.keybindsPanel.tips.title")}
        </h3>
        <ul className="text-sm text-text-secondary space-y-1">
          <li>- {t("settings.keybindsPanel.tips.modifierKeys")}</li>
          <li>- {t("settings.keybindsPanel.tips.systemKeys")}</li>
          <li>- {t("settings.keybindsPanel.tips.windowsLinux")}</li>
        </ul>
      </div>
    </SettingsPanelLayout>
  );
}
