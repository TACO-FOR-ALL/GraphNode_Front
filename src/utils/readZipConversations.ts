import JSZip from "jszip";

export interface ZipEntry {
  name: string;
  text: string;
}

/**
 * ZIP 파일에서 conversation*.json 파일만 추출해 텍스트 배열로 반환.
 * FileReader + JSZip 기반 — 브라우저와 Electron renderer 모두 동작.
 *
 * @param file      ZIP File 객체
 * @param onProgress 0~100 진행률 콜백
 */
export async function readZipConversations(
  file: File,
  onProgress?: (p: number) => void,
): Promise<ZipEntry[]> {
  // ArrayBuffer 로 읽기 (0 → 50%)
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress?.(Math.round((ev.loaded / ev.total) * 50));
      }
    };
    reader.onerror = () => reject(new Error("ZIP 파일 읽기 실패"));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  });

  onProgress?.(50);

  // JSZip 으로 압축 해제
  const zip = await JSZip.loadAsync(buffer);

  // .json 확장자 + 이름에 "conversation" 포함인 파일만 필터
  const targets = Object.values(zip.files).filter(
    (entry) =>
      !entry.dir &&
      entry.name.toLowerCase().endsWith(".json") &&
      entry.name.toLowerCase().includes("conversation"),
  );

  if (targets.length === 0) return [];

  // 각 파일을 텍스트로 변환 (50 → 100%)
  const results: ZipEntry[] = [];
  for (let i = 0; i < targets.length; i++) {
    const entry = targets[i];
    const text = await entry.async("text");
    results.push({ name: entry.name, text });
    onProgress?.(50 + Math.round(((i + 1) / targets.length) * 50));
  }

  return results;
}
