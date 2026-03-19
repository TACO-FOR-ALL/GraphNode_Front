import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";
import hljs from "highlight.js";
import { FiCopy, FiCheck } from "react-icons/fi";
import normalizeMathMarkdown from "@/utils/normalizeMathMarkdown";

interface StreamingMarkdownBubbleProps {
  text: string;
  isStreaming?: boolean;
}

type CodePropsLike = {
  inline?: boolean;
  node?: unknown;
  children?: React.ReactNode;
  className?: string;
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
    try {
      return JSON.stringify(children, null, 2);
    } catch {
      return String(children);
    }
  }
  return "";
}

function CodeBlock({
  children,
  ...rest
}: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const codeChild = React.Children.toArray(children).find((child) =>
    React.isValidElement(child)
  ) as React.ReactElement | undefined;
  const className = (codeChild?.props as any)?.className || "";
  const match = /language-(\w+)/.exec(className);
  const language = match ? match[1] : "";

  const handleCopy = async () => {
    const text = preRef.current?.textContent || "";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-base-border">
      <div className="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary border-b border-base-border">
        <span className="text-xs text-text-secondary font-mono">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
          <span>COPY</span>
        </button>
      </div>
      <pre
        ref={preRef}
        className="overflow-auto p-4 bg-bg-tertiary font-mono text-sm leading-relaxed"
        {...rest}
      >
        {children}
      </pre>
    </div>
  );
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

    // className이 없으면 인라인 코드
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
        highlighted = hljs.highlight(code, { language }).value;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch (error) {
      try {
        highlighted = hljs.highlightAuto(code).value;
      } catch (autoError) {
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

  pre: (props) => <CodeBlock {...(props as React.HTMLAttributes<HTMLPreElement>)} />,

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

export default function StreamingMarkdownBubble({
  text,
  isStreaming = false,
}: StreamingMarkdownBubbleProps) {
  const previousTextRef = useRef("");
  const chunkIdRef = useRef(0);
  const [chunks, setChunks] = useState<Array<{ id: number; text: string }>>([]);

  useEffect(() => {
    if (!isStreaming) {
      previousTextRef.current = text;
      setChunks([]);
      return;
    }

    const prev = previousTextRef.current;

    // 일반적인 스트리밍 케이스: 뒤에 텍스트가 덧붙는 경우
    if (text.startsWith(prev) && text.length > prev.length) {
      const delta = text.slice(prev.length);
      const id = ++chunkIdRef.current;
      setChunks((prevChunks) => [...prevChunks, { id, text: delta }]);
    } else if (text !== prev) {
      // 비정상 업데이트(교체/축소) 시 전체를 단일 청크로 재설정
      const id = ++chunkIdRef.current;
      setChunks([{ id, text }]);
    }

    previousTextRef.current = text;
  }, [text, isStreaming]);

  const renderedText =
    isStreaming && chunks.length > 0
      ? chunks.map((chunk) => chunk.text).join("")
      : text;

  return (
    <>
      <style>{`
        @keyframes streamChunkFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div
        className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        style={
          isStreaming
            ? {
                animation: "streamChunkFadeIn 180ms ease forwards",
              }
            : undefined
        }
      >
        <ReactMarkdown
          remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
          components={components}
        >
          {normalizeMathMarkdown(renderedText)}
        </ReactMarkdown>
      </div>
    </>
  );
}
