import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { trashRepo } from "@/managers/trashRepo";
import {
  IoTrash,
  IoRefresh,
  IoDocumentText,
  IoChatbubbles,
} from "react-icons/io5";
import { TrashedNote, TrashedThread } from "@/types/Trash";

type TabType = "all" | "notes" | "chats";

export default function TrashPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [trashedNotes, setTrashedNotes] = useState<TrashedNote[]>([]);
  const [trashedThreads, setTrashedThreads] = useState<TrashedThread[]>([]);

  const loadTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notes, threads] = await Promise.all([
        trashRepo.getTrashedNotes(),
        trashRepo.getTrashedThreads(),
      ]);
      setTrashedNotes(notes);
      setTrashedThreads(threads);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestoreNote = async (id: string) => {
    await trashRepo.restoreNote(id);
    setTrashedNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleRestoreThread = async (id: string) => {
    await trashRepo.restoreThread(id);
    setTrashedThreads((prev) => prev.filter((thread) => thread.id !== id));
  };

  const handleDeleteNote = async (id: string) => {
    await trashRepo.permanentlyDeleteNote(id);
    setTrashedNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleDeleteThread = async (id: string) => {
    await trashRepo.permanentlyDeleteThread(id);
    setTrashedThreads((prev) => prev.filter((thread) => thread.id !== id));
  };

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      await trashRepo.emptyTrash();
      setTrashedNotes([]);
      setTrashedThreads([]);
      setShowEmptyConfirm(false);
    } finally {
      setIsEmptying(false);
    }
  };

  const getDaysUntilExpiry = (expiresAt: number): number => {
    const now = Date.now();
    const diff = expiresAt - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const filteredNotes =
    activeTab === "all" || activeTab === "notes" ? trashedNotes : [];
  const filteredThreads =
    activeTab === "all" || activeTab === "chats" ? trashedThreads : [];

  const totalItems = trashedNotes.length + trashedThreads.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {showEmptyConfirm && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmptyConfirm(false)}
              disabled={isEmptying}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              {t("settings.dataPrivacy.cancel", "Cancel")}
            </button>
            <button
              onClick={handleEmptyTrash}
              disabled={isEmptying}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isEmptying
                ? t("settings.dataPrivacy.deleting", "Deleting...")
                : t("settings.dataPrivacy.confirmDelete", "Confirm Delete")}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-bg-tertiary">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "all"
              ? "text-accent-primary border-b-2 border-accent-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t("settings.dataPrivacy.trash.all", "All")} ({totalItems})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "notes"
              ? "text-accent-primary border-b-2 border-accent-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t("search.notes", "Notes")} ({trashedNotes.length})
        </button>
        <button
          onClick={() => setActiveTab("chats")}
          className={`px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "chats"
              ? "text-accent-primary border-b-2 border-accent-primary"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {t("search.chats", "Chats")} ({trashedThreads.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-primary" />
          </div>
        ) : totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <IoTrash className="text-3xl mb-2 opacity-50" />
            <p className="text-sm">
              {t("settings.dataPrivacy.trash.noItems", "Trash is empty")}
            </p>
          </div>
        ) : (
          <>
            {filteredNotes.map((note) => (
              <TrashNoteItem
                key={note.id}
                note={note}
                daysLeft={getDaysUntilExpiry(note.expiresAt)}
                onRestore={() => handleRestoreNote(note.id)}
                onDelete={() => handleDeleteNote(note.id)}
              />
            ))}
            {filteredThreads.map((thread) => (
              <TrashThreadItem
                key={thread.id}
                thread={thread}
                daysLeft={getDaysUntilExpiry(thread.expiresAt)}
                onRestore={() => handleRestoreThread(thread.id)}
                onDelete={() => handleDeleteThread(thread.id)}
              />
            ))}
          </>
        )}
      </div>
      <div>
        {totalItems > 0 && !showEmptyConfirm && (
          <button
            onClick={() => setShowEmptyConfirm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <IoTrash className="text-base" />
            {t("settings.dataPrivacy.trash.empty", "Empty Trash")}
          </button>
        )}
      </div>
    </div>
  );
}

function TrashNoteItem({
  note,
  daysLeft,
  onRestore,
  onDelete,
}: {
  note: TrashedNote;
  daysLeft: number;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <IoDocumentText className="text-lg text-text-secondary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {note.originalNote.title || t("notes.newNote", "Untitled")}
          </p>
          <p className="text-xs text-text-tertiary">
            {t(
              "settings.dataPrivacy.trash.expiresIn",
              "Expires in {{days}} days",
              {
                days: daysLeft,
              },
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!showDeleteConfirm ? (
          <>
            <button
              onClick={onRestore}
              className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:bg-bg-tertiary rounded transition-colors"
              title={t("settings.dataPrivacy.trash.restore", "Restore")}
            >
              <IoRefresh className="text-sm" />
              {t("settings.dataPrivacy.trash.restore", "Restore")}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title={t(
                "settings.dataPrivacy.trash.delete",
                "Delete Permanently",
              )}
            >
              <IoTrash className="text-sm" />
              {t("settings.dataPrivacy.trash.delete", "Delete")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary rounded transition-colors"
            >
              {t("settings.dataPrivacy.cancel", "Cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
            >
              {isDeleting
                ? t("settings.dataPrivacy.deleting", "Deleting...")
                : t("settings.dataPrivacy.confirmDelete", "Confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TrashThreadItem({
  thread,
  daysLeft,
  onRestore,
  onDelete,
}: {
  thread: TrashedThread;
  daysLeft: number;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <IoChatbubbles className="text-lg text-text-secondary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {thread.originalThread.title || t("chat.newChat", "Untitled Chat")}
          </p>
          <p className="text-xs text-text-tertiary">
            {t(
              "settings.dataPrivacy.trash.expiresIn",
              "Expires in {{days}} days",
              {
                days: daysLeft,
              },
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!showDeleteConfirm ? (
          <>
            <button
              onClick={onRestore}
              className="flex items-center gap-1 px-2 py-1 text-xs text-accent-primary hover:bg-bg-tertiary rounded transition-colors"
              title={t("settings.dataPrivacy.trash.restore", "Restore")}
            >
              <IoRefresh className="text-sm" />
              {t("settings.dataPrivacy.trash.restore", "Restore")}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title={t(
                "settings.dataPrivacy.trash.delete",
                "Delete Permanently",
              )}
            >
              <IoTrash className="text-sm" />
              {t("settings.dataPrivacy.trash.delete", "Delete")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary rounded transition-colors"
            >
              {t("settings.dataPrivacy.cancel", "Cancel")}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-2 py-1 text-xs text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
            >
              {isDeleting
                ? t("settings.dataPrivacy.deleting", "Deleting...")
                : t("settings.dataPrivacy.confirmDelete", "Confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
