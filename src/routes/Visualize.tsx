import { api } from "@/apiClient";
import VisualizeToggle from "@/components/visualize/VisualizeToggle";
import {
  GraphSnapshotDto,
  GraphStatsDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import { useEffect, useState } from "react";

export default function Visualize() {
  const [nodeData, setNodeData] = useState<GraphSnapshotDto | null>(null);
  const [statisticData, setStatisticData] = useState<GraphStatsDto | undefined>(
    undefined
  );

  useEffect(() => {
    (async () => {
      const resultData = await api.graph.getSnapshot();
      const resultStatistic = await api.graph.getStats();
      console.log(resultData, resultStatistic);
      // @ts-ignore
      setNodeData(resultData.data);
      // @ts-ignore
      setStatisticData(resultStatistic.data);
    })();
  }, []);

  return <VisualizeToggle />;
}
