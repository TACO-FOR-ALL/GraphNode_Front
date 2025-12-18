import { useState } from "react";
import Graph3D from "./Graph3D";
import {
  GraphSnapshotDto,
  GraphStatsDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import Graph2D from "./Graph2D";
import ChevronsDown from "@/assets/icons/ChevronsDown.svg";
import ChevronsUp from "@/assets/icons/ChevronsUp.svg";

export default function VisualizeToggle({
  nodeData,
  statisticData,
}: {
  nodeData: GraphSnapshotDto;
  statisticData: GraphStatsDto;
}) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [toggleTopClutserPanel, setToggleTopClutserPanel] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      {/* 그래프 데이터 정보 */}
      <div className="absolute z-20 bottom-12 left-6 flex flex-col gap-1 text-text-tertiary text-sm">
        <p>Graph Data Info</p>
        <p>Total Nodes: {JSON.stringify(statisticData.nodes)}</p>
        <p>Total Edges: {JSON.stringify(statisticData.edges)}</p>
        <p>Total Clusters: {JSON.stringify(statisticData.clusters)}</p>
        <p>
          Generated At:
          {statisticData.generatedAt
            ? new Date(statisticData.generatedAt).toLocaleString()
            : "N/A"}
        </p>
      </div>

      {/* 2D 모드 클러스터 토글 패널 */}
      {mode === "2d" && (
        <>
          <div
            className="absolute z-20 top-3 left-1/2 -translate-x-1/2 cursor-pointer"
            onClick={() => setToggleTopClutserPanel(!toggleTopClutserPanel)}
          >
            {toggleTopClutserPanel ? (
              <img src={ChevronsUp} alt="ChevronsUp" />
            ) : (
              <img src={ChevronsDown} alt="ChevronsDown" />
            )}
          </div>
          <div
            className={`absolute z-20 top-[46px] left-1/2 -translate-x-1/2 w-[751px] h-[77px] rounded-[20px] bg-[#BADAFF]/10 shadow-[0_2px_20px_#BADAFF] transition-all duration-300 ease-out ${
              toggleTopClutserPanel
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          >
            {/* 패널 내용 추후 추가 */}
          </div>
        </>
      )}

      {/* 2D/3D 모드 토글 패널 */}
      <div className="absolute z-20 top-6 right-6 flex flex-col gap-2">
        <div className="flex gap-1 w-[170px] h-[32px] p-[2px] relative bg-bg-tertiary rounded-md">
          <div
            onClick={() => setMode("2d")}
            className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200 ${
              mode === "2d" ? "text-primary" : "text-text-secondary"
            }`}
          >
            2D
          </div>
          <div
            onClick={() => setMode("3d")}
            className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200  ${
              mode === "3d" ? "text-primary" : "text-text-secondary"
            }`}
          >
            3D
          </div>
          <div
            className={`absolute top-[2px] h-[28px] bg-white border-base-border border-solid border-[1px] rounded-md w-[81px] transition-all duration-300 ease-in-out ${
              mode === "3d" ? "left-[87px]" : "left-[2px]"
            }`}
          ></div>
        </div>
      </div>

      {/* 그래프 렌더링 */}
      {mode === "2d" ? (
        <Graph2D
          rawNodes={nodeData.nodes}
          rawEdges={nodeData.edges}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      ) : (
        <Graph3D data={nodeData} />
      )}
    </div>
  );
}
