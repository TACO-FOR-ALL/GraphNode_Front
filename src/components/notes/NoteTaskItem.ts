import { findParentNode, InputRule } from "@tiptap/core";
import { TaskItem } from "@tiptap/extension-list";

const markdownTaskShortcutRegex = /^\[([ xX])\]\s$/;

export const NoteTaskItem = TaskItem.extend({
  addInputRules() {
    const parentRules = this.parent?.() ?? [];

    return [
      new InputRule({
        find: markdownTaskShortcutRegex,
        handler: ({ state, range, match, chain }) => {
          const isInsideBulletList = !!findParentNode(
            (node) => node.type.name === "bulletList",
          )(state.selection);
          const isInsideListItem = !!findParentNode(
            (node) => node.type.name === "listItem",
          )(state.selection);

          if (!isInsideBulletList || !isInsideListItem) {
            return null;
          }

          const checked = match[1].toLowerCase() === "x";

          const converted = chain()
            .deleteRange(range)
            .toggleTaskList()
            .command(({ tr, state: nextState }) => {
              const taskItem = findParentNode(
                (node) => node.type.name === "taskItem",
              )(nextState.selection);

              if (!taskItem) {
                return false;
              }

              tr.setNodeMarkup(taskItem.pos, undefined, {
                ...taskItem.node.attrs,
                checked,
              });

              return true;
            })
            .run();

          if (!converted) {
            return null;
          }
        },
      }),
      ...parentRules,
    ];
  },
});
