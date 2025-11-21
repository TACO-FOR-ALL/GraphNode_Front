import { db } from "@/db/chat.db";
import { Note } from "@/types/Note";
import extractTitleFromMarkdown from "@/utils/extractTitleFromMarkdown";
import uuid from "@/utils/uuid";

export const noteRepo = {
  async create(content: string): Promise<Note> {
    const newNote: Note = {
      id: uuid(),
      title: extractTitleFromMarkdown(content),
      content,
      updatedAt: new Date(Date.now()),
      createdAt: new Date(Date.now()),
    };

    await db.notes.put(newNote);
    return newNote;
  },

  async getNoteList(): Promise<Note[]> {
    const rows = await db.notes.orderBy("updatedAt").reverse().toArray();
    return rows ?? [];
  },

  async getNoteById(id: string): Promise<Note | null> {
    return (await db.notes.get(id)) ?? null;
  },

  async updateNoteById(id: string, content: string) {
    const note = await this.getNoteById(id);
    if (!note) return null;

    const updated = {
      ...note,
      title: extractTitleFromMarkdown(content),
      content,
      updatedAt: new Date(Date.now()),
    };
    await db.notes.put(updated);
    return updated;
  },

  async deleteNoteById(id: string): Promise<string | null> {
    const note = await this.getNoteById(id);
    if (!note) return null;
    await db.notes.delete(id);
    return id;
  },

  async initializeDefaultNote(): Promise<Note | null> {
    const notes = await this.getNoteList();
    // 이미 노트가 있으면 생성하지 않음
    if (notes.length > 0) return null;

    const title = "Welcome to GraphNode!";
    const defaultContent = `# Welcome to GraphNode!
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

Inline math: $E = mc^2$ and $\pi r^2$
\`\`\`markdown
Inline math: $E = mc^2$ and $\pi r^2$
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

    return await this.create(defaultContent);
  },
};
