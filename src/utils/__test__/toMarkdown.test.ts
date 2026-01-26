import { toMarkdownFromUnknown } from "../toMarkdown";

describe("toMarkdownFromUnknown", () => {
  describe("기본 타입 처리", () => {
    test("null → 빈 문자열", () => {
      expect(toMarkdownFromUnknown(null)).toBe("");
    });

    test("undefined → 빈 문자열", () => {
      expect(toMarkdownFromUnknown(undefined)).toBe("");
    });

    test("문자열 → 그대로 반환", () => {
      expect(toMarkdownFromUnknown("Hello World")).toBe("Hello World");
    });

    test("숫자 → 문자열 변환", () => {
      expect(toMarkdownFromUnknown(42)).toBe("42");
      expect(toMarkdownFromUnknown(3.14)).toBe("3.14");
    });

    test("boolean → 문자열 변환", () => {
      expect(toMarkdownFromUnknown(true)).toBe("true");
      expect(toMarkdownFromUnknown(false)).toBe("false");
    });
  });

  describe("배열 처리", () => {
    test("문자열 배열 → 줄바꿈으로 join", () => {
      expect(toMarkdownFromUnknown(["Hello", "World"])).toBe("Hello\nWorld");
    });

    test("빈 값 필터링", () => {
      expect(toMarkdownFromUnknown(["Hello", "", null, "World"])).toBe(
        "Hello\nWorld",
      );
    });

    test("중첩 배열", () => {
      expect(toMarkdownFromUnknown([["Nested"], "Flat"])).toBe("Nested\nFlat");
    });
  });

  describe("parts 구조 처리", () => {
    test("{ parts: [...] } 구조", () => {
      expect(toMarkdownFromUnknown({ parts: ["Part 1", "Part 2"] })).toBe(
        "Part 1\nPart 2",
      );
    });

    test("{ parts: [{ text: '...' }] } 구조", () => {
      expect(
        toMarkdownFromUnknown({
          parts: [{ text: "Hello" }, { text: "World" }],
        }),
      ).toBe("Hello\nWorld");
    });
  });

  describe("content 구조 처리", () => {
    test("{ content: [...] } 구조", () => {
      expect(toMarkdownFromUnknown({ content: ["Line 1", "Line 2"] })).toBe(
        "Line 1\nLine 2",
      );
    });

    test("{ content: { parts: [...] } } 중첩 구조", () => {
      expect(
        toMarkdownFromUnknown({
          content: { parts: ["Nested Part"] },
        }),
      ).toBe("Nested Part");
    });
  });

  describe("children 구조 처리", () => {
    test("heading 타입", () => {
      expect(
        toMarkdownFromUnknown({
          type: "heading",
          depth: 2,
          children: [{ text: "Title" }],
        }),
      ).toBe("## Title");
    });

    test("heading depth 1", () => {
      expect(
        toMarkdownFromUnknown({
          type: "heading",
          depth: 1,
          children: [{ text: "Main Title" }],
        }),
      ).toBe("# Main Title");
    });

    test("paragraph 타입", () => {
      expect(
        toMarkdownFromUnknown({
          type: "paragraph",
          children: [{ text: "Paragraph text" }],
        }),
      ).toBe("Paragraph text");
    });

    test("listItem 타입", () => {
      expect(
        toMarkdownFromUnknown({
          type: "listItem",
          children: [{ text: "Item text" }],
        }),
      ).toBe("- Item text");
    });

    test("알 수 없는 타입의 children", () => {
      expect(
        toMarkdownFromUnknown({
          type: "unknown",
          children: [{ text: "Text" }],
        }),
      ).toBe("Text");
    });
  });

  describe("코드 블록 처리", () => {
    test("{ code: '...' } 구조", () => {
      expect(
        toMarkdownFromUnknown({
          code: 'console.log("hello")',
        }),
      ).toBe('```\nconsole.log("hello")\n```');
    });

    test("{ code: '...', lang: '...' } 언어 지정", () => {
      expect(
        toMarkdownFromUnknown({
          code: 'console.log("hello")',
          lang: "javascript",
        }),
      ).toBe('```javascript\nconsole.log("hello")\n```');
    });

    test("{ type: 'code', text: '...' } 구조", () => {
      expect(
        toMarkdownFromUnknown({
          type: "code",
          text: "print('hello')",
          language: "python",
        }),
      ).toBe("```python\nprint('hello')\n```");
    });

    test("{ content_type: 'code', text: '...' } 구조", () => {
      expect(
        toMarkdownFromUnknown({
          content_type: "code",
          text: "fn main() {}",
          lang: "rust",
        }),
      ).toBe("```rust\nfn main() {}\n```");
    });
  });

  describe("인라인 코드 처리", () => {
    test("{ type: 'inlineCode', value: '...' }", () => {
      expect(
        toMarkdownFromUnknown({
          type: "inlineCode",
          value: "const x = 1",
        }),
      ).toBe("`const x = 1`");
    });
  });

  describe("텍스트 필드 우선순위", () => {
    test("text 필드", () => {
      expect(toMarkdownFromUnknown({ text: "Text content" })).toBe(
        "Text content",
      );
    });

    test("value 필드", () => {
      expect(toMarkdownFromUnknown({ value: "Value content" })).toBe(
        "Value content",
      );
    });

    test("literal 필드", () => {
      expect(toMarkdownFromUnknown({ literal: "Literal content" })).toBe(
        "Literal content",
      );
    });

    test("label 필드", () => {
      expect(toMarkdownFromUnknown({ label: "Label content" })).toBe(
        "Label content",
      );
    });

    test("data.text 필드", () => {
      expect(
        toMarkdownFromUnknown({
          data: { text: "Data text" },
        }),
      ).toBe("Data text");
    });

    test("data.value 필드", () => {
      expect(
        toMarkdownFromUnknown({
          data: { value: "Data value" },
        }),
      ).toBe("Data value");
    });
  });

  describe("React 컴포넌트 구조", () => {
    test("{ props: { children: '...' } }", () => {
      expect(
        toMarkdownFromUnknown({
          props: { children: "Child content" },
        }),
      ).toBe("Child content");
    });

    test("중첩된 props.children", () => {
      expect(
        toMarkdownFromUnknown({
          props: {
            children: {
              props: { children: "Nested child" },
            },
          },
        }),
      ).toBe("Nested child");
    });
  });

  describe("일반 객체 fallback", () => {
    test("문자열 값들을 공백으로 join", () => {
      const result = toMarkdownFromUnknown({
        field1: "Hello",
        field2: "World",
      });
      expect(result).toContain("Hello");
      expect(result).toContain("World");
    });

    test("배열 필드 처리", () => {
      const result = toMarkdownFromUnknown({
        items: ["Item 1", "Item 2"],
      });
      expect(result).toContain("Item 1");
      expect(result).toContain("Item 2");
    });

    test("빈 객체 → 빈 문자열", () => {
      expect(toMarkdownFromUnknown({})).toBe("");
    });

    test("숫자만 있는 객체", () => {
      expect(toMarkdownFromUnknown({ count: 42 })).toBe("");
    });
  });

  describe("복합 시나리오", () => {
    test("OpenAI 응답 형식", () => {
      const openAIResponse = {
        content: [
          { type: "text", text: "Hello!" },
          {
            type: "code",
            text: "console.log('hi')",
            language: "javascript",
          },
        ],
      };

      const result = toMarkdownFromUnknown(openAIResponse);
      expect(result).toContain("Hello!");
      expect(result).toContain("```javascript");
    });

    test("Gemini 응답 형식", () => {
      const geminiResponse = {
        parts: [
          { text: "Part 1" },
          { text: "Part 2" },
        ],
      };

      expect(toMarkdownFromUnknown(geminiResponse)).toBe("Part 1\nPart 2");
    });
  });
});
