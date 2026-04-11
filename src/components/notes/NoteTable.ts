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

    this.columnControls = this.createActionControls("column");
    this.rowControls = this.createActionControls("row");

    this.dom.append(this.columnControls, this.rowControls);
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
  }

  private destroyControls(
    controls: HTMLDivElement,
    mouseEnterHandler: () => void,
  ) {
    controls.removeEventListener("mouseenter", mouseEnterHandler);
    controls
      .querySelectorAll<HTMLButtonElement>(".note-table__action")
      .forEach((button) => {
        button.removeEventListener("mousedown", this.handleButtonMouseDown);
        button.removeEventListener("click", this.handleButtonClick);
      });
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
      this.createActionButton(
        kind,
        "add",
        kind === "column" ? "Add column" : "Add row",
        "+",
      ),
      this.createActionButton(
        kind,
        "remove",
        kind === "column" ? "Remove last column" : "Remove last row",
        "−",
      ),
    );

    controls.addEventListener(
      "mouseenter",
      kind === "column"
        ? this.handleColumnControlsMouseEnter
        : this.handleRowControlsMouseEnter,
    );

    return controls;
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

  private refreshControlState() {
    const map = TableMap.get(this.node);
    const columnRemoveButton = this.columnControls.querySelector<HTMLButtonElement>(
      '.note-table__action[data-operation="remove"]',
    );
    const rowRemoveButton = this.rowControls.querySelector<HTMLButtonElement>(
      '.note-table__action[data-operation="remove"]',
    );

    if (columnRemoveButton) {
      columnRemoveButton.disabled = map.width <= 1;
    }

    if (rowRemoveButton) {
      rowRemoveButton.disabled = map.height <= 1;
    }
  }

  private handleButtonMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  private handleButtonClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLButtonElement | null;
    const edge = target?.dataset.edge as EdgeKind | undefined;
    const operation = target?.dataset.operation as EdgeOperation | undefined;
    const anchorCell = this.getAnchorCellPos();

    if (anchorCell === null || !edge || !operation || target?.disabled) {
      return;
    }

    const chain = this.editor.chain().focus().setCellSelection({
      anchorCell,
      headCell: anchorCell,
    });

    if (edge === "column" && operation === "add") {
      chain.addColumnAfter().run();
      this.setActiveEdge("column");
      return;
    }

    if (edge === "column" && operation === "remove") {
      chain.deleteColumn().run();
      this.setActiveEdge("column");
      return;
    }

    if (edge === "row" && operation === "add") {
      chain.addRowAfter().run();
      this.setActiveEdge("row");
      return;
    }

    if (edge === "row" && operation === "remove") {
      chain.deleteRow().run();
      this.setActiveEdge("row");
    }
  };

  private handleColumnControlsMouseEnter = () => {
    this.setActiveEdge("column");
  };

  private handleRowControlsMouseEnter = () => {
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
