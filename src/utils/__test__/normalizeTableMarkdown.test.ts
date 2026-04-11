import normalizeTableMarkdown from "../normalizeTableMarkdown";

describe("normalizeTableMarkdown", () => {
  test("정상적인 테이블 문법은 그대로 둔다", () => {
    const markdown = `|제목|내용|설명|
|------|---|---|
|테스트1|테스트2|테스트3|
|테스트1|테스트2|테스트3|`;

    expect(normalizeTableMarkdown(markdown)).toBe(markdown);
  });

  test("테이블 행 사이의 빈 줄을 제거한다", () => {
    const markdown = `|제목|내용|설명|

|------|---|---|

|테스트1|테스트2|테스트3|

|테스트1|테스트2|테스트3|

|테스트1|테스트2|테스트3|`;

    expect(normalizeTableMarkdown(markdown)).toBe(`|제목|내용|설명|
|------|---|---|
|테스트1|테스트2|테스트3|
|테스트1|테스트2|테스트3|
|테스트1|테스트2|테스트3|`);
  });

  test("코드블록 안의 파이프 문법은 건드리지 않는다", () => {
    const markdown = `\`\`\`md
|제목|내용|

|---|---|
|값|값|
\`\`\``;

    expect(normalizeTableMarkdown(markdown)).toBe(markdown);
  });
});
