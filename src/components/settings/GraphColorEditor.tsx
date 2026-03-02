// 그래프 색상 커스터마이징 에디터 (개발자 모드)
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiSave, FiAlertCircle, FiCheck, FiRefreshCw } from "react-icons/fi";

interface GraphColorConfig {
  graph: {
    nodeDefault: string;
    nodeFocus: string;
    edgeDefault: string;
    clusterDefault: string;
    clusterPalette?: string[];
  };
}

// 기본 색상 (테마별)
const DEFAULT_COLORS: Record<string, GraphColorConfig["graph"]> = {
  light: {
    nodeDefault: "#bcbcbc",
    nodeFocus: "#badaff",
    edgeDefault: "#d6d6d6",
    clusterDefault: "#f5f5f5",
    clusterPalette: [
      "#4aa8c0",
      "#e74c3c",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#16a085",
      "#e84393",
      "#2d98da",
      "#ff9f43",
    ],
  },
  dark: {
    nodeDefault: "#ebeae2",
    nodeFocus: "#ef7235",
    edgeDefault: "#4a4a4f",
    clusterDefault: "#1f1f23",
    clusterPalette: [
      "#4aa8c0",
      "#e74c3c",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#16a085",
      "#e84393",
      "#2d98da",
      "#ff9f43",
    ],
  },
};

const STORAGE_KEY = "graphnode-custom-graph-colors";

// JSON 템플릿
const createTemplate = (theme: "light" | "dark") => {
  const colors = DEFAULT_COLORS[theme];
  return JSON.stringify({ graph: colors }, null, 2);
};

