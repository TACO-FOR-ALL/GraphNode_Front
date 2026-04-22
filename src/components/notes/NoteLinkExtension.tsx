import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import { noteRepo } from "@/managers/noteRepo";
import { noteLinkStore, type NoteLinkItem } from "./noteLinkStore";

const NoteLinkPluginKey = new PluginKey("noteLink");

export const NoteLinkExtension = Extension.create({
  name: "noteLinkExtension",

  addProseMirrorPlugins() {
    return [
      Suggestion<NoteLinkItem, NoteLinkItem>({
        pluginKey: NoteLinkPluginKey,
        editor: this.editor,
        char: "/note",
        allowSpaces: true,
        allowedPrefixes: null,

        items: async ({ query }) => {
          const q = query.trim();
          const currentId = noteLinkStore.getCurrentNoteId();
          const notes = (await noteRepo.getAllNotes()).filter(
            (n) => n.id !== currentId,
          );
          const filtered = q
            ? notes.filter((n) =>
                (n.title || "").toLowerCase().includes(q.toLowerCase()),
              )
            : notes.slice(0, 20);
          return filtered.map((n) => ({
            type: "note" as const,
            noteId: n.id,
            noteTitle: n.title || "Untitled",
          }));
        },

        command: ({ editor, range, props: item }) => {
          const linkText =
            item.type === "heading"
              ? `${item.noteTitle} › ${item.headingText}`
              : item.noteTitle || "Untitled";

          const href =
            item.type === "heading"
              ? `note://${item.noteId}?heading=${encodeURIComponent(item.headingText)}`
              : `note://${item.noteId}`;

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContentAt(range.from, [
              {
                type: "text",
                text: linkText,
                marks: [{ type: "link", attrs: { href, target: null, rel: null } }],
              },
              { type: "text", text: " " },
            ])
            .run();
        },

        render: () => ({
          onStart(props) {
            noteLinkStore.activate(
              props.items,
              props.clientRect ?? (() => null),
              (item) => props.command(item),
            );
          },
          onUpdate(props) {
            noteLinkStore.update(
              props.items,
              props.clientRect ?? (() => null),
            );
          },
          onKeyDown({ event }) {
            if (event.key === "Escape") {
              noteLinkStore.dismiss();
              return true;
            }
            return noteLinkStore.handleKeyDown(event);
          },
          onExit() {
            noteLinkStore.deactivate();
          },
        }),
      }),
    ];
  },
});
