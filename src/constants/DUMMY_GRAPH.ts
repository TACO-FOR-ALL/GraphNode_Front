export const DUMMY_GRAPH = {
  nodes: [
    // 중심 노드
    { id: "Me" },

    // 개발 영역
    { id: "Frontend" },
    { id: "Backend" },
    { id: "Database" },
    { id: "DevOps" },
    { id: "React" },
    { id: "Next.js" },
    { id: "Django" },
    { id: "PostgreSQL" },
    { id: "Docker" },
    { id: "AWS" },
    { id: "GitHub Actions" },
    { id: "Side Project A" },
    { id: "AI Service" },

    // 중문과 영역
    { id: "古代文学" },
    { id: "现代文学" },
    { id: "鲁迅" },
    { id: "老舍" },
    { id: "莫言" },
    { id: "语法学" },
    { id: "修辞学" },
    { id: "比较文学" },
    { id: "翻译理论" },
    { id: "社会语言学" },
    { id: "文化研究" },
    { id: "古籍研究" },
    { id: "诗经" },
    { id: "楚辞" },
    { id: "文言文" },
    { id: "白话文" },

    // 완전히 분리된 군집 (중문과 연구 관련)
    { id: "Disconnected Cluster: 文学与社会" },
    { id: "Disconnected Cluster: 翻译实验" },
  ],

  links: [
    // 나(Me)와 개발 관련 연결
    { source: "Me", target: "Frontend" },
    { source: "Me", target: "Backend" },
    { source: "Me", target: "DevOps" },
    { source: "Me", target: "Side Project A" },
    { source: "Me", target: "AI Service" },

    // 개발 기술 연결
    { source: "Frontend", target: "React" },
    { source: "Frontend", target: "Next.js" },
    { source: "Backend", target: "Django" },
    { source: "Backend", target: "Database" },
    { source: "Database", target: "PostgreSQL" },
    { source: "DevOps", target: "Docker" },
    { source: "DevOps", target: "AWS" },
    { source: "DevOps", target: "GitHub Actions" },
    { source: "AI Service", target: "Next.js" },
    { source: "AI Service", target: "Django" },

    // 중문과 영역 내부 연결
    { source: "古代文学", target: "诗经" },
    { source: "古代文学", target: "楚辞" },
    { source: "古代文学", target: "文言文" },
    { source: "现代文学", target: "白话文" },
    { source: "现代文学", target: "鲁迅" },
    { source: "现代文学", target: "老舍" },
    { source: "现代文学", target: "莫言" },
    { source: "比较文学", target: "文化研究" },
    { source: "比较文学", target: "社会语言学" },
    { source: "翻译理论", target: "比较文学" },
    { source: "翻译理论", target: "语法学" },
    { source: "翻译理论", target: "修辞学" },
    { source: "古籍研究", target: "古代文学" },

    // 중문과 군집 내부 연결
    { source: "Disconnected Cluster: 文学与社会", target: "比较文学" },
    { source: "Disconnected Cluster: 翻译实验", target: "翻译理论" },

    // 개발 ↔ 중문과 교차점 (AI 연구, 번역)
    { source: "AI Service", target: "翻译理论" },
    { source: "AI Service", target: "比较文学" },
    { source: "AI Service", target: "文化研究" },
  ],
};
