export const config = {
  remoteUrl: "https://graphnode.site/app",
  // 연결 타임아웃 (ms)
  connectionTimeout: 15000,

  // 허용된 도메인 목록 (보안 검증용)
  allowedOrigins: [
    "https://graphnode.site",
    "https://taco4graphnode.online",
    "http://localhost:5173",
    "http://localhost:3000",
  ],

  // 스플래시 창 설정
  splash: {
    width: 400,
    height: 300,
    backgroundColor: "#1a1a2e",
  },
};

// URL이 허용된 도메인인지 검증
export function isAllowedOrigin(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const origin = urlObj.origin;
    return config.allowedOrigins.some(
      (allowed) => origin === allowed || url.startsWith(allowed),
    );
  } catch {
    return false;
  }
}
