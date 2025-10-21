export function toMarkdownFromUnknown(node: any): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean")
    return String(node);

  if (Array.isArray(node)) {
    return node.map(toMarkdownFromUnknown).filter(Boolean).join("\n");
  }

  if (Array.isArray(node?.parts)) return toMarkdownFromUnknown(node.parts);
  if (Array.isArray(node?.content)) return toMarkdownFromUnknown(node.content);
  if (node?.content?.parts) return toMarkdownFromUnknown(node.content.parts);

  if (Array.isArray(node?.children)) {
    const inner = toMarkdownFromUnknown(node.children);
    if (node.type === "heading" && node.depth)
      return `${"#".repeat(node.depth)} ${inner}`;
    if (node.type === "paragraph") return inner;
    if (node.type === "listItem") return `- ${inner}`;
    return inner;
  }

  const code =
    typeof node.code === "string"
      ? node.code
      : (node.type === "code" || node.content_type === "code") &&
          typeof node.text === "string"
        ? node.text
        : undefined;
  if (typeof code === "string") {
    const lang = node.lang || node.language || "";
    return `\`\`\`${lang}\n${code}\n\`\`\``;
  }

  if (node.type === "inlineCode" && typeof node.value === "string") {
    return "`" + node.value + "`";
  }

  if (typeof node.text === "string") return node.text;
  if (typeof node.value === "string") return node.value;
  if (typeof node.literal === "string") return node.literal;
  if (typeof node.label === "string") return node.label;
  if (typeof node?.data?.text === "string") return node.data.text;
  if (typeof node?.data?.value === "string") return node.data.value;

  if (node && typeof node === "object" && node.props) {
    return toMarkdownFromUnknown(node.props.children);
  }

  if (node && typeof node === "object") {
    const stringValues: string[] = [];
    for (const key in node) {
      if (typeof node[key] === "string") {
        stringValues.push(node[key]);
      } else if (Array.isArray(node[key])) {
        stringValues.push(toMarkdownFromUnknown(node[key]));
      }
    }
    if (stringValues.length > 0) {
      return stringValues.join(" ");
    }
  }

  return "";
}
