import { api } from "@/apiClient";
import type {
  ClusterCircle,
  PositionedEdge,
  PositionedNode,
} from "@/types/GraphData";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MdAddLink,
  MdArrowBack,
  MdDeleteOutline,
  MdDriveFileMove,
  MdDriveFileRenameOutline,
  MdLinkOff,
  MdSearch,
} from "react-icons/md";

type NodeEditMenuProps = {
  nodeId: number;
  origId: string;
  position: { x: number; y: number };
  onClose: () => void;
  allNodes: PositionedNode[];
  allEdges: PositionedEdge[];
  clusters: ClusterCircle[];
};

type ViewState =
  | { kind: "menu" }
  | { kind: "rename"; label: string }
  | { kind: "move" }
  | { kind: "connect"; selectedClusterId: string | null; query: string }
  | { kind: "disconnect" }
  | { kind: "delete" };

function getNodeLabel(node: PositionedNode) {
  return node.nodeTitle || node.origId;
}

function getClusterKey(node: PositionedNode) {
  return node.clusterName || node.clusterId || "default";
}

export default function NodeEditMenu({
  nodeId,
  origId,
  position,
  onClose,
  allNodes,
  allEdges,
  clusters,
}: NodeEditMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>({ kind: "menu" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [onClose]);

  const currentNode = useMemo(
    () => allNodes.find((n) => n.id === nodeId),
    [allNodes, nodeId],
  );
  // 노드 id로 노드 객체를 O(1)에 찾기 위한 룩업 테이블
  const nodeMap = useMemo(
    () => new Map(allNodes.map((n) => [n.id, n])),
    [allNodes],
  );
  const connectedEdges = useMemo(
    () =>
      allEdges.filter(
        (e) => e.id && (e.source === nodeId || e.target === nodeId),
      ),
    [allEdges, nodeId],
  );
  const connectedNodeIds = useMemo(() => {
    const ids = new Set<number>([nodeId]);
    allEdges.forEach((e) => {
      if (e.source === nodeId) ids.add(e.target);
      if (e.target === nodeId) ids.add(e.source);
    });
    return ids;
  }, [allEdges, nodeId]);
  const availableClusters = useMemo(
    () =>
      clusters.filter(
        (c) =>
          c.clusterId !== (currentNode ? getClusterKey(currentNode) : null),
      ),
    [clusters, currentNode],
  );

  async function run(label: string, action: () => Promise<unknown>) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await action();
      onClose();
    } catch (err) {
      console.error(`[NodeEditMenu] ${label} 실패`, err);
      setSubmitting(false);
    }
  }

  const subHeader = (title: string) => (
    <div className="flex items-center gap-1.5 border-b border-sidebar-button-border px-2 py-1.5">
      <button
        className="rounded p-0.5 text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/10"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => {
          setSubmitting(false);
          setView({ kind: "menu" });
        }}
      >
        <MdArrowBack size={15} />
      </button>
      <span className="text-xs font-semibold text-text-secondary">{title}</span>
    </div>
  );

  const listItem = (
    key: string | number,
    label: string,
    onClick: () => void,
    destructive = false,
  ) => (
    <button
      key={key}
      disabled={submitting}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10 ${
        destructive ? "text-red-400" : "text-text-primary"
      }`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );

  const renderView = () => {
    if (view.kind === "rename") {
      return (
        <>
          {subHeader(t("visualize.nodeEditMenu.rename"))}
          <div className="flex flex-col gap-2 p-2">
            <input
              autoFocus
              className="w-full rounded-md border border-sidebar-button-border bg-bg-primary px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-placeholder outline-none transition-colors focus:border-primary"
              value={view.label}
              placeholder={t("visualize.nodeEditMenu.renamePlaceholder")}
              onChange={(e) =>
                setView({ kind: "rename", label: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && view.label.trim())
                  run("rename", () =>
                    api.graphEditor.updateNode(nodeId, {
                      label: view.label.trim(),
                    }),
                  );
                if (e.key === "Escape") onClose();
              }}
            />
            <div className="flex gap-1.5">
              <button
                disabled={!view.label.trim() || submitting}
                className="flex-1 rounded-md bg-primary py-1 text-xs font-semibold text-white transition-opacity disabled:opacity-40"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() =>
                  view.label.trim() &&
                  run("rename", () =>
                    api.graphEditor.updateNode(nodeId, {
                      label: view.label.trim(),
                    }),
                  )
                }
              >
                {t("visualize.nodeEditMenu.save")}
              </button>
              <button
                className="flex-1 rounded-md border border-sidebar-button-border py-1 text-xs text-text-secondary transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onClose}
              >
                {t("visualize.nodeEditMenu.cancel")}
              </button>
            </div>
          </div>
        </>
      );
    }

    if (view.kind === "move") {
      return (
        <>
          {subHeader(t("visualize.nodeEditMenu.move"))}
          <div className="max-h-48 overflow-y-auto">
            {availableClusters.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-secondary">
                {t("visualize.nodeEditMenu.noClusters")}
              </p>
            ) : (
              availableClusters.map((c) =>
                listItem(c.clusterId, c.clusterName, () => {
                  const realClusterId =
                    allNodes.find((n) => getClusterKey(n) === c.clusterId)
                      ?.clusterId ?? c.clusterId;
                  run("move", () =>
                    api.graphEditor.moveNodeToCluster(nodeId, {
                      newClusterId: realClusterId,
                    }),
                  );
                }),
              )
            )}
          </div>
        </>
      );
    }

    if (view.kind === "connect") {
      // 클러스터 선택 단계
      if (view.selectedClusterId === null) {
        return (
          <>
            {subHeader(t("visualize.nodeEditMenu.connect"))}
            <div className="max-h-48 overflow-y-auto">
              {clusters.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-secondary">
                  {t("visualize.nodeEditMenu.noClusters")}
                </p>
              ) : (
                clusters.map((c) =>
                  listItem(c.clusterId, c.clusterName, () =>
                    setView({
                      kind: "connect",
                      selectedClusterId: c.clusterId,
                      query: "",
                    }),
                  ),
                )
              )}
            </div>
          </>
        );
      }

      // 노드 선택 단계
      const selectedCluster = clusters.find(
        (c) => c.clusterId === view.selectedClusterId,
      );
      const candidates = allNodes.filter(
        (n) =>
          !connectedNodeIds.has(n.id) &&
          getClusterKey(n) === view.selectedClusterId,
      );
      const filtered = view.query
        ? candidates.filter((n) =>
            getNodeLabel(n).toLowerCase().includes(view.query.toLowerCase()),
          )
        : candidates;

      return (
        <>
          <div className="flex items-center gap-1.5 border-b border-sidebar-button-border px-2 py-1.5">
            <button
              className="rounded p-0.5 text-text-secondary transition-colors hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/10"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() =>
                setView({ kind: "connect", selectedClusterId: null, query: "" })
              }
            >
              <MdArrowBack size={15} />
            </button>
            <span className="min-w-0 truncate text-xs font-semibold text-text-secondary">
              {selectedCluster?.clusterName ?? view.selectedClusterId}
            </span>
          </div>
          <div className="border-b border-sidebar-button-border p-2">
            <div className="flex items-center gap-1.5 rounded-md border border-sidebar-button-border bg-bg-primary px-2 py-1">
              <MdSearch size={13} className="shrink-0 text-text-secondary" />
              <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-placeholder outline-none"
                placeholder={t("visualize.nodeEditMenu.searchPlaceholder")}
                value={view.query}
                onChange={(e) =>
                  setView({
                    kind: "connect",
                    selectedClusterId: view.selectedClusterId,
                    query: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-secondary">
                {t("visualize.nodeEditMenu.noNodes")}
              </p>
            ) : (
              filtered.map((n) =>
                listItem(n.id, getNodeLabel(n), () =>
                  run("connect", () =>
                    api.graphEditor.createEdge({
                      source: nodeId,
                      target: n.id,
                      weight: 1.0,
                    }),
                  ),
                ),
              )
            )}
          </div>
        </>
      );
    }

    if (view.kind === "disconnect") {
      return (
        <>
          {subHeader(t("visualize.nodeEditMenu.disconnect"))}
          <div className="max-h-48 overflow-y-auto">
            {connectedEdges.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-secondary">
                {t("visualize.nodeEditMenu.noConnections")}
              </p>
            ) : (
              connectedEdges.map((edge) => {
                const otherId =
                  edge.source === nodeId ? edge.target : edge.source;
                const other = nodeMap.get(otherId);
                const label = other ? getNodeLabel(other) : String(otherId);
                return listItem(edge.id!, label, () =>
                  run("disconnect", () => api.graphEditor.deleteEdge(edge.id!)),
                );
              })
            )}
          </div>
        </>
      );
    }

    if (view.kind === "delete") {
      return (
        <>
          {subHeader(t("visualize.nodeEditMenu.delete"))}
          <div className="flex flex-col gap-2 p-2">
            <p className="text-xs text-text-secondary">
              {t("visualize.nodeEditMenu.deleteMessage")}
            </p>
            <div className="flex gap-1.5">
              <button
                disabled={submitting}
                className="flex-1 rounded-md bg-red-500 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-40"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() =>
                  run("delete", () => api.graphEditor.deleteNode(nodeId, true))
                }
              >
                {t("visualize.nodeEditMenu.confirmDelete")}
              </button>
              <button
                className="flex-1 rounded-md border border-sidebar-button-border py-1 text-xs text-text-secondary transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onClose}
              >
                {t("visualize.nodeEditMenu.cancel")}
              </button>
            </div>
          </div>
        </>
      );
    }

    // Main menu
    const menuItems = [
      {
        icon: MdDriveFileRenameOutline,
        label: t("visualize.nodeEditMenu.rename"),
        onClick: () =>
          setView({
            kind: "rename",
            label: currentNode ? getNodeLabel(currentNode) : origId,
          }),
      },
      {
        icon: MdDriveFileMove,
        label: t("visualize.nodeEditMenu.move"),
        onClick: () => setView({ kind: "move" }),
      },
      {
        icon: MdAddLink,
        label: t("visualize.nodeEditMenu.connect"),
        onClick: () =>
          setView({ kind: "connect", selectedClusterId: null, query: "" }),
      },
      {
        icon: MdLinkOff,
        label: t("visualize.nodeEditMenu.disconnect"),
        onClick: () => setView({ kind: "disconnect" }),
      },
      {
        icon: MdDeleteOutline,
        label: t("visualize.nodeEditMenu.delete"),
        onClick: () => setView({ kind: "delete" }),
        destructive: true,
      },
    ];

    return menuItems.map(({ icon: Icon, label, onClick, destructive }) => (
      <button
        key={label}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
          destructive ? "text-red-400" : "text-text-primary"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onClick}
      >
        <Icon size={16} />
        <span>{label}</span>
      </button>
    ));
  };

  // 선택된 액션이 있을 때만 기존 액션 리스트 위에 덮여서 생성
  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-52 overflow-hidden rounded-lg border border-sidebar-button-border bg-sidebar-expanded-background shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {renderView()}
    </div>
  );
}
