export const DEFAULT_NOTE_ZH = `# 欢迎使用 GraphNode！
此演示展示了 GraphNode 笔记编辑器中的扩展功能以及 Markdown 支持。

## 功能

- **粗体文本** 和 *斜体文本*
- \`内联代码\` 和代码块
- [链接](https://graphnode.ai/dev)
- 列表等更多功能！
\`\`\`markdown
- **粗体文本** 和 *斜体文本*
- \`内联代码\` 和代码块
- [链接](https://graphnode.ai/dev)
- 列表等更多功能！
\`\`\`

## 扩展功能

## 任务列表

- [ ] 未完成的任务
  - [ ] 嵌套的未完成任务
  - [x] 已完成的任务
- [x] 已完成的任务
  - [ ] 未完成的任务
  - [x] 已完成的任务
\`\`\`markdown
- [ ] 未完成的任务
  - [ ] 嵌套的未完成任务
  - [x] 已完成的任务
- [x] 已完成的任务
  - [ ] 未完成的任务
  - [x] 已完成的任务
\`\`\`

## HTML 支持

Markdown 支持附带额外的 HTML 支持，因此即使不是 Markdown 格式，您的内容也可以轻松解析。

- **列表**
- 和
- 子列表
  - 看到了吗？


### 代码

GraphNode 支持\`内联代码\`和完整的代码块：

\`\`\`python3
print("你好，世界！") # 内联代码使用 \` 代码块
\`\`\`

### 提及

嘿，[@ id="johnhan" label="John Han"]，你见过 [@ id="ayatsunoyuki" label="Ayatsuno Yuki"] 吗？
\`\`\`markdown
嘿，[@ id="johnhan" label="John Han"]，你见过 [@ id="ayatsunoyuki" label="Ayatsuno Yuki"] 吗？
\`\`\`

### 数学

内联数学：$E = mc^2$ 和 $\\pi r^2$
\`\`\`markdown
内联数学：$E = mc^2$ 和 $\\pi r^2$
\`\`\`

块数学：

$$
40*5/38
$$
\`\`\`markdown
块数学：

$$
40*5/38
$$
\`\`\`

### 添加图片

要添加图片，只需**将图片拖放到编辑器中**即可！
- 选择图片文件并将其拖到编辑器中
- 或从剪贴板复制图片并粘贴
- 图片将自动压缩并保存为 Base64 格式

### 自定义 React 组件

:::react {content="这是一个带有围栏语法的自定义 React 节点视图！"}

这不是很棒吗？

:::

:::react {content="这是另一个包含更多内容的自定义 React 节点视图！"}

另一个包含更多可**编辑**内联内容的示例！

:::react {content="嵌套节点"}

也支持嵌套内容！

:::

:::

🎉 祝您使用 GraphNode 度过美好的一天！
`;
