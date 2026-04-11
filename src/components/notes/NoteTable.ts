import { Table, TableView } from "@tiptap/extension-table";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TableMap } from "@tiptap/pm/tables";

const EDGE_THRESHOLD = 18;

type HoverEdge = "column" | "row" | null;
type GetPos = () => number | undefined;

class NoteTableView extends TableView {
  private editor: Editor;

  private getPosRef: GetPos;

  private columnButton: HTMLButtonElement;

  private rowButton: HTMLButtonElement;

  private activeEdge: HoverEdge = null;

  constructor(
    node: ProseMirrorNode,
    cellMinWidth: number,
    editor: Editor,
    getPos: GetPos,
  ) {
    super(node, cellMinWidth);

    this.editor = editor;
    this.getPosRef = getPos;

    this.dom.classList.add("note-table");
    this.dom.dataset.tableEditable = String(editor.isEditable);
    this.table.classList.add("note-table__table");

    this.columnButton = this.createActionButton("column", "Add column");
    this.rowButton = this.createActionButton("row", "Add row");

    this.dom.append(this.columnButton, this.rowButton);
    this.dom.addEventListener("mousemove", this.handleMouseMove);
    this.dom.addEventListener("mouseleave", this.handleMouseLeave);
  }

  override update(node: ProseMirrorNode) {
    const didUpdate = super.update(node);

    if (didUpdate) {
      this.dom.dataset.tableEditable = String(this.editor.isEditable);
    }

    return didUpdate;
  }

  stopEvent(event: Event) {
    return (
      event.target instanceof HTMLElement &&
      event.target.closest(".note-table__add") !== null
    );
  }

  destroy() {
    this.dom.removeEventListener("mousemove", this.handleMouseMove);
    this.dom.removeEventListener("mouseleave", this.handleMouseLeave);
    this.columnButton.removeEventListener("mousedown", this.handleButtonMouseDown);
    this.columnButton.removeEventListener("click", this.handleButtonClick);
    this.columnButton.removeEventListener(
      "mouseenter",
      this.handleColumnButtonMouseEnter,
    );
    this.rowButton.removeEventListener("mousedown", this.handleButtonMouseDown);
    this.rowButton.removeEventListener("click", this.handleButtonClick);
    this.rowButton.removeEventListener(
      "mouseenter",
      this.handleRowButtonMouseEnter,
    );
  }

  private createActionButton(kind: Exclude<HoverEdge, null>, label: string) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `note-table__add note-table__add--${kind}`;
    button.dataset.action = kind;
    button.setAttribute("aria-label", label);
    button.setAttribute("contenteditable", "false");
    button.innerHTML = '<span aria-hidden="true">+</span>';

    button.addEventListener("mousedown", this.handleButtonMouseDown);
    button.addEventListener("click", this.handleButtonClick);
    button.addEventListener(
      "mouseenter",
      kind === "column"
        ? this.handleColumnButtonMouseEnter
        : this.handleRowButtonMouseEnter,
    );

    return button;
  }

  private setActiveEdge(edge: HoverEdge) {
    this.activeEdge = edge;

    if (edge) {
      this.dom.dataset.hoverEdge = edge;
    } else {
      delete this.dom.dataset.hoverEdge;
    }
  }

  private getAnchorCellPos() {
    const tablePos = this.getPosRef();
    const map = TableMap.get(this.node);

    if (tablePos === undefined) {
      return null;
    }

    if (map.width === 0 || map.height === 0) {
      return null;
    }

    const lastCellPos = map.positionAt(map.height - 1, map.width - 1, this.node);

    return tablePos + 1 + lastCellPos;
  }

  private handleButtonMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  private handleButtonClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const action = (event.currentTarget as HTMLElement | null)?.dataset.action;
    const anchorCell = this.getAnchorCellPos();

    if (anchorCell === null) {
      return;
    }

    const chain = this.editor.chain().focus().setCellSelection({
      anchorCell,
      headCell: anchorCell,
    });

    if (action === "column") {
      chain.addColumnAfter().run();
      this.setActiveEdge("column");
      return;
    }

    if (action === "row") {
      chain.addRowAfter().run();
      this.setActiveEdge("row");
    }
  };

  private handleColumnButtonMouseEnter = () => {
    this.setActiveEdge("column");
  };

  private handleRowButtonMouseEnter = () => {
    this.setActiveEdge("row");
  };

  private handleMouseLeave = () => {
    this.setActiveEdge(null);
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (!this.editor.isEditable) {
      this.setActiveEdge(null);
      return;
    }

    const rect = this.table.getBoundingClientRect();
    const rightDistance = Math.abs(rect.right - event.clientX);
    const bottomDistance = Math.abs(rect.bottom - event.clientY);
    const withinTableY =
      event.clientY >= rect.top - 8 && event.clientY <= rect.bottom + 8;
    const withinTableX =
      event.clientX >= rect.left - 8 && event.clientX <= rect.right + 8;
    const nearRight = withinTableY && rightDistance <= EDGE_THRESHOLD;
    const nearBottom = withinTableX && bottomDistance <= EDGE_THRESHOLD;

    if (!nearRight && !nearBottom) {
      this.setActiveEdge(null);
      return;
    }

    if (nearRight && nearBottom) {
      this.setActiveEdge(rightDistance <= bottomDistance ? "column" : "row");
      return;
    }

    this.setActiveEdge(nearRight ? "column" : "row");
  };
}

export const NoteTable = Table.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      return new NoteTableView(
        node,
        this.options.cellMinWidth,
        editor,
        getPos,
      );
    };
  },
});
