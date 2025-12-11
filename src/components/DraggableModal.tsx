import { useEffect, useRef, useState } from "react";

export default function DraggableModal({
  children,
  setOpenModal,
}: {
  children: React.ReactNode;
  setOpenModal: (open: boolean) => void;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Search Modal 드래그
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;
      setPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
      };
      setIsDragging(true);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      onClick={() => setOpenModal(false)}
    >
      <div
        ref={modalRef}
        className="flex flex-col w-[750px] h-[480px] shadow-[0_2px_20px_0_#badaff] rounded-2xl border-[1px] border-solid border-[rgba(var(--color-border-quaternary),0.08)] bg-[rgba(255,255,255,0.2)] backdrop-blur-[12px] overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        onMouseDown={handleHeaderMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
