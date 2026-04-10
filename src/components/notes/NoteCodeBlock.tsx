import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useEffect, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiCopy } from "react-icons/fi";
import { useToastStore } from "@/store/useToastStore";

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  css: "CSS",
  dockerfile: "Dockerfile",
  html: "HTML",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  markdown: "Markdown",
  md: "Markdown",
  mysql: "MySQL",
  plaintext: "Plain text",
  postgresql: "PostgreSQL",
  py: "Python",
  python: "Python",
  scss: "SCSS",
  sh: "Shell",
  shell: "Shell",
  sql: "SQL",
  text: "Plain text",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  yaml: "YAML",
  yml: "YAML",
  zsh: "Zsh",
};

function formatLanguageLabel(language?: string | null) {
  const normalized = language?.trim().toLowerCase() || "plaintext";

  if (LANGUAGE_LABELS[normalized]) {
    return LANGUAGE_LABELS[normalized];
  }

  return normalized
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) =>
      segment.length <= 3
        ? segment.toUpperCase()
        : `${segment[0].toUpperCase()}${segment.slice(1)}`,
    )
    .join(" ");
}

function NoteCodeBlockView({ node }: NodeViewProps) {
  const { t } = useTranslation();
  const addToast = useToastStore((state) => state.addToast);
  const [copied, setCopied] = useState(false);

  const language =
    typeof node.attrs.language === "string" ? node.attrs.language : "";
  const languageLabel = formatLanguageLabel(language);

  useEffect(() => {
    if (!copied) return;

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      addToast({
        message: t("notes.codeBlock.copied", { language: languageLabel }),
        type: "success",
      });
    } catch (error) {
      console.error("Failed to copy code block:", error);
      addToast({
        message: t("notes.codeBlock.copyFailed"),
        type: "error",
      });
    }
  };

  return (
    <NodeViewWrapper className="note-code-block">
      <div className="note-code-block__shell">
        <div className="note-code-block__toolbar" contentEditable={false}>
          <button
            type="button"
            className={`note-code-block__copy ${copied ? "is-copied" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleCopy}
            aria-label={t("notes.codeBlock.copyAriaLabel", {
              language: languageLabel,
            })}
          >
            <span className="note-code-block__language">{languageLabel}</span>
            {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          </button>
        </div>

        <pre className="note-code-block__pre">
          <NodeViewContent<"code">
            as="code"
            className={`note-code-block__content hljs ${
              language ? `language-${language}` : ""
            }`}
          />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}

export const NoteCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(NoteCodeBlockView);
  },
});
