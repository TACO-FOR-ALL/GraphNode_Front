export const DEFAULT_NOTE_EN = `# Welcome to GraphNode!
This demo showcases markdown support in GraphNode's Note Editor with extended features.

## Features

- **Bold text** and *italic text*
- ~~Strikethrough~~ and \`inline code\`
- [Links](https://graphnode.ai/dev)
- ==Highlight==
- Lists and more!
\`\`\`markdown
- **Bold text** and *italic text*
- ~~Strikethrough~~ and \`inline code\`
- [Links](https://graphnode.ai/dev)
- ==Highlight==
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

### Tables

Simple markdown tables are rendered right away:

| Item | Status | Notes |
| --- | --- | --- |
| GraphNode | In progress | Organizing notes |
| Table UI | Done | Supports adding rows and columns |

\`\`\`markdown
| Item | Status | Notes |
| --- | --- | --- |
| GraphNode | In progress | Organizing notes |
| Table UI | Done | Supports adding rows and columns |
\`\`\`

Hover the **right edge of a table to add a column**, or the **bottom edge to add a row**.

**Quick table creation**: Type \`/table{rows}:{cols}\` or \`/table{rows}x{cols}\` and press Enter.

Example: \`/table3:4\` + Enter → creates a 3-row, 4-column table

### Highlight

Use \`==text==\` syntax to apply a default green highlight.

==This is a highlight example==

\`\`\`markdown
==This is a highlight example==
\`\`\`

You can also select text and choose a background color from the **bubble menu → A color** to highlight in any color.

### Mentions

Hey, [@ id="johnhan" label="John Han"], have you seen [@ id="ayatsunoyuki" label="Ayatsuno Yuki"]?
\`\`\`markdown
Hey, [@ id="johnhan" label="John Han"], have you seen [@ id="ayatsunoyuki" label="Ayatsuno Yuki"]?
\`\`\`

### Mathematics

Inline math: $E = mc^2$ and $\\pi r^2$

Block math:

$$
40*5/38
$$

**How to type math directly in the editor:**
- Inline math: type \`$$formula$$\` → auto-converts
- Block math: type \`$$$formula$$$\` → auto-converts
- Or select text and click the math icon in the bubble menu to convert it to a formula

**Markdown file format** (when loading from file):
\`\`\`markdown
Inline math: $E = mc^2$ and $\\pi r^2$

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

### Note Links

Type \`/note\` anywhere in the editor to link to another note!

- A list of your notes appears — select one to insert a link
- Hover over a note to preview its headings in the side panel
- Select a heading to link directly to that section
- Use ↑↓ to navigate the list, → to move to headings, Enter to insert

### Text Selection Menu

Drag to select text and a floating formatting menu will appear.

| Button | Function |
| --- | --- |
| Aa / H1~H4 | Convert block to heading or paragraph |
| A color | Text color (10 options) or background highlight (10 options) |
| B / I / U / Strikethrough | Toggle bold · italic · underline · strikethrough |
| Code icon | Convert to inline code |
| Math icon | Convert selected text to a formula |
| Link icon | Insert URL link |
| Note icon | Link to another note |

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
