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

export default function Visualize() {
  const { t } = useTranslation();

  const [nodeData, setNodeData] = useState<GraphSnapshotDto | null>(null);
  const [statisticData, setStatisticData] = useState<GraphStatsDto | undefined>(
    undefined
  );

  useEffect(() => {
    (async () => {
      const resultData = await api.graph.getSnapshot();
      const resultStatistic = await api.graph.getStats();
      console.log(resultData.data);
      // @ts-ignore
      setNodeData(resultData.data);
      // @ts-ignore
      setStatisticData(resultStatistic.data);
    })();
  }, []);

  if (!nodeData || !statisticData) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center gap-5">
        <Lottie
          animationData={loadingAnimation}
          loop={true}
          width={200}
          height={200}
        />
        <div className="text-xl font-medium">{t("visualize.loading")}</div>
      </div>
    );
  }

  return (
    <VisualizeToggle nodeData={nodeData!} statisticData={statisticData!} />
  );
}
