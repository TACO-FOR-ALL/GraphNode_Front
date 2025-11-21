import "./styles.scss";
import "katex/dist/katex.min.css";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createBlockMarkdownSpec, Node } from "@tiptap/core";
import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Mention } from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
// import { Youtube } from "@tiptap/extension-youtube"; 유튜브 임베딩 지원
import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React from "react";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

const CustomReactComponent = ({ node }: any) => {
  return (
    <NodeViewWrapper className="custom-react-node">
      <div
        style={{
          border: "2px solid #3b82f6",
          borderRadius: "8px",
          padding: "16px",
          margin: "8px 0",
          backgroundColor: "#eff6ff",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", color: "#1e40af" }}>
          Custom React Component
        </h4>
        <p style={{ margin: 0, color: "#374151" }}>
          {node.attrs.content || "This is a custom React node view!"}
        </p>
        <div>
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// Custom node extension with React node view
const CustomReactNode = Node.create({
  name: "customReactNode",

  group: "block",

  content: "block+",

  addAttributes() {
    return {
      content: {
        default: "This is a custom React node view!",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="custom-react-node"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-type": "custom-react-node", ...HTMLAttributes }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CustomReactComponent);
  },

  markdownTokenName: "customReactNode",

  ...createBlockMarkdownSpec({
    nodeName: "customReactNode",
    name: "react",
  }),
});

export default () => {
  const editor = useEditor({
    extensions: [
      Markdown,
      StarterKit.configure({
        codeBlock: false, // 기본 CodeBlock 비활성화
      }),
      CodeBlockLowlight.configure({ lowlight: lowlight }),
      Details,
      DetailsSummary,
      DetailsContent,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "markdown-image",
        },
      }),
      TableKit,
      Highlight,
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          items: ({ query }) => {
            return [
              "Lea Thompson",
              "Cyndi Lauper",
              "Tom Cruise",
              "Madonna",
              "Jerry Hall",
              "Joan Collins",
              "Winona Ryder",
              "Christina Applegate",
            ]
              .filter((item) =>
                item.toLowerCase().startsWith(query.toLowerCase())
              )
              .slice(0, 5);
          },
        },
      }),
      Mathematics,
      CustomReactNode,
    ],
    content: "",
    contentType: "markdown",
  });

  return (
    <div className="markdown-parser-demo bg-white border-solid border-[1px] border-note-editor-border shadow-[0_2px_4px_-2px_rgba(23,23,23,0.06)]">
      <div className="editor-container">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div>Loading editor…</div>
        )}
      </div>
    </div>
  );
};
