import { ChatThread } from "@/types/Chat";
import { Note } from "@/types/Note";

export default function SearchResultItem({
  type,
  item,
  onItemClick,
  searchRegex,
  matchedMessageId,
  matchedMessageContent,
}: {
  type: "chat" | "note" | "semantic-chat";
  item: ChatThread | Note | { id: string; title: string };
  onItemClick: (item: ChatThread | Note | { id: string; title: string }) => void;
  searchRegex: RegExp | null;
  matchedMessageId?: string | null;
  matchedMessageContent?: string | null;
}) {
  const highlightText = (text: string) => {
    if (!searchRegex) return text;
    const parts = text.split(searchRegex);
    return parts.map((part, index) =>
      searchRegex.test(part) ? (
        <span key={index} className="text-primary">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const previewText = () => {
    if (type === "chat") {
      const thread = item as ChatThread;
      // 매칭된 메시지가 있으면 그 내용을, 없으면 첫 메시지를 보여줌
      if (matchedMessageContent) return matchedMessageContent;
      return thread.messages[0]?.content ?? "";
    }
    if (type === "semantic-chat") {
      return matchedMessageContent ?? "";
    }
    return (item as Note).content;
  };

  return (
    <div
      onClick={() => onItemClick(item)}
      className="w-full group cursor-pointer flex flex-col items-start gap-2.5 hover:bg-search-item-hover rounded-[10px] p-3"
    >
      <div className="flex items-center gap-2 w-full">
        <p className="font-noto-sans-kr font-medium text-[14px] text-text-primary flex-1 truncate">
          {type === "semantic-chat"
            ? item.title
            : highlightText(item.title)}
        </p>
        {type === "semantic-chat" && (
          <span className="text-[10px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">
            AI
          </span>
        )}
      </div>
      <p className="text-[12px] text-text-secondary line-clamp-1 group-hover:line-clamp-2">
        {type === "semantic-chat"
          ? previewText()
          : highlightText(previewText())}
      </p>
    </div>
  );
}
