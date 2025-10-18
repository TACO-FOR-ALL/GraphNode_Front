import { ipcMain } from "electron";
import fs from "fs"; // Node.js 기본 내장 모듈 (File System을 다루는)

export default function fileIPC() {
  ipcMain.on(
    "file:read-start",
    (evt, { id, absPath }: { id: string; absPath: string }) => {
      try {
        const stat = fs.statSync(absPath); // 해당 경로에 있는 파일 정보를 가져옴
        const total = stat.size || 1; // 파일 크기를 가져옴 (없으면 1로 설정)

        // 메모리 절약을 위해 128KB 단위로 읽음, 이 수치를 높이면 메모리 사용량이 증가하는 대신 처리 속도가 빨라짐
        const stream = fs.createReadStream(absPath, {
          highWaterMark: 128 * 1024,
        });
        stream.setEncoding("utf8"); // 스트림 인코딩 설정하여 디코딩 오류 방지

        let loaded = 0; // 데이터 크기
        const chunks: string[] = []; // 데이터 내용

        // 위에서 stream으로 지정한 용량만큼 한번씩 호출해서 읽음
        stream.on("data", (chunk: string | Buffer) => {
          // 지금까지 읽은 데이터 크기 누적 연산
          const inc =
            typeof chunk === "string"
              ? Buffer.byteLength(chunk, "utf8")
              : chunk.length;
          loaded += inc;

          // 문자열로 변환 후 chunk배열에 추가, push는 배열 끝에 요소를 추가하고 새 길이를 반환한다.
          const str =
            typeof chunk === "string" ? chunk : chunk.toString("utf8");
          chunks.push(str);

          // 진행률 계산
          const percent = Math.min(100, Math.round((loaded / total) * 100));
          // 진행률을 read-progress 이벤트로 전송
          evt.sender.send("file:read-progress", { id, percent });
        });

        // 파일을 전부 다 읽은 시점에 실행
        stream.on("end", () => {
          // 지금까지 모든 chunk(배열)을 합쳐서 하나의 완성된 문자열로 만든 뒤 read-complete 이벤트로 전송
          evt.sender.send("file:read-complete", {
            id,
            text: chunks.join(""),
          });
        });

        // 파일 읽기 중 에러가 발생한 시점에 실행
        stream.on("error", (error: Error) => {
          // 에러 메시지를 read-error 이벤트로 전송
          evt.sender.send("file:read-error", {
            id,
            message: String(error?.message || error),
          });
        });
      } catch (e: any) {
        evt.sender.send("file:read-error", {
          id,
          message: String(e?.message || e),
        });
      }
    }
  );
}
