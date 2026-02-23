import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github.css";
import hljs from "highlight.js";

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

const components: Components = {
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

  return (
    <>
      <style>{`
        @keyframes streamChunkFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {isStreaming ? (
        <div className="whitespace-pre-wrap break-words">
          {chunks.map((chunk) => (
            <span
              key={chunk.id}
              style={{
                opacity: 0,
                animation: "streamChunkFadeIn 260ms ease forwards",
              }}
            >
              {chunk.text}
            </span>
          ))}
        </div>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {text}
        </ReactMarkdown>
      )}
    </>
  );
}
