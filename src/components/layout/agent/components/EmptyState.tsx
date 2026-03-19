import { useTranslation } from "react-i18next";
import { RiFileInfoFill } from "react-icons/ri";
import { FaPen } from "react-icons/fa";
import { TbMicroscope } from "react-icons/tb";
import type { MicroscopeNode } from "@/store/useAgentToolBoxStore";

interface EmptyStateProps {
  onSummary: () => void;
  onNote: () => void;
  alertMessage: string | null;
  microscopeNodes?: MicroscopeNode[] | null;
  onRelationship?: () => void;
  onImportance?: () => void;
}

export default function EmptyState({
  onSummary,
  onNote,
  alertMessage,
  microscopeNodes,
  onRelationship,
  onImportance,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const isMicroscopeMode =
    microscopeNodes != null && microscopeNodes.length > 0;

  return (
    <>
      <p className="text-[30px] font-medium mb-1 text-text-primary">
        {t("aiAgentChatBox.title")}
      </p>
      <p className="text-[20px] font-medium mb-3 text-text-primary">
        {t("aiAgentChatBox.subtitle")}
      </p>

      {isMicroscopeMode ? (
        <>
          <button
            onClick={onRelationship}
            className="w-full mb-2 flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
          >
            <TbMicroscope className="w-3.5 h-3.5 text-text-primary group-hover:text-primary shrink-0" />
            <span className="text-[13px] font-medium text-text-primary group-hover:text-primary">
              {t("graphVisualization.agent.suggestRelation")}
            </span>
          </button>

          <button
            onClick={onImportance}
            className="w-full flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
          >
            <TbMicroscope className="w-3.5 h-3.5 text-text-primary group-hover:text-primary shrink-0" />
            <span className="text-[13px] font-medium text-text-primary group-hover:text-primary">
              {t("graphVisualization.agent.suggestImportance")}
            </span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onSummary}
            className="w-full mb-2 flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
          >
            <RiFileInfoFill className="w-3.5 h-3.5 text-text-primary group-hover:text-primary" />
            <span className="text-[13px] font-medium text-text-primary group-hover:text-primary">
              {t("aiAgentChatBox.summary")}
            </span>
          </button>

          <button
            onClick={onNote}
            className="w-full flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
          >
            <FaPen className="w-3 h-3 text-text-primary group-hover:text-primary" />
            <span className="text-[13px] font-medium text-text-primary group-hover:text-primary">
              {t("aiAgentChatBox.note")}
            </span>
          </button>
        </>
      )}

      {alertMessage && (
        <div className="mt-2 px-3 py-2 bg-frame-bar-red/10 text-frame-bar-red text-[12px] rounded-lg">
          {alertMessage}
        </div>
      )}
    </>
  );
}
