import { syncOnce } from "./syncWorker";

let started = false;
let timer: number | null = null;

export function startSyncLoop() {
  if (started) return;
  started = true;

  // 앱 시작 시 한번 outbox 비우기
  syncOnce();

  // 주기적으로 outbox 비우기
  const handleOnline = () => syncOnce();
  window.addEventListener("online", handleOnline);

  timer = window.setInterval(() => {
    if (navigator.onLine) {
      syncOnce();
    }
  }, 5000);

  return () => {
    window.removeEventListener("online", handleOnline);
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    started = false;
  };
}
