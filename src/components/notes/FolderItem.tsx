import { Folder } from "@/types/Folder";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import { MdDeleteOutline, MdEdit } from "react-icons/md";
import { FaPlus } from "react-icons/fa6";
import { FolderItemContextValue } from "@/hooks/useFolderItemContext";
import NewFolderField from "../NewFolderField";

type FolderItemProps = {
  folder: Folder; // 현재 폴더
  depth: number; // 깊이 (들여쓰기)
  context: FolderItemContextValue; // 모든 상태와 핸들러를 포함한 컨텍스트
};

export default function FolderItem({
  folder,
  depth,
  context,
}: FolderItemProps) {
  const {
    expandedFolders,
    editingFolderId,
    editingFolderName,
    newFolderName,
    creatingFolderParentId,
    draggedNoteId,
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
  const children = buildTree?.folderChildren.get(folder.id) || [];
  const notes = buildTree?.folderNotes.get(folder.id) || [];

  return (
    <div>
      <div
        data-folder-id={folder.id}
        className={`flex items-center gap-1 px-[6px] py-[5.5px] h-[32px] rounded-[6px] transition-colors duration-300 text-text-secondary hover:bg-sidebar-button-hover group ${
          depth > 0 ? "ml-4" : ""
        } ${isDragOver ? "bg-blue-100 border-2 border-blue-400 border-dashed" : ""}`}
        onClick={() => {
          // 드래그 중이 아닐 때만 토글
          if (!draggedNoteId) {
            onToggle(folder.id);
          }
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
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {isExpanded ? (
            <IoChevronDown className="text-[12px]" />
          ) : (
            <IoChevronForward className="text-[12px]" />
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
            <span className="text-[14px] font-normal font-noto-sans-kr truncate">
              {folder.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <MdEdit
            className="text-[14px] cursor-pointer"
            onClick={(e) => onStartEdit(folder, e)}
          />
          <MdDeleteOutline
            className="text-[14px] cursor-pointer"
            onClick={(e) => onDelete(folder.id, e)}
          />
          <FaPlus
            className="text-[12px] cursor-pointer"
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
        <div className="ml-2">
          {children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              context={context}
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
                draggable
                onDragStart={(e) => onNoteDragStart(note.id, e)}
                onDragEnd={onNoteDragEnd}
                className={`text-[14px] font-normal font-noto-sans-kr py-[5.5px] h-[32px] px-[6px] ml-4 rounded-[6px] transition-colors duration-300 cursor-move ${
                  isSelected
                    ? "bg-sidebar-button-hover text-chatbox-active"
                    : "text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active"
                } ${isDragging ? "opacity-50" : ""}`}
                onClick={() => onNoteClick(note.id)}
              >
                <div className="w-[195px] truncate">{note.title}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
