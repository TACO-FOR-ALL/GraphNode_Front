import { Extension, InputRule } from '@tiptap/core'

// 지원하는 입력 형식:
//   /table3:4<Enter>  → 3행 4열 테이블 (Enter 트리거)
//   /table3x4<Enter>  → 동일
//   /table3:4<space>  → 스페이스 트리거 (InputRule)
export const SlashTableExtension = Extension.create({
  name: 'slashTable',

  // ─── Enter 키 트리거 ──────────────────────────────────────
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor
        const { selection } = state
        if (!selection.empty) return false

        const { $from } = selection
        const lineText = state.doc.textBetween($from.start(), $from.pos)
        const match = lineText.match(/^\/table(\d+)[x:](\d+)$/)
        if (!match) return false

        const rows = Math.max(1, Math.min(parseInt(match[1], 10), 20))
        const cols = Math.max(1, Math.min(parseInt(match[2], 10), 20))

        this.editor
          .chain()
          .deleteRange({ from: $from.start(), to: $from.pos })
          .insertTable({ rows, cols, withHeaderRow: true })
          .run()

        return true
      },
    }
  },

  // ─── 스페이스 트리거 (InputRule) ─────────────────────────
  addInputRules() {
    return [
      new InputRule({
        find: /\/table(\d+)[x:](\d+) $/,
        handler: ({ range, match, chain }) => {
          const rows = Math.max(1, Math.min(parseInt(match[1], 10), 20))
          const cols = Math.max(1, Math.min(parseInt(match[2], 10), 20))
          chain()
            .deleteRange(range)
            .insertTable({ rows, cols, withHeaderRow: true })
            .run()
        },
      }),
    ]
  },
})
