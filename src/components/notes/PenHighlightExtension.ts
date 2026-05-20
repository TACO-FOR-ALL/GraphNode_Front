import { Mark, markInputRule, markPasteRule, mergeAttributes } from '@tiptap/core'

// --text-- 패턴 (공백으로 시작하지 않고, 내부에 단일 대시는 허용)
export const inputRegex = /(?:^|\s)(--(?!\s)((?:[^-]|-(?!-))+?)--)$/
export const pasteRegex = /(--(?!\s)((?:[^-]|-(?!-))+?)--)/g

export const PenHighlight = Mark.create({
  name: 'penHighlight',

  parseHTML() {
    return [
      {
        tag: 'mark[data-pen-highlight]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(HTMLAttributes, {
        'data-pen-highlight': '',
        class: 'pen-highlight',
      }),
      0,
    ]
  },

  renderMarkdown: (node: any, h: any) => {
    return `--${h.renderChildren(node)}--`
  },

  parseMarkdown: (token: any, h: any) => {
    return h.applyMark('penHighlight', h.parseInline(token.tokens || []))
  },

  markdownTokenizer: {
    name: 'penHighlight',
    level: 'inline',
    start: (src: string) => src.indexOf('--'),
    tokenize(src: string, _: any, h: any) {
      const rule = /^--((?:[^-]|-(?!-))+?)--/
      const match = rule.exec(src)
      if (match) {
        const innerContent = match[1]
        const children = h.inlineTokens(innerContent)
        return {
          type: 'penHighlight',
          raw: match[0],
          text: innerContent,
          tokens: children,
        }
      }
    },
  },

  addInputRules() {
    return [
      markInputRule({
        find: inputRegex,
        type: this.type,
      }),
    ]
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: pasteRegex,
        type: this.type,
      }),
    ]
  },
})
