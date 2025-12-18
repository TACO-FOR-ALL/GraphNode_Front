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

export default function Visualize() {
  const { t } = useTranslation();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const meData = await window.keytarAPI.getMe();
      setMe(meData as Me);
    })();
  }, []);

  const [nodeData, setNodeData] = useState<GraphSnapshotDto | null>(null);
  const [statisticData, setStatisticData] = useState<GraphStatsDto | undefined>(
    undefined
  );

  useEffect(() => {
    (async () => {
      const resultData = await api.graph.getSnapshot();
      const resultStatistic = await api.graph.getStats();
      // @ts-ignore
      setNodeData(resultData.data);
      // @ts-ignore
      setStatisticData(resultStatistic.data);
    })();
  }, []);

  if (!nodeData || !statisticData) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-5">
        <div className="w-[200px] h-[200px]">
          <Lottie animationData={loadingAnimation} loop={true} />
        </div>
        <div className="text-lg text-primary">{t("visualize.loading")}</div>
      </div>
    );
  }

  return (
    <VisualizeToggle
      nodeData={nodeData!}
      statisticData={statisticData!}
      avatarUrl={me?.profile?.avatarUrl ?? null}
    />
  );
}
