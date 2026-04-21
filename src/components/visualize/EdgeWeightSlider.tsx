import { useTranslation } from "react-i18next";

interface EdgeWeightSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function EdgeWeightSlider({
  value,
  onChange,
}: EdgeWeightSliderProps) {
  const { t } = useTranslation();
  const fillPercent = ((value - 0.6) / 0.4) * 100;

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {t("visualize.zoomControls.edgeWeight", "Similarity")}
        </span>
        <span className="text-xs text-text-primary font-medium tabular-nums">
          {value.toFixed(2)}
        </span>
      </div>

      <input
        type="range"
        min={0.6}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="edge-weight-slider w-full"
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${fillPercent}%, var(--color-bg-tertiary) ${fillPercent}%, var(--color-bg-tertiary) 100%)`,
        }}
      />

      <div className="flex justify-between text-[10px] text-text-tertiary">
        <span>0.60</span>
        <span>1.00</span>
      </div>
    </div>
  );
}
