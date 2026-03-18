import os from "node:os";
import path from "node:path";

const DEFAULT_GRAPHNODE_HOME = path.join(os.homedir(), ".graphnode");

// 앱의 로컬 데이터 루트 경로를 반환합니다.
export function getGraphNodeHomeDirectory(): string {
  return process.env.GRAPHNODE_HOME
    ? path.resolve(process.env.GRAPHNODE_HOME)
    : DEFAULT_GRAPHNODE_HOME;
}

// CLI 관련 데이터 전용 하위 디렉토리를 반환합니다.
export function getCliDataDirectory(): string {
  return path.join(getGraphNodeHomeDirectory(), "cli");
}

// CLI가 임시 markdown preview를 둘 수 있는 notes 경로를 반환합니다.
export function getCliNotesDirectory(): string {
  return path.join(getCliDataDirectory(), "notes");
}
