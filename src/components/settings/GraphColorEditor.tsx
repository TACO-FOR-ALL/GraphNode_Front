import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiRefreshCw } from "react-icons/fi";
import {
  GRAPH_COLOR_DEFAULTS,
  ThemeColorConfig,
  GraphColorConfigV2,
  getStoredGraphColors,
  saveGraphColors,
  applyThemeColors,
  getCurrentTheme,
} from "@/utils/graphColors";

type ThemeKey = "light" | "dark";
type ColorField = keyof Required<ThemeColorConfig>;

// ── 프리셋 정의 (테이블 그대로) ─────────────────────────────
const PRESET_V1: Record<ThemeKey, Required<ThemeColorConfig>> = {
  light: { nodeDefault: "#bcbcbc", nodeFocus: "#badaff", edgeDefault: "#d6d6d6", clusterDefault: "#f5f5f5" },
  dark:  { nodeDefault: "#ebeae2", nodeFocus: "#ef7235", edgeDefault: "#4a4a4f", clusterDefault: "#1f1f23" },
};

const PRESET_V2: Record<ThemeKey, Required<ThemeColorConfig>> = {
  light: { nodeDefault: "#9090b0", nodeFocus: "#4daaff", edgeDefault: "#b8b8c8", clusterDefault: "#f5f5f5" },
  dark:  { nodeDefault: "#d0cfc8", nodeFocus: "#ff8c4a", edgeDefault: "#6a6a78", clusterDefault: "#1f1f23" },
};

const PRESETS = { v1: PRESET_V1, v2: PRESET_V2 } as const;
type PresetKey = keyof typeof PRESETS;

const COLOR_FIELDS: ColorField[] = ["nodeDefault", "nodeFocus", "edgeDefault", "clusterDefault"];

function themeMatchesPreset(colors: ThemeColorConfig, preset: Required<ThemeColorConfig>): boolean {
  return COLOR_FIELDS.every(
    (k) => (colors[k] ?? preset[k]) === preset[k],
  );
}

function detectActivePreset(stored: GraphColorConfigV2): PresetKey | null {
  for (const [key, preset] of Object.entries(PRESETS) as [PresetKey, Record<ThemeKey, Required<ThemeColorConfig>>][]) {
    if (
      themeMatchesPreset(stored.light ?? {}, preset.light) &&
      themeMatchesPreset(stored.dark ?? {}, preset.dark)
    ) return key;
  }
  return null;
}

