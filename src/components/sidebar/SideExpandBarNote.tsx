import { Note } from "@/types/Note";
import { useNavigate } from "react-router-dom";

import { Folder } from "@/types/Folder";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { folderRepo } from "@/managers/folderRepo";
import { noteRepo } from "@/managers/noteRepo";
import NewFolderField from "../NewFolderField";
import { buildFolderTree } from "@/utils/buildFolderTree";
import FolderItem from "../notes/FolderItem";
import { useFolderItemContext } from "@/hooks/useFolderItemContext";
import { FaTrash } from "react-icons/fa";
import { FiEdit3, FiFolderPlus } from "react-icons/fi";
import { UserFile } from "@/types/UserFile";
import { mapUserFile } from "@/utils/dtoMappers";
import FileIcon from "@/components/notes/FileIcon";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import SidebarSkeletonList from "./SidebarSkeletonList";
import { api } from "@/apiClient";
import { useToastStore } from "@/store/useToastStore";
import { FaFileImport } from "react-icons/fa6";

export default function SideExpandBarNote({
  path,
  selectedId,
}: {
  path: string;
  selectedId: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToastStore();

  // set을 사용하면 여러 폴더 확장 여부를 동시에 독립적으로 관리할 수 있으며, has()메서드로 O(1)의 시간복잡도로 확인 가능
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<
    string | null | "ROOT"
  >(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isRootExpanded, setIsRootExpanded] = useState<boolean>(true);
  const isCreatingFolderRef = useRef(false);
  const draggingNoteRef = useRef<string | null>(null);
  const draggingFolderIdRef = useRef<string | null>(null);
  const draggingFileIdRef = useRef<string | null>(null);
  const lastDraggedNoteIdRef = useRef<string | null>(null);
  const lastDragStartedAtRef = useRef(0);
  const dragHoverFolderRef = useRef<string | "ROOT" | null>(null);
  const dropHandledRef = useRef(false);
  const queryClient = useQueryClient();

  // 루트 데이터만 초기 패칭
  const { data: rootNotes, isLoading: isLoadingNotes } = useQuery<Note[]>({
    queryKey: ["sidebar-notes", null],
    queryFn: () => noteRepo.getNotesByFolder(null),
  });

  const { data: rootFolders, isLoading: isLoadingFolders } = useQuery<Folder[]>(
    {
      queryKey: ["sidebar-folders", null],
      queryFn: () => folderRepo.getFoldersByParentId(null),
    },
  );

  const { data: rootFiles } = useQuery<UserFile[]>({
    queryKey: ["sidebar-files", null],
    queryFn: async () => {
      const result = await api.userFiles.listUserFiles({ limit: 100 });
      return result.isSuccess ? result.data.items.map(mapUserFile) : [];
    },
  });

  const isLoading = isLoadingNotes || isLoadingFolders;

  // 펼쳐진 폴더의 자식 데이터 lazy 패칭
  const expandedFolderIdsArray = useMemo(
    () => Array.from(expandedFolders),
    [expandedFolders],
  );

  const subNoteQueries = useQueries({
    queries: expandedFolderIdsArray.map((folderId) => ({
      queryKey: ["sidebar-notes", folderId],
      queryFn: () => noteRepo.getNotesByFolder(folderId),
      staleTime: 30_000,
    })),
  });

  const subFolderQueries = useQueries({
    queries: expandedFolderIdsArray.map((folderId) => ({
      queryKey: ["sidebar-folders", folderId],
      queryFn: () => folderRepo.getFoldersByParentId(folderId),
      staleTime: 30_000,
    })),
  });

  const subFileQueries = useQueries({
    queries: expandedFolderIdsArray.map((folderId) => ({
      queryKey: ["sidebar-files", folderId],
      queryFn: async (): Promise<UserFile[]> => {
        const result = await api.userFiles.listUserFiles({
          folderId,
          limit: 100,
        });
        return result.isSuccess ? result.data.items.map(mapUserFile) : [];
      },
      staleTime: 30_000,
    })),
  });

  // 루트 + 로드된 하위 폴더 데이터 집계
  const notes = useMemo(() => {
    const result: Note[] = [...(rootNotes ?? [])];
    subNoteQueries.forEach((q) => {
      if (q.data) result.push(...q.data);
    });
    return result;
  }, [rootNotes, subNoteQueries]);

  const folders = useMemo(() => {
    const result: Folder[] = [...(rootFolders ?? [])];
    subFolderQueries.forEach((q) => {
      if (q.data) result.push(...q.data);
    });
    return result;
  }, [rootFolders, subFolderQueries]);

  const files = useMemo(() => {
    const result = [...(rootFiles ?? [])];
    subFileQueries.forEach((q) => {
      if (q.data) result.push(...q.data);
    });
    return result;
  }, [rootFiles, subFileQueries]);

  const resolveNoteIdFromEventTarget = (target: EventTarget | null) => {
    const targetElement =
      target instanceof Element
        ? target
        : target instanceof Node
          ? target.parentElement
          : null;

    return (
      targetElement?.closest("[data-note-id]")?.getAttribute("data-note-id") ??
      null
    );
  };

  const beginDragTracking = (noteId: string) => {
    draggingNoteRef.current = noteId;
    lastDraggedNoteIdRef.current = noteId;
    lastDragStartedAtRef.current = Date.now();
    dragHoverFolderRef.current = null;
    dropHandledRef.current = false;
    setDraggedNoteId(noteId);
  };

  // React 합성 이벤트가 웹 브라우저에서 dragstart를 누락하는 경우를 방지하기 위해
  // document 레벨에서 직접 리스닝합니다.
  useEffect(() => {
    const onNativeDragStart = (e: DragEvent) => {
      const target = e.target as Element;

      // 노트 드래그 우선
      const noteId =
        target.closest("[data-note-id]")?.getAttribute("data-note-id") ?? null;
      if (noteId) {
        draggingNoteRef.current = noteId;
        lastDraggedNoteIdRef.current = noteId;
        lastDragStartedAtRef.current = Date.now();
        dragHoverFolderRef.current = null;
        dropHandledRef.current = false;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", noteId);
          e.dataTransfer.setData("text", noteId);
        }
        setDraggedNoteId(noteId);
        return;
      }

      // 파일 드래그
      const fileId =
        target.closest("[data-file-id]")?.getAttribute("data-file-id") ?? null;
      if (fileId) {
        draggingFileIdRef.current = fileId;
        dragHoverFolderRef.current = null;
        dropHandledRef.current = false;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `file:${fileId}`);
        }
        setDraggedFileId(fileId);
        return;
      }

      // 폴더 드래그
      const folderId =
        target.closest("[data-folder-id]")?.getAttribute("data-folder-id") ??
        null;
      if (folderId) {
        draggingFolderIdRef.current = folderId;
        dragHoverFolderRef.current = null;
        dropHandledRef.current = false;
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
        }
        setDraggedFolderId(folderId);
      }
    };
    document.addEventListener("dragstart", onNativeDragStart, true);
    return () =>
      document.removeEventListener("dragstart", onNativeDragStart, true);
  }, []);

  // 트리 구조로 폴더와 노트 구성
  const buildTree = useMemo(() => {
    if ((!path.includes("/note") && !path.includes("/file")) || !folders || !notes) return null;
    return buildFolderTree(folders, notes, files);
  }, [folders, notes, files, path]);

  // 선택된 노트가 폴더 안에 있으면 해당 폴더 자동 펼치기
  useEffect(() => {
    if (!buildTree || !selectedId) return;
    buildTree.folderNotes.forEach((notes, folderId) => {
      if (notes.some((note) => note.id === selectedId)) {
        setExpandedFolders((prev) => {
          if (prev.has(folderId)) return prev;
          return new Set(prev).add(folderId);
        });
      }
    });
  }, [selectedId, buildTree]);

  // 폴더 토글
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // 폴더 생성 시작
  const handleStartCreateFolder = (parentId: string | null = null) => {
    setCreatingFolderParentId(parentId === null ? "ROOT" : parentId);
    setNewFolderName("");
  };

  // 폴더 생성 완료
  const handleCreateFolder = async () => {
    // 중복 실행 방지
    if (isCreatingFolderRef.current) return;

    if (!newFolderName.trim()) {
      setCreatingFolderParentId(null);
      return;
    }

    isCreatingFolderRef.current = true;
    try {
      const parentId =
        creatingFolderParentId === "ROOT" ? null : creatingFolderParentId;
      await folderRepo.create(newFolderName.trim(), parentId);
      queryClient.invalidateQueries({ queryKey: ["sidebar-folders"] });
      setCreatingFolderParentId(null);
      setNewFolderName("");
    } finally {
      isCreatingFolderRef.current = false;
    }
  };

  // 폴더 생성 취소
  const handleCancelCreateFolder = () => {
    setCreatingFolderParentId(null);
    setNewFolderName("");
  };

  // 폴더 삭제
  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure you want to delete this folder? All notes inside will also be moved to the trash.",
      )
    )
      return;

    await folderRepo.deleteFolderById(folderId);
    queryClient.invalidateQueries({ queryKey: ["sidebar-folders"] });
    queryClient.invalidateQueries({ queryKey: ["sidebar-notes"] });
  };

  // 폴더 이름 수정 시작
  const handleStartEditFolder = (folder: Folder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  // 폴더 이름 수정 완료
  const handleSaveFolderName = async (folderId: string) => {
    if (editingFolderName.trim()) {
      await folderRepo.updateFolderById(folderId, {
        name: editingFolderName.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ["sidebar-folders"] });
    }
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  // 노트 드래그 시작
  const handleNoteDragStart = (noteId: string, e: React.DragEvent) => {
    beginDragTracking(noteId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
    // Safari/legacy 브라우저 호환용
    e.dataTransfer.setData("text", noteId);
  };

  // 파일 드래그 시작
  const handleFileDragStart = (fileId: string, e: React.DragEvent) => {
    draggingFileIdRef.current = fileId;
    dragHoverFolderRef.current = null;
    dropHandledRef.current = false;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `file:${fileId}`);
    setDraggedFileId(fileId);
  };

  // 파일 드래그 종료
  const handleFileDragEnd = () => {
    draggingFileIdRef.current = null;
    dragHoverFolderRef.current = null;
    setDraggedFileId(null);
    setDragOverFolderId(null);
  };

  // 노트 드래그 종료
  const handleNoteDragEnd = () => {
    if (
      !dropHandledRef.current &&
      lastDraggedNoteIdRef.current &&
      dragHoverFolderRef.current !== null
    ) {
      const noteId = lastDraggedNoteIdRef.current;
      const targetFolderId =
        dragHoverFolderRef.current === "ROOT"
          ? null
          : dragHoverFolderRef.current;
      void (async () => {
        try {
          dropHandledRef.current = true;
          await noteRepo.moveNoteToFolder(noteId, targetFolderId);
          queryClient.setQueriesData<Note[]>(
            { queryKey: ["sidebar-notes"] },
            (old) =>
              old
                ? old.map((n) =>
                    n.id === noteId ? { ...n, folderId: targetFolderId } : n,
                  )
                : old,
          );
          if (targetFolderId) {
            setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
          }
        } catch (err) {
          console.error("[dragend-fallback] move failed:", err);
          queryClient.invalidateQueries({ queryKey: ["sidebar-notes"] });
        }
      })();
    }

    draggingNoteRef.current = null;
    draggingFolderIdRef.current = null;
    dragHoverFolderRef.current = null;
    window.setTimeout(() => {
      // Safari 계열에서 dragend -> drop 순서가 뒤집힐 수 있어, 즉시 초기화하지 않습니다.
      if (!dropHandledRef.current) return;
      lastDraggedNoteIdRef.current = null;
      dropHandledRef.current = false;
    }, 0);
    setDraggedNoteId(null);
    setDraggedFolderId(null);
    setDraggedFileId(null);
    setDragOverFolderId(null);
  };

  // 폴더 위로 드래그 오버
  const handleFolderDragOver = (
    folderId: string | null,
    e: React.DragEvent,
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move"; // (드롭 대상 위에서, 이동 커서)
    dragHoverFolderRef.current = folderId;
    setDragOverFolderId(folderId);
  };

  // 폴더가 다른 폴더의 자손인지 확인 (순환 참조 방지)
  const isDescendant = (candidateId: string, ancestorId: string): boolean => {
    if (!buildTree) return false;
    const children = buildTree.folderChildren.get(ancestorId) || [];
    return children.some(
      (child) =>
        child.id === candidateId || isDescendant(candidateId, child.id),
    );
  };

  // 폴더로 드롭
  const handleFolderDrop = async (
    targetFolderId: string | null,
    e: React.DragEvent,
  ) => {
    e.preventDefault();

    // 폴더 드래그인 경우
    const draggingFolder = draggingFolderIdRef.current;
    if (draggingFolder) {
      draggingFolderIdRef.current = null;
      setDraggedFolderId(null);
      setDragOverFolderId(null);

      // 자기 자신이나 자손에 드롭하면 무시
      if (
        draggingFolder === targetFolderId ||
        (targetFolderId && isDescendant(targetFolderId, draggingFolder))
      )
        return;

      try {
        await folderRepo.updateFolderById(draggingFolder, {
          parentId: targetFolderId,
        });
        queryClient.invalidateQueries({ queryKey: ["sidebar-folders"] });
        if (targetFolderId) {
          setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
        }
      } catch (err) {
        console.error("[drop] folder move failed:", err);
      }
      return;
    }

    // 파일 드래그인 경우
    const draggingFile = draggingFileIdRef.current;
    if (draggingFile) {
      draggingFileIdRef.current = null;
      setDraggedFileId(null);
      setDragOverFolderId(null);
      dropHandledRef.current = true;
      try {
        await api.userFiles.updateUserFile(draggingFile, {
          folderId: targetFolderId,
        });
        queryClient.invalidateQueries({ queryKey: ["sidebar-files"] });
        if (targetFolderId) {
          setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
        }
      } catch (err) {
        console.error("[drop] file move failed:", err);
      }
      return;
    }

    // 노트 드래그인 경우
    const fromDataTransfer =
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text") ||
      e.dataTransfer.getData("Text");
    const isRecentOwnDrag = Date.now() - lastDragStartedAtRef.current < 5000;
    const noteId =
      fromDataTransfer ||
      draggingNoteRef.current ||
      draggedNoteId ||
      (isRecentOwnDrag ? lastDraggedNoteIdRef.current : null);
    if (!noteId) return;
    dropHandledRef.current = true;

    draggingNoteRef.current = null;
    dragHoverFolderRef.current = null;
    setDraggedNoteId(null);
    setDragOverFolderId(null);

    try {
      await noteRepo.moveNoteToFolder(noteId, targetFolderId);
      queryClient.setQueriesData<Note[]>(
        { queryKey: ["sidebar-notes"] },
        (old) =>
          old
            ? old.map((n) =>
                n.id === noteId ? { ...n, folderId: targetFolderId } : n,
              )
            : old,
      );
      if (targetFolderId) {
        setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
      }
    } catch (err) {
      console.error("[drop] note move failed:", err);
      queryClient.invalidateQueries({ queryKey: ["sidebar-notes"] });
    }
  };

  // 드래그 리브
  const handleDragLeave = () => {
    dragHoverFolderRef.current = null;
    setDragOverFolderId(null);
  };

  // FolderItem에 전달할 컨텍스트 객체
  const folderItemContext = useFolderItemContext({
    expandedFolders,
    editingFolderId,
    editingFolderName,
    newFolderName,
    creatingFolderParentId,
    draggedNoteId,
    draggedFolderId,
    draggedFileId,
    dragOverFolderId,
    selectedId,
    buildTree,
    onToggle: toggleFolder,
    onStartEdit: handleStartEditFolder,
    onSaveName: handleSaveFolderName,
    onDelete: handleDeleteFolder,
    onStartCreate: handleStartCreateFolder,
    onCreate: handleCreateFolder,
    onCancelCreate: handleCancelCreateFolder,
    onNoteDragStart: handleNoteDragStart,
    onNoteDragEnd: handleNoteDragEnd,
    onFileDragStart: handleFileDragStart,
    onFileDragEnd: handleFileDragEnd,
    onFolderDragOver: handleFolderDragOver,
    onFolderDrop: handleFolderDrop,
    onDragLeave: handleDragLeave,
    onNoteClick: (noteId) => navigate(`/note/${noteId}`),
    onFileClick: (fileId) => navigate(`/file/${fileId}`),
    setEditingFolderName,
    setEditingFolderId,
    setNewFolderName,
    setExpandedFolders,
  });

  const handleDeleteNote = async (noteId: string) => {
    await noteRepo.deleteNoteById(noteId);
    queryClient.setQueriesData<Note[]>({ queryKey: ["sidebar-notes"] }, (old) =>
      old?.filter((n) => n.id !== noteId),
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (rawFiles: File[]) => {
    // NFC 정규화
    const normalizedFiles = rawFiles.map(
      (f) => new File([f], f.name.normalize("NFC"), { type: f.type }),
    );

    const results = await Promise.allSettled(
      normalizedFiles.map((file) => api.userFiles.uploadUserFile(file)),
    );

    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value.isSuccess,
    ).length;
    const failed = rawFiles.length - succeeded;

    if (succeeded > 0) {
      queryClient.invalidateQueries({ queryKey: ["sidebar-files"] });
    }

    if (failed === 0) {
      addToast({
        type: "success",
        message: t("notes.importFileToast.success", { count: succeeded }),
      });
    } else if (succeeded === 0) {
      addToast({
        type: "error",
        message: t("notes.importFileToast.allFailed", { count: failed }),
      });
    } else {
      addToast({
        type: "info",
        message: t("notes.importFileToast.partial", { succeeded, failed }),
      });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 pl-3 pr-0.5 pb-13">
      {/* 새 노트 혹 폴더 생성*/}
      <div
        className="cursor-pointer flex items-center gap-x-1.5 px-[6px] py-2 text-text-secondary hover:text-primary rounded-[6px] group hover:bg-sidebar-button-hover transition-colors duration-300"
        onClick={() => navigate("/note")}
      >
        <FiEdit3 className="w-4 h-4 shrink-0" />
        <p className="text-[14px] font-normal font-noto-sans-kr">
          {t("notes.newNote")}
        </p>
      </div>
      <div
        className="cursor-pointer mb-2 flex items-center gap-x-1.5 px-[6px] py-2 text-text-secondary hover:text-primary rounded-[6px] group hover:bg-sidebar-button-hover transition-colors duration-300"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="
          .doc, application/msword, 
          .docx, application/vnd.openxmlformats-officedocument.wordprocessingml.document, 
          .pdf, application/pdf, 
          .ppt, application/vnd.ms-powerpoint, 
          .pptx, application/vnd.openxmlformats-officedocument.presentationml.presentation, 
          "
          // .xls, application/vnd.ms-excel,
          // .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) handleFiles(files);
            e.target.value = "";
          }}
        />

        <FaFileImport className="w-4 h-4 shrink-0" />
        <p className="text-[14px] font-normal font-noto-sans-kr">
          {t("notes.importFile")}
        </p>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 pb-20">
        {isLoading ? (
          <>
            {/* 워크스페이스 헤더 (실제) */}
            <div className="flex items-center gap-1 px-[6px] py-[2px] mb-[6px] text-text-secondary">
              <span className="text-[12px] font-medium font-noto-sans-kr">
                {t("notes.workspace")}
              </span>
              <IoChevronDown className="text-[12px]" />
            </div>
            <SidebarSkeletonList />
          </>
        ) : (
          <>
            {/* 루트 토글 헤더 */}
            {buildTree &&
              (buildTree.rootFolders.length > 0 ||
                buildTree.rootNotes.length > 0) && (
                <div className="flex items-center justify-between px-[6px] py-[2px] rounded-[6px] transition-colors duration-300 text-text-secondary group hover:text-primary hover:bg-sidebar-button-hover cursor-pointer mb-[6px]">
                  <div
                    onClick={() => setIsRootExpanded(!isRootExpanded)}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <span className="text-[12px] font-medium font-noto-sans-kr">
                      {t("notes.workspace")}
                    </span>
                    {isRootExpanded ? (
                      <IoChevronDown className="text-[12px]" />
                    ) : (
                      <IoChevronForward className="text-[12px]" />
                    )}
                  </div>
                  <div
                    onClick={() => handleStartCreateFolder(null)} // 무조건 ROOT에 생성
                    className="gap-1 p-[1px] hover:bg-[rgba(var(--color-sidebar-folder-plus-hover),0.2)] rounded-[4px] hidden group-hover:block cursor-pointer"
                  >
                    <FiFolderPlus className="w-4 h-4 text-primary" />
                  </div>
                </div>
              )}
            {/* 루트에 폴더 생성 UI */}
            {creatingFolderParentId === "ROOT" && (
              <NewFolderField
                newFolderName={newFolderName}
                setNewFolderName={setNewFolderName}
                handleCreateFolder={handleCreateFolder}
                handleCancelCreateFolder={handleCancelCreateFolder}
                depth={0}
              />
            )}
            <div
              className="flex flex-col gap-[6px] min-h-[100px]"
              onDragStartCapture={(e) => {
                const noteId = resolveNoteIdFromEventTarget(e.target);
                if (!noteId) return;
                beginDragTracking(noteId);
                e.dataTransfer.setData("text/plain", noteId);
                e.dataTransfer.setData("text", noteId);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEndCapture={() => {
                handleNoteDragEnd();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                dragHoverFolderRef.current = "ROOT";
                setDragOverFolderId("ROOT");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFolderDrop(null, e);
              }}
              onDragLeave={(e) => {
                // 자식 요소로 이동하는 경우가 아니면 리셋
                const relatedTarget = e.relatedTarget as Node | null;
                if (
                  !e.currentTarget.contains(relatedTarget) &&
                  !(
                    relatedTarget instanceof Element &&
                    relatedTarget.closest("[data-folder-id]")
                  )
                ) {
                  if (dragOverFolderId === "ROOT") {
                    dragHoverFolderRef.current = null;
                    setDragOverFolderId(null);
                  }
                }
              }}
            >
              {buildTree && isRootExpanded && (
                <>
                  {buildTree.rootFolders.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      depth={0}
                      handleDeleteNote={handleDeleteNote}
                      context={folderItemContext}
                    />
                  ))}
                  {dragOverFolderId === "ROOT" && (
                    <div className="px-[6px] py-2 rounded-[6px] bg-sidebar-button-hover border-2 border-primary border-dashed text-center text-[12px] text-primary">
                      Drop here to move to root
                    </div>
                  )}
                  {buildTree.rootNotes.map((note) => {
                    const isSelected = selectedId === note.id;
                    const isDragging = draggedNoteId === note.id;
                    return (
                      <div
                        key={note.id}
                        data-note-id={note.id}
                        draggable={true}
                        style={
                          { WebkitUserDrag: "element" } as React.CSSProperties
                        }
                        onDragStart={(e) => handleNoteDragStart(note.id, e)}
                        onDragEnd={handleNoteDragEnd}
                        className={`text-[14px] mr-2 font-normal flex items-center justify-between font-noto-sans-kr py-[6px] h-[32px] px-2 rounded-[6px] transition-colors duration-300 cursor-move group ${
                          isSelected
                            ? "bg-sidebar-button-hover text-chatbox-active"
                            : "text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active"
                        } ${isDragging ? "opacity-50" : ""}`}
                        onClick={() => navigate(`/note/${note.id}`)}
                      >
                        <div className="w-[195px] truncate">{note.title}</div>
                        <FaTrash
                          className="text-[10px] cursor-pointer hidden group-hover:block"
                          onClick={() => handleDeleteNote(note.id)}
                        />
                      </div>
                    );
                  })}
                  {buildTree.rootFiles.map((file) => {
                    const isDragging = draggedFileId === file.id;
                    return (
                      <div
                        key={file.id}
                        data-file-id={file.id}
                        draggable={true}
                        style={
                          { WebkitUserDrag: "element" } as React.CSSProperties
                        }
                        onDragStart={(e) => handleFileDragStart(file.id, e)}
                        onDragEnd={handleFileDragEnd}
                        className={`text-[14px] mr-2 font-normal flex items-center gap-2 font-noto-sans-kr py-[6px] h-[32px] px-2 rounded-[6px] transition-colors duration-300 cursor-move group text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active ${isDragging ? "opacity-50" : ""}`}
                        onClick={() => navigate(`/file/${file.id}`)}
                      >
                        <FileIcon category={file.category} />
                        <span className="truncate flex-1 min-w-0">
                          {file.displayName}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
