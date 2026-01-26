import { useRef, useState, useEffect } from "react";

export const isImageFile = (file: File) => file.type.startsWith("image/");

export const getFileExtension = (filename: string) =>
  filename.split(".").pop()?.toUpperCase() || "FILE";

export interface UseFileAttachmentReturn {
  attachedFiles: File[];
  previewUrls: string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleButtonClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveFile: (index: number) => void;
  clearFiles: () => void;
}

export default function useFileAttachment(): UseFileAttachmentReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // 파일 변경 시 프리뷰 URL 생성/정리
  useEffect(() => {
    const urls = attachedFiles.map((file) =>
      isImageFile(file) ? URL.createObjectURL(file) : "",
    );
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [attachedFiles]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setAttachedFiles((prev) => [...prev, ...fileArray]);

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setAttachedFiles([]);
  };

  return {
    attachedFiles,
    previewUrls,
    fileInputRef,
    handleButtonClick,
    handleFileChange,
    handleRemoveFile,
    clearFiles,
  };
}
