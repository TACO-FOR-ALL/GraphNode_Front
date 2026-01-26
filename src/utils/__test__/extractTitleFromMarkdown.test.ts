import extractTitleFromMarkdown, {
  seperateTitleAndContentFromMarkdown,
} from "../extractTitleFromMarkdown";

describe("extractTitleFromMarkdown", () => {
  describe("기본 동작", () => {
    test("일반 텍스트에서 첫 줄을 제목으로 추출", () => {
      expect(extractTitleFromMarkdown("Hello World")).toBe("Hello World");
    });

    test("여러 줄에서 첫 줄만 추출", () => {
      expect(extractTitleFromMarkdown("First Line\nSecond Line")).toBe(
        "First Line",
      );
    });
  });

  describe("마크다운 헤더 처리", () => {
    test("# 헤더 제거", () => {
      expect(extractTitleFromMarkdown("# Hello")).toBe("Hello");
    });

    test("## 헤더 제거", () => {
      expect(extractTitleFromMarkdown("## Hello")).toBe("Hello");
    });

    test("### 헤더 제거", () => {
      expect(extractTitleFromMarkdown("### Hello")).toBe("Hello");
    });

    test("#### 헤더 제거", () => {
      expect(extractTitleFromMarkdown("#### Hello")).toBe("Hello");
    });

    test("헤더와 텍스트 사이 공백 처리", () => {
      expect(extractTitleFromMarkdown("#    Hello   ")).toBe("Hello");
    });

    test("헤더 없이 # 문자가 있는 경우", () => {
      expect(extractTitleFromMarkdown("Hello # World")).toBe("Hello # World");
    });
  });

  describe("엣지 케이스", () => {
    test("빈 문자열 → Untitled", () => {
      expect(extractTitleFromMarkdown("")).toBe("Untitled");
    });

    test("null → Untitled", () => {
      expect(extractTitleFromMarkdown(null as unknown as string)).toBe(
        "Untitled",
      );
    });

    test("undefined → Untitled", () => {
      expect(extractTitleFromMarkdown(undefined as unknown as string)).toBe(
        "Untitled",
      );
    });

    test("공백만 있는 경우 → Untitled", () => {
      expect(extractTitleFromMarkdown("   ")).toBe("Untitled");
    });

    test("줄바꿈만 있는 경우 → Untitled", () => {
      expect(extractTitleFromMarkdown("\n\n\n")).toBe("Untitled");
    });

    test("# 만 있는 경우 → Untitled", () => {
      expect(extractTitleFromMarkdown("#")).toBe("Untitled");
    });

    test("## 만 있는 경우 → Untitled", () => {
      expect(extractTitleFromMarkdown("##   ")).toBe("Untitled");
    });

    test("앞에 공백이 있는 헤더", () => {
      expect(extractTitleFromMarkdown("   # Hello")).toBe("Hello");
    });
  });

  describe("특수 문자 처리", () => {
    test("이모지가 포함된 제목", () => {
      expect(extractTitleFromMarkdown("# 🎉 Welcome!")).toBe("🎉 Welcome!");
    });

    test("특수 문자가 포함된 제목", () => {
      expect(extractTitleFromMarkdown("# Hello <World> & Friends")).toBe(
        "Hello <World> & Friends",
      );
    });

    test("한글 제목", () => {
      expect(extractTitleFromMarkdown("# 안녕하세요")).toBe("안녕하세요");
    });
  });
});

describe("seperateTitleAndContentFromMarkdown", () => {
  describe("기본 동작", () => {
    test("제목과 컨텐츠 분리", () => {
      const result = seperateTitleAndContentFromMarkdown(
        "# Title\nContent here",
      );
      expect(result.title).toBe("Title");
      expect(result.content).toContain("Content");
    });

    test("헤더 없는 경우", () => {
      const result = seperateTitleAndContentFromMarkdown(
        "First Line\nSecond Line",
      );
      expect(result.title).toBe("First Line");
    });
  });

  describe("엣지 케이스", () => {
    test("빈 문자열", () => {
      const result = seperateTitleAndContentFromMarkdown("");
      expect(result.title).toBe("Untitled");
      expect(result.content).toBe("");
    });

    test("null", () => {
      const result = seperateTitleAndContentFromMarkdown(
        null as unknown as string,
      );
      expect(result.title).toBe("Untitled");
      expect(result.content).toBe("");
    });

    test("undefined", () => {
      const result = seperateTitleAndContentFromMarkdown(
        undefined as unknown as string,
      );
      expect(result.title).toBe("Untitled");
      expect(result.content).toBe("");
    });

    test("제목만 있는 경우", () => {
      const result = seperateTitleAndContentFromMarkdown("# Only Title");
      expect(result.title).toBe("Only Title");
    });
  });
});
