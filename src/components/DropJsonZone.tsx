import { useCallback, useEffect, useRef, useState } from "react";
import { Status } from "../types/FileUploadStatus";
import { useTranslation } from "react-i18next";
import threadRepo from "../managers/threadRepo";
import { parseConversations } from "../utils/parseConversations";
import { toMarkdownFromUnknown } from "../utils/toMarkdown";
import { ChatMessage } from "../types/Chat";
import uuid from "../utils/uuid";

export default function DropJsonZone() {
  const { t } = useTranslation();

  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState("");
  const [jsonPreview, setJsonPreview] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<number>(0);

  // 등록된 이벤트 리스너를 한 번에 해제하기 위한 저장소 (일반 배열처럼 push나 pop 가능함), 렌더 사이클과 무관하게 유지
  const unsubRef = useRef<Array<() => void>>([]);

  // 컴포넌트 언마운트될 때 등록된 이벤트 리스너를 해제
  useEffect(() => {
    return () => {
      unsubRef.current.forEach((u) => u());
      unsubRef.current = [];
    };
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // 이벤트의 기본 동작 방지 (브라우저는 기본적으로 파일 드롭 시 그 파일을 브라우저에서 열려고 시도해서 방지해야함)
    e.stopPropagation(); // 이벤트가 상위 요소로 전파 방지
    setIsOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOver(false);
      setError("");
      setJsonPreview(null);
      setFileName("");
      setProgress(0);
      setStatus("idle");

      // 드래그한게 파일들일 수 있어서 첫번째 파일만 처리
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;
      const file = files[0];

      // 파일 형식이 JSON인지 확인
      const isJsonByName = file.name?.toLowerCase().endsWith(".json");
      if (!isJsonByName) {
        setError(t("settings.dropJsonZone.errorMessage.notJson"));
        setStatus("error");
        return;
      }

      setFileName(file.name);

      const id = uuid(); // 파일 읽기 요청에 대응되는 고유 ID (진행률/완료/에러 이벤트 구분 용도)

      try {
        // Electron 환경에서는 file.path
        if (file.path) {
          setStatus("reading");

          // 먼저 리스너 등록
          unsubRef.current.push(
            window.fileAPI.onReadProgress(({ id: gotId, percent }) => {
              if (gotId === id) setProgress(percent);
            })
          );
          unsubRef.current.push(
            window.fileAPI.onReadComplete(async ({ id: gotId, text }) => {
              if (gotId !== id) return;
              console.log("파일 읽기 완료");
              setStatus("parsing");
              try {
                await new Promise((r) => setTimeout(r, 50));

                const data = JSON.parse(text);
                setJsonPreview(data);

                // 디버그 로그 확인
                // console.log(
                //   "📦 raw JSON keys:",
                //   typeof data,
                //   Array.isArray(data) ? "array" : Object.keys(data || {})
                // );
                // console.log(
                //   "📦 raw JSON preview:",
                //   JSON.stringify(data).slice(0, 200)
                // );

                // 로컬 스토리지에 저장
                try {
                  const threads = parseConversations(data);
                  console.log(
                    "🧩 parseConversations length:",
                    threads?.length,
                    threads
                  );
                  if (threads.length) {
                    // content가 객체/배열이면 강제로 마크다운 변환
                    const normalized = threads.map((th) => ({
                      ...th,
                      messages: th.messages.map((m: ChatMessage) => ({
                        ...m,
                        content:
                          typeof m.content === "string"
                            ? m.content
                            : toMarkdownFromUnknown(m.content),
                      })),
                    }));

                    // 정규화된 데이터를 안전하게 로컬 저장
                    threadRepo.upsertMany(normalized);
                    console.log(
                      `💾 로컬에 ${normalized.length}개 스레드 저장 완료`
                    );
                  } else {
                    console.warn(
                      "🟡 파싱 결과가 0개입니다. JSON 구조가 예상과 다를 가능성."
                    );
                  }
                } catch (e) {
                  console.warn("대화 파싱/저장 중 경고:", e);
                }

                setStatus("done");
              } catch (e: any) {
                setError(
                  t("settings.dropJsonZone.errorMessage.parseFailed", {
                    msg: e?.message || e,
                  })
                );
                setStatus("error");
              }
            })
          );
          unsubRef.current.push(
            window.fileAPI.onReadError(({ id: gotId, message }) => {
              if (gotId !== id) return;
              setError(
                t("settings.dropJsonZone.errorMessage.readFailed", {
                  msg: message,
                })
              );
              setStatus("error");
            })
          );

          // 읽기 실행
          window.fileAPI.readFileStream(file.path, id);
        } else {
          // 브라우저 환경에서는 FileReader로 진행률
          setStatus("reading");
          const reader = new FileReader();
          reader.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const percent = Math.min(
                100,
                Math.round((ev.loaded / ev.total) * 100)
              );
              setProgress(percent);
            }
          };
          reader.onerror = () => {
            setError(t("settings.dropJsonZone.errorMessage.readFailed"));
            setStatus("error");
          };
          reader.onload = async () => {
            console.log("파일 읽기 완료");
            setStatus("parsing");
            try {
              await new Promise((r) => setTimeout(r, 50));
              const text = String(reader.result || "");
              const data = JSON.parse(text);
              setJsonPreview(data);

              // 디버그 로그 확인
              // console.log(
              //   "📦 raw JSON keys:",
              //   typeof data,
              //   Array.isArray(data) ? "array" : Object.keys(data || {})
              // );
              // console.log(
              //   "📦 raw JSON preview:",
              //   JSON.stringify(data).slice(0, 200)
              // );

              // 로컬 스토리지에 저장
              try {
                const threads = parseConversations(data);
                console.log(
                  "🧩 parseConversations length:",
                  threads?.length,
                  threads
                );
                if (threads.length) {
                  // content가 객체/배열이면 강제로 마크다운 변환
                  const normalized = threads.map((th) => ({
                    ...th,
                    messages: th.messages.map((m: ChatMessage) => ({
                      ...m,
                      content:
                        typeof m.content === "string"
                          ? m.content
                          : toMarkdownFromUnknown(m.content),
                    })),
                  }));

                  // 정규화된 데이터를 안전하게 로컬 저장
                  threadRepo.upsertMany(normalized);
                  console.log(
                    `💾 로컬에 ${normalized.length}개 스레드 저장 완료`
                  );
                } else {
                  console.warn(
                    "🟡 파싱 결과가 0개입니다. JSON 구조가 예상과 다를 가능성."
                  );
                }
              } catch (e) {
                console.warn("대화 파싱/저장 중 경고:", e);
              }

              setStatus("done");
            } catch (e: any) {
              setError(
                t("settings.dropJsonZone.errorMessage.parseFailed", {
                  msg: e?.message || e,
                })
              );
              setStatus("error");
            }
          };
          reader.readAsText(file);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          t("settings.dropJsonZone.errorMessage.processingFailed", { msg })
        );
        setStatus("error");
      }
    },
    [t]
  );

  return (
    <div className="max-w-[780px] mx-auto mt-10 mb-10 font-sans">
      <h2 className="text-2xl font-semibold mb-6">
        {t("settings.dropJsonZone.title")}
      </h2>

      <div
        onDragOver={onDragOver} // 드래그 중인 파일이 영역 위를 지나갈 때 계속 발생
        onDragLeave={onDragLeave} // 드래그 중이던 파일이 영역을 벗어날 때 발생
        onDrop={onDrop} // 드래그 중이던 파일이 영역 안에 떨어졌을 떄
        className={`
      border-2 border-dashed border-gray-400 rounded-2xl p-9 text-center
      transition-colors duration-150 select-none
      ${isOver ? "bg-blue-50" : "bg-gray-50"}
    `}
      >
        <p className="m-0">{t("settings.dropJsonZone.description")}</p>
        <small className="text-gray-500 text-sm">
          {t("settings.dropJsonZone.maxSize")}
        </small>

        {/* 진행률 & 상태 */}
        {status !== "idle" && (
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-1.5">
              {status === "reading" && (
                <>{t("settings.dropJsonZone.uploading", { progress })}</>
              )}
              {status === "parsing" && (
                <>{t("settings.dropJsonZone.parsing")}</>
              )}
              {status === "done" && <>{t("settings.dropJsonZone.done")}</>}
              {status === "error" && <>{t("settings.dropJsonZone.error")}</>}
            </div>
            {/* Progress bar */}
            {(status === "reading" || status === "parsing") && (
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-blue-500 transition-all duration-150 ease-out`}
                  style={{
                    width: status === "reading" ? `${progress}%` : "100%",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600">
          {error}
        </div>
      )}

      {jsonPreview && (
        <div className="mt-4">
          <div className="mb-2">
            <b className="font-semibold">
              {t("settings.dropJsonZone.fileName")}:
            </b>
            {fileName}
          </div>
          <pre className="bg-gray-900 text-gray-300 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
            {JSON.stringify(jsonPreview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
