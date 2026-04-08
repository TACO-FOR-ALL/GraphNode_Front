import type { Page, Route } from "@playwright/test";

type MockOptions = {
  authenticated?: boolean;
};

const NOW = "2026-04-08T09:00:00.000Z";

const mockMe = {
  userId: "user-1",
  profile: {
    id: "profile-1",
    email: "john@example.com",
    displayName: "John",
    avatarUrl: "",
    provider: "google",
    providerUserId: "google-user-1",
    createdAt: NOW,
    preferredLanguage: "ko",
  },
};

const mockNotes = [
  {
    id: "note-1",
    title: "테스트 노트",
    content: "# 테스트 노트\n\nE2E 내용입니다.",
    folderId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const mockFolders = [
  {
    id: "folder-1",
    name: "워크스페이스",
    parentId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const mockConversations = [
  {
    id: "thread-1",
    title: "첫 번째 대화",
    messages: [],
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  },
];

const mockGraphSnapshot = {
  nodes: [
    {
      id: 1,
      userId: "user-1",
      origId: "thread-1",
      clusterId: "cluster-1",
      clusterName: "Core",
      timestamp: NOW,
      numMessages: 5,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 2,
      userId: "user-1",
      origId: "thread-2",
      clusterId: "cluster-1",
      clusterName: "Core",
      timestamp: NOW,
      numMessages: 3,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  edges: [
    {
      id: "edge-1",
      userId: "user-1",
      source: 1,
      target: 2,
      weight: 0.8,
      type: "hard",
      intraCluster: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  clusters: [
    {
      id: "cluster-1",
      userId: "user-1",
      name: "Core",
      description: "핵심 클러스터",
      size: 2,
      themes: ["testing"],
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  subclusters: [],
  stats: {
    userId: "user-1",
    nodes: 2,
    edges: 1,
    clusters: 1,
    status: "UPDATED",
    updatedAt: NOW,
    generatedAt: NOW,
    metadata: {},
  },
};

const mockGraphSummary = {
  overview: {
    total_conversations: 2,
    time_span: "2026-04-01 ~ 2026-04-08",
    primary_interests: ["testing"],
    conversation_style: "분석형",
    most_active_period: "오후",
    summary_text: "테스트용 그래프 요약입니다.",
  },
  clusters: [
    {
      cluster_id: "cluster-1",
      name: "Core",
      size: 2,
      density: 0.8,
      centrality: 0.6,
      recency: "active",
      top_keywords: ["testing"],
      key_themes: ["E2E"],
      common_question_types: ["구현"],
      insight_text: "핵심 테스트 대화입니다.",
      notable_conversations: ["thread-1"],
    },
  ],
  patterns: [],
  connections: [],
  recommendations: [],
  generated_at: NOW,
  detail_level: "standard",
};

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockGraphNodeApi(
  page: Page,
  options: MockOptions = {},
) {
  const { authenticated = true } = options;

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;

    if (pathname === "/v1/me") {
      if (authenticated) {
        await fulfillJson(route, 200, mockMe);
      } else {
        await fulfillJson(route, 401, { message: "Unauthorized" });
      }
      return;
    }

    if (pathname === "/v1/me/preferred-language") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }

    if (pathname === "/v1/notes") {
      await fulfillJson(route, 200, mockNotes);
      return;
    }

    if (pathname === "/v1/folders") {
      await fulfillJson(route, 200, mockFolders);
      return;
    }

    if (pathname === "/v1/ai/conversations") {
      await fulfillJson(route, 200, {
        items: mockConversations,
        nextCursor: null,
      });
      return;
    }

    if (pathname === "/v1/graph/stats") {
      await fulfillJson(route, 200, mockGraphSnapshot.stats);
      return;
    }

    if (pathname === "/v1/graph/snapshot") {
      await fulfillJson(route, 200, mockGraphSnapshot);
      return;
    }

    if (pathname === "/v1/graph-ai/summary") {
      await fulfillJson(route, 200, mockGraphSummary);
      return;
    }

    await route.continue();
  });
}
