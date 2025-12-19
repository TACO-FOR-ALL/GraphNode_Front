import { Note } from "@/types/Note";
import { useNavigate } from "react-router-dom";

import { Folder } from "@/types/Folder";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { folderRepo } from "@/managers/folderRepo";
import { noteRepo } from "@/managers/noteRepo";
import NewFolderField from "../NewFolderField";
import { buildFolderTree } from "@/utils/buildFolderTree";
import { FaPlus } from "react-icons/fa6";
import FolderItem from "../notes/FolderItem";
import { useFolderItemContext } from "@/hooks/useFolderItemContext";
import { FaTrash } from "react-icons/fa";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";

import FolderPlusIconActive from "@/assets/icons/folderplus_active.svg";

export default function SideExpandBarNote({
  path,
  notes,
  folders,
  selectedId,
}: {
  path: string;
  notes: Note[];
  folders: Folder[];
  selectedId: string;
}) {
  const navigate = useNavigate();

  // set을 사용하면 여러 폴더 확장 여부를 동시에 독립적으로 관리할 수 있으며, has()메서드로 O(1)의 시간복잡도로 확인 가능
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [creatingFolderParentId, setCreatingFolderParentId] = useState<
    string | null | "ROOT"
  >(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isRootExpanded, setIsRootExpanded] = useState<boolean>(true);
  const isCreatingFolderRef = useRef(false);
  const queryClient = useQueryClient();

  // 트리 구조로 폴더와 노트 구성
  const buildTree = useMemo(() => {
    if (!path.includes("/note") || !folders || !notes) return null;
    return buildFolderTree(folders, notes);
  }, [folders, notes, path]);

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
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
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
        "Are you sure you want to delete this folder? All notes inside will be moved to the root."
      )
    )
      return;

    await folderRepo.deleteFolderById(folderId);
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
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
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    }
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  // 노트 드래그 시작
  const handleNoteDragStart = (noteId: string, e: React.DragEvent) => {
    setDraggedNoteId(noteId);
    e.dataTransfer.effectAllowed = "move"; // 이동만 허용 (드래그 시작) => HTML5 Drag and Drop API
    // e.dataTransfer.setData("text/plain", noteId); => e.dataTransfer.getData("text/plain") 으로 데이터 가져오기 가능
  };

  // 노트 드래그 종료
  const handleNoteDragEnd = () => {
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  };

  // 폴더 위로 드래그 오버
  const handleFolderDragOver = (
    folderId: string | null,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move"; // (드롭 대상 위에서, 이동 커서)
    setDragOverFolderId(folderId);
  };

  // 폴더로 드롭
  const handleFolderDrop = async (
    folderId: string | null,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    if (!draggedNoteId) return;

    await noteRepo.moveNoteToFolder(draggedNoteId, folderId);
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  };

  // 드래그 리브
  const handleDragLeave = () => {
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
    onFolderDragOver: handleFolderDragOver,
    onFolderDrop: handleFolderDrop,
    onDragLeave: handleDragLeave,
    onNoteClick: (noteId) => navigate(`/notes/${noteId}`),
    setEditingFolderName,
    setEditingFolderId,
    setNewFolderName,
    setExpandedFolders,
  });

  const handleDeleteNote = async (noteId: string) => {
    await noteRepo.deleteNoteById(noteId);
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  return (
    <div className="px-3">
      {/* 새 노트 혹 폴더 생성*/}
      <div
        className="cursor-pointer mb-2 flex items-center gap-1 px-[6px] py-2 text-text-secondary hover:text-primary rounded-[6px] hover:bg-sidebar-button-hover transition-colors duration-300"
        onClick={() => navigate("/note")}
      >
        <FaPlus className="w-4 h-4" />
        <p className="text-[14px] font-normal font-noto-sans-kr">New Note</p>
      </div>
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
                Workspace
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
              <img
                src={FolderPlusIconActive}
                alt="folder plus"
                className="w-4 h-4"
              />
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
        onDragOver={(e) => {
          if (draggedNoteId) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            setDragOverFolderId("ROOT");
          }
        }}
        onDrop={(e) => {
          if (draggedNoteId) {
            e.preventDefault();
            e.stopPropagation();
            handleFolderDrop(null, e);
          }
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
              <div className="px-[6px] py-2 rounded-[6px] bg-blue-100 border-2 border-blue-400 border-dashed text-center text-[12px] text-blue-600">
                Drop here to move to root
              </div>
            )}
            {buildTree.rootNotes.map((note) => {
              const isSelected = selectedId === note.id;
              const isDragging = draggedNoteId === note.id;
              return (
                <div
                  key={note.id}
                  draggable
                  onDragStart={(e) => handleNoteDragStart(note.id, e)}
                  onDragEnd={handleNoteDragEnd}
                  className={`text-[14px] font-normal flex items-center justify-between font-noto-sans-kr py-[6px] h-[32px] px-2 rounded-[6px] transition-colors duration-300 cursor-move group ${
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
          </>
        )}
      </div>
    </div>
  );
}
