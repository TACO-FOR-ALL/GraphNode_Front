// 특정 텍스트 조각이 “일반 문장”이 아니라 “수식처럼 보이는 문단/줄”인지 판별하는 휴리스틱
// LLM의 수식 포맷이 일관되지 못해서 수식 포맷을 확실히 해서 렌더 오류를 방지하기 위한 함수
function looksLikeBareMathParagraph(paragraph: string): boolean {
  // 문단을 줄 단위로 자르고, 공백과 빈줄을 제거합니다
  const lines = paragraph
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return false;

  // 마크다운 구조 감지
  return lines.every((line) => {
    if (
      line.includes("$") || // 이미 수식인 문장은 스킵
      /^#{1,6}\s/.test(line) ||
      /^[-*+]\s/.test(line) ||
      /^\d+\.\s/.test(line) ||
      /^>/.test(line) ||
      /^```/.test(line) ||
      /^\|/.test(line)
    ) {
      return false;
    }

    // 수식 부호 감지
    if (!/[\\^{}=]/.test(line) && !/_[{]/.test(line)) {
      return false;
    }

    // 일반 문장 감지
    if (/[가-힣]/.test(line) && !/[=+\-*/<>]/.test(line)) {
      return false;
    }

    // 수식 패턴 감지
    return (
      /^\\[A-Za-z]+/.test(line) ||
      /\\[A-Za-z]+/.test(line) ||
      /[_^][A-Za-z{(]/.test(line)
    );
  });
}

// 문단 전체가 수식으로 보이면 $$...$$로 감싸는 함수
function wrapBareMathParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed || !looksLikeBareMathParagraph(trimmed)) {
        return paragraph;
      }

      return `$$\n${trimmed}\n$$`;
    })
    .join("\n\n");
}
// 문단 전체는 아니지만 “한 줄만 수식인 경우”를 처리하는 함수
function wrapBareMathLines(text: string): string {
  let insideMathBlock = false;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "$$") {
        insideMathBlock = !insideMathBlock;
        return line;
      }
      if (!trimmed || insideMathBlock || trimmed.startsWith("$")) {
        return line;
      }
      if (!looksLikeBareMathParagraph(trimmed)) {
        return line;
      }

      return `$$\n${trimmed}\n$$`;
    })
    .join("\n");
}

// 문장 안에 낀 수학 토큰만 $...$로 감싸는 함수
function wrapBareInlineMath(text: string): string {
  let insideMathBlock = false;

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "$$") {
        insideMathBlock = !insideMathBlock;
        return line;
      }

      if (!trimmed || insideMathBlock || looksLikeBareMathParagraph(trimmed)) {
        return line;
      }

      let next = line;

      next = next.replace(
        /(^|[\s([{:;,])((?:[A-Za-z](?:[A-Za-z])?(?:_\{(?:[^{}\n]+|\{[^{}\n]*\})+\}|_[A-Za-z0-9]+))(?:\([^)\n]*\))?)(?=($|[\s)\]}.,;:!?가-힣]))/g,
        "$1$$$2$$",
      );
      next = next.replace(
        /(^|[\s([{:;,])(\\(?:Rightarrow|Leftarrow|iff|implies))(?=($|[\s)\]}.,;:!?가-힣]))/g,
        "$1$$$2$$",
      );

      return next;
    })
    .join("\n");
}

function transformOutsideDisplayMath(
  text: string,
  transform: (segment: string) => string,
): string {
  return text
    .split(/(\$\$[\s\S]*?\$\$)/g)
    .map((segment) => {
      if (segment.startsWith("$$") && segment.endsWith("$$")) {
        return segment;
      }
      return transform(segment);
    })
    .join("");
}

/* 메인 엔트리
중요 => 이미 $$ ... $$ 안에 들어간 수식은 다시 건드리지 않는다

1. 줄바꿈 통일
2. 이중 이스케이프된 LaTeX 복원
3. \[ \], \( \) 같은 delimiter를 KaTeX-friendly 형태로 변환
4. display math 블록 바깥에서만
  - bare math 문단 감싸기
  - bare math 한 줄 감싸기
  - bare inline math 감싸기
*/
export default function normalizeMathMarkdown(text: string): string {
  // Windows 줄바꿈 \r\n을 Unix 줄바꿈 \n으로 통일합니다 (맥, 리눅스는 필요 없음)
  let result = text.replace(/\r\n/g, "\n");

  // 이중 이스케이프된 LaTeX 복원 => \\[ \\] \\( \\) \\$를 \[ \] \( \) \$로 줄입니다
  result = result.replace(/\\\\(?=[\[\]()$])/g, "\\");
  // \\frac, \\text, \\mathbb처럼 LaTeX 명령이 JSON escape 때문에 한 번 더 백슬래시를 먹은 경우 복원합니다. => "\\\\frac{a}{b}" -> "\\frac{a}{b}"
  result = result.replace(/\\\\([A-Za-z]+)/g, "\\$1");

  // \$...\$ 형태로 이스케이프된 인라인 수식을 다시 remark-math가 읽을 수 있게 복원한다.
  result = result.replace(/\\\$(.+?)\\\$/gs, (_match, content: string) => {
    if (content.trim().length === 0) {
      return _match;
    }
    return `$${content}$`;
  });

  // \[ \], \( \)를 KaTeX-friendly 형태로 변환(package:remark-math) => \[...\] -> block math $$...$$
  result = result.replace(/\\\[/g, () => "\n$$\n");
  result = result.replace(/\\\]/g, () => "\n$$\n");

  // \(...\) 안에 줄바꿈이 없으면 inline math로 보고 $...$, 줄바꿈이 있으면 block math로 보고 $$...$$로 처리합니다
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, content: string) => {
    if (content.includes("\n")) {
      return `\n$$\n${content}\n$$\n`;
    }
    return `$${content}$`;
  });

  // $ 가 단독 줄에 있는 멀티라인 블록: "$\n...\n$" -> "$$\n...\n$$"
  result = result.replace(
    /(?<!\$)\$[ \t]*\n+([\s\S]*?)\n+[ \t]*\$(?!\$)/g,
    (_match, content: string) => `\n$$\n${content}\n$$\n`,
  );

  result = transformOutsideDisplayMath(result, wrapBareMathParagraphs);
  result = transformOutsideDisplayMath(result, wrapBareMathLines);
  result = transformOutsideDisplayMath(result, wrapBareInlineMath);

  return result;
}
