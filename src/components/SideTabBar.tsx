import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState, useRef } from "react";
import { FaPlus } from "react-icons/fa6";
import { PiNotePencil } from "react-icons/pi";
import {
  IoFolder,
  IoSettingsOutline,
  IoShareSocialOutline,
} from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import {
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightExpand,
} from "react-icons/tb";
import { IoChevronForward, IoChevronDown } from "react-icons/io5";
import { MdDeleteOutline, MdEdit } from "react-icons/md";
import { Note } from "@/types/Note";
import { ChatThread } from "@/types/Chat";
import { Folder } from "@/types/Folder";
import { threadRepo } from "@/managers/threadRepo";
import { noteRepo } from "@/managers/noteRepo";
import { folderRepo } from "@/managers/folderRepo";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const NAVIGATION_ITEMS = [
  { id: "/", image: "/icons/logo.png", label: "/" },
  { id: "chat", icon: <FaPlus />, label: "chat" },
  { id: "notes", icon: <PiNotePencil />, label: "notes" },
  { id: "visualize", icon: <IoShareSocialOutline />, label: "visualize" },
  { id: "search", icon: <FiSearch />, label: "search" },
];

export default function SideTabBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const path = useLocation().pathname;

  const showSidebarExpanded = useMemo(
    () => path.includes("/chat") || path.includes("/notes"),
    [path]
  );

  // URL에서 현재 선택된 ID 추출
  const selectedId = useMemo(() => {
    const pathParts = path.split("/");
    if (pathParts.length >= 3) {
      return pathParts[2]; // /notes/:noteId 또는 /chat/:threadId
    }
    return null;
  }, [path]);

  const [isExpanded, setIsExpanded] = useState(true);
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
  const isCreatingFolderRef = useRef(false);
  const queryClient = useQueryClient();

  // React Query를 사용하여 데이터 페칭 및 자동 업데이트
  const { data: chatThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads"],
    queryFn: () => threadRepo.getThreadList(),
    enabled: path.includes("/chat"),
  });

  const { data: notes } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => noteRepo.getAllNotes(),
    enabled: path.includes("/notes"),
  });

  const { data: folders } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: () => folderRepo.getFolderList(),
    enabled: path.includes("/notes"),
  });

  // 트리 구조로 폴더와 노트 구성
  const buildTree = useMemo(() => {
    if (!path.includes("/notes") || !folders || !notes) return null;

    const folderMap = new Map<string, Folder>();
    const rootFolders: Folder[] = [];
    const folderChildren = new Map<string, Folder[]>();
    const folderNotes = new Map<string, Note[]>();
    const rootNotes: Note[] = [];

    // 폴더 맵 구성
    folders.forEach((folder) => {
      folderMap.set(folder.id, folder);
      if (folder.parentId === null) {
        rootFolders.push(folder);
      } else {
        if (!folderChildren.has(folder.parentId)) {
          folderChildren.set(folder.parentId, []);
        }
        folderChildren.get(folder.parentId)!.push(folder);
      }
    });

    // 노트 분류
    notes.forEach((note) => {
      if (note.folderId === null) {
        rootNotes.push(note);
      } else {
        if (!folderNotes.has(note.folderId)) {
          folderNotes.set(note.folderId, []);
        }
        folderNotes.get(note.folderId)!.push(note);
      }
    });

    return {
      rootFolders,
      rootNotes,
      folderMap,
      folderChildren,
      folderNotes,
    };
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
      !confirm("폴더를 삭제하시겠습니까? 폴더 내의 노트는 루트로 이동합니다.")
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
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
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
    e.dataTransfer.dropEffect = "move";
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

  // 폴더 렌더링 (재귀적)
  const renderFolder = (folder: Folder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const children = buildTree?.folderChildren.get(folder.id) || [];
    const notes = buildTree?.folderNotes.get(folder.id) || [];
    const isEditing = editingFolderId === folder.id;
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          data-folder-id={folder.id}
          className={`flex items-center gap-1 px-[6px] py-[5.5px] h-[32px] rounded-[6px] transition-colors duration-300 text-text-secondary hover:bg-sidebar-button-hover group ${
            depth > 0 ? "ml-4" : ""
          } ${isDragOver ? "bg-blue-100 border-2 border-blue-400 border-dashed" : ""}`}
          onClick={() => {
            // 드래그 중이 아닐 때만 토글
            if (!draggedNoteId) {
              toggleFolder(folder.id);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFolderDragOver(folder.id, e);
            // 드래그 중이면 폴더 자동으로 펼치기
            if (draggedNoteId && !isExpanded) {
              setExpandedFolders((prev) => new Set(prev).add(folder.id));
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFolderDrop(folder.id, e);
          }}
          onDragLeave={(e) => {
            const relatedTarget = e.relatedTarget as Node | null;
            // 루트 영역이나 다른 폴더로 이동하는 경우에만 리셋
            if (
              !(
                relatedTarget instanceof Element &&
                (relatedTarget.closest("[data-folder-id]") ===
                  e.currentTarget ||
                  relatedTarget.closest(".flex.flex-col.gap-\\[6px\\]") !==
                    null)
              )
            ) {
              handleDragLeave();
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
                onBlur={() => handleSaveFolderName(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveFolderName(folder.id);
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
              onClick={(e) => handleStartEditFolder(folder, e)}
            />
            <MdDeleteOutline
              className="text-[14px] cursor-pointer"
              onClick={(e) => handleDeleteFolder(folder.id, e)}
            />
            <FaPlus
              className="text-[12px] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleStartCreateFolder(folder.id);
              }}
            />
          </div>
        </div>
        {isExpanded && (
          <div className="ml-2">
            {children.map((child) => renderFolder(child, depth + 1))}
            {/* 하위 폴더 생성 UI */}
            {creatingFolderParentId === folder.id && (
              <div
                className={`flex items-center gap-1 px-[6px] py-[5.5px] h-[32px] rounded-[6px] transition-colors duration-300 text-text-secondary hover:bg-sidebar-button-hover group ${
                  depth >= 0 ? "ml-4" : ""
                }`}
              >
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <IoChevronForward className="text-[12px]" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCreateFolder();
                      } else if (e.key === "Escape") {
                        e.stopPropagation();
                        handleCancelCreateFolder();
                      }
                    }}
                    onBlur={() => {
                      // 포커스를 잃으면 취소
                      handleCancelCreateFolder();
                    }}
                    className="flex-1 bg-transparent border-none outline-none text-[14px] font-normal font-noto-sans-kr placeholder:text-text-secondary placeholder:opacity-50"
                    placeholder="Enter folder name"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MdDeleteOutline
                    className="text-[14px] cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelCreateFolder();
                    }}
                  />
                </div>
              </div>
            )}
            {notes.map((note) => {
              const isSelected = selectedId === note.id;
              const isDragging = draggedNoteId === note.id;
              return (
                <div
                  key={note.id}
                  draggable
                  onDragStart={(e) => handleNoteDragStart(note.id, e)}
                  onDragEnd={handleNoteDragEnd}
                  className={`text-[14px] font-normal font-noto-sans-kr py-[5.5px] h-[32px] px-[6px] ml-4 rounded-[6px] transition-colors duration-300 cursor-move ${
                    isSelected
                      ? "bg-sidebar-button-hover text-chatbox-active"
                      : "text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active"
                  } ${isDragging ? "opacity-50" : ""}`}
                  onClick={() => navigate(`/notes/${note.id}`)}
                >
                  <div className="w-[195px] truncate">{note.title}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 현재 경로에 따라 적절한 데이터 선택
  const data = path.includes("/chat")
    ? (chatThreads as Note[] | ChatThread[] | null)
    : path.includes("/notes")
      ? (notes as Note[] | ChatThread[] | null)
      : null;

  return (
    <div className="flex h-full">
      {/* Sidebar Collapsed - Navigation */}
      <div
        className={`bg-sidebar-background flex flex-col py-2.5 px-2.5 items-stretch justify-between`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {NAVIGATION_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] ${item.id === path.split("/")[1] ? "bg-sidebar-tab-selected text-white" : ""} ${item.id === "home" ? "bg-transparent" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
              onClick={() => navigate(`/${item.id}`)}
            >
              {item.image ? (
                <img src={item.image as string} alt={item.label} />
              ) : (
                item.icon
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            key="profile"
            className="flex items-center justify-center p-[6px]"
          >
            <img
              src="/icons/profile.jpeg"
              alt="profile"
              className="w-[28px] h-[28px] rounded-full hover:bg-sidebar-tab-selected transition-colors duration-300"
            />
          </div>
          <div
            key="settings"
            className="flex items-center justify-center p-[6px] hover:bg-sidebar-tab-selected transition-colors duration-300"
          >
            <IoSettingsOutline onClick={() => navigate("/settings")} />
          </div>
        </div>
      </div>
      {/* Sidebar Expanded - Chat or Note List */}
      {showSidebarExpanded && (
        <div
          className={`bg-sidebar-expanded-background duration-500 transition-all ${isExpanded ? "w-[259px]" : "w-[40px]"} flex flex-col gap-4.5`}
        >
          <div className="flex px-3 py-4">
            {isExpanded ? (
              <TbLayoutSidebarRightExpand
                onClick={() => setIsExpanded(false)}
                className="text-text-secondary text-[16px] ml-auto"
              />
            ) : (
              <TbLayoutSidebarLeftExpand
                onClick={() => setIsExpanded(true)}
                className="text-text-secondary text-[16px] ml-auto"
              />
            )}
          </div>

          {isExpanded && (
            <div className="px-3">
              {path.includes("/notes") ? (
                <>
                  <div className="flex gap-1 mb-2">
                    <div
                      className="cursor-pointer flex items-center gap-1 px-[6px] py-2 text-text-secondary bg-white border-[0.6px] border-solid rounded-[6px] border-sidebar-button-border hover:bg-sidebar-button-hover transition-colors duration-300"
                      onClick={() => navigate("/notes")}
                    >
                      <FaPlus className="text-[16px]" />
                      <p className="text-[14px] font-normal font-noto-sans-kr">
                        New Note
                      </p>
                    </div>
                    <div
                      className="cursor-pointer flex items-center justify-center gap-1 px-[6px] py-2 text-text-secondary bg-white border-[0.6px] border-solid rounded-[6px] border-sidebar-button-border hover:bg-sidebar-button-hover transition-colors duration-300"
                      onClick={() => handleStartCreateFolder(null)}
                    >
                      <IoFolder className="text-[16px]" />
                      <p className="text-[14px] font-normal font-noto-sans-kr">
                        New Folder
                      </p>
                    </div>
                  </div>
                  {/* 루트 폴더 생성 UI */}
                  {creatingFolderParentId === "ROOT" && (
                    <div className="flex items-center gap-1 px-[6px] py-[5.5px] h-[32px] rounded-[6px] transition-colors duration-300 text-text-secondary hover:bg-sidebar-button-hover group mb-[6px]">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <IoChevronForward className="text-[12px]" />
                        <input
                          type="text"
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCreateFolder();
                            } else if (e.key === "Escape") {
                              e.stopPropagation();
                              handleCancelCreateFolder();
                            }
                          }}
                          onBlur={() => {
                            // 포커스를 잃으면 취소
                            handleCancelCreateFolder();
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-[14px] font-normal font-noto-sans-kr placeholder:text-text-secondary placeholder:opacity-50"
                          placeholder="Enter folder name"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MdDeleteOutline
                          className="text-[14px] cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelCreateFolder();
                          }}
                        />
                      </div>
                    </div>
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
                    {buildTree && (
                      <>
                        {buildTree.rootFolders.map((folder) =>
                          renderFolder(folder, 0)
                        )}
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
                              onDragStart={(e) =>
                                handleNoteDragStart(note.id, e)
                              }
                              onDragEnd={handleNoteDragEnd}
                              className={`text-[14px] font-normal font-noto-sans-kr py-[5.5px] h-[32px] px-[6px] rounded-[6px] transition-colors duration-300 cursor-move ${
                                isSelected
                                  ? "bg-sidebar-button-hover text-chatbox-active"
                                  : "text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active"
                              } ${isDragging ? "opacity-50" : ""}`}
                              onClick={() => navigate(`/notes/${note.id}`)}
                            >
                              <div className="w-[195px] truncate">
                                {note.title}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="cursor-pointer mb-2 flex items-center gap-1 px-[6px] py-2 text-text-secondary bg-white border-[0.6px] border-solid rounded-[6px] border-sidebar-button-border hover:bg-sidebar-button-hover transition-colors duration-300"
                    onClick={() => navigate("/chat")}
                  >
                    <FaPlus className="text-[16px]" />
                    <p className="text-[14px] font-normal font-noto-sans-kr">
                      New Chat
                    </p>
                  </div>
                  <div className="flex flex-col gap-[6px]">
                    {data &&
                      data.map((item) => {
                        const isSelected = selectedId === item.id;
                        return (
                          <div
                            className={`text-[14px] font-normal font-noto-sans-kr py-[5.5px] h-[32px] px-[6px] rounded-[6px] transition-colors duration-300 ${
                              isSelected
                                ? "bg-sidebar-button-hover text-chatbox-active"
                                : "text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active"
                            }`}
                            key={item.id}
                            onClick={() => navigate(`/chat/${item.id}`)}
                          >
                            <div className="w-[195px] truncate">
                              {item.title}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
