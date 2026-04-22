import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";

export default function ToggleSidebarExpand({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}) {
  return (
    <div className="flex px-3 py-4">
      {isExpanded ? (
        <RiSidebarFoldLine
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-4 h-4 ml-auto cursor-pointer text-text-secondary hover:text-primary transition-colors"
        />
      ) : (
        <RiSidebarUnfoldLine
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-4 h-4 ml-auto cursor-pointer text-text-secondary hover:text-primary transition-colors"
        />
      )}
    </div>
  );
}