export default function GraphColorEditor() {
  const { t } = useTranslation();
  const [jsonValue, setJsonValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 현재 테마 감지
  const getCurrentTheme = (): "light" | "dark" => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  };

  // 저장된 색상 또는 기본값 로드
  const loadColors = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setJsonValue(stored);
        applyColors(JSON.parse(stored));
      } else {
        const theme = getCurrentTheme();
        setJsonValue(createTemplate(theme));
      }
    } catch {
      const theme = getCurrentTheme();
      setJsonValue(createTemplate(theme));
    }
  }, []);

  useEffect(() => {
    loadColors();
  }, [loadColors]);

  // CSS 변수 적용
  const applyColors = (config: GraphColorConfig) => {
    const root = document.documentElement;
    const { graph } = config;

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

    // 클러스터 팔레트는 커스텀 속성으로 저장 (Graph2D에서 읽어서 사용)
    if (graph.clusterPalette) {
      root.style.setProperty(
        "--graph-cluster-palette",
        JSON.stringify(graph.clusterPalette)
      );
    }
  };

  // JSON 유효성 검사
  const validateJson = (value: string): { valid: boolean; config?: GraphColorConfig; error?: string } => {
    try {
      const parsed = JSON.parse(value) as GraphColorConfig;

      if (!parsed.graph || typeof parsed.graph !== "object") {
        return { valid: false, error: t("settings.graphColors.errorGraphObject") };
      }

      // 색상 형식 검증 (hex color)
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      const colors = parsed.graph;

      if (colors.nodeDefault && !hexColorRegex.test(colors.nodeDefault)) {
        return { valid: false, error: t("settings.graphColors.errorInvalidColor", { field: "nodeDefault" }) };
      }
      if (colors.nodeFocus && !hexColorRegex.test(colors.nodeFocus)) {
        return { valid: false, error: t("settings.graphColors.errorInvalidColor", { field: "nodeFocus" }) };
      }
      if (colors.edgeDefault && !hexColorRegex.test(colors.edgeDefault)) {
        return { valid: false, error: t("settings.graphColors.errorInvalidColor", { field: "edgeDefault" }) };
      }
      if (colors.clusterDefault && !hexColorRegex.test(colors.clusterDefault)) {
        return { valid: false, error: t("settings.graphColors.errorInvalidColor", { field: "clusterDefault" }) };
      }

      if (colors.clusterPalette) {
        if (!Array.isArray(colors.clusterPalette)) {
          return { valid: false, error: t("settings.graphColors.errorPaletteArray") };
        }
        for (const color of colors.clusterPalette) {
          if (!hexColorRegex.test(color)) {
            return { valid: false, error: t("settings.graphColors.errorInvalidPaletteColor") };
          }
        }
      }

      return { valid: true, config: parsed };
    } catch {
      return { valid: false, error: t("settings.mcp.json.errorParse") };
    }
  };

  // 저장 핸들러
  const handleSave = async () => {
    const validation = validateJson(jsonValue);

    if (!validation.valid) {
      setError(validation.error || "Invalid JSON");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      localStorage.setItem(STORAGE_KEY, jsonValue);
      applyColors(validation.config!);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setError(t("settings.mcp.json.errorSave"));
    } finally {
      setIsSaving(false);
    }
  };

  // 기본값으로 초기화
  const handleReset = () => {
    const theme = getCurrentTheme();
    const defaultJson = createTemplate(theme);
    setJsonValue(defaultJson);
    localStorage.removeItem(STORAGE_KEY);

    // CSS 변수 초기화 (원래 테마 색상으로 복원)
    const root = document.documentElement;
    root.style.removeProperty("--color-node-default");
    root.style.removeProperty("--color-node-focus");
    root.style.removeProperty("--color-edge-default");
    root.style.removeProperty("--color-cluster-default");
    root.style.removeProperty("--graph-cluster-palette");

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // 텍스트 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonValue(e.target.value);
    setError(null);
    setSaveSuccess(false);
  };

  // 키보드 단축키 (Cmd/Ctrl + S)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 에디터 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          {t("settings.graphColors.hint")}
        </p>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <FiCheck className="w-3 h-3" />
              {t("settings.mcp.json.saved")}
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-base-border text-text-secondary hover:bg-bg-tertiary transition-colors text-sm"
          >
            <FiRefreshCw className="w-4 h-4" />
            {t("settings.graphColors.reset")}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors text-sm"
          >
            <FiSave className="w-4 h-4" />
            {isSaving ? t("settings.my.api.saving") : t("settings.my.api.save")}
          </button>
        </div>
      </div>

      {/* 색상 미리보기 */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-bg-secondary border border-base-border">
        <span className="text-xs text-text-secondary">{t("settings.graphColors.preview")}:</span>
        <div className="flex items-center gap-2">
          {(() => {
            try {
              const config = JSON.parse(jsonValue) as GraphColorConfig;
              return (
                <>
                  <div
                    className="w-6 h-6 rounded-full border border-base-border"
                    style={{ backgroundColor: config.graph?.nodeDefault || "#bcbcbc" }}
                    title="Node Default"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-base-border"
                    style={{ backgroundColor: config.graph?.nodeFocus || "#badaff" }}
                    title="Node Focus"
                  />
                  <div
                    className="w-6 h-1 rounded border border-base-border"
                    style={{ backgroundColor: config.graph?.edgeDefault || "#d6d6d6" }}
                    title="Edge"
                  />
                  <div
                    className="w-8 h-6 rounded border border-base-border"
                    style={{ backgroundColor: config.graph?.clusterDefault || "#f5f5f5" }}
                    title="Cluster"
                  />
                </>
              );
            } catch {
              return <span className="text-xs text-text-tertiary">-</span>;
            }
          })()}
        </div>
      </div>

      {/* JSON 에디터 */}
      <textarea
        value={jsonValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className={`w-full h-[300px] px-4 py-3 rounded-lg border font-mono text-sm resize-none focus:outline-none focus:ring-2 transition-colors
          ${error
            ? "border-red-500 bg-red-500/5 focus:ring-red-500/50"
            : "border-base-border bg-bg-secondary text-text-primary focus:ring-primary/50"
          }`}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30">
          <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* 도움말 */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-base-border">
        <h4 className="text-sm font-medium text-text-primary mb-2">
          {t("settings.graphColors.formatTitle")}
        </h4>
        <pre className="text-xs text-text-tertiary font-mono overflow-x-auto">
{`{
  "graph": {
    "nodeDefault": "#bcbcbc",   // 기본 노드 색상
    "nodeFocus": "#badaff",     // 포커스 노드 색상
    "edgeDefault": "#d6d6d6",   // 엣지 색상
    "clusterDefault": "#f5f5f5", // 클러스터 배경
    "clusterPalette": [         // 클러스터별 노드 색상
      "#4aa8c0", "#e74c3c", ...
    ]
  }
}`}
        </pre>
      </div>
    </div>
  );
}
