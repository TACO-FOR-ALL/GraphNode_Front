export function isElectron(): boolean {
  // SSR 환경에서는 window 자체가 없어서 접근시 ReferenceError 발생 (typeof로 안전하게 확인)
  // window.windowAPI는 Electron의 preload 스크립트가 contextBridge로 주입하는 객체 (undefined면 웹)
  return (
    typeof window !== "undefined" && typeof window.windowAPI !== "undefined"
  );
}
