// 그래프 색상 유틸리티
// 저장된 커스텀 그래프 색상을 로드하고 적용

interface GraphColorConfig {
  graph: {
    nodeDefault?: string;
    nodeFocus?: string;
    edgeDefault?: string;
    clusterDefault?: string;
    clusterPalette?: string[];
  };
}

const STORAGE_KEY = "graphnode-custom-graph-colors";

/**
 * 저장된 커스텀 그래프 색상을 로드하고 CSS 변수에 적용
 * 앱 시작 시 호출되어야 함
 */
export function loadAndApplyGraphColors(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const config = JSON.parse(stored) as GraphColorConfig;
    applyGraphColors(config);
  } catch (error) {
    console.error("[GraphColors] Failed to load custom colors:", error);
  }
}

/**
 * 그래프 색상 설정을 CSS 변수에 적용
 */
export function applyGraphColors(config: GraphColorConfig): void {
  const root = document.documentElement;
  const { graph } = config;

  if (!graph) return;

  if (graph.nodeDefault) {
    root.style.setProperty("--color-node-default", graph.nodeDefault);
  }
  if (graph.nodeFocus) {
    root.style.setProperty("--color-node-focus", graph.nodeFocus);
  }
  if (graph.edgeDefault) {
    root.style.setProperty("--color-edge-default", graph.edgeDefault);
  }
  if (graph.clusterDefault) {
    root.style.setProperty("--color-cluster-default", graph.clusterDefault);
  }
  if (graph.clusterPalette) {
    root.style.setProperty(
      "--graph-cluster-palette",
      JSON.stringify(graph.clusterPalette)
    );
  }
}

/**
 * 커스텀 색상을 초기화하고 테마 기본값으로 복원
 */
export function resetGraphColors(): void {
  const root = document.documentElement;
  root.style.removeProperty("--color-node-default");
  root.style.removeProperty("--color-node-focus");
  root.style.removeProperty("--color-edge-default");
  root.style.removeProperty("--color-cluster-default");
  root.style.removeProperty("--graph-cluster-palette");
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 커스텀 클러스터 팔레트 가져오기
 * Graph2D에서 사용
 */
export function getClusterPalette(): string[] | null {
  try {
    const paletteStr = document.documentElement.style.getPropertyValue(
      "--graph-cluster-palette"
    );
    if (paletteStr) {
      return JSON.parse(paletteStr);
    }
  } catch {
    // ignore
  }
  return null;
}
