import { useState } from "react";
import frontendGraphHys from "../../constants/frontend_graph_ky.json";
import Graph3D from "./Graph3D";
import ClusterCircleGraph from "./Graph2D";

export default function VisualizeToggle() {
  const [mode, setMode] = useState<"2d" | "3d">("2d");

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 20,
          top: 12,
          right: 12,
          display: "flex",
          gap: 8,
        }}
      >
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

      {mode === "2d" ? (
        <ClusterCircleGraph
          rawNodes={frontendGraphHys.nodes}
          rawEdges={frontendGraphHys.edges}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      ) : (
        <Graph3D data={frontendGraphHys} />
      )}
    </div>
  );
}
