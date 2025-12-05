import {
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightExpand,
} from "react-icons/tb";

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
        <TbLayoutSidebarRightExpand
          onClick={() => setIsExpanded(false)}
          className="text-text-secondary text-[16px] ml-auto"
        />
      ) : (
        <TbLayoutSidebarLeftExpand
          onClick={() => setIsExpanded(true)}
          className="text-text-secondary text-[16px] ml-auto"
        />
      )}
    </div>
  );
}
