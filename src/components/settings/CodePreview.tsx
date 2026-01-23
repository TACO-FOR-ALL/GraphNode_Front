import { useEffect, useRef } from "react";
import hljs from "highlight.js";

const SAMPLE_CODE = `function greet(name: string) {                                                    
    console.log(\`Hello, \${name}!\`);                                                                   
    return { success: true };                                                                            
  }`;

interface CodePreviewProps {
  currentHighlight: string;
  isOpenPanel: boolean;
}

export default function CodePreview({
  currentHighlight,
  isOpenPanel,
}: CodePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 기존 스타일 제거
    const oldStyle = document.getElementById("hljs-preview-style");
    if (oldStyle) oldStyle.remove();

    // base16 스타일은 서브폴더에 있음 (예: base16-3024 -> base16/3024.css)
    let cssPath = `/hljs-styles/${currentHighlight}.css`;
    if (currentHighlight.startsWith("base16-")) {
      const themeName = currentHighlight.replace("base16-", "");
      cssPath = `/hljs-styles/base16/${themeName}.css`;
    }

    // public 폴더에서 CSS 로드
    fetch(cssPath)
      .then((res) => {
        if (!res.ok) throw new Error("CSS not found");
        return res.text();
      })
      .then((css) => {
        const style = document.createElement("style");
        style.id = "hljs-preview-style";
        style.textContent = css;
        document.head.appendChild(style);
      })
      .catch((err) => console.warn("Failed to load theme:", err));
  }, [currentHighlight]);

  const highlighted = hljs.highlight(SAMPLE_CODE, {
    language: "typescript",
  }).value;

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-text-tertiary transition-all duration-200 w-full"
      style={{ marginTop: isOpenPanel ? "240px" : "0px" }}
    >
      <pre className="p-4 text-sm m-0">
        <code
          className="hljs"
          key={currentHighlight}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
