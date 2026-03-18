// 이 index.ts는 paths 패키지의 공개 진입점으로, 외부 코드가 내부 파일 구조를 직접 알지 않아도 공용 함수를 import할 수 있게 합니다.
// 경로 규칙은 앱 여러 군데에서 공통으로 쓰이기 때문에 로컬 데이터 경로 정책을 중앙처리하기 위해 작성된 코드입니다.
export {
  getCliDataDirectory,
  getCliNotesDirectory,
  getGraphNodeHomeDirectory,
} from "./cli-paths";
