import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { Note } from "@/types/Note";
import { ChatThread } from "@/types/Chat";
import { Folder } from "@/types/Folder";
import { threadRepo } from "@/managers/threadRepo";
import { noteRepo } from "@/managers/noteRepo";
import { folderRepo } from "@/managers/folderRepo";
import { useQuery } from "@tanstack/react-query";
import SideNavigationBar from "./SideNavigationBar";
import ToggleSidebarExpand from "./ToggleSidebarExpand";
import SideExpandBarChat from "./SideExpandBarChat";
import SideExpandBarNote from "./SideExpandBarNote";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import SideExpandBarSettings from "./SideExpandBarSettings";

export default function SideTabBar({
  setOpenSearch,
}: {
  setOpenSearch: (open: boolean) => void;
}) {
  const path = useLocation().pathname;

  const showSidebarExpanded = useMemo(
    () =>
      path.includes("/chat") ||
      path.includes("/note") ||
      path.includes("/settings"),
    [path]
  );

  // URL에서 현재 선택된 ID 추출
  const selectedId = useMemo(() => {
    const pathParts = path.split("/");
    if (pathParts.length >= 3) {
      return pathParts[2]; // /note/:noteId 또는 /chat/:threadId
    }
    return null;
  }, [path]);

  const { isExpanded, setIsExpanded } = useSidebarExpandStore();

  const { data: chatThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads"],
    queryFn: () => threadRepo.getThreadList(),
    enabled: path.includes("/chat"),
  });

  const { data: notes } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => noteRepo.getAllNotes(),
    enabled: path.includes("/note"),
  });

  const { data: folders } = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: () => folderRepo.getFolderList(),
    enabled: path.includes("/note"),
  });

  return (
    <div className="flex h-full">
      <SideNavigationBar
        path={path.split("/")[1]}
        setOpenSearch={setOpenSearch}
      />
      {showSidebarExpanded && (
        <div
          className={`bg-sidebar-expanded-background duration-500 transition-all ${isExpanded ? "w-[259px]" : "w-[40px]"} flex flex-col`}
        >
          <ToggleSidebarExpand
            isExpanded={isExpanded}
            setIsExpanded={setIsExpanded}
          />
          {isExpanded && (
            <div>
              {path.includes("/note") && (
                <SideExpandBarNote
                  path={path}
                  notes={notes ?? []}
                  folders={folders ?? []}
                  selectedId={selectedId ?? ""}
                />
              )}
              {path.includes("/chat") && (
                <SideExpandBarChat
                  data={chatThreads ?? []}
                  selectedId={selectedId ?? ""}
                />
              )}
              {path.includes("/settings") && <SideExpandBarSettings />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
