export function WebAppFrameBar() {
  return (
    <div className="drag-region flex h-7 px-4 items-center bg-frame-bar-background gap-2">
      <div
        className="w-3 h-3 rounded-full bg-frame-bar-red"
        onClick={window.windowAPI.close}
      ></div>
      <div
        className="w-3 h-3 rounded-full bg-frame-bar-yellow"
        onClick={window.windowAPI.minimize}
      ></div>
      <div
        className="w-3 h-3 rounded-full bg-frame-bar-green"
        onClick={window.windowAPI.maximize}
      ></div>
    </div>
  );
}
