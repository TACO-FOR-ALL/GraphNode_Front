import { ChatThread } from "@/types/Chat";
import { Note } from "@/types/Note";
import { useNavigate } from "react-router-dom";
import { useMemo, useCallback } from "react";
import SearchResultItem from "./SearchResultItem";

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

  // searchQuery가 변경될 때만 정규식 재생성
  const searchRegex = useMemo(() => {
    if (!searchQuery || searchQuery.length === 0) return null;
    return new RegExp(
      `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
  }, [searchQuery]);

  const onItemClick = useCallback(
    (item: ChatThread | Note) => {
      navigate(`/${type}/${item.id}`);
      setOpenSearch(false);
    },
    [navigate, type, setOpenSearch]
  );

  return (
    <div>
      <p className="font-noto-sans-kr font-medium text-[12px] text-text-secondary mb-2">
        {title}
      </p>
      {data && data.length > 0 ? (
        data.map((item) => (
          <SearchResultItem
            key={item.id}
            type={type}
            item={item}
            onItemClick={onItemClick}
            searchRegex={searchRegex}
          />
        ))
      ) : (
        <div className="w-full flex items-center justify-center py-1">
          <p className="text-[14px] font-medium">{`No ${title} found`}</p>
        </div>
      )}
    </div>
  );
}
