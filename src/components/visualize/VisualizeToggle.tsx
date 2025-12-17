import { useState } from "react";
import Graph3D from "./Graph3D";
import {
  GraphSnapshotDto,
  GraphStatsDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import Graph2D from "./Graph2D";

export default function VisualizeToggle({
  nodeData,
  statisticData,
}: {
  nodeData: GraphSnapshotDto;
  statisticData: GraphStatsDto;
}) {
  const [mode, setMode] = useState<"2d" | "3d">("3d");

  return (
    <div style={{ position: "relative" }}>
      <div className="absolute z-20 top-3 right-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("2d")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: mode === "2d" ? "#eee" : "#fff",
            }}
          >
            2D
          </button>
          <button
            onClick={() => setMode("3d")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: mode === "3d" ? "#eee" : "#fff",
            }}
          >
            3D
          </button>
        </div>
        <div>
          <p>Graph Data</p>
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
      </div>

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
