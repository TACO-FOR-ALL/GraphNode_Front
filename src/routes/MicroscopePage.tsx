import { useState, useMemo, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAgentToolBoxStore } from "@/store/useAgentToolBoxStore";
import { TbMicroscope, TbChevronRight, TbChevronDown } from "react-icons/tb";
import MicroScopeVisualization from "@/components/microscope/MicroScopeVisualization";
import ToggleSidebarExpand from "@/components/sidebar/ToggleSidebarExpand";
import { api } from "@/apiClient";
import { unwrapResponse } from "@/utils/httpResponse";
import { useMicroscopeGenerationStore } from "@/store/useMicroscopeGenerationStore";
import type { MicroscopeWorkspace } from "@taco_tsinghua/graphnode-sdk";

type GraphData = Parameters<typeof MicroScopeVisualization>[0]["data"][number];

/** 이름별로 그룹핑하고 그룹 내/그룹 간 모두 createdAt 내림차순 정렬 */
function groupWorkspaces(
  workspaces: MicroscopeWorkspace[],
): [string, MicroscopeWorkspace[]][] {
  const map = new Map<string, MicroscopeWorkspace[]>();
  for (const ws of workspaces) {
    const list = map.get(ws.name) ?? [];
    list.push(ws);
    map.set(ws.name, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
  const entries = Array.from(map.entries());
  entries.sort(
    ([, a], [, b]) =>
      new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime(),
  );
  return entries;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export default function MicroscopePage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const location = useLocation();
  const { t } = useTranslation();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );

  const { isGenerating, setGenerating } = useMicroscopeGenerationStore();
  const [requested, setRequested] = useState(false);

  const { setIsOpen: setAgentOpen, setMicroscopeNodes, microscopeNodes } = useAgentToolBoxStore();

  const handleCtrlClickNodes = useCallback(
    (nodes: { id: string; name: string; type: string }[]) => {
      setMicroscopeNodes(nodes);
      setAgentOpen(true);
    },
    [setMicroscopeNodes, setAgentOpen],
  );

  const locationState = location.state as {
    graphData?: GraphData;
    nodeTitle?: string;
  } | null;
  const passedGraphData = locationState?.graphData;
  const nodeTitle = locationState?.nodeTitle ?? nodeId;

  // 워크스페이스 목록 조회
  const { data: workspaceList = [] } = useQuery({
    queryKey: ["microscope-workspaces"],
    queryFn: async () => unwrapResponse(await api.microscope.listWorkspaces()),
  });

  // 선택된 워크스페이스의 그래프 데이터 조회
  const { data: workspaceGraphData, isLoading: isGraphLoading } = useQuery({
    queryKey: ["microscope-workspace-graph", selectedWorkspaceId],
    queryFn: async () =>
      unwrapResponse(
        await api.microscope.getWorkspaceGraph(selectedWorkspaceId!),
      ),
    enabled: !!selectedWorkspaceId,
  });

  const groupedWorkspaces = useMemo(
    () => groupWorkspaces(workspaceList),
    [workspaceList],
  );

  const externalContextNodeIds = useMemo(
    () => microscopeNodes?.map((n) => n.id) ?? [],
    [microscopeNodes],
  );

  const handleGroupClick = (name: string) => {
    const entries = groupedWorkspaces.find(([n]) => n === name)?.[1] ?? [];

    if (entries.length === 1) {
      // 단일 항목: 바로 선택
      setSelectedWorkspaceId(entries[0]._id);
      return;
    }

    // 복수 항목: 펼치기/접기 + 펼칠 때 최신 자동 선택
    const isExpanded = expandedGroups.has(name);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      isExpanded ? next.delete(name) : next.add(name);
      return next;
    });
    if (!isExpanded && entries.length > 0) {
      setSelectedWorkspaceId(entries[0]._id);
    }
  };

  const handleRequestAnalysis = async () => {
    if (!nodeId || isGenerating) return;
    setGenerating(true);
    setRequested(true);
    try {
      await api.microscope.ingestFromConversation(nodeId);
    } catch (e) {
      console.error(e);
      setGenerating(false);
    }
  };

  // 표시할 그래프 데이터 결정
  const graphData: GraphData[] =
    selectedWorkspaceId && workspaceGraphData
      ? (workspaceGraphData as unknown as GraphData[])
      : passedGraphData
        ? [passedGraphData]
        : [];

  const selectedWorkspace = workspaceList.find(
    (ws) => ws._id === selectedWorkspaceId,
  );
  const displayTitle = selectedWorkspace?.name ?? nodeTitle;
  const hasContent = graphData.length > 0;

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* 사이드바 */}
      <div
        className={`bg-sidebar-expanded-background border-r border-base-border transition-all duration-300 flex flex-col shrink-0 ${
          isSidebarExpanded ? "w-[259px]" : "w-[40px]"
        }`}
      >
        <ToggleSidebarExpand
          isExpanded={isSidebarExpanded}
          setIsExpanded={setIsSidebarExpanded}
        />

        {isSidebarExpanded && (
          <div className="flex-1 overflow-y-auto">
            {workspaceList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-4 py-8">
                <TbMicroscope
                  size={28}
                  className="text-text-tertiary opacity-40"
                />
                <p className="text-[12px] text-text-tertiary text-center leading-relaxed">
                  {t("microscope.noWorkspaces")}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {groupedWorkspaces.map(([name, entries]) => {
                  const isExpanded = expandedGroups.has(name);
                  const isMultiple = entries.length > 1;
                  const isGroupSelected = entries.some(
                    (e) => e._id === selectedWorkspaceId,
                  );

                  return (
                    <div key={name}>
                      {/* 그룹 헤더 */}
                      <button
                        onClick={() => handleGroupClick(name)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-secondary transition-colors ${
                          isGroupSelected
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {isMultiple ? (
                          isExpanded ? (
                            <TbChevronDown
                              size={13}
                              className="shrink-0 text-text-tertiary"
                            />
                          ) : (
                            <TbChevronRight
                              size={13}
                              className="shrink-0 text-text-tertiary"
                            />
                          )
                        ) : (
                          <TbMicroscope
                            size={13}
                            className="shrink-0 text-text-tertiary"
                          />
                        )}
                        <span className="text-[13px] font-medium truncate flex-1">
                          {name}
                        </span>
                        {isMultiple && (
                          <span className="text-[11px] text-text-tertiary shrink-0">
                            {entries.length}
                          </span>
                        )}
                      </button>

                      {/* 날짜 목록 (복수 항목 + 펼쳐진 경우) */}
                      {isMultiple && isExpanded && (
                        <div className="ml-4 border-l border-base-border">
                          {entries.map((ws, idx) => (
                            <button
                              key={ws._id}
                              onClick={() => setSelectedWorkspaceId(ws._id)}
                              className={`w-full px-3 py-1.5 text-left transition-colors hover:bg-bg-secondary ${
                                ws._id === selectedWorkspaceId
                                  ? "text-primary bg-primary/5"
                                  : "text-text-tertiary"
                              }`}
                            >
                              <span className="text-[11px] truncate">
                                {idx === 0 ? "★ " : ""}
                                {formatDate(ws.createdAt)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {isGraphLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasContent ? (
          <MicroScopeVisualization
            data={graphData}
            title={displayTitle}
            subtitle={t("visualizeDetail.subtitle")}
            onCtrlClickNodes={handleCtrlClickNodes}
            externalContextNodeIds={externalContextNodeIds}
          />
        ) : nodeId ? (
          /* NodeChatPreview에서 진입한 경우 분석 요청 UI */
          <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-bg-primary">
            <div className="flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <TbMicroscope size={32} className="text-primary opacity-60" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[15px] font-semibold text-text-primary">
                  {requested || isGenerating
                    ? t("visualizeDetail.noData.generating")
                    : t("visualizeDetail.noData.title")}
                </p>
                {!requested && !isGenerating && (
                  <p className="text-[13px] text-text-secondary whitespace-pre-line leading-relaxed">
                    {t("visualizeDetail.noData.description")}
                  </p>
                )}
              </div>
              {requested || isGenerating ? (
                <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {t("visualizeDetail.noData.generating")}
                </div>
              ) : (
                <button
                  onClick={handleRequestAnalysis}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <TbMicroscope size={16} />
                  {t("visualizeDetail.noData.requestButton")}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 기본 상태: 사이드바에서 항목 선택 안내 */
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <TbMicroscope size={36} className="text-text-tertiary opacity-30" />
            <p className="text-[13px] text-text-tertiary">
              {t("microscope.selectToView")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
