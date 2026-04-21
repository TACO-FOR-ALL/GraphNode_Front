interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
}: ZoomControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <button
        onClick={onZoomOut}
        className="w-7 h-7 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-base"
      >
        −
      </button>
      <span className="text-xs text-text-secondary tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        className="w-7 h-7 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-base"
      >
        +
      </button>
    </div>
  );
}