// ── 컴포넌트 ─────────────────────────────────────────────────
export default function GraphColorEditor() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ThemeKey>(getCurrentTheme());
  const [stored, setStored] = useState<GraphColorConfigV2>({ light: {}, dark: {} });

  useEffect(() => {
    const s = getStoredGraphColors();
    setStored({ light: s.light ?? {}, dark: s.dark ?? {} });
    setActiveTab(getCurrentTheme());
  }, []);

  const activePreset = detectActivePreset(stored);

  // V1 / V2 통째로 적용
  const handleApplyPreset = useCallback((presetKey: PresetKey) => {
    const preset = PRESETS[presetKey];
    const next: GraphColorConfigV2 = { light: { ...preset.light }, dark: { ...preset.dark } };
    setStored(next);
    saveGraphColors("light", next.light);
    saveGraphColors("dark", next.dark);
    applyThemeColors(getCurrentTheme(), next[getCurrentTheme()]);
  }, []);

  // 개별 필드 변경
  const handleChange = useCallback((theme: ThemeKey, field: ColorField, value: string) => {
    setStored((prev) => {
      const next = { ...prev, [theme]: { ...prev[theme], [field]: value } };
      saveGraphColors(theme, next[theme]);
      if (theme === getCurrentTheme()) applyThemeColors(theme, next[theme]);
      return next;
    });
  }, []);

  // 필드 하나 초기화 (GRAPH_COLOR_DEFAULTS 기준)
  const handleResetField = useCallback((theme: ThemeKey, field: ColorField) => {
    setStored((prev) => {
      const next = { ...prev, [theme]: { ...prev[theme] } };
      delete next[theme][field];
      saveGraphColors(theme, next[theme]);
      if (theme === getCurrentTheme()) applyThemeColors(theme, next[theme]);
      return next;
    });
  }, []);

  // 현재 탭 전체 초기화
  const handleResetTab = useCallback((theme: ThemeKey) => {
    setStored((prev) => {
      const next = { ...prev, [theme]: {} };
      saveGraphColors(theme, {});
      if (theme === getCurrentTheme()) applyThemeColors(theme, {});
      return next;
    });
  }, []);

  const getColor = (theme: ThemeKey, field: ColorField) =>
    stored[theme][field] ?? GRAPH_COLOR_DEFAULTS[theme][field];

  const isOverridden = (theme: ThemeKey, field: ColorField) => {
    const v = stored[theme][field];
    return !!v && v !== GRAPH_COLOR_DEFAULTS[theme][field];
  };

  const fieldLabel: Record<ColorField, string> = {
    nodeDefault: t("settings.graphColors.nodeDefault", "Node Default"),
    nodeFocus:   t("settings.graphColors.nodeFocus",   "Node Focus"),
    edgeDefault: t("settings.graphColors.edgeDefault",  "Edge"),
    clusterDefault: t("settings.graphColors.clusterDefault", "Cluster BG"),
  };

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* ── V1 / V2 프리셋 ── */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-bg-secondary border border-base-border">
        <span className="text-xs text-text-tertiary">
          {t("settings.graphColors.preset", "Preset")}
        </span>
        <div className="flex gap-2">
          {(["v1", "v2"] as PresetKey[]).map((pk) => (
            <button
              key={pk}
              onClick={() => handleApplyPreset(pk)}
              className={`flex-1 flex flex-col gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                activePreset === pk
                  ? "border-primary bg-primary/8"
                  : "border-base-border hover:border-text-tertiary/40"
              }`}
            >
              <span className={`text-xs font-semibold ${activePreset === pk ? "text-primary" : "text-text-secondary"}`}>
                {pk === "v1" ? "Version 1" : "Version 2"}
              </span>
              {/* 색상 미리보기 */}
              <div className="flex gap-1.5 flex-wrap">
                {(["light", "dark"] as ThemeKey[]).map((th) =>
                  COLOR_FIELDS.filter((f) => f !== "clusterDefault").map((f) => (
                    <div
                      key={`${th}-${f}`}
                      className="w-3.5 h-3.5 rounded-sm border border-black/10"
                      style={{ backgroundColor: PRESETS[pk][th][f] }}
                      title={`${th} ${f}: ${PRESETS[pk][th][f]}`}
                    />
                  ))
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 테마 탭 ── */}
      <div className="flex rounded-lg border border-base-border overflow-hidden text-sm">
        {(["light", "dark"] as ThemeKey[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 transition-colors ${
              activeTab === tab
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            {t(`settings.appearance.theme.${tab}`)}
          </button>
        ))}
      </div>

      {/* ── 개별 색상 커스텀 ── */}
      <div className="flex flex-col gap-2">
        {COLOR_FIELDS.map((field) => {
          const v1Color   = PRESET_V1[activeTab][field];
          const v2Color   = PRESET_V2[activeTab][field];
          const current   = getColor(activeTab, field);
          const overridden = isOverridden(activeTab, field);

          return (
            <div key={field} className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-bg-secondary">
              <span className="text-sm text-text-secondary w-28 shrink-0">{fieldLabel[field]}</span>

              {/* V1 */}
              <div
                className="w-5 h-5 rounded border border-base-border shrink-0 cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: v1Color }}
                title={`V1: ${v1Color}`}
                onClick={() => handleChange(activeTab, field, v1Color)}
              />

              {/* V2 */}
              <div
                className="w-5 h-5 rounded border border-base-border shrink-0 cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: v2Color }}
                title={`V2: ${v2Color}`}
                onClick={() => handleChange(activeTab, field, v2Color)}
              />

              <span className="text-text-tertiary text-xs mx-0.5">|</span>

              {/* 커스텀 컬러 피커 */}
              <label className="relative cursor-pointer shrink-0">
                <div
                  className={`w-5 h-5 rounded border-2 transition-colors ${
                    overridden ? "border-primary" : "border-dashed border-base-border"
                  }`}
                  style={{ backgroundColor: current }}
                  title={`Custom: ${current}`}
                />
                <input
                  type="color"
                  value={current}
                  onChange={(e) => handleChange(activeTab, field, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
              <span className={`text-[10px] font-mono w-16 shrink-0 ${overridden ? "text-text-primary" : "text-text-tertiary"}`}>
                {current}
              </span>

              {overridden && (
                <button
                  onClick={() => handleResetField(activeTab, field)}
                  className="ml-auto text-text-tertiary hover:text-text-primary transition-colors"
                  title="Reset"
                >
                  <FiRefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => handleResetTab(activeTab)}
        className="self-start flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
      >
        <FiRefreshCw className="w-3 h-3" />
        {t("settings.graphColors.reset")}
      </button>
    </div>
  );
}
