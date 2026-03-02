interface ToggleProps {
  isOn: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ isOn, onChange, disabled }: ToggleProps) {
  return (
    <div
      onClick={() => !disabled && onChange(!isOn)}
      className={`relative w-[50px] h-[24px] rounded-full transition-colors duration-300
        ${isOn ? "bg-primary" : "bg-bg-tertiary"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-1 w-[16px] h-[16px] rounded-full bg-white dark:bg-zinc-200 transition-all duration-300 shadow-sm
          ${isOn ? "left-[29px]" : "left-1"}`}
      />
    </div>
  );
}
