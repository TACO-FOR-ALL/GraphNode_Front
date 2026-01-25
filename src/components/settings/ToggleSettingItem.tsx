function Toggle({
  isOn,
  onChange,
}: {
  isOn: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!isOn)}
      className={`relative w-[50px] h-[24px] rounded-full cursor-pointer transition-colors duration-300
        ${isOn ? "bg-primary" : "bg-bg-tertiary"}`}
    >
      <div
        className={`absolute top-1 w-[16px] h-[16px] rounded-full bg-white dark:bg-zinc-200 transition-all duration-300 shadow-sm
          ${isOn ? "left-[29px]" : "left-1"}`}
      />
    </div>
  );
}

export default function ToggleSettingItem({
  title,
  subtitle,
  isActive,
  onChange,
  devMode,
}: {
  title: string;
  subtitle: string;
  isActive: boolean;
  onChange: (value: boolean) => void;
  devMode?: boolean;
}) {
  return (
    <div className="w-full flex justify-between items-center pb-3 border-b-1 border-base-border">
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary">
          {subtitle}{" "}
          {devMode && (
            <a
              className="text-primary cursor-pointer hover:underline"
              onClick={(e) => {
                e.preventDefault();
                window.systemAPI.openExternal(
                  "https://www.graphnode.site/dev/docs/intro"
                );
              }}
            >
              GraphNode API
            </a>
          )}
        </p>
      </div>
      <Toggle isOn={isActive} onChange={onChange} />
    </div>
  );
}
