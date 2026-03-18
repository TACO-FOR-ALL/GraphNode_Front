export const SQLITE_SYNC_CURSOR_KEY = "sqlite.sync.cursor";
export const SQLITE_BOOTSTRAP_STATE_KEY = "sqlite.bootstrap.state";

export interface BootstrapMeta {
  state: string;
  lastServerTime: string | null;
  lastBootstrappedAt: string | null;
}

// 부트스트랩 상태는 SQLite가 준비 완료됐는지 판단해서, UI, CLI, 저장소 선택 로직에서 상태 확인용으로 씁니다
export function createBootstrapMeta({
  state = "idle",
  lastServerTime = null,
  lastBootstrappedAt = null,
}: Partial<BootstrapMeta> = {}): BootstrapMeta {
  return {
    state,
    lastServerTime,
    lastBootstrappedAt,
  };
}
