import { dialog } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

type ExportNote = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
};

type ExportThread = {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    ts: number;
    temp?: boolean;
  }>;
  updatedAt: number;
};

function toPosixPath(targetPath: string) {
  return targetPath.replace(/\\/g, "/");
}

// 추출하는 파일의 이름을 지정합니다 (fallback으로 id를 사용합니다)
function slugifyFileName(input: string, fallback: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return normalized || fallback;
}

// 사용자가 내보낼 폴더를 직접 선택
async function chooseDirectory(title: string) {
  const result = await dialog.showOpenDialog({
    title,
    properties: ["openDirectory", "createDirectory"], // 기존 폴더 선택, 새 폴더 생성 가능
  }); // Electron 내부 제공

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return toPosixPath(result.filePaths[0]);
}

export async function exportSQLiteNotesToDirectory(notes: ExportNote[]) {
  const directory = await chooseDirectory("Export GraphNode Notes");
  if (!directory) {
    return { canceled: true as const };
  }

  await fs.mkdir(directory, { recursive: true });

  let count = 0;
  for (const note of notes) {
    const baseName = slugifyFileName(note.title, note.id);
    const fileName = `${baseName}-${note.id.slice(0, 8)}.md`;
    await fs.writeFile(path.posix.join(directory, fileName), note.content, "utf-8");
    count += 1;
  }

  return {
    canceled: false as const,
    directory,
    count,
  };
}

export async function exportSQLiteThreadsToDirectory(threads: ExportThread[]) {
  const directory = await chooseDirectory("Export GraphNode Conversations");
  if (!directory) {
    return { canceled: true as const };
  }

  await fs.mkdir(directory, { recursive: true });

  const exportPath = path.posix.join(directory, "conversations.json");
  const payload = {
    exportedAt: new Date().toISOString(),
    threads,
  };

  await fs.writeFile(exportPath, JSON.stringify(payload, null, 2), "utf-8");

  return {
    canceled: false as const,
    directory,
    filePath: exportPath,
    count: threads.length,
  };
}
