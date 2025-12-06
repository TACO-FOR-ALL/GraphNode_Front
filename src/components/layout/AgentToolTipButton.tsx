import logo from "@/assets/icons/logo.svg";

export default function AgentToolTipButton({
  setOpenAgentTooltip,
}: {
  setOpenAgentTooltip: (open: boolean) => void;
}) {
  return (
    <div
      className="absolute bottom-9 right-9 z-50 group"
      onClick={() => setOpenAgentTooltip(true)}
    >
      <div className="w-16 h-16 cursor-pointer flex items-center justify-center bg-white rounded-full shadow-[0_2px_20px_0_#badaff] hover:rotate-360 transition-all duration-500 relative">
        <img
          src={logo}
          alt="logo"
          className="w-6 h-6 group-hover:scale-125 transition-all duration-300"
        />
      </div>
      <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap z-50">
        <div
          className="flex flex-col py-2 px-4 items-center justify-center rounded-xl border-[1px] transition-all duration-500 border-[rgba(var(--color-chatbox-border-rgb),0.2)] border-solid shadow-[0_2px_20px_0_#badaff]"
          style={{
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <span className="text-sm font-noto-sans-kr text-text-secondary">
            Hi! I'm GraphNode AI
          </span>
        </div>
      </div>
    </div>
  );
}
