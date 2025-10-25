import { useCallback, useEffect, useRef, useState } from "react";
import { Status } from "../types/FileUploadStatus";
import { useTranslation } from "react-i18next";
import threadRepo from "../managers/threadRepo";
import { parseConversations } from "../utils/parseConversations";
import { toMarkdownFromUnknown } from "../utils/toMarkdown";
import { ChatMessage } from "../types/Chat";
import uuid from "../utils/uuid";
import { db } from "@/db/chat.db";
import { indexThreadVectors } from "@/managers/embed";

export default function DropJsonZone() {
  const { t } = useTranslation();

  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState("");
  const [jsonPreview, setJsonPreview] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<number>(0);

  // 등록된 이벤트 리스너 해제 저장소
  const unsubRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      unsubRef.current.forEach((u) => u());
      unsubRef.current = [];
    };
  }, []);

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

  const handleParsedJSON = useCallback(
    async (data: any) => {
      setStatus("parsing");
      try {
        await new Promise((r) => setTimeout(r, 50));

        setJsonPreview(data);

        // 1) JSON → 내부 스레드 구조로 파싱
        const threads = await parseConversations(data);
        console.log("🧩 parseConversations length:", threads?.length, threads);

        if (!threads.length) {
          console.warn("🟡 파싱 결과 0개");
          setStatus("done");
          return;
        }

        // 2) 메시지 content 정규화
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

        // 3) 로컬 저장
        await threadRepo.upsertMany(normalized);
        console.log(`💾 로컬에 ${normalized.length}개 스레드 저장 완료`);

        // 4) ✅ 배치 임베딩 (모든 환경 공통)
        for (const th of normalized) {
          const msgs = th.messages.map((m) => ({
            id: m.id,
            content:
              typeof m.content === "string" ? m.content : String(m.content),
            ts: m.ts,
          }));

          try {
            await indexThreadVectors(th.id, msgs);
          } catch (e) {
            console.error("❌ indexThreadVectors 실패:", th.id, e);
          }

          // 검증: 해당 스레드에 저장된 벡터 수
          const cnt = await db.vectors.where("threadId").equals(th.id).count();
          console.log("🧭 vector count for thread", th.id, cnt);
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
    },
    [t]
  );

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

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;
      const file = files[0];

      const isJsonByName = file.name?.toLowerCase().endsWith(".json");
      if (!isJsonByName) {
        setError(t("settings.dropJsonZone.errorMessage.notJson"));
        setStatus("error");
        return;
      }
      setFileName(file.name);

      const id = uuid();

      try {
        if ((file as any).path) {
          // ✅ Electron 분기: 파일 스트림 + 진행률
          setStatus("reading");

          unsubRef.current.push(
            window.fileAPI.onReadProgress(({ id: gotId, percent }) => {
              if (gotId === id) setProgress(percent);
            })
          );
          unsubRef.current.push(
            window.fileAPI.onReadComplete(async ({ id: gotId, text }) => {
              if (gotId !== id) return;
              console.log("파일 읽기 완료(Electron)");
              await handleParsedJSON(JSON.parse(text));
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

          window.fileAPI.readFileStream((file as any).path, id);
        } else {
          // ✅ 브라우저 분기: FileReader
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
            console.log("파일 읽기 완료(Browser)");
            const text = String(reader.result || "");
            await handleParsedJSON(JSON.parse(text));
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
    [t, handleParsedJSON]
  );

  return (
    <div className="max-w-[780px] mx-auto mt-10 mb-10 font-sans">
      <h2 className="text-2xl font-semibold mb-6">
        {t("settings.dropJsonZone.title")}
      </h2>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
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
            </b>{" "}
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
