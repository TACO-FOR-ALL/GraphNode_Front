import { BubbleMenu } from "@tiptap/react/menus"
import type { Editor } from "@tiptap/core"
import { useState, useRef, useEffect, useCallback } from "react"
import { noteRepo } from "@/managers/noteRepo"
import { noteLinkStore } from "./noteLinkStore"
import type { Note } from "@/types/Note"

import { RiBold, RiItalic, RiUnderline, RiStrikethrough, RiCodeLine, RiLink, RiFileTextLine } from "react-icons/ri"
import { TbMath } from "react-icons/tb"
import { IoChevronDown } from "react-icons/io5"
import { useTranslation } from "react-i18next"

// ─── 색상 팔레트 ─────────────────────────────────────────────

const TEXT_COLORS: Array<{ colorKey: string; value: string | null; swatch: string }> = [
  { colorKey: "default", value: null, swatch: "transparent" },
  { colorKey: "gray", value: "#6b7280", swatch: "#6b7280" },
  { colorKey: "brown", value: "#78350f", swatch: "#78350f" },
  { colorKey: "orange", value: "#ea580c", swatch: "#ea580c" },
  { colorKey: "yellow", value: "#d97706", swatch: "#d97706" },
  { colorKey: "green", value: "#16a34a", swatch: "#16a34a" },
  { colorKey: "blue", value: "#2563eb", swatch: "#2563eb" },
  { colorKey: "purple", value: "#7c3aed", swatch: "#7c3aed" },
  { colorKey: "pink", value: "#db2777", swatch: "#db2777" },
  { colorKey: "red", value: "#dc2626", swatch: "#dc2626" },
]

const BG_COLORS: Array<{ colorKey: string; highlightColor: string | null }> = [
  { colorKey: "default", highlightColor: null },
  { colorKey: "gray", highlightColor: "#f3f4f6" },
  { colorKey: "brown", highlightColor: "#fef3c7" },
  { colorKey: "orange", highlightColor: "#ffedd5" },
  { colorKey: "yellow", highlightColor: "#fef9c3" },
  { colorKey: "greenHighlight", highlightColor: "rgba(134, 239, 172, 0.45)" },
  { colorKey: "blue", highlightColor: "#dbeafe" },
  { colorKey: "purple", highlightColor: "#f3e8ff" },
  { colorKey: "pink", highlightColor: "#fce7f3" },
  { colorKey: "red", highlightColor: "#fee2e2" },
]

const TURN_INTO_OPTIONS = [
  {
    labelKey: "blockTypes.text",
    icon: "P",
    action: (ed: Editor) => ed.chain().focus().setParagraph().run(),
    isActive: (ed: Editor) => ed.isActive("paragraph"),
  },
  {
    labelKey: "blockTypes.heading1",
    icon: "H1",
    action: (ed: Editor) => ed.chain().focus().setHeading({ level: 1 }).run(),
    isActive: (ed: Editor) => ed.isActive("heading", { level: 1 }),
  },
  {
    labelKey: "blockTypes.heading2",
    icon: "H2",
    action: (ed: Editor) => ed.chain().focus().setHeading({ level: 2 }).run(),
    isActive: (ed: Editor) => ed.isActive("heading", { level: 2 }),
  },
  {
    labelKey: "blockTypes.heading3",
    icon: "H3",
    action: (ed: Editor) => ed.chain().focus().setHeading({ level: 3 }).run(),
    isActive: (ed: Editor) => ed.isActive("heading", { level: 3 }),
  },
  {
    labelKey: "blockTypes.heading4",
    icon: "H4",
    action: (ed: Editor) => ed.chain().focus().setHeading({ level: 4 }).run(),
    isActive: (ed: Editor) => ed.isActive("heading", { level: 4 }),
  },
]

// ─── 헬퍼 ────────────────────────────────────────────────────

function getBlockLabel(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "H1"
  if (editor.isActive("heading", { level: 2 })) return "H2"
  if (editor.isActive("heading", { level: 3 })) return "H3"
  if (editor.isActive("heading", { level: 4 })) return "H4"
  return "Aa"
}

// ─── 컴포넌트 ─────────────────────────────────────────────────

type MenuState = null | "turnInto" | "color" | "link" | "noteLink"

interface NoteBubbleMenuProps {
  editor: Editor
}

