function normalizeDisplayMathContent(content: string): string {
  const trimmed = content.trim();

  // align/aligned/array 또는 명시적 줄바꿈(\\)이 있으면 원래 줄바꿈을 유지한다.
  if (/\\begin\{[^}]+\}|\\\\/.test(trimmed)) {
    return trimmed;
  }

  // 일반 display 수식은 한 줄로 접어서 + / - 가 markdown 리스트로 해석되지 않게 한다.
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function wrapBareDisplayMathLines(text: string): string {
  let insideMathBlock = false;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed === "$$") {
        insideMathBlock = !insideMathBlock;
        return line;
      }
      if (insideMathBlock || trimmed.startsWith("$")) return line;
      if (/[가-힣]/.test(trimmed)) return line;

      const looksLikeDisplayMath =
        /^(\\(?:min|max|mathbb|frac|sum|int|begin|logit|mathrm|text)|[A-Z]\^|[A-Z]_|[A-Za-z]+\()/.test(
          trimmed,
        ) && /[\\_^=]/.test(trimmed);

      if (!looksLikeDisplayMath) {
        return line;
      }

      return `$$\n${trimmed}\n$$`;
    })
    .join("\n");
}

export default function normalizeMathMarkdown(text: string): string {
  let result = text.replace(/\r\n/g, "\n");

  // JSON/스트리밍 과정에서 한 번 더 이스케이프된 LaTeX를 복원한다.
  result = result.replace(/\\\\(?=[\[\]()$])/g, "\\");
  result = result.replace(/\\\\([A-Za-z]+)/g, "\\$1");

  // \$...\$ -> $...$
  result = result.replace(/\\\$(.+?)\\\$/gs, (_match, content: string) => {
    if (content.trim().length === 0) {
      return _match;
    }
    return `$${content}$`;
  });

  // 한쪽만 이스케이프된 inline math도 복원한다.
  result = result.replace(/\\\$(.+?)\$(?!\$)/gs, (_match, content: string) => {
    if (content.trim().length === 0 || content.includes("\n")) {
      return _match;
    }
    return `$${content}$`;
  });
  result = result.replace(/(?<!\$)\$(.+?)\\\$/gs, (_match, content: string) => {
    if (content.trim().length === 0 || content.includes("\n")) {
      return _match;
    }
    return `$${content}$`;
  });

  // \[...\] -> $$...$$
  result = result.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_match, content: string) => {
    return `\n$$\n${normalizeDisplayMathContent(content)}\n$$\n`;
  });

  // fallback: 단독 delimiter만 남은 경우 정리
  result = result.replace(/\\\[/g, () => "\n$$\n");
  result = result.replace(/\\\]/g, () => "\n$$\n");

  // \(...\) -> inline/block math
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, content: string) => {
    if (content.includes("\n")) {
      return `\n$$\n${content.trim()}\n$$\n`;
    }
    return `$${content}$`;
  });

  // "$\n...\n$" -> "$$\n...\n$$"
  result = result.replace(
    /(?<!\$)\$[ \t]*\n+([\s\S]*?)\n+[ \t]*\$(?!\$)/g,
    (_match, content: string) => `\n$$\n${content.trim()}\n$$\n`,
  );

  result = wrapBareDisplayMathLines(result);

  return result;
}
