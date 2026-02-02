import { useState } from "react";
import { useTranslation } from "react-i18next";
import { threadRepo } from "@/managers/threadRepo";
import DropJsonZone from "../DropJsonZone";
import SettingsPanelLayout from "./SettingsPanelLayout";
import SettingCategoryTitle from "./SettingCategoryTitle";
import { api } from "@/apiClient";
import { noteRepo } from "@/managers/noteRepo";
import DropMdZone from "../DropMdZone";
import DangerZoneItem from "./DangerZoneItem";

export default function DataPrivacyPanel() {
  const { t } = useTranslation();
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [showNoteConfirm, setShowNoteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearChats = async () => {
    setIsDeleting(true);
    try {
      await threadRepo.clearAll();
      await api.conversations.deleteAll();
      setShowChatConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearNotes = async () => {
    setIsDeleting(true);
    try {
      await noteRepo.clearAll();
      await api.note.deleteAllNotes();
      await api.note.deleteAllFolders();
      setShowNoteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SettingsPanelLayout>
      {/* Import Data Section */}
      <SettingCategoryTitle
        title={t("settings.dataPrivacy.import.title", "Import Data")}
        subtitle={t(
          "settings.dataPrivacy.import.subtitle",
          "Import your data from external sources",
        )}
      />
      <div className="flex flex-col gap-4 w-full">
        <DropJsonZone />
        <DropMdZone />
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

      {/* Dev Tools - 개발 테스트용 (주석 처리) */}
      {/*
      <div className="mt-8">
        <SettingCategoryTitle title="Developer Tools" subtitle="For testing purposes only" />
      </div>
      <div className="flex flex-col gap-3 w-full p-4 bg-bg-secondary rounded-lg border border-dashed border-text-tertiary">
        <div className="flex gap-4">
          <button
            onClick={async () => {
              const result = await threadRepo.getThreadList();
              console.log(result);
            }}
            className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded-lg transition-colors"
          >
            get client chat
          </button>
          <button
            onClick={async () => {
              const result = await api.conversations.list();
              console.log(result);
            }}
            className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded-lg transition-colors"
          >
            get server chat
          </button>
        </div>
        <div className="flex gap-4">
          <button
            onClick={async () => {
              const result = await noteRepo.getAllNotes();
              console.log(result);
            }}
            className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded-lg transition-colors"
          >
            get client notes
          </button>
          <button
            onClick={async () => {
              const result = await api.note.listNotes();
              console.log(result);
            }}
            className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded-lg transition-colors"
          >
            get server notes
          </button>
        </div>
        <button
          onClick={async () => {
            const result = await api.graphAi.generateGraph();
            console.log(result);
          }}
          className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded-lg transition-colors w-fit"
        >
          generate graph
        </button>
      </div>
      */}
    </SettingsPanelLayout>
  );
}
