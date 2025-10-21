import { ChatThread, ChatMessage } from "../types/Chat";
import uuid from "../utils/uuid";

/** 버전 키 (스키마 바뀌면 v2로 변경) */
const THREADS_KEY = "chatThreads:v1";

/** 메모리 캐시 */
let cache: ChatThread[] | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load(): ChatThread[] {
  if (cache) return cache;
  const raw = window.localStorage.getItem(THREADS_KEY);
  if (!raw) return (cache = []);
  try {
    const parsed = JSON.parse(raw) as ChatThread[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function commitSoon() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const data = load();
    window.localStorage.setItem(THREADS_KEY, JSON.stringify(data));
  }, 50);
}

/** 헬퍼: 정렬 일관성 보장 (updatedAt 내림차순) */
function sortThreads(arr: ChatThread[]): ChatThread[] {
  return [...arr].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 공개 API: Repository */
export const threadRepo = {
  /** 모든 스레드 조회 (정렬 보장) */
  list(): ChatThread[] {
    return sortThreads(load());
  },

  /** 전체 덮어쓰기 저장 */
  saveAll(threads: ChatThread[]): void {
    cache = sortThreads(threads); // 메모리 캐시 업데이트
    commitSoon();
  },

  /** 여러 스레드 upsert */
  upsertMany(newOnes: ChatThread[]): void {
    const byId = new Map<string, ChatThread>();
    for (const t of load()) byId.set(t.id, t);
    for (const t of newOnes) byId.set(t.id, t);
    cache = sortThreads(Array.from(byId.values()));
    commitSoon();
  },

  /** 단건 조회 */
  get(id: string): ChatThread | null {
    return load().find((t) => t.id === id) ?? null;
  },

  /** 생성 (자동 저장) */
  create(title: string, messages: ChatMessage[] = []): ChatThread {
    const newThread: ChatThread = {
      id: uuid(),
      title,
      messages,
      updatedAt: Date.now(),
    };
    this.upsertMany([newThread]);
    return newThread;
  },

  /** 부분 업데이트 (updatedAt 자동 갱신) */
  update(
    id: string,
    patch: Partial<Omit<ChatThread, "id">>
  ): ChatThread | null {
    const arr = load();
    const i = arr.findIndex((t) => t.id === id);
    if (i < 0) return null;
    const next: ChatThread = {
      ...arr[i],
      ...patch,
      updatedAt: Date.now(),
    };
    arr[i] = next;
    this.saveAll(arr);
    return next;
  },

  /** 제목 변경(편의 함수) */
  rename(id: string, title: string): ChatThread | null {
    return this.update(id, { title });
  },

  /** 스레드 삭제 */
  removeItem(id: string): void {
    const next = load().filter((t) => t.id !== id);
    this.saveAll(next);
  },

  /** 전부 삭제 */
  clear(): void {
    cache = [];
    commitSoon();
  },

  /** 제목 추론 (빈 제목 생성 시 유용) */
  inferTitle(messages: ChatMessage[]): string {
    const firstUser = messages.find((m) => m.role === "user")?.content?.trim();
    return firstUser
      ? firstUser.slice(0, 30) + (firstUser.length > 30 ? "…" : "")
      : "Imported Conversation";
  },

  /** updatedAt만 갱신 (정렬 올리기용) */
  touch(id: string): ChatThread | null {
    return this.update(id, {});
  },
};

export default threadRepo;
