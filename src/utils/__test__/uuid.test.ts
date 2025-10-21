import uuid from "@/utils/uuid";

// describe: 테스트 그룹
// test, it: 테스트 케이스
describe("uuid()", () => {
  // crypto 객체의 원래 값 저장
  const realCrypto = globalThis.crypto;

  // 각 테스트가 끝날 때마다 실행
  afterEach(() => {
    if (realCrypto !== undefined) {
      Object.defineProperty(globalThis, "crypto", {
        value: realCrypto,
        configurable: true,
      });
    } else {
      delete (globalThis as any).crypto;
    }
    jest.restoreAllMocks();
  });

  test("crypto.randomUUID exists => use crypto.randomUUID", () => {
    const mockUUID = "mocked-uuid-123";
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: jest.fn(() => mockUUID) }, // randomUUID()가 호출되면  "mocked-uuid-123"를 반환하는 가짜 함수(mock)를 globalThis.crypto에 할당
      configurable: true, // Object.defineProperty()로 만든 속성을 나중에 다시 수정하거나 삭제할 수 있게 허용하는 옵션
    });

    const result = uuid();

    expect(result).toBe(mockUUID); // uuid()가 반환한 값이 "mocked-uuid-123"인지 확인
    expect(globalThis.crypto!.randomUUID).toHaveBeenCalledTimes(1); // crypto.randomUUID()가 1번 호출되었는지 확인
  });

  test("crypto.randomUUID not exists => use Date.now + Math.random", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: {}, // 빈 객체를 globalThis.crypto에 할당
      configurable: true,
    });

    // Date.now()가 호출되면 1700000000000을 반환하는 가짜 함수(mock)를 정의
    jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    // Math.random()가 호출되면 0.123456을 반환하는 가짜 함수(mock)를 정의
    jest.spyOn(Math, "random").mockReturnValue(0.123456);

    const result = uuid();

    const expectedRandom = (0.123456).toString(36).slice(2);
    expect(result).toBe(`1700000000000-${expectedRandom}`);
  });

  test("crypto is completely undefined => safely work", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined, // globalThis.crypto를 undefined로 설정
      configurable: true,
    });

    const result = uuid();

    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d{13}-[a-z0-9]+$/);
  });
});
