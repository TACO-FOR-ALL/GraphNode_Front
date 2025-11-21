export function WebAppFrameBar() {
  const handleClose = () => window.windowAPI.close();
  const handleMinimize = () => window.windowAPI.minimize();
  const handleMaximize = () => window.windowAPI.maximize();

  return (
    <div className="drag-region flex h-7 px-4 items-center bg-frame-bar-background gap-2">
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-red cursor-pointer"
        onClick={handleClose}
      ></div>
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-yellow cursor-pointer"
        onClick={handleMinimize}
      ></div>
      <div
        className="no-drag w-3 h-3 rounded-full bg-frame-bar-green cursor-pointer"
        onClick={handleMaximize}
      ></div>
    </div>
  );
}
