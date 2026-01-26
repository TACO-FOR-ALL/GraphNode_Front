import { IoClose } from "react-icons/io5";
import { isImageFile, getFileExtension } from "@/hooks/useFileAttachment";

interface FilePreviewListProps {
  files: File[];
  previewUrls: string[];
  onRemove: (index: number) => void;
}

export default function FilePreviewList({
  files,
  previewUrls,
  onRemove,
}: FilePreviewListProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 w-full pb-2 overflow-x-auto">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="relative group flex-shrink-0"
        >
          {isImageFile(file) && previewUrls[index] ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              <img
                src={previewUrls[index]}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center p-1">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">
                {getFileExtension(file.name)}
              </span>
              <span className="text-[8px] text-gray-400 dark:text-gray-400 truncate w-full text-center mt-1">
                {file.name.length > 10
                  ? file.name.slice(0, 8) + "..."
                  : file.name}
              </span>
            </div>
          )}
          {/* 삭제 버튼 */}
          <div
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 w-3 h-3 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/60 cursor-pointer"
          >
            <IoClose className="w-2 h-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
