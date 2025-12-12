import { db } from "@/db/chat.db";
import { Note } from "@/types/Note";
import extractTitleFromMarkdown from "@/utils/extractTitleFromMarkdown";
import uuid from "@/utils/uuid";
import { outboxRepo } from "./outboxRepo";

export const noteRepo = {
  async create(content: string, folderId: string | null = null): Promise<Note> {
    const newNote: Note = {
      id: uuid(),
      title: extractTitleFromMarkdown(content),
      content,
      folderId,
      updatedAt: new Date(Date.now()),
      createdAt: new Date(Date.now()),
    };

    // transaction 안에서 실행되는 DB 작업은 전부 성공 또는 전부 실패 (rw = read write, 접근할 테이블 목록 전부 명시)
    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.put(newNote);

      await outboxRepo.enqueueNoteCreate(newNote.id, {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        folderId: newNote.folderId,
      });
    });

    return newNote;
  },

  async getAllNotes(): Promise<Note[]> {
    return await db.notes.toArray();
  },

  async getNoteById(id: string): Promise<Note | null> {
    return (await db.notes.get(id)) ?? null;
  },

  async getNoteByQuery(query: string): Promise<Note[]> {
    return await db.notes
      .filter((note) =>
        note.content.toLowerCase().includes(query.toLowerCase())
      )
      .toArray();
  },

  async updateNoteById(id: string, content: string) {
    const note = await this.getNoteById(id);
    if (!note) return null;

    const title = extractTitleFromMarkdown(content);
    const updatedAt = new Date();

    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.update(id, {
        title: title,
        content,
        updatedAt: updatedAt,
      });

      await outboxRepo.enqueueNoteUpdate(id, {
        title: title,
        content: content,
      });
    });

    return await this.getNoteById(id);
  },

  async moveNoteToFolder(
    noteId: string,
    folderId: string | null
  ): Promise<Note | null> {
    const note = await this.getNoteById(noteId);
    if (!note) return null;

    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.update(noteId, {
        folderId,
        updatedAt: new Date(Date.now()),
      });

      await outboxRepo.enqueueNoteMove(noteId, {
        folderId: folderId,
      });
    });

    return await this.getNoteById(noteId);
  },

  async deleteNoteById(id: string): Promise<string | null> {
    const note = await this.getNoteById(id);
    if (!note) return null;

    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.delete(id);
      await outboxRepo.enqueueNoteDelete(id);
    });

    return id;
  },

  async initializeDefaultNote(): Promise<Note | null> {
    const notes = await this.getAllNotes();
    if (notes.length > 0) return null;

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
