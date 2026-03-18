import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  IoBookOutline,
  IoChatbubblesOutline,
  IoCloudDownloadOutline,
} from "react-icons/io5";
import { threadRepo } from "@/managers/threadRepo";
import DropJsonZone from "./DropJsonZone";
import SettingsPanelLayout from "./SettingsPanelLayout";
import SettingCategoryTitle from "./SettingCategoryTitle";
import { api } from "@/apiClient";
import { noteRepo } from "@/managers/noteRepo";
import DropMdZone from "./DropMdZone";
import DangerZoneItem from "./DangerZoneItem";
import TrashPanel from "./TrashPanel";
import { useToastStore } from "@/store/useToastStore";
import { unwrapResponse } from "@/utils/httpResponse";
import { folderRepo } from "@/managers/folderRepo";
import { trashRepo } from "@/managers/trashRepo";
import DeveloperToolsPanel, { isDeveloperToolsEnabled } from "./DeveloperToolsPanel";

export default function DataPrivacyPanel() {
  const { t } = useTranslation();
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [showNoteConfirm, setShowNoteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExportingNotes, setIsExportingNotes] = useState(false);
  const [isExportingChats, setIsExportingChats] = useState(false);

  const { addToast } = useToastStore();

  const handleClearChats = async () => {
    setIsDeleting(true);
    try {
      unwrapResponse(await api.conversations.deleteAll());
      await threadRepo.clearAll();
      await trashRepo.clearThreadsTrash();
      await window.graphnodeAPI.deleteSQLiteOutboxByEntityType("thread");
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
      await folderRepo.clearAll();
      await trashRepo.clearNotesAndFoldersTrash();
      await window.graphnodeAPI.deleteSQLiteOutboxByEntityType("note");
      await window.graphnodeAPI.deleteSQLiteOutboxByEntityType("folder");
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

  const handleExportNotes = async () => {
    setIsExportingNotes(true);
    try {
      const notes = await noteRepo.getAllNotes();
      const result =
        await window.graphnodeAPI.exportSQLiteNotesToDirectory(notes);

      if (result.canceled) {
        addToast({
          message: t("settings.dataPrivacy.export.toast.cancelled"),
          type: "info",
        });
        return;
      }

      addToast({
        message: t("settings.dataPrivacy.export.toast.notesSuccess", {
          count: result.count ?? notes.length,
        }),
        type: "success",
      });
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : t("settings.dataPrivacy.export.toast.notesError"),
        type: "error",
      });
    } finally {
      setIsExportingNotes(false);
    }
  };

  const handleExportChats = async () => {
    setIsExportingChats(true);
    try {
      const threads = await threadRepo.getThreadList();
      const result =
        await window.graphnodeAPI.exportSQLiteThreadsToDirectory(threads);

      if (result.canceled) {
        addToast({
          message: t("settings.dataPrivacy.export.toast.cancelled"),
          type: "info",
        });
        return;
      }

      addToast({
        message: t("settings.dataPrivacy.export.toast.chatsSuccess", {
          count: result.count ?? threads.length,
        }),
        type: "success",
      });
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : t("settings.dataPrivacy.export.toast.chatsError"),
        type: "error",
      });
    } finally {
      setIsExportingChats(false);
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
      {/* Export Data Section */}
      <div className="mt-8 w-full">
        <SettingCategoryTitle
          title={t("settings.dataPrivacy.export.title", "Export My Data")}
          subtitle={t(
            "settings.dataPrivacy.export.subtitle",
            "Save your notes and conversations to a directory you choose",
          )}
        />
        <div className="flex gap-3 w-full mt-4">
          <button
            onClick={handleExportNotes}
            disabled={isExportingNotes || isExportingChats}
            className="group flex flex-col gap-3 flex-1 p-4 bg-bg-secondary hover:bg-bg-tertiary border border-transparent hover:border-text-tertiary/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                <IoBookOutline className="text-base" />
              </div>
              <IoCloudDownloadOutline
                className={`text-lg text-text-tertiary group-hover:text-text-secondary transition-colors ${isExportingNotes ? "animate-pulse" : ""}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {isExportingNotes
                  ? t("settings.dataPrivacy.export.exporting", "Exporting...")
                  : t("settings.dataPrivacy.export.notes", "Export Notes")}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {t("settings.dataPrivacy.export.notesHint", "Markdown files")}
              </p>
            </div>
          </button>
          <button
            onClick={handleExportChats}
            disabled={isExportingChats || isExportingNotes}
            className="group flex flex-col gap-3 flex-1 p-4 bg-bg-secondary hover:bg-bg-tertiary border border-transparent hover:border-text-tertiary/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 transition-colors">
                <IoChatbubblesOutline className="text-base" />
              </div>
              <IoCloudDownloadOutline
                className={`text-lg text-text-tertiary group-hover:text-text-secondary transition-colors ${isExportingChats ? "animate-pulse" : ""}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {isExportingChats
                  ? t("settings.dataPrivacy.export.exporting", "Exporting...")
                  : t("settings.dataPrivacy.export.chats", "Export Chats")}
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {t("settings.dataPrivacy.export.chatsHint", "JSON files")}
              </p>
            </div>
          </button>
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
      {isDeveloperToolsEnabled() && <DeveloperToolsPanel />}
    </SettingsPanelLayout>
  );
}
