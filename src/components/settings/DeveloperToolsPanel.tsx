import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/apiClient";
import { noteRepo } from "@/managers/noteRepo";
import { folderRepo } from "@/managers/folderRepo";
import { threadRepo } from "@/managers/threadRepo";
import { trashRepo } from "@/managers/trashRepo";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { useChangelogStore } from "@/store/useChangelogStore";
import { useToastStore } from "@/store/useToastStore";
import { unwrapResponse } from "@/utils/httpResponse";
import { mapConversation, mapFolder, mapNote } from "@/utils/dtoMappers";
import SettingCategoryTitle from "./SettingCategoryTitle";

export function isDeveloperToolsEnabled() {
  const runtimeDev =
    process.env.NODE_ENV !== "production" ||
    (globalThis as { __GRAPHNODE_DEVTOOLS__?: boolean })
      .__GRAPHNODE_DEVTOOLS__ === true;

  return (
    runtimeDev ||
    (globalThis as { __GRAPHNODE_TEST_DEVTOOLS__?: boolean })
      .__GRAPHNODE_TEST_DEVTOOLS__ === true
  );
}

export default function DeveloperToolsPanel() {
  const queryClient = useQueryClient();
  const [isReconcilingNotes, setIsReconcilingNotes] = useState(false);
  const [isSyncingChatFromServer, setIsSyncingChatFromServer] = useState(false);
  const [isSyncingChatFromClient, setIsSyncingChatFromClient] = useState(false);

  const { resetOnboarding, startOnboarding } = useOnboardingStore();
  const { resetLastSeenVersion, setModalOpen } = useChangelogStore();
  const { addToast } = useToastStore();

  const getAllServerNotesAndFolders = async () => {
    const syncNotes = unwrapResponse(await api.sync.pullNotes());
    return {
      notes: syncNotes.notes.map(mapNote),
      folders: syncNotes.folders.map(mapFolder),
    };
  };

  const handleReconcileNotes = async () => {
    setIsReconcilingNotes(true);
    try {
      const [localNotes, localFolders, serverData] = await Promise.all([
        noteRepo.getAllNotes(),
        folderRepo.getFolderList(),
        getAllServerNotesAndFolders(),
      ]);

      const serverNotes = serverData.notes;
      const serverFolders = serverData.folders;

      const localNoteIds = new Set(localNotes.map((note) => note.id));
      const serverNoteIds = new Set(serverNotes.map((note) => note.id));
      const localFolderIds = new Set(localFolders.map((folder) => folder.id));
      const serverFolderIds = new Set(serverFolders.map((folder) => folder.id));

      const localOnlyNotes = localNotes.filter(
        (note) => !serverNoteIds.has(note.id),
      );
      const serverOnlyNotes = serverNotes.filter(
        (note) => !localNoteIds.has(note.id),
      );
      const serverOnlyFolders = serverFolders.filter(
        (folder) => !localFolderIds.has(folder.id),
      );

      if (localOnlyNotes.length > 0) {
        unwrapResponse(
          await api.note.bulkCreate({
            notes: localOnlyNotes.map((note) => ({
              id: note.id,
              title: note.title,
              content: note.content,
              folderId:
                note.folderId && serverFolderIds.has(note.folderId)
                  ? note.folderId
                  : null,
            })),
          }),
        );
      }

      if (serverOnlyFolders.length > 0) {
        await folderRepo.upsertMany(serverOnlyFolders);
      }

      if (serverOnlyNotes.length > 0) {
        await noteRepo.upsertMany(serverOnlyNotes);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notes"] }),
        queryClient.invalidateQueries({ queryKey: ["recent-notes"] }),
        queryClient.invalidateQueries({ queryKey: ["folders"] }),
      ]);

      addToast({
        message: `노트 sync 완료: 서버 업로드 ${localOnlyNotes.length}개, 로컬 가져오기 ${serverOnlyNotes.length}개, 폴더 가져오기 ${serverOnlyFolders.length}개`,
        type: "success",
      });
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : "노트 강제 sync 중 오류가 발생했습니다.",
        type: "error",
      });
    } finally {
      setIsReconcilingNotes(false);
    }
  };

  // 서버 기준: 서버 전체 데이터를 로컬에 덮어씀
  const handleSyncChatFromServer = async () => {
    setIsSyncingChatFromServer(true);
    try {
      const serverThreadsDto = unwrapResponse(await api.conversations.list());
      const serverThreads = serverThreadsDto.map(mapConversation);

      await threadRepo.clearAll();
      if (serverThreads.length > 0) {
        await threadRepo.upsertMany(serverThreads);
      }

      await queryClient.invalidateQueries({ queryKey: ["chatThreads"] });

      addToast({
        message: `서버 기준 채팅 sync 완료: 총 ${serverThreads.length}개 로컬 반영`,
        type: "success",
      });
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : "채팅 강제 sync 중 오류가 발생했습니다.",
        type: "error",
      });
    } finally {
      setIsSyncingChatFromServer(false);
    }
  };

  // 클라이언트 기준: 로컬 전체 데이터를 서버에 덮어씀
  const handleSyncChatFromClient = async () => {
    setIsSyncingChatFromClient(true);
    try {
      const localThreads = await threadRepo.getThreadList();

      unwrapResponse(await api.conversations.deleteAll());

      if (localThreads.length > 0) {
        unwrapResponse(
          await api.conversations.bulkCreate({
            conversations: localThreads.map((thread) => ({
              id: thread.id,
              title: thread.title,
              messages: thread.messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                createdAt: new Date(msg.ts).toISOString(),
              })),
            })),
          }),
        );
      }

      addToast({
        message: `클라이언트 기준 채팅 sync 완료: 총 ${localThreads.length}개 서버 반영`,
        type: "success",
      });
    } catch (err) {
      addToast({
        message:
          err instanceof Error
            ? err.message
            : "채팅 강제 sync 중 오류가 발생했습니다.",
        type: "error",
      });
    } finally {
      setIsSyncingChatFromClient(false);
    }
  };

  return (
    <div className="mt-8 w-full">
      <SettingCategoryTitle
        title="Developer Tools"
        subtitle="For testing purposes only"
      />
      <div className="w-full mt-4 bg-bg-secondary rounded-lg border border-dashed border-text-tertiary divide-y divide-text-tertiary/20">
        {/* Force Sync */}
        <div className="p-4">
          <p className="text-[10px] font-semibold text-text-tertiary mb-3 uppercase tracking-widest">
            Force Sync
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={handleSyncChatFromServer}
              disabled={
                isSyncingChatFromServer ||
                isSyncingChatFromClient ||
                isReconcilingNotes
              }
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncingChatFromServer
                ? "syncing..."
                : "force sync chat by server"}
            </button>
            <button
              onClick={handleSyncChatFromClient}
              disabled={
                isSyncingChatFromServer ||
                isSyncingChatFromClient ||
                isReconcilingNotes
              }
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncingChatFromClient
                ? "syncing..."
                : "force sync chat by client"}
            </button>
            <button
              onClick={handleReconcileNotes}
              disabled={
                isSyncingChatFromServer ||
                isSyncingChatFromClient ||
                isReconcilingNotes
              }
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReconcilingNotes ? "syncing notes..." : "force sync notes"}
            </button>
          </div>

          {/* Chat */}
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
                const result = await api.conversations.listTest();
                console.log(result);
              }}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
            >
              get server chat
            </button>
            <button
              onClick={async () => {
                console.log("click");
                const result = await api.conversations.deleteAll();
                console.log(result);
              }}
            >
              delte server chat
            </button>
            <button
              onClick={async () => {
                await threadRepo.clearAll();
                await trashRepo.clearThreadsTrash();
                await window.graphnodeAPI.deleteSQLiteOutboxByEntityType(
                  "thread",
                );
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
                const result = await getAllServerNotesAndFolders();
                console.log(result.notes);
              }}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
            >
              get server notes
            </button>
            <button
              onClick={async () => {
                const result = await folderRepo.getFolderList();
                console.log(result);
              }}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
            >
              get client folders
            </button>
            <button
              onClick={async () => {
                const result = await api.note.listFolders();
                console.log(result);
              }}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
            >
              get server folders
            </button>
            <button
              onClick={async () => {
                await noteRepo.clearAll();
                await folderRepo.clearAll();
                await trashRepo.clearNotesAndFoldersTrash();
                await window.graphnodeAPI.deleteSQLiteOutboxByEntityType(
                  "note",
                );
                await window.graphnodeAPI.deleteSQLiteOutboxByEntityType(
                  "folder",
                );
                const results = await Promise.all([
                  api.note.deleteAllNotes(),
                  api.note.deleteAllFolders(),
                ]);
                console.log(results);
              }}
              className="px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 bg-bg-tertiary hover:bg-bg-primary rounded transition-colors"
            >
              delete server, client notes
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
  );
}
