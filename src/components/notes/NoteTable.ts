import { Table, TableView } from "@tiptap/extension-table";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TableMap } from "@tiptap/pm/tables";

const EDGE_THRESHOLD = 18;

type HoverEdge = "column" | "row" | null;
type GetPos = () => number | undefined;
type EdgeKind = Exclude<HoverEdge, null>;
type EdgeOperation = "add" | "remove";

class NoteTableView extends TableView {
  private editor: Editor;
  private getPosRef: GetPos;

  private columnControls: HTMLDivElement;
  private rowControls: HTMLDivElement;
  private deleteControl: HTMLDivElement;

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

    this.columnControls = this.createActionControls("column");
    this.rowControls = this.createActionControls("row");
    this.deleteControl = this.createDeleteControl();

    this.dom.append(this.columnControls, this.rowControls, this.deleteControl);

    this.dom.addEventListener("mousemove", this.handleMouseMove);
    this.dom.addEventListener("mouseleave", this.handleMouseLeave);
    this.refreshControlState();
  }

  override update(node: ProseMirrorNode) {
    const didUpdate = super.update(node);
    if (didUpdate) {
      this.dom.dataset.tableEditable = String(this.editor.isEditable);
      this.refreshControlState();
    }
    return didUpdate;
  }

  stopEvent(event: Event) {
    return (
      event.target instanceof HTMLElement &&
      event.target.closest(".note-table__controls") !== null
    );
  }

  destroy() {
    this.dom.removeEventListener("mousemove", this.handleMouseMove);
    this.dom.removeEventListener("mouseleave", this.handleMouseLeave);
    this.destroyControls(this.columnControls, this.handleColumnControlsMouseEnter);
    this.destroyControls(this.rowControls, this.handleRowControlsMouseEnter);
    this.deleteControl
      .querySelectorAll<HTMLButtonElement>(".note-table__action")
      .forEach((btn) => {
        btn.removeEventListener("mousedown", this.handleButtonMouseDown);
        btn.removeEventListener("click", this.handleDeleteTableClick);
      });
  }

  // ─── 생성 헬퍼 ───────────────────────────────────────────

  private createDeleteControl() {
    const controls = document.createElement("div");
    controls.className = "note-table__controls note-table__controls--delete";
    controls.setAttribute("contenteditable", "false");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "note-table__action note-table__action--delete";
    btn.setAttribute("aria-label", "Delete table");
    btn.setAttribute("contenteditable", "false");
    btn.innerHTML = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
    btn.addEventListener("mousedown", this.handleButtonMouseDown);
    btn.addEventListener("click", this.handleDeleteTableClick);

    controls.append(btn);
    return controls;
  }

  private createActionButton(
    kind: EdgeKind,
    operation: EdgeOperation,
    label: string,
    symbol: "+" | "−",
  ) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `note-table__action note-table__action--${operation}`;
    button.dataset.edge = kind;
    button.dataset.operation = operation;
    button.setAttribute("aria-label", label);
    button.setAttribute("contenteditable", "false");
    button.innerHTML = `<span aria-hidden="true">${symbol}</span>`;
    button.addEventListener("mousedown", this.handleButtonMouseDown);
    button.addEventListener("click", this.handleButtonClick);
    return button;
  }

  private createActionControls(kind: EdgeKind) {
    const controls = document.createElement("div");
    controls.className = `note-table__controls note-table__controls--${kind}`;
    controls.setAttribute("contenteditable", "false");
    controls.dataset.edge = kind;
    controls.append(
      this.createActionButton(kind, "add", kind === "column" ? "Add column" : "Add row", "+"),
      this.createActionButton(kind, "remove", kind === "column" ? "Remove last column" : "Remove last row", "−"),
    );
    controls.addEventListener(
      "mouseenter",
      kind === "column" ? this.handleColumnControlsMouseEnter : this.handleRowControlsMouseEnter,
    );
    return controls;
  }

  // ─── 상태 관리 ────────────────────────────────────────────

  private setActiveEdge(edge: HoverEdge) {
    if (edge) {
      this.dom.dataset.hoverEdge = edge;
    } else {
      delete this.dom.dataset.hoverEdge;
    }
  }

  private getAnchorCellPos() {
    const tablePos = this.getPosRef();
    const map = TableMap.get(this.node);
    if (tablePos === undefined || map.width === 0 || map.height === 0) return null;
    const lastCellPos = map.positionAt(map.height - 1, map.width - 1, this.node);
    return tablePos + 1 + lastCellPos;
  }

  private refreshControlState() {
    const map = TableMap.get(this.node);
    const colRemoveBtn = this.columnControls.querySelector<HTMLButtonElement>(
      '.note-table__action[data-operation="remove"]',
    );
    const rowRemoveBtn = this.rowControls.querySelector<HTMLButtonElement>(
      '.note-table__action[data-operation="remove"]',
    );
    if (colRemoveBtn) colRemoveBtn.disabled = map.width <= 1;
    if (rowRemoveBtn) rowRemoveBtn.disabled = map.height <= 1;
  }

  private destroyControls(controls: HTMLDivElement, mouseEnterHandler: () => void) {
    controls.removeEventListener("mouseenter", mouseEnterHandler);
    controls.querySelectorAll<HTMLButtonElement>(".note-table__action").forEach((btn) => {
      btn.removeEventListener("mousedown", this.handleButtonMouseDown);
      btn.removeEventListener("click", this.handleButtonClick);
    });
  }

  // ─── 이벤트 핸들러 ────────────────────────────────────────

  private handleButtonMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  private handleDeleteTableClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const pos = this.getPosRef();
    if (pos === undefined) return;
    this.editor.chain().setNodeSelection(pos).deleteSelection().run();
  };

  private handleButtonClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLButtonElement | null;
    const edge = target?.dataset.edge as EdgeKind | undefined;
    const operation = target?.dataset.operation as EdgeOperation | undefined;
    const anchorCell = this.getAnchorCellPos();

    if (anchorCell === null || !edge || !operation || target?.disabled) return;

    const chain = this.editor.chain().focus().setCellSelection({ anchorCell, headCell: anchorCell });

    if (edge === "column" && operation === "add") { chain.addColumnAfter().run(); this.setActiveEdge("column"); return; }
    if (edge === "column" && operation === "remove") { chain.deleteColumn().run(); this.setActiveEdge("column"); return; }
    if (edge === "row" && operation === "add") { chain.addRowAfter().run(); this.setActiveEdge("row"); return; }
    if (edge === "row" && operation === "remove") { chain.deleteRow().run(); this.setActiveEdge("row"); }
  };

  private handleColumnControlsMouseEnter = () => { this.setActiveEdge("column"); };
  private handleRowControlsMouseEnter = () => { this.setActiveEdge("row"); };

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
    const withinTableY = event.clientY >= rect.top - 8 && event.clientY <= rect.bottom + 8;
    const withinTableX = event.clientX >= rect.left - 8 && event.clientX <= rect.right + 8;
    const nearRight = withinTableY && rightDistance <= EDGE_THRESHOLD;
    const nearBottom = withinTableX && bottomDistance <= EDGE_THRESHOLD;

    if (!nearRight && !nearBottom) { this.setActiveEdge(null); return; }
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
      return new NoteTableView(node, this.options.cellMinWidth, editor, getPos);
    };
  },
});
