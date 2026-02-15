export const DEFAULT_NOTE_EN = `# Welcome to GraphNode!
This demo showcases markdown support in GraphNode's Note Editor with extended features.

## Features

- **Bold text** and *italic text*
- \`inline code\` and code blocks
- [Links](https://graphnode.ai/dev)
- Lists and more!
\`\`\`markdown
- **Bold text** and *italic text*
- \`inline code\` and code blocks
- [Links](https://graphnode.ai/dev)
- Lists and more!
\`\`\`

## Extended Features

## Task Lists

- [ ] Incomplete task
  - [ ] Nested incomplete task
  - [x] Completed task
- [x] Completed task
  - [ ] Incomplete task
  - [x] Completed task
\`\`\`markdown
- [ ] Incomplete task
  - [ ] Nested incomplete task
  - [x] Completed task
- [x] Completed task
  - [ ] Incomplete task
  - [x] Completed task
\`\`\`

## HTML Support

Markdown support comes with additional HTML support so your content can be easily parsed as well, even if not in Markdown format.

- **Lists**
- and
- Sublists
  - See?


### Code

GraphNode supports \`inline code\` and full code blocks:

\`\`\`python3
print("Hello, World!") # use \` code block for inline code
\`\`\`

### Mentions

Hey, [@ id="johnhan" label="John Han"], have you seen [@ id="ayatsunoyuki" label="Ayatsuno Yuki"]?
\`\`\`markdown
Hey, [@ id="johnhan" label="John Han"], have you seen [@ id="ayatsunoyuki" label="Ayatsuno Yuki"]?
\`\`\`

### Mathematics

Inline math: $E = mc^2$ and $\\pi r^2$
\`\`\`markdown
Inline math: $E = mc^2$ and $\\pi r^2$
\`\`\`

Block math:

$$
40*5/38
$$
\`\`\`markdown
Block math:

$$
40*5/38
$$
\`\`\`

### Adding Images

To add images, simply **drag and drop images into the editor**!
- Select an image file and drag it into the editor
- Or copy an image from clipboard and paste it
- Images are automatically compressed and saved as Base64

### Custom React Component

:::react {content="This is a custom React node view with fenced syntax!"}

Isn't this great?

:::

:::react {content="Here is another custom React node view with more content!"}

Another one with even more inline content to **edit**!

:::react {content="Nested node"}

Nested content is also supported!

:::

:::

🎉 Have a great day with GraphNode!
`;
