import uuid from "./uuid";

export default function readJsonWithProgress(
  file: File & { path?: string },
  onProgress: (p: number) => void,
  t: (key: string, vars?: any) => string
): Promise<string> {
  // Electron 환경
  if ((file as any).path && (window as any).fileAPI) {
    const id = uuid();
    return new Promise<string>((resolve, reject) => {
      const unsubs: Array<() => void> = [];
      unsubs.push(
        window.fileAPI.onReadProgress(({ id: gotId, percent }) => {
          if (gotId === id) onProgress(percent);
        })
      );
      unsubs.push(
        window.fileAPI.onReadComplete(({ id: gotId, text }) => {
          if (gotId !== id) return;
          unsubs.forEach((u) => u());
          resolve(text);
        })
      );
      unsubs.push(
        window.fileAPI.onReadError(({ id: gotId, message }) => {
          if (gotId !== id) return;
          unsubs.forEach((u) => u());
          reject(
            new Error(
              t("settings.dropJsonZone.errorMessage.readFailed", {
                msg: message,
              })
            )
          );
        })
      );
      window.fileAPI.readFileStream(file.path!, id);
    });
  }

  // Browser 환경 (맥북에서 파일 읽기 시 사용)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (ev) => {
      if (ev.lengthComputable) {
        const percent = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
        onProgress(percent);
      }
    };
    reader.onerror = () =>
      reject(new Error(t("settings.dropJsonZone.errorMessage.readFailed")));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}
