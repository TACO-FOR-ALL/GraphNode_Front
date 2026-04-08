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
import { useToastStore } from "@/store/useToastStore";
import { unwrapResponse } from "@/utils/httpResponse";
import { folderRepo } from "@/managers/folderRepo";
import { trashRepo } from "@/managers/trashRepo";
import DeveloperToolsPanel, { isDeveloperToolsEnabled } from "./DeveloperToolsPanel";
import { isElectron } from "@/utils/platform";
import ExportNotesCard from "./ExportNotesCard";
import ExportChatsCard from "./ExportChatsCard";

export default function DataPrivacyPanel() {
  const { t } = useTranslation();
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [showNoteConfirm, setShowNoteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { addToast } = useToastStore();

  const handleClearChats = async () => {
    setIsDeleting(true);
    try {
      unwrapResponse(await api.conversations.deleteAll());
      await threadRepo.clearAll();
      await trashRepo.clearThreadsTrash();
      if (isElectron()) {
        await window.graphnodeAPI.deleteSQLiteOutboxByEntityType("thread");
      }
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
      if (isElectron()) {
        await window.graphnodeAPI.deleteSQLiteOutboxByEntityType("note");
        await window.graphnodeAPI.deleteSQLiteOutboxByEntityType("folder");
      }
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
          <ExportNotesCard />
          <ExportChatsCard />
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
