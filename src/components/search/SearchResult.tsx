import { ChatThread } from "@/types/Chat";
import { Note } from "@/types/Note";
import { useNavigate } from "react-router-dom";

type SearchResultData = ChatThread[] | Note[] | undefined;

export default function SearchResult({
  type,
  title,
  data,
  searchQuery,
  setOpenSearch,
}: {
  type: "chat" | "note";
  title: string;
  data: SearchResultData;
  searchQuery: string;
  setOpenSearch: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  const highlightText = (text: string, query: string) => {
    if (!query || query.length === 0) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="text-primary">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      <p className="font-noto-sans-kr font-medium text-[12px] text-text-secondary mb-2">
        {title}
      </p>
      {data && data.length > 0 ? (
        data.map((item) => (
          <div
            onClick={() => {
              navigate(`/${type}/${item.id}`);
              setOpenSearch(false);
            }}
            key={item.id}
            className="w-full group cursor-pointer flex flex-col items-start gap-2.5 hover:bg-search-item-hover rounded-[10px] p-3"
          >
            <p className="font-noto-sans-kr font-medium text-[14px]">
              {highlightText(item.title, searchQuery)}
            </p>
            <p className="text-[12px] text-text-secondary line-clamp-1 group-hover:line-clamp-2">
              {highlightText(
                type === "chat"
                  ? (item as ChatThread).messages[0].content
                  : (item as Note).content,
                searchQuery
              )}
            </p>
          </div>
        ))
      ) : (
        <div className="w-full flex items-center justify-center py-1">
          <p className="text-[14px] font-medium">{`No ${title} found`}</p>
        </div>
      )}
    </div>
  );
}
