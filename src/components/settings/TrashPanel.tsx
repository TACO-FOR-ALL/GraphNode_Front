import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { trashRepo } from "@/managers/trashRepo";
import {
  IoTrash,
  IoRefresh,
  IoDocumentText,
  IoChatbubbles,
  IoFolder,
} from "react-icons/io5";
import { TrashedNote, TrashedThread, TrashedFolder } from "@/types/Trash";

type TabType = "all" | "notes" | "chats" | "folders";

export default function TrashPanel() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [trashedNotes, setTrashedNotes] = useState<TrashedNote[]>([]);
  const [trashedThreads, setTrashedThreads] = useState<TrashedThread[]>([]);
  const [trashedFolders, setTrashedFolders] = useState<TrashedFolder[]>([]);

  const loadTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notes, threads, folders] = await Promise.all([
        trashRepo.getTrashedNotes(),
        trashRepo.getTrashedThreads(),
        trashRepo.getTrashedFolders(),
      ]);
      setTrashedNotes(notes);
      setTrashedThreads(threads);
      setTrashedFolders(folders);
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

  const handleRestoreFolder = async (id: string) => {
    await trashRepo.restoreFolder(id);
    setTrashedFolders((prev) => prev.filter((folder) => folder.id !== id));
  };

  const handleDeleteNote = async (id: string) => {
    await trashRepo.permanentlyDeleteNote(id);
    setTrashedNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const handleDeleteThread = async (id: string) => {
    await trashRepo.permanentlyDeleteThread(id);
    setTrashedThreads((prev) => prev.filter((thread) => thread.id !== id));
  };

  const handleDeleteFolder = async (id: string) => {
    await trashRepo.permanentlyDeleteFolder(id);
    setTrashedFolders((prev) => prev.filter((folder) => folder.id !== id));
  };

  const handleEmptyTrash = async () => {
    setIsEmptying(true);
    try {
      await trashRepo.emptyTrash();
      setTrashedNotes([]);
      setTrashedThreads([]);
      setTrashedFolders([]);
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
  const filteredFolders =
    activeTab === "all" || activeTab === "folders" ? trashedFolders : [];

  const totalItems =
    trashedNotes.length + trashedThreads.length + trashedFolders.length;

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
        {(
          [
            { key: "all", label: t("settings.dataPrivacy.trash.all", "All"), count: totalItems },
            { key: "notes", label: t("search.notes", "Notes"), count: trashedNotes.length },
            { key: "chats", label: t("search.chats", "Chats"), count: trashedThreads.length },
            { key: "folders", label: t("notes.folders", "Folders"), count: trashedFolders.length },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === key
                ? "text-accent-primary border-b-2 border-accent-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {label} ({count})
          </button>
        ))}
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
            {filteredFolders.map((folder) => (
              <TrashFolderItem
                key={folder.id}
                folder={folder}
                daysLeft={getDaysUntilExpiry(folder.expiresAt)}
                onRestore={() => handleRestoreFolder(folder.id)}
                onDelete={() => handleDeleteFolder(folder.id)}
              />
            ))}
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

// ── Shared action buttons ─────────────────────────────────────────────────────

function TrashItemActions({
  onRestore,
  onDelete,
}: {
  onRestore: () => void;
  onDelete: () => Promise<void>;
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
  );
}

// ── Folder item ───────────────────────────────────────────────────────────────

function TrashFolderItem({
  folder,
  daysLeft,
  onRestore,
  onDelete,
}: {
  folder: TrashedFolder;
  daysLeft: number;
  onRestore: () => void;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <IoFolder className="text-lg text-text-secondary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {folder.originalFolder.name}
          </p>
          <p className="text-xs text-text-tertiary">
            {t(
              "settings.dataPrivacy.trash.expiresIn",
              "Expires in {{days}} days",
              { days: daysLeft },
            )}
          </p>
        </div>
      </div>
      <TrashItemActions onRestore={onRestore} onDelete={onDelete} />
    </div>
  );
}

// ── Note item ─────────────────────────────────────────────────────────────────

function TrashNoteItem({
  note,
  daysLeft,
  onRestore,
  onDelete,
}: {
  note: TrashedNote;
  daysLeft: number;
  onRestore: () => void;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();
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
              { days: daysLeft },
            )}
          </p>
        </div>
      </div>
      <TrashItemActions onRestore={onRestore} onDelete={onDelete} />
    </div>
  );
}

// ── Thread item ───────────────────────────────────────────────────────────────

function TrashThreadItem({
  thread,
  daysLeft,
  onRestore,
  onDelete,
}: {
  thread: TrashedThread;
  daysLeft: number;
  onRestore: () => void;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation();
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
              { days: daysLeft },
            )}
          </p>
        </div>
      </div>
      <TrashItemActions onRestore={onRestore} onDelete={onDelete} />
    </div>
  );
}
