import { api } from "@/apiClient";
import VisualizeToggle from "@/components/visualize/VisualizeToggle";
import {
  GraphSnapshotDto,
  GraphStatsDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/lottie/loading.json";
import { useTranslation } from "react-i18next";
import { Me } from "@/types/Me";
import { useQuery } from "@tanstack/react-query";
import ErrorScreen from "@/components/visualize/Error";
import EmptyGraph from "@/components/visualize/EmptyGraph";

interface GraphData {
  nodeData: GraphSnapshotDto;
  statisticData: GraphStatsDto;
}

export default function Visualize() {
  const { t } = useTranslation();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const meData = await window.keytarAPI.getMe();
      setMe(meData as Me);
    })();
  }, []);

  const {
    data: graphData,
    isLoading,
    error,
    refetch,
  } = useQuery<GraphData>({
    queryKey: ["graphData"],
    queryFn: async () => {
      const [nodes, stats] = await Promise.all([
        // @ts-ignore
        await api.graph.getSnapshot().data,
        // @ts-ignore
        await api.graph.getStats().data,
      ]);

      return {
        nodeData: nodes,
        statisticData: stats,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-5">
        <div className="w-[200px] h-[200px]">
          <Lottie animationData={loadingAnimation} loop={true} />
        </div>
        <div className="text-lg text-primary">{t("visualize.loading")}</div>
      </div>
    );
  }

  if (error) return <ErrorScreen onRetry={() => refetch()} />;

  if (graphData?.statisticData == null) {
    return <EmptyGraph />;
  }

  return (
    <VisualizeToggle
      graphData={graphData}
      avatarUrl={me?.profile?.avatarUrl ?? null}
    />
  );
}
