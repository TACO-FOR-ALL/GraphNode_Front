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
  code: (props) => {
    const { inline, className, children, ...rest } = props as CodePropsLike;
    const code = safeStringify(children);

    if (inline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 font-mono text-sm"
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
        error
      );
      try {
        highlighted = hljs.highlightAuto(code).value;
      } catch (autoError) {
        // 자동 감지도 실패하면 그냥 텍스트로 표시
        console.warn(
          "자동 언어 감지도 실패했습니다. 일반 텍스트로 표시합니다.",
          autoError
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
        className="rounded-lg overflow-auto my-4 p-4 bg-gray-200 text-gray-100 border border-gray-700 font-mono text-sm leading-relaxed"
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
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
}
