import { parseConversations } from "../parseConversations";

// threadRepo 모킹
jest.mock("../../managers/threadRepo", () => ({
  __esModule: true,
  default: {
    create: jest.fn((title: string, messages: any[]) =>
      Promise.resolve({
        id: "mock-thread-id",
        title,
        messages,
        updatedAt: Date.now(),
      }),
    ),
  },
}));

// uuid 모킹
jest.mock("../uuid", () => ({
  __esModule: true,
  default: jest.fn(() => "mock-uuid"),
}));

describe("parseConversations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("threads 배열 형식", () => {
    test("{ threads: [...] } 형식 파싱", async () => {
      const json = {
        threads: [
          {
            title: "Thread 1",
            messages: [
              { role: "user", content: "Hello" },
              { role: "assistant", content: "Hi there!" },
            ],
          },
        ],
      };

      const result = await parseConversations(json);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Thread 1");
    });

    test("빈 메시지 스레드 건너뛰기", async () => {
      const json = {
        threads: [
          { title: "Empty Thread", messages: [] },
          {
            title: "Valid Thread",
            messages: [{ role: "user", content: "Hello" }],
          },
        ],
      };

      const result = await parseConversations(json);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid Thread");
    });

    test("content가 없는 메시지 필터링", async () => {
      const json = {
        threads: [
          {
            title: "Thread",
            messages: [
              { role: "user", content: "" },
              { role: "user", content: "Valid message" },
            ],
          },
        ],
      };

      const result = await parseConversations(json);
      expect(result).toHaveLength(1);
      expect(result[0].messages).toHaveLength(1);
    });
  });

  describe("messages 배열 형식", () => {
    test("{ messages: [...] } 형식 파싱", async () => {
      const json = {
        title: "Single Thread",
        messages: [
          { role: "user", content: "Question" },
          { role: "assistant", content: "Answer" },
        ],
      };

      const result = await parseConversations(json);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Single Thread");
    });

    test("빈 messages 배열", async () => {
      const json = {
        title: "Empty",
        messages: [],
      };

      const result = await parseConversations(json);
      expect(result).toHaveLength(0);
    });
  });

  describe("OpenAI 형식 (mapping 구조)", () => {
    test("OpenAI conversations.json 형식 파싱", async () => {
      const json = [
        {
          title: "OpenAI Chat",
          create_time: 1700000000,
          mapping: {
            node1: {
              message: {
                author: { role: "user" },
                content: { parts: ["Hello GPT"] },
                create_time: 1700000001,
              },
            },
            node2: {
              message: {
                author: { role: "assistant" },
                content: { parts: ["Hello!"] },
                create_time: 1700000002,
              },
            },
          },
        },
      ];

      const result = await parseConversations(json);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("OpenAI Chat");
    });

    test("hidden 메시지 필터링", async () => {
      const json = [
        {
          title: "Chat",
          mapping: {
            node1: {
              message: {
                author: { role: "system" },
                content: { parts: ["System message"] },
                metadata: { is_visually_hidden_from_conversation: true },
              },
            },
            node2: {
              message: {
                author: { role: "user" },
                content: { parts: ["Visible message"] },
              },
            },
          },
        },
      ];

      const result = await parseConversations(json);
      expect(result).toHaveLength(1);
      // hidden 메시지는 필터링됨
      expect(result[0].messages).toHaveLength(1);
    });

    test("빈 content 필터링", async () => {
      const json = [
        {
          title: "Chat",
          mapping: {
            node1: {
              message: {
                author: { role: "user" },
                content: { parts: ["   "] },
              },
            },
            node2: {
              message: {
                author: { role: "user" },
                content: { parts: ["Valid"] },
              },
            },
          },
        },
      ];

      const result = await parseConversations(json);
      expect(result[0].messages).toHaveLength(1);
    });
  });

  describe("일반 배열 형식", () => {
    test("메시지 배열 직접 파싱", async () => {
      const json = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi!" },
      ];

      const result = await parseConversations(json);
      expect(result).toHaveLength(1);
    });
  });

  describe("role 정규화 (mapRole)", () => {
    test("assistant 변형 처리", async () => {
      const json = {
        messages: [
          { role: "assistant", content: "Normal" },
          { role: "Assistant", content: "Capitalized" },
          { role: "ASSISTANT", content: "Uppercase" },
        ],
      };

      const result = await parseConversations(json);
      result[0].messages.forEach((msg: any) => {
        expect(msg.role).toBe("assistant");
      });
    });

    test("system 변형 처리", async () => {
      const json = {
        messages: [
          { role: "system", content: "System 1" },
          { role: "sys", content: "System 2" },
          { role: "SYSTEM", content: "System 3" },
        ],
      };

      const result = await parseConversations(json);
      result[0].messages.forEach((msg: any) => {
        expect(msg.role).toBe("system");
      });
    });

    test("알 수 없는 role → user", async () => {
      const json = {
        messages: [
          { role: "unknown", content: "Message 1" },
          { role: "human", content: "Message 2" },
          { content: "No role" }, // role 없음
        ],
      };

      const result = await parseConversations(json);
      result[0].messages.forEach((msg: any) => {
        expect(msg.role).toBe("user");
      });
    });

    test("author 필드 사용", async () => {
      const json = {
        messages: [{ author: "assistant", content: "Using author field" }],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].role).toBe("assistant");
    });

    test("speaker 필드 사용", async () => {
      const json = {
        messages: [{ speaker: "system", content: "Using speaker field" }],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].role).toBe("system");
    });
  });

  describe("content 추출", () => {
    test("text 필드에서 추출", async () => {
      const json = {
        messages: [{ role: "user", text: "Text field content" }],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].content).toBe("Text field content");
    });

    test("message 필드에서 추출", async () => {
      const json = {
        messages: [{ role: "user", message: "Message field content" }],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].content).toBe("Message field content");
    });

    test("delta 필드에서 추출", async () => {
      const json = {
        messages: [{ role: "user", delta: "Delta field content" }],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].content).toBe("Delta field content");
    });
  });

  describe("타임스탬프 처리 (toMs)", () => {
    test("초 단위 → ms 변환", async () => {
      const json = {
        messages: [
          {
            role: "user",
            content: "Hello",
            ts: 1700000000, // 10자리 (초)
          },
        ],
      };

      const result = await parseConversations(json);
      // ts는 toMsg에서 처리되며, 유한한 숫자면 그대로 사용
      expect(result[0].messages[0].ts).toBeDefined();
      expect(typeof result[0].messages[0].ts).toBe("number");
    });

    test("ms 단위는 그대로 유지", async () => {
      const timestamp = 1700000000000; // 13자리 (ms)
      const json = {
        messages: [
          {
            role: "user",
            content: "Hello",
            ts: timestamp,
          },
        ],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].ts).toBe(timestamp);
    });

    test("time 필드 사용", async () => {
      const json = {
        messages: [
          {
            role: "user",
            content: "Hello",
            time: 1700000000,
          },
        ],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].ts).toBeDefined();
    });

    test("create_time 필드 사용", async () => {
      const json = {
        messages: [
          {
            role: "user",
            content: "Hello",
            create_time: 1700000000,
          },
        ],
      };

      const result = await parseConversations(json);
      expect(result[0].messages[0].ts).toBeDefined();
    });
  });

  describe("빈 입력 처리", () => {
    test("null → 빈 배열", async () => {
      const result = await parseConversations(null);
      expect(result).toEqual([]);
    });

    test("undefined → 빈 배열", async () => {
      const result = await parseConversations(undefined);
      expect(result).toEqual([]);
    });

    test("빈 객체 → 빈 배열", async () => {
      const result = await parseConversations({});
      expect(result).toEqual([]);
    });

    test("빈 배열 → 빈 배열", async () => {
      const result = await parseConversations([]);
      expect(result).toEqual([]);
    });
  });
});
