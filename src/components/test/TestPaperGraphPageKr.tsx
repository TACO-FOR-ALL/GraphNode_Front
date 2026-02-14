import PaperGraphVisualizationKr from "./PaperGraphVisualizationKr";

// JSON 데이터 (한국어 버전)
const paperData = [
  {
    nodes: [
      {
        name: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        type: "Paper",
        source_chunk_id: 1,
        description:
          "IEEE Trans. Affective Computing, 2025. 대조 학습 및 정보 최대화를 보조 태스크로 활용한 멀티태스크 트랜스포머 제안.",
      },
      {
        name: "크로스-코퍼스 음성 감정 인식 (SER / MER)",
        type: "Problem",
        source_chunk_id: 2,
        description:
          "서로 다른 음성 감정 데이터셋 간의 일반화 문제; 크로스-코퍼스 시나리오에서 낮은 정확도.",
      },
      {
        name: "낮은 크로스-코퍼스 일반화 / 낮은 정확도",
        type: "Problem",
        source_chunk_id: 1,
        description:
          "크로스-코퍼스 SER의 전체 정확도가 상대적으로 낮아 개선이 필요함.",
      },
      {
        name: "멀티태스크 트랜스포머 프레임워크",
        type: "Method",
        source_chunk_id: 4,
        description:
          "사전 학습된 트랜스포머를 백본으로 사용하고, SER을 주 태스크로, 대조 학습 + 정보 최대화를 보조 태스크로 활용하는 프레임워크.",
      },
      {
        name: "보조 태스크 / 보조 손실",
        type: "Method",
        source_chunk_id: 9,
        description:
          "양성 쌍(동일 인스턴스의 두 증강)을 끌어당기고 음성을 밀어내는 비지도 보조 손실.",
      },
      {
        name: "데이터 증강 (오디오 및 텍스트)",
        type: "Method",
        source_chunk_id: 7,
        description:
          "오디오: 대조 학습을 위해 샘플당 두 번 적용되는 다섯 가지 파형 증강 유형(torch-audiomentations). 텍스트: 토큰 컷오프 적용(다섯 번).",
      },
      {
        name: "결정 수준 융합",
        type: "Method",
        source_chunk_id: 10,
        description:
          "추론 시 오디오와 텍스트 트랜스포머의 로짓을 더하여 멀티모달 예측 수행(융합 학습 없음).",
      },
      {
        name: "IEMOCAP",
        type: "Dataset",
        source_chunk_id: 11,
        description:
          "약 12시간의 영어 대화 세션; 4가지 감정 클래스(중립, 행복, 슬픔, 분노) 사용.",
      },
      {
        name: "MSP-IMPROV",
        type: "Dataset",
        source_chunk_id: 11,
        description:
          "감정별 목표 문장이 있는 영어 대화 데이터셋; 4가지 감정 클래스 사용; IEMOCAP보다 큰 규모.",
      },
      {
        name: "EMO-DB",
        type: "Dataset",
        source_chunk_id: 11,
        description:
          "독일어 연기 데이터셋(800개 발화; 4가지 감정 클래스로 매핑된 535개 발화 서브셋 사용).",
      },
      {
        name: "MSP-PODCAST",
        type: "Dataset",
        source_chunk_id: 18,
        description:
          "자연스러운 데이터셋(~238시간); 실험실 데이터셋 대비 높은 변동성과 분포 이동; 예비 실험에 사용.",
      },
      {
        name: "비가중 평균 재현율 (UAR)",
        type: "Metric",
        source_chunk_id: 12,
        description:
          "크로스-코퍼스 실험에서 타겟 테스트 셋(Tte)에 대해 보고되는 주요 평가 지표.",
      },
      {
        name: "최신 기술 대비 5% 향상",
        type: "Result",
        source_chunk_id: 14,
        description:
          "MSP-IMPROV -> IEMOCAP 크로스-코퍼스 설정에서 이전 최신 기술 대비 5% 유의미한 향상 보고.",
      },
      {
        name: "4% 멀티모달 향상",
        type: "Result",
        source_chunk_id: 16,
        description:
          "결정 수준 융합으로 텍스트 모달리티 추가 시 단일모달 크로스-코퍼스 SER 대비 ~4% 향상.",
      },
      {
        name: "ASR 트랜스크립트 사용 시 2% 감소",
        type: "Result",
        source_chunk_id: 16,
        description:
          "정답 텍스트 대신 ASR 생성 트랜스크립트 사용 시 멀티모달 정확도 ~2% 감소.",
      },
      {
        name: "적대적 학습 기반 멀티태스크 학습",
        type: "Baseline",
        source_chunk_id: 14,
        description:
          "도메인 적대적 목적(그래디언트 반전 / 미니맥스)을 사용하는 크로스-코퍼스 SER의 기존 일반적인 접근법.",
      },
      {
        name: "Wav2Vec2",
        type: "Baseline",
        source_chunk_id: 17,
        description:
          "사전 학습된 파형 기반 트랜스포머(논의/비교됨; 저자들은 SER에 Wav2Vec2보다 AST 선호).",
      },
      {
        name: "EMO-DB 언어 제한",
        type: "Limitation",
        source_chunk_id: 11,
        description:
          "EMO-DB는 독일어이며 트랜스크립트가 정제/중립적이어서 연구에서 텍스트 기반 감정 인식에 적합하지 않음.",
      },
      {
        name: "MSP-PODCAST 분산",
        type: "Limitation",
        source_chunk_id: 18,
        description:
          "MSP-PODCAST는 훈련과 테스트 간 훨씬 큰 분산을 보임; 자연스러운 조건이 크로스-코퍼스 전이를 어렵게 만듦.",
      },
      {
        name: "멀티모달 융합 일반화 과제",
        type: "Limitation",
        source_chunk_id: 4,
        description:
          "크로스-코퍼스 MER은 높은 특수성과 두 배의 입력 특성 크기로 인해 비자명한 융합 과제 제시.",
      },
    ],
    edges: [
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "크로스-코퍼스 음성 감정 인식 (SER / MER)",
        type: "addresses",
        source_chunk_id: 4,
        description: "SER에서 크로스-코퍼스 일반화를 개선하기 위해 설계된 프레임워크.",
        confidence: 0.95,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "IEMOCAP",
        type: "evaluates_on",
        source_chunk_id: 1,
        description: "IEMOCAP을 소스 또는 타겟으로 사용하여 크로스-코퍼스 실험에서 오디오 트랜스포머 평가.",
        confidence: 0.9,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "MSP-IMPROV",
        type: "evaluates_on",
        source_chunk_id: 1,
        description: "MSP-IMPROV를 소스 또는 타겟으로 사용하여 크로스-코퍼스 실험에서 오디오 트랜스포머 평가.",
        confidence: 0.9,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "EMO-DB",
        type: "evaluates_on",
        source_chunk_id: 1,
        description: "EMO-DB를 소스 또는 타겟으로 사용하여 크로스-코퍼스 실험에서 오디오 트랜스포머 평가.",
        confidence: 0.9,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "보조 태스크 / 보조 손실",
        type: "uses",
        source_chunk_id: 4,
        description: "멀티태스크 프레임워크에서 비지도 보조 태스크로 대조 학습 활용.",
        confidence: 0.95,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "데이터 증강 (오디오 및 텍스트)",
        type: "uses",
        source_chunk_id: 7,
        description: "오디오: 데이터를 5배 증가시키는 다섯 가지 증강 유형(torch-audiomentations); 텍스트: 토큰 컷오프 증강.",
        confidence: 0.93,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "결정 수준 융합",
        type: "uses",
        source_chunk_id: 10,
        description: "추론 시 오디오와 텍스트 브랜치의 로짓을 결정 수준에서 더하여 멀티모달 MER 달성.",
        confidence: 0.92,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "최신 기술 대비 5% 향상",
        type: "achieves",
        source_chunk_id: 14,
        description: "한 크로스-코퍼스 설정에서 이전 SOTA 대비 ~5% 유의미한 향상 보고.",
        confidence: 0.88,
      },
      {
        start: "최신 기술 대비 5% 향상",
        target: "비가중 평균 재현율 (UAR)",
        type: "measured_by",
        source_chunk_id: 12,
        description: "크로스-코퍼스 실험에서 보고된 향상은 UAR로 정량화됨.",
        confidence: 0.95,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "적대적 학습 기반 멀티태스크 학습",
        type: "outperforms",
        source_chunk_id: 14,
        description: "저자들은 비지도 멀티태스크 접근법이 적대적 학습 접근법을 능가한다고 보고.",
        confidence: 0.9,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "Wav2Vec2",
        type: "outperforms",
        source_chunk_id: 17,
        description: "저자들은 Wav2Vec2 대비 AST 선택을 검증하고 AST가 SER에서 유의미한 향상을 보였음을 확인.",
        confidence: 0.9,
      },
      {
        start: "결정 수준 융합",
        target: "4% 멀티모달 향상",
        type: "achieves",
        source_chunk_id: 16,
        description: "결정 수준 융합이 단일모달 크로스-코퍼스 SER 대비 약 4% 향상 달성.",
        confidence: 0.9,
      },
      {
        start: "결정 수준 융합",
        target: "ASR 트랜스크립트 사용 시 2% 감소",
        type: "achieves",
        source_chunk_id: 16,
        description: "테스트 시 ASR 트랜스크립트 사용 시 정답 트랜스크립트 대비 ~2% 하락 발생.",
        confidence: 0.88,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "MSP-PODCAST",
        type: "evaluates_on",
        source_chunk_id: 18,
        description: "IEMOCAP을 소스로, MSP-PODCAST를 테스트(자연스러운 데이터셋)로 사용하여 예비 실험 수행.",
        confidence: 0.9,
      },
      {
        start: "EMO-DB",
        target: "EMO-DB 언어 제한",
        type: "suffers_from",
        source_chunk_id: 11,
        description: "EMO-DB는 언어 및 정제된 트랜스크립트로 인해 텍스트 기반 실험에 사용 불가.",
        confidence: 0.95,
      },
      {
        start: "멀티태스크 트랜스포머 (크로스-코퍼스 / 멀티태스크 변형)",
        target: "멀티모달 융합 일반화 과제",
        type: "suffers_from",
        source_chunk_id: 4,
        description: "저자들은 크로스-코퍼스 MER이 비자명한 융합 과제와 높은 특수성을 도입한다고 언급.",
        confidence: 0.9,
      },
      {
        start: "보조 태스크 / 보조 손실",
        target: "데이터 증강 (오디오 및 텍스트)",
        type: "uses",
        source_chunk_id: 7,
        description: "증강 유형 분류기가 오디오 증강의 레이블을 사용.",
        confidence: 0.9,
      },
    ],
  },
];

export default function TestPaperGraphPageKr() {
  return (
    <div className="w-full h-screen">
      <PaperGraphVisualizationKr data={paperData} />
    </div>
  );
}
