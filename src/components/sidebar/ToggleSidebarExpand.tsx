import SideExpandPanelIcon from "@/assets/icons/panel.svg";

export default function ToggleSidebarExpand({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}) {
  return (
    <div className="flex px-3 py-4">
      <img
        onClick={() => setIsExpanded(!isExpanded)}
        src={SideExpandPanelIcon}
        alt="side expand panel"
        className="w-4 h-4 ml-auto"
      />
    </div>
  );
}
