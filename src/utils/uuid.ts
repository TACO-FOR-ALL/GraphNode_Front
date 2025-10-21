// 중요한 개념!!!
// 유틸 같은 외부 함수(모듈 바깥에 정의, import로 가져오는 것)는 리렌더링과 무관하게 재생성되지 않음
// 반면 컴포넌트 함수 내부에 정의한 함수는 리렌더마다 새로 생성

export default function uuid() {
  // 브라우저 (또는 Node 환경)에 crypto 객체가 있고, randomUUID 함수가 있으면 사용, 없으면 날짜+랜덤 조합
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
