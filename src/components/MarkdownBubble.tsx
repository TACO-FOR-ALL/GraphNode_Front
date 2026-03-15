import React from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github.css";
import hljs from "highlight.js";

type CodePropsLike = React.ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
  node?: unknown;
  children?: React.ReactNode;
};

// 객체를 안전하게 문자열로 변환하는 헬퍼 함수
function safeStringify(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (typeof children === "boolean") return String(children);
  if (Array.isArray(children)) {
    return children.map(safeStringify).join("");
  }
  if (children && typeof children === "object") {
    if (React.isValidElement(children)) {
      const props = children.props as any;
      if (props && typeof props === "object" && "children" in props) {
        return safeStringify(props.children);
      }
    }
    try {
      return JSON.stringify(children, null, 2);
    } catch {
      return String(children);
    }
  }
  return "";
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-base-border text-text-primary leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-7 mb-3 text-text-primary leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-6 mb-2 text-text-primary leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mt-5 mb-2 text-text-primary">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-3 leading-7 text-text-primary">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 pl-6 list-disc space-y-1.5 text-text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 pl-6 list-decimal space-y-1.5 text-text-primary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 pl-4 border-l-4 border-base-border text-text-secondary italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-base-border" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-bg-tertiary">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-base-border px-4 py-2 text-left font-semibold text-text-primary">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-base-border px-4 py-2 text-text-primary">
      {children}
    </td>
  ),

  code: (props) => {
    const { className, children, ...rest } = props as CodePropsLike;
    const code = safeStringify(children);

    // className이 없으면 인라인 코드 (react-markdown v9+에서 inline prop deprecated)
    const isInline = !className;

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded-sm bg-code-bg text-code-text font-mono text-sm"
          {...rest}
        >
          {code}
        </code>
      );
    }

    // 언어 추출
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";

    let highlighted;
    try {
      if (language) {
        // 특정 언어로 하이라이팅 시도
        highlighted = hljs.highlight(code, { language }).value;
      } else {
        // 자동 감지
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch (error) {
      // 언어를 찾을 수 없거나 오류가 발생하면 자동 감지로 폴백
      console.warn(
        `언어 '${language}'를 찾을 수 없습니다. 자동 감지로 전환합니다.`,
        error,
      );
      try {
        highlighted = hljs.highlightAuto(code).value;
      } catch (autoError) {
        // 자동 감지도 실패하면 그냥 텍스트로 표시
        console.warn(
          "자동 언어 감지도 실패했습니다. 일반 텍스트로 표시합니다.",
          autoError,
        );
        highlighted = hljs.highlight(code, { language: "plaintext" }).value;
      }
    }

    return (
      <code
        className={`hljs ${className || ""}`}
        dangerouslySetInnerHTML={{ __html: highlighted }}
        {...rest}
      />
    );
  },

  pre: ({ children, ...rest }) => {
    return (
      <pre
        className="rounded-lg overflow-auto my-4 p-4 bg-bg-tertiary text-text-primary border border-base-border font-mono text-sm leading-relaxed"
        {...rest}
      >
        {children}
      </pre>
    );
  },

  a: (props) => {
    const { href, children, ...rest } =
      props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-dotted text-blue-600 hover:text-blue-800"
        {...rest}
      >
        {children}
      </a>
    );
  },
};

export default function MarkdownBubble({ text }: { text: string }) {
  return (
    <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
