import { useState } from "react";
import { useTranslation } from "react-i18next";
import { threadRepo } from "@/managers/threadRepo";
import DropJsonZone from "./DropJsonZone";
import SettingsPanelLayout from "./SettingsPanelLayout";
import SettingCategoryTitle from "./SettingCategoryTitle";
import { api } from "@/apiClient";
import { noteRepo } from "@/managers/noteRepo";
import DropMdZone from "./DropMdZone";
import DangerZoneItem from "./DangerZoneItem";
import TrashPanel from "./TrashPanel";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useChangelogStore } from "@/store/useChangelogStore";
import { useToastStore } from "@/store/useToastStore";
import { unwrapResponse } from "@/utils/httpResponse";

export default function DataPrivacyPanel() {
  const { t } = useTranslation();
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [showNoteConfirm, setShowNoteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { resetOnboarding, startOnboarding } = useOnboardingStore();
  const { resetLastSeenVersion, setModalOpen } = useChangelogStore();
  const { addToast } = useToastStore();

  const handleClearChats = async () => {
    setIsDeleting(true);
    try {
      unwrapResponse(await api.conversations.deleteAll());
      await threadRepo.clearAll();
      setShowChatConfirm(false);
      addToast({
        message: t("settings.dataPrivacy.clearChats.toast.success"),
        type: "success",
      });
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : t("settings.dataPrivacy.clearChats.toast.error"),
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearNotes = async () => {
    setIsDeleting(true);
    try {
      unwrapResponse(await api.note.deleteAllNotes());
      unwrapResponse(await api.note.deleteAllFolders());
      await noteRepo.clearAll();
      setShowNoteConfirm(false);
      addToast({
        message: t("settings.dataPrivacy.clearNotes.toast.success"),
        type: "success",
      });
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : t("settings.dataPrivacy.clearNotes.toast.error"),
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SettingsPanelLayout>
      {/* Import Data Section */}
      <div data-onboarding="data-import-section" className="w-full">
        <SettingCategoryTitle
          title={t("settings.dataPrivacy.import.title", "Import Data")}
          subtitle={t(
            "settings.dataPrivacy.import.subtitle",
            "Import your data from external sources",
          )}
        />
        <div className="flex gap-4 w-full mt-4">
          <DropJsonZone />
          <DropMdZone />
        </div>
      </div>
      {/* Trash Section */}
      <div className="mt-8 w-full">
        <SettingCategoryTitle
          title={t("settings.dataPrivacy.trash.title", "Trash")}
          subtitle={t(
            "settings.dataPrivacy.trash.subtitle",
            "Deleted items are kept for 30 days",
          )}
        />
        <TrashPanel />
      </div>
      {/* Danger Zone */}
      <div className="mt-8">
        <SettingCategoryTitle
          title={t("settings.dataPrivacy.dangerZone.title", "Danger Zone")}
          subtitle={t(
            "settings.dataPrivacy.dangerZone.subtitle",
            "Irreversible actions. Please proceed with caution.",
          )}
        />
      </div>
      <div className="flex flex-col gap-3 w-full">
        <DangerZoneItem
          title={t("settings.dataPrivacy.clearChats.title", "Clear All Chats")}
          subtitle={t(
            "settings.dataPrivacy.clearChats.description",
            "Permanently delete all chat conversations",
          )}
          cancel={t("settings.dataPrivacy.cancel", "Cancel")}
          deleteText={t("settings.dataPrivacy.delete", "Delete")}
          deleting={t("settings.dataPrivacy.deleting", "Deleting...")}
          confirmDelete={t(
            "settings.dataPrivacy.confirmDelete",
            "Confirm Delete",
          )}
          isDeleting={isDeleting}
          showConfirm={showChatConfirm}
          setShowConfirm={setShowChatConfirm}
          handleClearTarget={handleClearChats}
        />
        <DangerZoneItem
          title={t("settings.dataPrivacy.clearNotes.title", "Clear All Notes")}
          subtitle={t(
            "settings.dataPrivacy.clearNotes.description",
            "Permanently delete all notes and folders",
          )}
          cancel={t("settings.dataPrivacy.cancel", "Cancel")}
          deleteText={t("settings.dataPrivacy.delete", "Delete")}
          deleting={t("settings.dataPrivacy.deleting", "Deleting...")}
          confirmDelete={t(
            "settings.dataPrivacy.confirmDelete",
            "Confirm Delete",
          )}
          isDeleting={isDeleting}
          showConfirm={showNoteConfirm}
          setShowConfirm={setShowNoteConfirm}
          handleClearTarget={handleClearNotes}
        />
      </div>
      {import.meta.env.DEV && (
        <div className="mt-8 w-full">
          <SettingCategoryTitle
            title="Developer Tools"
            subtitle="For testing purposes only"
          />
          <div className="w-full mt-4 bg-bg-secondary rounded-lg border border-dashed border-text-tertiary divide-y divide-text-tertiary/20">
            {/* Chat */}
            <div className="p-4">
              <p className="text-[10px] font-semibold text-text-tertiary mb-3 uppercase tracking-widest">
                Chat
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    const result = await threadRepo.getThreadList();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  get client chat
                </button>
                <button
                  onClick={async () => {
                    const result = await api.conversations.list();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  get server chat
                </button>
                <button
                  onClick={async () => {
                    await threadRepo.clearAll();
                    const result = await api.conversations.deleteAll();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  delete server, client chat
                </button>
              </div>
            </div>
            {/* Notes */}
            <div className="p-4">
              <p className="text-[10px] font-semibold text-text-tertiary mb-3 uppercase tracking-widest">
                Notes
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    const result = await noteRepo.getAllNotes();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  get client notes
                </button>
                <button
                  onClick={async () => {
                    const result = await api.note.listNotes();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  get server notes
                </button>
              </div>
            </div>
            {/* Graph */}
            <div className="p-4">
              <p className="text-[10px] font-semibold text-text-tertiary mb-3 uppercase tracking-widest">
                Graph
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    const result = await api.graphAi.generateGraph();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  generate graph
                </button>
                <button
                  onClick={async () => {
                    const result = await api.graph.getSnapshot();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  get graph
                </button>
                <button
                  onClick={async () => {
                    const result = await api.graphAi.requestSummary();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  generate summary
                </button>
                <button
                  onClick={async () => {
                    const result = await api.graphAi.getSummary();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  get summary
                </button>
                <button
                  onClick={async () => {
                    const result = await api.graphAi.deleteGraph();
                    console.log(result);
                  }}
                  className="px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  delete graph
                </button>
              </div>
            </div>
            {/* UI */}
            <div className="p-4">
              <p className="text-[10px] font-semibold text-text-tertiary mb-3 uppercase tracking-widest">
                UI
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    resetOnboarding();
                    startOnboarding();
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  restart onboarding
                </button>
                <button
                  onClick={() => {
                    resetLastSeenVersion();
                    setModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
                >
                  show changelog
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsPanelLayout>
  );
}
