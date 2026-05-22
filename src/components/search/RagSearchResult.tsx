import { useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchNotesAndAIChatsResponse } from "@taco_tsinghua/graphnode-sdk";
import { FiMessageCircle, FiFileText, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const MAX_VISIBLE = 3;

export default function RagSearchResult({
  data,
  isLoading,
  setOpenSearch,
}: {
  data: SearchNotesAndAIChatsResponse | undefined;
  isLoading: boolean;
  setOpenSearch: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const onNoteClick = useCallback(
    (id: string) => {
      navigate(`/note/${id}`);
      setOpenSearch(false);
    },
    [navigate, setOpenSearch],
  );

  const onChatClick = useCallback(
    (id: string) => {
      navigate(`/chat/${id}`);
      setOpenSearch(false);
    },
    [navigate, setOpenSearch],
  );

  const allItems = data
    ? [
        ...data.chatThreads.map((item) => ({ ...item, itemType: "chat" as const })),
        ...data.notes.map((item) => ({ ...item, itemType: "note" as const })),
      ]
    : [];

  const visibleItems = expanded ? allItems : allItems.slice(0, MAX_VISIBLE);
  const hasMore = allItems.length > MAX_VISIBLE;
  const hasResults = allItems.length > 0;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-primary text-[12px]">✦</span>
        <p className="font-noto-sans-kr font-medium text-[12px] text-text-secondary">
          {t("search.aiRecommended")}
        </p>
      </div>
      {isLoading ? (
        <div className="w-full flex items-center justify-center py-3">
          <AiOutlineLoading3Quarters className="text-[18px] text-text-secondary animate-spin" />
        </div>
      ) : hasResults ? (
        <>
          {visibleItems.map((item) =>
            item.itemType === "chat" ? (
              <div
                key={item.id}
                onClick={() => onChatClick(item.id)}
                className="w-full group cursor-pointer flex flex-col items-start gap-2.5 hover:bg-search-item-hover rounded-[10px] p-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <FiMessageCircle className="text-[13px] text-text-secondary flex-shrink-0" />
                  <p className="font-noto-sans-kr font-medium text-[14px] text-text-primary truncate">
                    {item.title}
                  </p>
                </div>
                {item.snippet && (
                  <p className="text-[12px] text-text-secondary line-clamp-1 group-hover:line-clamp-2">
                    {item.snippet}
                  </p>
                )}
              </div>
            ) : (
              <div
                key={item.id}
                onClick={() => onNoteClick(item.id)}
                className="w-full group cursor-pointer flex flex-col items-start gap-2.5 hover:bg-search-item-hover rounded-[10px] p-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <FiFileText className="text-[13px] text-text-secondary flex-shrink-0" />
                  <p className="font-noto-sans-kr font-medium text-[14px] text-text-primary truncate">
                    {item.title}
                  </p>
                </div>
                {item.snippet && (
                  <p className="text-[12px] text-text-secondary line-clamp-1 group-hover:line-clamp-2">
                    {item.snippet}
                  </p>
                )}
              </div>
            ),
          )}
          {hasMore && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-[12px] text-text-secondary hover:text-text-primary transition-colors"
            >
              {expanded ? (
                <>
                  {t("search.showLess")}
                  <FiChevronUp className="text-[13px]" />
                </>
              ) : (
                <>
                  {t("search.showMore")} ({allItems.length - MAX_VISIBLE})
                  <FiChevronDown className="text-[13px]" />
                </>
              )}
            </button>
          )}
        </>
      ) : (
        <div className="w-full flex items-center justify-center py-1">
          <p className="text-[14px] font-medium text-text-secondary">
            {t("search.noAiRecommendations")}
          </p>
        </div>
      )}
    </div>
  );
}
