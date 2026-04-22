export type NoteLinkItem =
  | { type: "note"; noteId: string; noteTitle: string }
  | { type: "heading"; noteId: string; noteTitle: string; headingText: string };

export type SuggestionState = {
  isActive: boolean;
  items: NoteLinkItem[];
  clientRect: (() => DOMRect | null) | null;
  onSelect: ((item: NoteLinkItem) => void) | null;
};

type Listener = (state: SuggestionState) => void;

const empty: SuggestionState = {
  isActive: false,
  items: [],
  clientRect: null,
  onSelect: null,
};

let state: SuggestionState = { ...empty };
const listeners = new Set<Listener>();
let keyDownHandler: ((event: KeyboardEvent) => boolean) | null = null;
let currentNoteId: string | null = null;
let dismissed = false;

function emit() {
  listeners.forEach((l) => l({ ...state }));
}

export function extractHeadings(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => {
      const m = line.match(/^#{1,6}\s+(.+)$/);
      return m ? m[1].trim() : null;
    })
    .filter((h): h is string => h !== null);
}

export const noteLinkStore = {
  get(): SuggestionState {
    return { ...state };
  },

  activate(
    items: NoteLinkItem[],
    clientRect: () => DOMRect | null,
    onSelect: (item: NoteLinkItem) => void,
  ) {
    dismissed = false;
    state = { isActive: true, items, clientRect, onSelect };
    emit();
  },

  update(items: NoteLinkItem[], clientRect: () => DOMRect | null) {
    if (dismissed) return;
    state = { ...state, items, clientRect };
    emit();
  },

  dismiss() {
    dismissed = true;
    state = { ...empty };
    emit();
  },

  deactivate() {
    dismissed = false;
    state = { ...empty };
    emit();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setKeyDownHandler(handler: ((event: KeyboardEvent) => boolean) | null) {
    keyDownHandler = handler;
  },

  handleKeyDown(event: KeyboardEvent): boolean {
    return keyDownHandler?.(event) ?? false;
  },

  setCurrentNoteId(id: string | null) {
    currentNoteId = id;
  },

  getCurrentNoteId(): string | null {
    return currentNoteId;
  },
};
