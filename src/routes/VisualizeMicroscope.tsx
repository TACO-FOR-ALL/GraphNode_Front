import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import MicroScopeVisualization from "@/components/microscope/MicroScopeVisualization";
import { api } from "@/apiClient";
import { TbMicroscope } from "react-icons/tb";

type GraphData = Parameters<typeof MicroScopeVisualization>[0]["data"][number];

export default function VisualizeMicroscope() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [requested, setRequested] = useState(false);

  const locationState = location.state as { graphData?: GraphData; nodeTitle?: string } | null;
  const passedGraphData = locationState?.graphData;
  const nodeTitle = locationState?.nodeTitle ?? nodeId;

  const data: GraphData[] = passedGraphData ? [passedGraphData] : [];

  const handleRequestAnalysis = async () => {
    if (!nodeId || isGenerating) return;
    setIsGenerating(true);
    try {
      await api.microscope.ingestFromConversation(nodeId);
      setRequested(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-bg-primary">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <TbMicroscope size={32} className="text-primary opacity-60" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[15px] font-semibold text-text-primary">
              {requested
                ? t("visualizeDetail.noData.generating")
                : t("visualizeDetail.noData.title")}
            </p>
            {!requested && (
              <p className="text-[13px] text-text-secondary whitespace-pre-line leading-relaxed">
                {t("visualizeDetail.noData.description")}
              </p>
            )}
          </div>
          {requested ? (
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
              {isGenerating
                ? t("visualizeDetail.noData.generating")
                : t("visualizeDetail.noData.requestButton")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <MicroScopeVisualization
        data={data}
        title={nodeTitle}
        subtitle={t("visualizeDetail.subtitle")}
        onBack={() => navigate("/visualize")}
      />
    </div>
  );
}
