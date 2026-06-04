export interface ThemeColorConfig {
  nodeDefault?: string;
  nodeFocus?: string;
  edgeDefault?: string;
  clusterDefault?: string;
}

export interface GraphColorConfigV2 {
  light: ThemeColorConfig;
  dark: ThemeColorConfig;
}

export const GRAPH_COLOR_DEFAULTS: Record<"light" | "dark", Required<ThemeColorConfig>> = {
  light: {
    nodeDefault: "#9090b0",
    nodeFocus: "#4daaff",
    edgeDefault: "#b8b8c8",
    clusterDefault: "#f5f5f5",
  },
  dark: {
    nodeDefault: "#d0cfc8",
    nodeFocus: "#ff8c4a",
    edgeDefault: "#6a6a78",
    clusterDefault: "#1f1f23",
  },
};

const STORAGE_KEY_V2 = "graphnode-graph-colors-v2";

export function getCurrentTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function getStoredGraphColors(): GraphColorConfigV2 {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_V2);
    if (stored) return JSON.parse(stored) as GraphColorConfigV2;
  } catch { /* ignore */ }
  return { light: {}, dark: {} };
}

export function saveGraphColors(theme: "light" | "dark", colors: ThemeColorConfig): void {
  const current = getStoredGraphColors();
  current[theme] = colors;
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(current));
}

export function applyThemeColors(theme: "light" | "dark", colors: ThemeColorConfig): void {
  const root = document.documentElement;
  const defaults = GRAPH_COLOR_DEFAULTS[theme];
  root.style.setProperty("--color-node-default", colors.nodeDefault ?? defaults.nodeDefault);
  root.style.setProperty("--color-node-focus", colors.nodeFocus ?? defaults.nodeFocus);
  root.style.setProperty("--color-edge-default", colors.edgeDefault ?? defaults.edgeDefault);
  root.style.setProperty("--color-cluster-default", colors.clusterDefault ?? defaults.clusterDefault);
}

export function resetGraphColors(theme?: "light" | "dark"): void {
  const stored = getStoredGraphColors();
  if (theme) {
    stored[theme] = {};
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(stored));
    if (theme === getCurrentTheme()) applyThemeColors(theme, {});
  } else {
    localStorage.removeItem(STORAGE_KEY_V2);
    applyThemeColors(getCurrentTheme(), {});
  }
}

let themeObserver: MutationObserver | null = null;

function watchThemeChanges(): void {
  if (themeObserver) return;
  let lastTheme = getCurrentTheme();
  themeObserver = new MutationObserver(() => {
    const newTheme = getCurrentTheme();
    if (newTheme !== lastTheme) {
      lastTheme = newTheme;
      applyThemeColors(newTheme, getStoredGraphColors()[newTheme]);
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

export function loadAndApplyGraphColors(): void {
  const stored = getStoredGraphColors();
  applyThemeColors(getCurrentTheme(), stored[getCurrentTheme()]);
  watchThemeChanges();
}

export function getClusterPalette(): string[] | null {
  try {
    const paletteStr = document.documentElement.style.getPropertyValue("--graph-cluster-palette");
    if (paletteStr) return JSON.parse(paletteStr);
  } catch { /* ignore */ }
  return null;
}
