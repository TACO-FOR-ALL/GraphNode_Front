import path from "node:path";
import { SQLITE_SCHEMA } from "./sqlite-schema";

// sqlite-schema.ts의 SQLITE_SCHEMA 문자열을 반환합니다
export async function readSQLiteSchema(): Promise<string> {
  return SQLITE_SCHEMA;
}

// GraphNode 홈 디렉토리를 받아서 실제 DB 파일 경로를 만듭니다
export function getDefaultDatabaseLocation(homeDirectory: string): string {
  return path.join(homeDirectory, "graphnode.db");
}
