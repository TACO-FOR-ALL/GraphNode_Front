export function WebAppFrameBar() {
  return (
    <div className="drag-region flex items-center h-12 px-3 border-b border-slate-800 bg-slate-950 text-slate-100">
      <div className="no-drag font-semibold select-none">GraphNode</div>
      <div className="flex-1" />
      <button
        className="no-drag px-3 py-1 hover:bg-slate-800 rounded"
        onClick={() => window.windowAPI.minimize()}
      >
        —
      </button>
      <button
        className="no-drag px-3 py-1 hover:bg-slate-800 rounded"
        onClick={() => window.windowAPI.maximize()}
      >
        ▢
      </button>
      <button
        className="no-drag px-3 py-1 hover:bg-red-500 rounded"
        onClick={() => window.windowAPI.close()}
      >
        ✕
      </button>
    </div>
  );
}
