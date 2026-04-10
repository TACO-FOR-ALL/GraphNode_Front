import { InputRule } from "@tiptap/core";
import Link from "@tiptap/extension-link";

const markdownLinkInputRegex = /\[([^\]\n]+)\]\(([^)\s]+)\)$/;

export const MarkdownLink = Link.extend({
  addInputRules() {
    return [
      new InputRule({
        find: markdownLinkInputRegex,
        handler: ({ state, range, match }) => {
          const [, text, href] = match;

          if (!text || !href) {
            return null;
          }

          if (
            !this.options.isAllowedUri(href, {
              defaultValidate: (url: string) => !!url,
              protocols: this.options.protocols,
              defaultProtocol: this.options.defaultProtocol,
            })
          ) {
            return null;
          }

          state.tr.insertText(text, range.from, range.to);
          state.tr.addMark(
            range.from,
            range.from + text.length,
            this.type.create({ href }),
          );
          state.tr.removeStoredMark(this.type);
        },
      }),
    ];
  },
});
