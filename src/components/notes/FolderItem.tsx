import React from "react";
import { Folder } from "@/types/Folder";
import { MdDeleteOutline, MdEdit } from "react-icons/md";
import { FaPlus } from "react-icons/fa6";
import { FolderItemContextValue } from "@/hooks/useFolderItemContext";
import NewFolderField from "../NewFolderField";
import { FaTrash, FaFolder, FaFolderOpen } from "react-icons/fa";

type FolderItemProps = {
  folder: Folder; // 현재 폴더
  depth: number; // 깊이 (들여쓰기)
  handleDeleteNote: (noteId: string) => void;
  context: FolderItemContextValue; // 모든 상태와 핸들러를 포함한 컨텍스트
};

export default function FolderItem({
  folder,
  depth,
  context,
  handleDeleteNote,
}: FolderItemProps) {
  const {
    expandedFolders,
    editingFolderId,
    editingFolderName,
    newFolderName,
    creatingFolderParentId,
    draggedNoteId,
    draggedFolderId,
    dragOverFolderId,
    selectedId,
    buildTree,
    onToggle,
    onStartEdit,
    onSaveName,
    onDelete,
    onStartCreate,
    onCreate,
    onCancelCreate,
    onNoteDragStart,
    onNoteDragEnd,
    onFolderDragOver,
    onFolderDrop,
    onDragLeave,
    onNoteClick,
    setEditingFolderName,
    setEditingFolderId,
    setNewFolderName,
    setExpandedFolders,
  } = context;

  const isExpanded = expandedFolders.has(folder.id);
  const isEditing = editingFolderId === folder.id;
  const isDragOver = dragOverFolderId === folder.id;
  const isDraggingThis = draggedFolderId === folder.id;
  const children = buildTree?.folderChildren.get(folder.id) || [];
  const notes = buildTree?.folderNotes.get(folder.id) || [];

  return (
    <div>
      <div
        data-folder-id={folder.id}
        draggable={true}
        style={{ WebkitUserDrag: "element" } as React.CSSProperties}
        className={`flex items-center mr-2 gap-1 px-[6px] py-[5.5px] h-[32px] rounded-[6px] transition-colors duration-300 text-text-secondary hover:bg-sidebar-button-hover group ${
          depth > 0 ? "ml-2" : ""
        } ${isDragOver ? "bg-sidebar-button-hover border-2 border-primary border-dashed" : ""} ${isDraggingThis ? "opacity-50" : ""}`}
        onClick={() => {
          onToggle(folder.id);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFolderDragOver(folder.id, e);
          // 드래그 중이면 폴더 자동으로 펼치기
          if (draggedNoteId && !isExpanded) {
            setExpandedFolders((prev) => new Set(prev).add(folder.id));
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onFolderDrop(folder.id, e);
        }}
        onDragLeave={(e) => {
          const relatedTarget = e.relatedTarget as Node | null;
          // 루트 영역이나 다른 폴더로 이동하는 경우에만 리셋
          if (
            !(
              relatedTarget instanceof Element &&
              (relatedTarget.closest("[data-folder-id]") === e.currentTarget ||
                relatedTarget.closest(".flex.flex-col.gap-\\[6px\\]") !== null)
            )
          ) {
            onDragLeave();
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 group">
          {isExpanded ? (
            <FaFolderOpen className="w-4 h-4 shrink-0 transition-colors group-hover:text-primary" />
          ) : (
            <FaFolder className="w-4 h-4 shrink-0 transition-colors group-hover:text-primary" />
          )}
          {isEditing ? (
            <input
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={() => onSaveName(folder.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSaveName(folder.id);
                } else if (e.key === "Escape") {
                  setEditingFolderId(null);
                  setEditingFolderName("");
                }
              }}
              className="flex-1 bg-transparent border-none outline-none text-[14px]"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-[14px] font-normal font-noto-sans-kr truncate group-hover:text-primary">
              {folder.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <MdEdit
            className="text-[14px] cursor-pointer hover:text-primary"
            onClick={(e) => onStartEdit(folder, e)}
          />
          <MdDeleteOutline
            className="text-[14px] cursor-pointer hover:text-primary"
            onClick={(e) => onDelete(folder.id, e)}
          />
          <FaPlus
            className="text-[12px] cursor-pointer hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onStartCreate(folder.id);
              onToggle(folder.id);
            }}
          />
        </div>
      </div>
      {/* 하위 폴더 목록 */}
      {isExpanded && (
        <div
          className="ml-3 border-l border-sidebar-button-border"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFolderDragOver(folder.id, e);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFolderDrop(folder.id, e);
          }}
        >
          {children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              context={context}
              handleDeleteNote={handleDeleteNote}
            />
          ))}
          {/* 하위 폴더 생성 UI */}
          {creatingFolderParentId === folder.id && (
            <NewFolderField
              depth={depth + 1}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              handleCreateFolder={onCreate}
              handleCancelCreateFolder={onCancelCreate}
            />
          )}
          {notes.map((note) => {
            const isSelected = selectedId === note.id;
            const isDragging = draggedNoteId === note.id;
            return (
              <div
                key={note.id}
                data-note-id={note.id}
                draggable={true}
                style={{ WebkitUserDrag: "element" } as React.CSSProperties}
                onDragStart={(e) => onNoteDragStart(note.id, e)}
                onDragEnd={onNoteDragEnd}
                className={`text-[14px] mr-2 font-normal flex items-center justify-between font-noto-sans-kr py-[6px] h-[32px] px-[6px] ml-4 rounded-[8px] transition-colors duration-300 cursor-move group ${
                  isSelected
                    ? "bg-sidebar-button-hover text-chatbox-active"
                    : "text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active"
                } ${isDragging ? "opacity-50" : ""}`}
                onClick={() => onNoteClick(note.id)}
              >
                <div className="w-[195px] truncate">{note.title}</div>
                <FaTrash
                  className="text-[10px] cursor-pointer hidden group-hover:block"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.id);
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
