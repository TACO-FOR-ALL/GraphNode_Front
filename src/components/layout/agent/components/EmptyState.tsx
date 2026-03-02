import { useTranslation } from "react-i18next";
import { RiFileInfoFill } from "react-icons/ri";
import { FaPen } from "react-icons/fa";

interface EmptyStateProps {
  onSummary: () => void;
  onNote: () => void;
  alertMessage: string | null;
}

export default function EmptyState({
  onSummary,
  onNote,
  alertMessage,
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <>
      <p className="text-[30px] font-medium mb-1 text-text-primary">
        {t("aiAgentChatBox.title")}
      </p>
      <p className="text-[20px] font-medium mb-3 text-text-primary">
        {t("aiAgentChatBox.subtitle")}
      </p>

      <button
        onClick={onSummary}
        className="w-full mb-2 flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
      >
        <RiFileInfoFill className="w-4 h-4 text-text-primary group-hover:text-primary" />
        <span className="text-[14px] font-medium text-text-primary group-hover:text-primary">
          {t("aiAgentChatBox.summary")}
        </span>
      </button>

      <button
        onClick={onNote}
        className="w-full flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
      >
        <FaPen className="w-3 h-3 text-text-primary group-hover:text-primary" />
        <span className="text-[14px] font-medium text-text-primary group-hover:text-primary">
          {t("aiAgentChatBox.note")}
        </span>
      </button>

      {alertMessage && (
        <div className="mt-2 px-3 py-2 bg-frame-bar-red/10 text-frame-bar-red text-[12px] rounded-lg">
          {alertMessage}
        </div>
      )}
    </>
  );
}
