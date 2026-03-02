import Toggle from "@/components/common/Toggle";

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
