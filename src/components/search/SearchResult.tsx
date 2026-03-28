import { ChatThread } from "@/types/Chat";
import { Note } from "@/types/Note";
import { useNavigate } from "react-router-dom";
import { useMemo, useCallback } from "react";
import SearchResultItem from "./SearchResultItem";
import { useTranslation } from "react-i18next";

type SemanticChatResult = {
  id: string;
  title: string;
  threadId: string;
  messageId: string;
  messageSnippet: string;
  score: number;
};

type SearchResultData = ChatThread[] | Note[] | SemanticChatResult[] | undefined;

export default function SearchResult({
  type,
  title,
  data,
  searchQuery,
  setOpenSearch,
}: {
  type: "chat" | "note" | "semantic-chat";
  title: string;
  data: SearchResultData;
  searchQuery: string;
  setOpenSearch: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const searchRegex = useMemo(() => {
    if (!searchQuery || searchQuery.length === 0) return null;
    return new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
  }, [searchQuery]);

  const onItemClick = useCallback(
    (item: ChatThread | Note | { id: string; title: string }) => {
      if (type === "semantic-chat") {
        const sem = item as unknown as SemanticChatResult;
        navigate(`/chat/${sem.threadId}?messageId=${sem.messageId}`);
      } else if (type === "chat") {
        const thread = item as ChatThread;
        const msgId = thread.matchedMessageId;
        navigate(`/chat/${thread.id}${msgId ? `?messageId=${msgId}` : ""}`);
      } else {
        navigate(`/note/${item.id}`);
      }
      setOpenSearch(false);
    },
    [navigate, type, setOpenSearch],
  );

  if (!data || data.length === 0) {
    return (
      <div>
        <p className="font-noto-sans-kr font-medium text-[12px] text-text-secondary mb-2">
          {title}
        </p>
        <div className="w-full flex items-center justify-center py-1">
          <p className="text-[14px] font-medium text-text-secondary">
            {t("search.noResultFound", { provider: title })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="font-noto-sans-kr font-medium text-[12px] text-text-secondary mb-2">
        {title}
      </p>
      {(data as Array<ChatThread | Note | SemanticChatResult>).map((item) => {
        if (type === "semantic-chat") {
          const sem = item as SemanticChatResult;
          return (
            <SearchResultItem
              key={`${sem.threadId}-${sem.messageId}`}
              type="semantic-chat"
              item={{ id: sem.threadId, title: sem.title }}
              onItemClick={() => onItemClick(sem as unknown as ChatThread)}
              searchRegex={null}
              matchedMessageContent={sem.messageSnippet}
            />
          );
        }
        const thread = item as ChatThread;
        const note = item as Note;
        return (
          <SearchResultItem
            key={item.id}
            type={type}
            item={type === "chat" ? thread : note}
            onItemClick={onItemClick}
            searchRegex={searchRegex}
            matchedMessageId={type === "chat" ? thread.matchedMessageId : null}
            matchedMessageContent={
              type === "chat" ? thread.matchedMessageContent : null
            }
          />
        );
      })}
    </div>
  );
}
