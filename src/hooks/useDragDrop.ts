import { useCallback, useState } from "react";

interface UseDragDropOptions {
  onFileDrop: (files: File[]) => void;
}

interface UseDragDropReturn {
  dragProps: {
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  };
  isOver: boolean;
}

export default function useDragDrop({
  onFileDrop,
}: UseDragDropOptions): UseDragDropReturn {
  const [isOver, setIsOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOver(false);

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        onFileDrop(files);
      }
    },
    [onFileDrop],
  );

  return {
    dragProps: {
      onDragOver,
      onDragLeave,
      onDrop,
    },
    isOver,
  };
}
