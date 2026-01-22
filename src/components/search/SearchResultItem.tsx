import { ChatThread } from "@/types/Chat";
import { Note } from "@/types/Note";

export default function SearchResultItem({
  type,
  item,
  onItemClick,
  searchRegex,
}: {
  type: "chat" | "note";
  item: ChatThread | Note;
  onItemClick: (item: ChatThread | Note) => void;
  searchRegex: RegExp | null;
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

  return (
    <div
      onClick={() => {
        onItemClick(item);
      }}
      className="w-full group cursor-pointer flex flex-col items-start gap-2.5 hover:bg-search-item-hover rounded-[10px] p-3"
    >
      <p className="font-noto-sans-kr font-medium text-[14px]">
        {highlightText(item.title)}
      </p>
      <p className="text-[12px] text-text-secondary line-clamp-1 group-hover:line-clamp-2">
        {highlightText(
          type === "chat"
            ? (item as ChatThread).messages[0].content
            : (item as Note).content
        )}
      </p>
    </div>
  );
}
