import { useState, useCallback } from "react";

interface ImageCompressionConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 (JPEG only)
  maxSizeKB?: number; // 경고용
}

const DEFAULT_CONFIG: Required<ImageCompressionConfig> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  maxSizeKB: 500,
};

export function useImageCompression(config?: ImageCompressionConfig) {
  const [isCompressing, setIsCompressing] = useState(false);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const compressImage = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        setIsCompressing(true);

        const reader = new FileReader();

        reader.onload = (e) => {
          const img = new Image();

          img.onload = () => {
            try {
              // 1. 원본 비율 유지하며 리사이징 계산
              let { width, height } = img;
              const aspectRatio = width / height;

              if (width > finalConfig.maxWidth) {
                width = finalConfig.maxWidth;
                height = width / aspectRatio;
              }

              if (height > finalConfig.maxHeight) {
                height = finalConfig.maxHeight;
                width = height * aspectRatio;
              }

              // 2. Canvas 사용 (리사이징 / JPEG 포맷 변환 및 품질 압축)
              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext("2d");
              if (!ctx) {
                throw new Error("Canvas context not available");
              }

              // 고품질 리샘플링 설정
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";

              ctx.drawImage(img, 0, 0, width, height);

              // 3. Base64 변환 (PNG는 압축 없이 그대로, JPEG/기타는 품질 조정)
              const mimeType =
                file.type === "image/png" ? "image/png" : "image/jpeg";
              const base64 = canvas.toDataURL(mimeType, finalConfig.quality);

              // 4. 파일 크기 체크
              const sizeKB = (base64.length * 3) / 4 / 1024; // Base64 크기 계산
              if (sizeKB > finalConfig.maxSizeKB) {
                console.warn(
                  `Compressed image is ${Math.round(sizeKB)}KB, exceeds ${finalConfig.maxSizeKB}KB limit`,
                );
              }

              setIsCompressing(false);
              resolve(base64);
            } catch (error) {
              setIsCompressing(false);
              reject(error);
            }
          };

          img.onerror = () => {
            setIsCompressing(false);
            reject(new Error("Failed to load image"));
          };

          img.src = e.target?.result as string;
        };

        reader.onerror = () => {
          setIsCompressing(false);
          reject(new Error("Failed to read file"));
        };

        reader.readAsDataURL(file);
      });
    },
    [finalConfig],
  );

  return { compressImage, isCompressing };
}
