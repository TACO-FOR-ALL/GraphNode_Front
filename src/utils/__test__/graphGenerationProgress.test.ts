import {
  ceilEtaMinutes,
  parseGraphGenerationStage,
} from "../graphGenerationProgress";

describe("parseGraphGenerationStage", () => {
  test("한글 단계 문자열에서 단계 번호와 상태를 추출한다", () => {
    expect(parseGraphGenerationStage("[1단계] 임베딩 생성 중")).toEqual({
      rawStage: "[1단계] 임베딩 생성 중",
      stepNumber: 1,
      displayStepNumber: 1,
      stepKey: "embeddingGeneration",
      status: "running",
    });
  });

  test("영문 단계 문자열도 인식한다", () => {
    expect(parseGraphGenerationStage("Step 4: Similarity Calculation completed")).toEqual(
      {
        rawStage: "Step 4: Similarity Calculation completed",
        stepNumber: 4,
        displayStepNumber: 4,
        stepKey: "similarityCalculation",
        status: "completed",
      },
    );
  });

  test("단계 번호가 없어도 키워드로 추론한다", () => {
    expect(parseGraphGenerationStage("Metadata generation in progress")).toEqual(
      {
        rawStage: "Metadata generation in progress",
        stepNumber: 6,
        displayStepNumber: 6,
        stepKey: "metadataGeneration",
        status: "running",
      },
    );
  });
});

describe("ceilEtaMinutes", () => {
  test("초를 분 단위로 올림한다", () => {
    expect(ceilEtaMinutes(1)).toBe(1);
    expect(ceilEtaMinutes(60)).toBe(1);
    expect(ceilEtaMinutes(61)).toBe(2);
    expect(ceilEtaMinutes(3599)).toBe(60);
  });

  test("잘못된 값은 null을 반환한다", () => {
    expect(ceilEtaMinutes(null)).toBeNull();
    expect(ceilEtaMinutes(undefined)).toBeNull();
    expect(ceilEtaMinutes(Number.NaN)).toBeNull();
  });
});