export function NoteBubbleMenu({ editor }: NoteBubbleMenuProps) {
  const { t } = useTranslation()
  const [openMenu, setOpenMenu] = useState<MenuState>(null)
  const [linkValue, setLinkValue] = useState("")
  const [noteLinkQuery, setNoteLinkQuery] = useState("")
  const [noteLinkResults, setNoteLinkResults] = useState<Note[]>([])

  const savedRangeRef = useRef<{ from: number; to: number }>({ from: 0, to: 0 })
  const isInputOpenRef = useRef(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const noteLinkInputRef = useRef<HTMLInputElement>(null)

  // link / noteLink 인풋이 열려 있는 동안 BubbleMenu가 닫히지 않도록
  useEffect(() => {
    isInputOpenRef.current = openMenu === "link" || openMenu === "noteLink"
  }, [openMenu])

  // 인풋 자동 포커스
  useEffect(() => {
    if (openMenu === "link") {
      setTimeout(() => linkInputRef.current?.focus(), 50)
    } else if (openMenu === "noteLink") {
      setTimeout(() => noteLinkInputRef.current?.focus(), 50)
    }
  }, [openMenu])

  // 노트 검색
  useEffect(() => {
    if (openMenu !== "noteLink") {
      setNoteLinkResults([])
      return
    }
    const currentId = noteLinkStore.getCurrentNoteId()
    noteRepo.getAllNotes().then(notes => {
      const filtered = notes
        .filter(n => n.id !== currentId)
        .filter(n =>
          !noteLinkQuery ||
          (n.title || "").toLowerCase().includes(noteLinkQuery.toLowerCase()),
        )
        .slice(0, 10)
      setNoteLinkResults(filtered)
    })
  }, [noteLinkQuery, openMenu])

  // 메뉴 외부 클릭 시 서브메뉴 닫기
  useEffect(() => {
    if (!openMenu) return
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        isInputOpenRef.current = false
        setOpenMenu(null)
      }
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [openMenu])

  const saveRange = useCallback(() => {
    const { from, to } = editor.state.selection
    savedRangeRef.current = { from, to }
  }, [editor])

  const openLinkMenu = useCallback(() => {
    saveRange()
    isInputOpenRef.current = true
    const linkAttrs = editor.getAttributes("link")
    setLinkValue(linkAttrs.href || "")
    setOpenMenu("link")
  }, [editor, saveRange])

  const openNoteLinkMenu = useCallback(() => {
    saveRange()
    isInputOpenRef.current = true
    setNoteLinkQuery("")
    setOpenMenu("noteLink")
  }, [saveRange])

  const closeMenu = useCallback(() => {
    isInputOpenRef.current = false
    setOpenMenu(null)
    editor.commands.focus()
  }, [editor])

  const applyLink = useCallback(() => {
    const url = linkValue.trim()
    const { from, to } = savedRangeRef.current
    if (!url) {
      editor.chain().focus().setTextSelection({ from, to }).unsetLink().run()
    } else {
      const href = /^https?:\/\//.test(url) ? url : `https://${url}`
      editor.chain().focus().setTextSelection({ from, to }).setLink({ href }).run()
    }
    isInputOpenRef.current = false
    setOpenMenu(null)
    setLinkValue("")
  }, [editor, linkValue])

  const applyNoteLink = useCallback(
    (note: Note) => {
      const { from, to } = savedRangeRef.current
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setLink({ href: `note://${note.id}` })
        .run()
      isInputOpenRef.current = false
      setOpenMenu(null)
      setNoteLinkQuery("")
    },
    [editor],
  )

  const applyMath = useCallback(() => {
    const { from, to } = editor.state.selection
    const text = editor.state.doc.textBetween(from, to, "")
    if (!text.trim()) return
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertInlineMath({ latex: text, pos: from })
      .run()
  }, [editor])

  const applyTextColor = useCallback(
    (color: string | null) => {
      if (color === null) {
        editor.chain().focus().setMark("textStyle", { color: null }).removeEmptyTextStyle().run()
      } else {
        editor.chain().focus().setMark("textStyle", { color }).run()
      }
      setOpenMenu(null)
    },
    [editor],
  )

  const applyBgColor = useCallback(
    (highlightColor: string | null) => {
      if (highlightColor === null) {
        editor.chain().focus().unsetHighlight().run()
      } else {
        editor.chain().focus().toggleHighlight({ color: highlightColor }).run()
      }
      setOpenMenu(null)
    },
    [editor],
  )

  const blockLabel = getBlockLabel(editor)

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ view, state }) => {
        const isChildOfMenu = menuRef.current?.contains(document.activeElement) ?? false
        if (isInputOpenRef.current) return isChildOfMenu || view.hasFocus()
        if (!view.hasFocus() && !isChildOfMenu) return false
        const { selection } = state
        if (selection.empty) return false
        try {
          return state.doc.textBetween(selection.from, selection.to).length > 0
        } catch {
          return false
        }
      }}
    >
      <div ref={menuRef} className="bubble-menu">
        {/* 전환 (Turn Into) */}
        <div className="bubble-menu__section">
          <button
            className={`bubble-menu__btn${openMenu === "turnInto" ? " bubble-menu__btn--active" : ""}`}
            onMouseDown={e => {
              e.preventDefault()
              setOpenMenu(prev => (prev === "turnInto" ? null : "turnInto"))
            }}
            data-tooltip={t("notes.bubbleMenu.turnInto")}
          >
            <span className="bubble-menu__block-label">{blockLabel}</span>
            <IoChevronDown size={9} />
          </button>

          {openMenu === "turnInto" && (
            <div className="bubble-menu__dropdown">
              {TURN_INTO_OPTIONS.map(opt => (
                <button
                  key={opt.labelKey}
                  className={`bubble-menu__dropdown-item${opt.isActive(editor) ? " bubble-menu__dropdown-item--active" : ""}`}
                  onMouseDown={e => {
                    e.preventDefault()
                    opt.action(editor)
                    setOpenMenu(null)
                  }}
                >
                  <span className="bubble-menu__dropdown-icon">{opt.icon}</span>
                  <span>{t(`notes.bubbleMenu.${opt.labelKey}`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bubble-menu__sep" />

        {/* 색상 */}
        <div className="bubble-menu__section">
          <button
            className={`bubble-menu__btn${openMenu === "color" ? " bubble-menu__btn--active" : ""}`}
            onMouseDown={e => {
              e.preventDefault()
              setOpenMenu(prev => (prev === "color" ? null : "color"))
            }}
            data-tooltip={t("notes.bubbleMenu.color")}
          >
            <span className="bubble-menu__color-label">A</span>
            <IoChevronDown size={9} />
          </button>

          {openMenu === "color" && (
            <div className="bubble-menu__dropdown bubble-menu__dropdown--color">
              <p className="bubble-menu__color-group-label">{t("notes.bubbleMenu.textColorLabel")}</p>
              <div className="bubble-menu__swatches">
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.colorKey}
                    className="bubble-menu__swatch"
                    title={t(`notes.bubbleMenu.colors.${c.colorKey}`)}
                    style={
                      c.value
                        ? { background: c.value }
                        : { border: "1.5px solid var(--color-base-border)" }
                    }
                    onMouseDown={e => {
                      e.preventDefault()
                      applyTextColor(c.value)
                    }}
                  >
                    {!c.value && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        A
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="bubble-menu__color-group-label" style={{ marginTop: "10px" }}>
                {t("notes.bubbleMenu.bgColorLabel")}
              </p>
              <div className="bubble-menu__swatches">
                {BG_COLORS.map(c => (
                  <button
                    key={c.colorKey}
                    className="bubble-menu__swatch"
                    title={t(`notes.bubbleMenu.colors.${c.colorKey}`)}
                    style={
                      c.highlightColor
                        ? { background: c.highlightColor }
                        : { border: "1.5px solid var(--color-base-border)" }
                    }
                    onMouseDown={e => {
                      e.preventDefault()
                      applyBgColor(c.highlightColor)
                    }}
                  >
                    {!c.highlightColor && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        A
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bubble-menu__sep" />

        {/* Bold */}
        <button
          className={`bubble-menu__btn${editor.isActive("bold") ? " bubble-menu__btn--active" : ""}`}
          onMouseDown={e => {
            e.preventDefault()
            editor.chain().focus().toggleBold().run()
          }}
          data-tooltip={t("notes.bubbleMenu.bold")}
        >
          <RiBold size={14} />
        </button>

        {/* Italic */}
        <button
          className={`bubble-menu__btn${editor.isActive("italic") ? " bubble-menu__btn--active" : ""}`}
          onMouseDown={e => {
            e.preventDefault()
            editor.chain().focus().toggleItalic().run()
          }}
          data-tooltip={t("notes.bubbleMenu.italic")}
        >
          <RiItalic size={14} />
        </button>

        {/* Underline */}
        <button
          className={`bubble-menu__btn${editor.isActive("underline") ? " bubble-menu__btn--active" : ""}`}
          onMouseDown={e => {
            e.preventDefault()
            editor.chain().focus().toggleUnderline().run()
          }}
          data-tooltip={t("notes.bubbleMenu.underline")}
        >
          <RiUnderline size={14} />
        </button>

        {/* Strike */}
        <button
          className={`bubble-menu__btn${editor.isActive("strike") ? " bubble-menu__btn--active" : ""}`}
          onMouseDown={e => {
            e.preventDefault()
            editor.chain().focus().toggleStrike().run()
          }}
          data-tooltip={t("notes.bubbleMenu.strike")}
        >
          <RiStrikethrough size={14} />
        </button>

        <div className="bubble-menu__sep" />

        {/* Inline Code */}
        <button
          className={`bubble-menu__btn${editor.isActive("code") ? " bubble-menu__btn--active" : ""}`}
          onMouseDown={e => {
            e.preventDefault()
            editor.chain().focus().toggleCode().run()
          }}
          data-tooltip={t("notes.bubbleMenu.inlineCode")}
        >
          <RiCodeLine size={14} />
        </button>

        {/* Math */}
        <button
          className="bubble-menu__btn"
          onMouseDown={e => {
            e.preventDefault()
            applyMath()
          }}
          data-tooltip={t("notes.bubbleMenu.math")}
        >
          <TbMath size={15} />
        </button>

        <div className="bubble-menu__sep" />

        {/* Link */}
        <div className="bubble-menu__section">
          <button
            className={`bubble-menu__btn${
              editor.isActive("link") || openMenu === "link"
                ? " bubble-menu__btn--active"
                : ""
            }`}
            onMouseDown={e => {
              e.preventDefault()
              openLinkMenu()
            }}
            data-tooltip={t("notes.bubbleMenu.link")}
          >
            <RiLink size={14} />
          </button>

          {openMenu === "link" && (
            <div className="bubble-menu__dropdown bubble-menu__dropdown--input">
              <div className="bubble-menu__input-row">
                <input
                  ref={linkInputRef}
                  className="bubble-menu__text-input"
                  type="text"
                  placeholder={t("notes.bubbleMenu.linkPlaceholder")}
                  value={linkValue}
                  onChange={e => setLinkValue(e.target.value)}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === "Enter") {
                      e.preventDefault()
                      applyLink()
                    }
                    if (e.key === "Escape") closeMenu()
                  }}
                />
                <button
                  className="bubble-menu__apply-btn"
                  onMouseDown={e => {
                    e.preventDefault()
                    applyLink()
                  }}
                >
                  {t("notes.bubbleMenu.linkApply")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Note Link */}
        <div className="bubble-menu__section">
          <button
            className={`bubble-menu__btn${openMenu === "noteLink" ? " bubble-menu__btn--active" : ""}`}
            onMouseDown={e => {
              e.preventDefault()
              openNoteLinkMenu()
            }}
            data-tooltip={t("notes.bubbleMenu.noteLink")}
          >
            <RiFileTextLine size={14} />
          </button>

          {openMenu === "noteLink" && (
            <div className="bubble-menu__dropdown bubble-menu__dropdown--note-link">
              <div className="bubble-menu__input-row">
                <input
                  ref={noteLinkInputRef}
                  className="bubble-menu__text-input"
                  type="text"
                  placeholder={t("notes.bubbleMenu.noteLinkPlaceholder")}
                  value={noteLinkQuery}
                  onChange={e => setNoteLinkQuery(e.target.value)}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === "Escape") closeMenu()
                  }}
                />
              </div>
              <div className="bubble-menu__note-list">
                {noteLinkResults.length === 0 ? (
                  <div className="bubble-menu__note-empty">
                    {noteLinkQuery ? t("notes.bubbleMenu.noteLinkNoResults") : t("notes.bubbleMenu.noteLinkEmpty")}
                  </div>
                ) : (
                  noteLinkResults.map(note => (
                    <button
                      key={note.id}
                      className="bubble-menu__note-item"
                      onMouseDown={e => {
                        e.preventDefault()
                        applyNoteLink(note)
                      }}
                    >
                      <span className="bubble-menu__note-icon">N</span>
                      <span className="bubble-menu__note-title">
                        {note.title || t("notes.bubbleMenu.noteUntitled")}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </BubbleMenu>
  )
}
