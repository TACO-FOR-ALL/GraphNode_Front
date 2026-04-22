export const GRAPH_GENERATION_TOTAL_STEPS = 6;

export type GraphGenerationStepKey =
  | "embeddingGeneration"
  | "keywordExtraction"
  | "clustering"
  | "similarityCalculation"
  | "graphCorrection"
  | "metadataGeneration";

export type GraphGenerationStageStatus =
  | "pending"
  | "started"
  | "running"
  | "completed";

export interface ParsedGraphGenerationStage {
  rawStage: string | null;
  stepNumber: number | null;
  displayStepNumber: number;
  stepKey: GraphGenerationStepKey | null;
  status: GraphGenerationStageStatus;
}

const STEP_KEY_BY_NUMBER: Record<number, GraphGenerationStepKey> = {
  1: "embeddingGeneration",
  2: "keywordExtraction",
  3: "clustering",
  4: "similarityCalculation",
  5: "graphCorrection",
  6: "metadataGeneration",
};

const STEP_PATTERNS: Array<{
  key: GraphGenerationStepKey;
  pattern: RegExp;
}> = [
  {
    key: "embeddingGeneration",
    pattern: /(embedding|embedding generation|임베딩|임베딩 생성)/i,
  },
  {
    key: "keywordExtraction",
    pattern: /(keyword extraction|keywords|keyword|키워드 추출|키워드)/i,
  },
  {
    key: "clustering",
    pattern: /(llm-based clustering|topic clustering|clustering|cluster assignment|클러스터링|클러스터 배정)/i,
  },
  {
    key: "similarityCalculation",
    pattern: /(similarity calculation|similarity|cosine similarity|유사도 계산|유사도)/i,
  },
  {
    key: "graphCorrection",
    pattern: /(graph correction|graph refinement|graph calibration|보정|그래프 보정|교정)/i,
  },
  {
    key: "metadataGeneration",
    pattern: /(metadata generation|metadata creation|metadata|메타데이터 생성|메타데이터)/i,
  },
];

function parseStepNumber(rawStage: string): number | null {
  const bracketMatch = rawStage.match(/\[(\d+)\s*(?:단계|step)\]/i);
  if (bracketMatch) {
    return Number.parseInt(bracketMatch[1], 10);
  }

  const plainMatch = rawStage.match(/\bstep\s*(\d+)\b/i);
  if (plainMatch) {
    return Number.parseInt(plainMatch[1], 10);
  }

  return null;
}

function parseStatus(rawStage: string): GraphGenerationStageStatus {
  if (/(완료|completed|complete|done|finished)/i.test(rawStage)) {
    return "completed";
  }

  if (/(시작|started|start|begin)/i.test(rawStage)) {
    return "started";
  }

  if (/(중|running|processing|in progress)/i.test(rawStage)) {
    return "running";
  }

  return "pending";
}

function parseStepKey(
  rawStage: string,
  stepNumber: number | null,
): GraphGenerationStepKey | null {
  if (stepNumber && STEP_KEY_BY_NUMBER[stepNumber]) {
    return STEP_KEY_BY_NUMBER[stepNumber];
  }

  const matched = STEP_PATTERNS.find(({ pattern }) => pattern.test(rawStage));
  return matched?.key ?? null;
}

export function parseGraphGenerationStage(
  rawStage: string | null | undefined,
): ParsedGraphGenerationStage {
  if (!rawStage) {
    return {
      rawStage: null,
      stepNumber: null,
      displayStepNumber: 1,
      stepKey: null,
      status: "pending",
    };
  }

  const stepNumber = parseStepNumber(rawStage);
  const stepKey = parseStepKey(rawStage, stepNumber);
  const derivedStepNumber =
    stepNumber ??
    (stepKey
      ? Object.entries(STEP_KEY_BY_NUMBER).find(([, key]) => key === stepKey)?.[0]
      : null);
  const normalizedStepNumber = derivedStepNumber
    ? Number(derivedStepNumber)
    : null;

  return {
    rawStage,
    stepNumber: normalizedStepNumber,
    displayStepNumber: Math.min(
      GRAPH_GENERATION_TOTAL_STEPS,
      Math.max(1, normalizedStepNumber ?? 1),
    ),
    stepKey,
    status: parseStatus(rawStage),
  };
}

export function ceilEtaMinutes(
  etaSeconds: number | null | undefined,
): number | null {
  if (typeof etaSeconds !== "number" || !Number.isFinite(etaSeconds)) {
    return null;
  }

  if (etaSeconds <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(etaSeconds / 60));
}
