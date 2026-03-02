import { useTranslation } from "react-i18next";

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export default function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  className = "",
}: ZoomControlsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`absolute bottom-10 right-6 flex items-center gap-1 bg-bg-secondary/90 backdrop-blur rounded-xl p-1 shadow-lg border border-text-tertiary/10 ${className}`}
    >
      <button
        onClick={onZoomIn}
        className="w-8 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-lg"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className="w-8 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-lg"
      >
        −
      </button>
      <div className="w-px h-6 bg-text-tertiary/20 mx-1" />
      <span className="px-2 text-xs text-text-secondary min-w-[45px] text-center">
        {Math.round(scale * 100)}%
      </span>
      <div className="w-px h-6 bg-text-tertiary/20 mx-1" />
      <button
        onClick={onReset}
        className="px-3 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-xs text-text-secondary transition-colors"
      >
        {t("visualize.zoomControls.reset", "Reset")}
      </button>
    </div>
  );
}
