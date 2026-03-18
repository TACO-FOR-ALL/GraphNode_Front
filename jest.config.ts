import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest", // ✅ TS 변환 담당
  testEnvironment: "jsdom", // uuid 테스트에서 window/crypto 다룰 수 있도록
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"], // 있으면 유지, 없으면 빼도 OK
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1", // 경로 별칭 쓰면 매핑
    "^.+\\.(mp3|wav|ogg|m4a|aac|flac|png|jpe?g|gif|svg)$":
      "<rootDir>/test/fileMock.ts",
  },
  // 필요하면 추가:
  // transformIgnorePatterns: ['/node_modules/'],
};
export default config;
