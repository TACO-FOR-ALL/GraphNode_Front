/**
 * Dummy GraphSummary Data
 *
 * Based on the actual graph summary document provided.
 * This data mirrors the output from GraphNode_AI/Ky/src/insights module.
 *
 * Location: src/constants/DUMMY_GRAPH_SUMMARY.ts
 * Usage: Import in development/testing before backend integration
 */

import type { GraphSummary } from "../types/GraphSummary";

export const DUMMY_GRAPH_SUMMARY: GraphSummary = {
  overview: {
    total_conversations: 376,
    time_span: "N/A",
    primary_interests: [
      "소프트웨어 및 머신러닝",
      "언어 및 작문",
      "수학 및 알고리즘",
      "정치 및 역사",
      "마케팅 및 분석",
    ],
    conversation_style: "기술 심화형",
    most_active_period: "N/A",
    summary_text:
      "대부분의 대화는 소프트웨어 및 머신러닝(376건 중 234건)에 집중되어 있으며, 언어 및 작문, 수학 및 알고리즘에 대한 후속 관심도 상당합니다. 정치 및 역사, 마케팅 및 분석 분야에서도 작지만 꾸준한 참여가 관찰됩니다. 사용자는 직접적인 코딩, 모델 개발, 알고리즘 추론과 같은 기술적 심층 분석을 선호하며, 동시에 언어적 정교화와 맥락 분석도 요청합니다. 이는 기초 알고리즘에서 응용 머신러닝 및 커뮤니케이션 기술로 나아가는 학습 여정을 반영하며, 종종 기술적 작업을 정책이나 비즈니스 맥락과 연결합니다.",
  },

  clusters: [
    {
      cluster_id: "cluster_1",
      name: "소프트웨어 및 머신러닝",
      size: 234,
      density: 0.03,
      centrality: 0.85,
      recency: "active",
      top_keywords: [
        "반복 루프(iteration loop)",
        "실시간 자산 포인터",
        "현재 대화 상대 확인",
        "zshrc 파일 명령",
        "csv 읽기 함수",
      ],
      key_themes: [
        "머신러닝 모델 개발",
        "소프트웨어 디버깅",
        "환경 설정",
        "교차 인코더 재순위화",
        "어텐션 분석",
      ],
      common_question_types: ["디버깅", "구현", "최적화", "코드 리뷰"],
      insight_text:
        "응용 머신러닝 및 소프트웨어 공학에 집중합니다. 저수준 환경 설정 및 디버깅 작업과 고수준 모델 작업(교차 인코더 재순위화, 평가, 어텐션 분석) 사이를 반복적으로 오갑니다. 도구 활용 단계에서 시작하여 모델 중심의 심화 문제로 발전하는 학습 패턴을 보입니다.",
      notable_conversations: [
        "conv_ml_001",
        "conv_ml_015",
        "conv_ml_089",
        "conv_ml_142",
      ],
    },
    {
      cluster_id: "cluster_2",
      name: "수학 및 알고리즘",
      size: 42,
      density: 0.19,
      centrality: 0.72,
      recency: "active",
      top_keywords: [
        "조합 점수 규칙",
        "극한 계산(limit)",
        "다변수 설정 최적화",
        "행렬식",
        "수렴 증명",
      ],
      key_themes: [
        "기초 계산 연습",
        "응용 알고리즘 사고",
        "점수 규칙 설계",
        "분포 모델링",
      ],
      common_question_types: ["증명", "계산", "개념 설명", "응용"],
      insight_text:
        "기초적인 계산 연습(극한, 행렬식, 조합론)과 응용 알고리즘 사고(점수 규칙 설계, 분포 모델링)를 병행합니다. 기호 유도부터 수치 시뮬레이션까지, 증명 기반의 이해와 실제 구현을 모두 강조하는 모습을 보입니다.",
      notable_conversations: [
        "conv_math_003",
        "conv_math_021",
        "conv_math_038",
      ],
    },
    {
      cluster_id: "cluster_3",
      name: "언어 및 작문",
      size: 49,
      density: 0.01,
      centrality: 0.45,
      recency: "active",
      top_keywords: [
        "병원 맥락",
        "지사/분점 표현",
        "회사 및 기관 명칭",
        "강남분원",
        "서울 중앙병원",
      ],
      key_themes: [
        "한국어-영어 번역",
        "의료 어휘",
        "비즈니스 커뮤니케이션",
        "격식 표현",
      ],
      common_question_types: ["번역", "교정", "어휘 선택", "맥락 파악"],
      insight_text:
        "한국어 모국어 사용자로 추정되며, 의료(치과 등) 및 비즈니스 상황에서 정확하고 맥락에 맞는 번역과 기술 어휘를 탐구합니다. 단순 어휘 습득을 넘어 전문 영역에 적합한 격식 있고 자연스러운 표현을 추구합니다.",
      notable_conversations: [
        "conv_lang_007",
        "conv_lang_023",
        "conv_lang_041",
      ],
    },
    {
      cluster_id: "cluster_4",
      name: "정치 및 역사",
      size: 38,
      density: 0.05,
      centrality: 0.38,
      recency: "dormant",
      top_keywords: [
        "중국 정치 학자",
        "중국 내 민족주의 정서",
        "중국 시위 비교",
        "정책적 함의",
        "한중 관계",
      ],
      key_themes: [
        "중국 민족주의",
        "동아시아 정치",
        "역사 비교 분석",
        "학술 연구",
      ],
      common_question_types: ["분석", "비교", "문장 교정", "자료 요청"],
      insight_text:
        "언어적 도움과 실질적인 정치/역사적 탐구를 결합합니다. 중국과 한국을 중심으로 문장 수정에서 시작하여 심층적인 비교 및 기록 분석으로 나아가는 양상을 보입니다.",
      notable_conversations: [
        "conv_pol_002",
        "conv_pol_019",
        "conv_pol_028",
        "conv_pol_035",
      ],
    },
    {
      cluster_id: "cluster_5",
      name: "마케팅 및 분석",
      size: 13,
      density: 0.35,
      centrality: 0.25,
      recency: "new",
      top_keywords: [
        "광고 효율성",
        "플랫폼별 정액제 광고",
        "참여도 기반 가치 해석",
        "예측 모델",
        "ROI 분석",
      ],
      key_themes: [
        "광고 성과 측정",
        "플랫폼 비교",
        "가격 민감도 분석",
        "마케팅 전략",
      ],
      common_question_types: ["분석", "전략 제안", "데이터 해석", "모델링"],
      insight_text:
        "광고 성과를 수량화하고 플랫폼별 가치를 비교하는 데 큰 관심이 있습니다. 단순한 개념 설명을 넘어 가격 민감도 분석 및 플랫폼별 실행 전략으로 확장되는 경향이 있습니다.",
      notable_conversations: ["conv_mkt_001", "conv_mkt_008", "conv_mkt_012"],
    },
  ],

  patterns: [
    {
      pattern_type: "repetition",
      description:
        "정치 및 역사 클러스터에서 중국 민족주의 주제가 반복적으로 다뤄집니다. 특히 매우 유사한 대화 쌍이 많아 거의 중복된 논의가 발생하고 있음을 나타냅니다.",
      evidence: [
        "conv_pol_002",
        "conv_pol_005",
        "conv_pol_019",
        "conv_pol_022",
        "conv_pol_028",
        "conv_pol_031",
      ],
      significance: "high",
    },
    {
      pattern_type: "repetition",
      description:
        "소프트웨어 및 머신러닝 클러스터에는 수많은 유사 대화와 연결된 '허브' 대화들이 존재합니다. 이는 전형적인 트러블슈팅 스레드나 기술 질문 템플릿이 반복 사용되고 있음을 의미합니다.",
      evidence: [
        "conv_ml_001",
        "conv_ml_015",
        "conv_ml_032",
        "conv_ml_067",
        "conv_ml_089",
        "conv_ml_112",
        "conv_ml_145",
        "conv_ml_178",
      ],
      significance: "high",
    },
    {
      pattern_type: "bridge",
      description:
        "소프트웨어 및 머신러닝과 수학 및 알고리즘 사이에 매우 강력한 구조적 연결(강도 1.00)이 존재합니다. 이는 응용 머신러닝 주제와 그 기반이 되는 수학적 개념이 실질적으로 긴밀하게 연결되어 있음을 보여줍니다.",
      evidence: [
        "conv_ml_042",
        "conv_math_015",
        "conv_ml_098",
        "conv_math_029",
      ],
      significance: "high",
    },
    {
      pattern_type: "progression",
      description:
        "소프트웨어 클러스터 내에서 도구 활용 → 디버깅 → 모델 최적화 → 고급 어텐션 분석으로 이어지는 학습 진행이 관찰됩니다.",
      evidence: [
        "conv_ml_003",
        "conv_ml_025",
        "conv_ml_078",
        "conv_ml_156",
        "conv_ml_201",
      ],
      significance: "medium",
    },
    {
      pattern_type: "gap",
      description:
        "마케팅 클러스터의 'A/B 테스트 설계' 주제가 1회 탐색 후 후속 논의가 없습니다. 실무 적용을 위해 복습이 필요할 수 있습니다.",
      evidence: ["conv_mkt_006"],
      significance: "low",
    },
  ],

  connections: [
    {
      source_cluster: "소프트웨어 및 머신러닝",
      target_cluster: "수학 및 알고리즘",
      connection_strength: 1.0,
      bridge_keywords: [
        "최적화",
        "수렴",
        "행렬 연산",
        "확률 분포",
        "그래디언트",
      ],
      description:
        "응용 머신러닝 기법과 그 기반이 되는 수학적 원리 사이의 매우 강한 연결",
    },
    {
      source_cluster: "언어 및 작문",
      target_cluster: "정치 및 역사",
      connection_strength: 0.45,
      bridge_keywords: ["문장 교정", "학술 작문", "번역"],
      description: "정치/역사 주제에 대한 글쓰기 및 번역 작업을 통한 연결",
    },
    {
      source_cluster: "소프트웨어 및 머신러닝",
      target_cluster: "마케팅 및 분석",
      connection_strength: 0.32,
      bridge_keywords: ["예측 모델", "데이터 분석", "파이썬"],
      description: "마케팅 데이터 분석을 위한 ML 기법 활용",
    },
    {
      source_cluster: "수학 및 알고리즘",
      target_cluster: "마케팅 및 분석",
      connection_strength: 0.28,
      bridge_keywords: ["통계", "최적화", "모델링"],
      description: "마케팅 분석에 활용되는 통계적/수학적 방법론",
    },
  ],

  recommendations: [
    {
      type: "consolidate",
      title: "'반복 루프' 및 ML 구현 이슈 표준 가이드 제작",
      description:
        "소프트웨어 클러스터에서 빈번하게 발생하는 'iteration loop' 관련 디버깅 템플릿을 통합하여 증상, 원인, 코드 패턴 및 해결책을 담은 표준 가이드를 구축하십시오.",
      related_nodes: [
        "conv_ml_001",
        "conv_ml_032",
        "conv_ml_067",
        "conv_ml_112",
      ],
      priority: "high",
    },
    {
      type: "consolidate",
      title: "중국 민족주의 정치 스레드 종합 입문서 제작",
      description:
        "거의 중복되는 정치/역사 대화들을 핵심 논거, 주요 학자, 흔한 오해를 정리한 하나의 완성된 입문서로 병합하여 반복되는 논의를 줄이십시오.",
      related_nodes: ["conv_pol_002", "conv_pol_019", "conv_pol_028"],
      priority: "medium",
    },
    {
      type: "connect",
      title: "머신러닝 실무와 수학적 기초를 잇는 큐레이션 맵 제작",
      description:
        "소프트웨어와 수학 클러스터 사이의 강력한 연결고리를 활용하여, 공통 ML 기법(최적화, 정규화 등)을 그 기반이 되는 수학적 원리(선형 대수, 수렴 증명 등)와 매핑한 자료를 만드십시오.",
      related_nodes: [
        "conv_ml_042",
        "conv_math_015",
        "conv_ml_098",
        "conv_math_029",
      ],
      priority: "high",
    },
    {
      type: "explore",
      title: "도메인 교차 프로젝트: NLP + 정치 담론 분석",
      description:
        "언어/작문, 정치/역사, 머신러닝을 결합한 실습 프로젝트(예: 민족주의 수사법 분류기 구축 또는 학술적 합성을 돕는 도구 제작)를 통해 여러 분야의 전문성을 동시에 심화하십시오.",
      related_nodes: ["conv_ml_156", "conv_pol_035", "conv_lang_041"],
      priority: "medium",
    },
    {
      type: "review",
      title: "A/B 테스트 설계 기법 복습",
      description:
        "마케팅 클러스터에서 1회만 탐색된 A/B 테스트 설계 주제를 복습하여 실무 적용 준비를 갖추십시오.",
      related_nodes: ["conv_mkt_006"],
      priority: "low",
    },
  ],

  generated_at: "2025-02-04T12:00:00Z",
  detail_level: "standard",
};

