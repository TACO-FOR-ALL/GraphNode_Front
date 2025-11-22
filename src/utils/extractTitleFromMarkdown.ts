/**
 * 마크다운 첫 줄에서 타이틀을 추출합니다.
 * 마크다운 문법(#, ##, ### 등)을 제거하고 텍스트만 반환합니다.
 * @param markdown - 마크다운 텍스트
 * @returns 첫 줄의 타이틀 (마크다운 문법 제거)
 */
export default function extractTitleFromMarkdown(markdown: string): string {
  if (!markdown || markdown.trim().length === 0) {
    return "Untitled";
  }

  const firstLine = markdown.split("\n")[0].trim();

  if (firstLine.length === 0) {
    return "Untitled";
  }

  // 마크다운 헤더 문법 제거 (#, ##, ### 등)
  const title = firstLine.replace(/^#+\s*/, "").trim();

  return title.length > 0 ? title : "Untitled";
}

export function seperateTitleAndContentFromMarkdown(markdown: string): {
  title: string;
  content: string;
} {
  if (!markdown || markdown.trim().length === 0) {
    return { title: "Untitled", content: "" };
  }

  const firstLine = markdown.split("\n")[0].trim();

  if (firstLine.length === 0) {
    return { title: "Untitled", content: "" };
  }

  // 마크다운 헤더 문법 제거 (#, ##, ### 등)
  const title = firstLine.replace(/^#+\s*/, "").trim();

  return {
    title: title.length > 0 ? title : "Untitled",
    content: markdown.slice(title.length).trim(),
  };
}