/**
 * Alternative minimal dummy data for testing edge cases
 */
export const DUMMY_GRAPH_SUMMARY_MINIMAL: GraphSummary = {
  overview: {
    total_conversations: 15,
    time_span: "2025-01-01 ~ 2025-01-31",
    primary_interests: ["프로그래밍", "데이터 분석"],
    conversation_style: "탐색형",
    most_active_period: "평일 오후",
    summary_text:
      "짧은 기간 동안 프로그래밍과 데이터 분석에 집중한 탐색적 대화들입니다.",
  },
  clusters: [
    {
      cluster_id: "cluster_1",
      name: "프로그래밍 기초",
      size: 10,
      density: 0.25,
      centrality: 0.6,
      recency: "active",
      top_keywords: ["파이썬", "변수", "함수"],
      key_themes: ["기초 문법", "디버깅"],
      common_question_types: ["개념 설명", "코드 리뷰"],
      insight_text: "프로그래밍 기초를 학습하는 초기 단계입니다.",
      notable_conversations: ["conv_001"],
    },
    {
      cluster_id: "cluster_2",
      name: "데이터 분석",
      size: 5,
      density: 0.4,
      centrality: 0.4,
      recency: "new",
      top_keywords: ["pandas", "시각화"],
      key_themes: ["데이터 처리"],
      common_question_types: ["구현"],
      insight_text: "데이터 분석 도구를 탐색하기 시작했습니다.",
      notable_conversations: ["conv_011"],
    },
  ],
  patterns: [
    {
      pattern_type: "progression",
      description: "기초 문법에서 데이터 처리로 자연스럽게 발전",
      evidence: ["conv_001", "conv_011"],
      significance: "medium",
    },
  ],
  connections: [
    {
      source_cluster: "프로그래밍 기초",
      target_cluster: "데이터 분석",
      connection_strength: 0.65,
      bridge_keywords: ["파이썬"],
      description: "파이썬을 통한 연결",
    },
  ],
  recommendations: [
    {
      type: "explore",
      title: "머신러닝 입문 탐색",
      description: "데이터 분석 경험을 바탕으로 머신러닝 기초를 탐색해보세요.",
      related_nodes: ["conv_011"],
      priority: "medium",
    },
  ],
  generated_at: "2025-02-04T12:00:00Z",
  detail_level: "brief",
};

export default DUMMY_GRAPH_SUMMARY;
