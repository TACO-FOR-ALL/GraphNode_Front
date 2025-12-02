import { GraphData } from "@/types/GraphData";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
} from "d3-force-3d";

type SimNode = {
  id: string;
  clusterId: string;
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
};

type SimLink = {
  source: SimNode | string;
  target: SimNode | string;
};

type ClusterInfo = {
  center: THREE.Vector3;
  radius: number;
  nodeIds: string[];
};

export default function Graph3D({ data }: { data: GraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvasRef.current,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    controls.minDistance = 6;
    controls.maxDistance = 60;

    const clusterColors: Record<string, number> = {
      cluster_1: 0x4aa8c0,
      cluster_2: 0xe74c3c,
      cluster_3: 0x2ecc71,
      cluster_4: 0xf39c12,
      cluster_5: 0x9b59b6,
    };
    const defaultNodeColor = 0x767676;
    const focusColor = 0xff4d4f;
    const hoverColor = 0xffcc00;
    const intraEdgeColor = 0xb3b3b3;

    const clusters = new Map<string, ClusterInfo>();

    data.nodes.forEach((n) => {
      const cid = (n.cluster_id ?? "default") as string;
      if (!clusters.has(cid)) {
        clusters.set(cid, {
          center: new THREE.Vector3(0, 0, 0),
          radius: 0,
          nodeIds: [],
        });
      }
      clusters.get(cid)!.nodeIds.push(String(n.id));
    });

    const clusterIds = Array.from(clusters.keys());
    const bigRadius = 18;

    clusterIds.forEach((cid, idx) => {
      const info = clusters.get(cid)!;
      const angle = (idx / clusterIds.length) * Math.PI * 2;

      const center = new THREE.Vector3(
        Math.cos(angle) * bigRadius,
        Math.sin(angle) * bigRadius * 0.4,
        Math.sin(angle * 0.7) * bigRadius * 1.0
      );
      const base = 2.2;
      const scale = 0.7;
      const radius = base + scale * Math.sqrt(info.nodeIds.length);

      info.center = center;
      info.radius = radius;
    });

    const simNodes: SimNode[] = [];
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeEntryMap: Record<
      string,
      { sim: SimNode; mesh: THREE.Mesh; clusterId: string }
    > = {};

    const clusterCounters = new Map<string, number>();
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    data.nodes.forEach((node) => {
      const id = String(node.id);
      const cid = (node.cluster_id ?? "default") as string;
      const cluster = clusters.get(cid)!;

      const count = clusterCounters.get(cid) ?? 0;
      const n = cluster.nodeIds.length;
      const t = count + 0.5;
      clusterCounters.set(cid, count + 1);

      const y = 1 - (2 * t) / n;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * t;

      const localX = Math.cos(theta) * r;
      const localZ = Math.sin(theta) * r;
      const localY = y;

      const sphereRadius = cluster.radius * 0.75;
      const worldX = cluster.center.x + localX * sphereRadius;
      const worldY = cluster.center.y + localY * sphereRadius;
      const worldZ = cluster.center.z + localZ * sphereRadius;

      const sim: SimNode = {
        id,
        clusterId: cid,
        x: worldX,
        y: worldY,
        z: worldZ,
      };
      simNodes.push(sim);

      const color =
        (cid in clusterColors ? clusterColors[cid] : defaultNodeColor) ??
        defaultNodeColor;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 16, 16),
        new THREE.MeshBasicMaterial({ color })
      );
      mesh.position.set(worldX, worldY, worldZ);
      mesh.userData.id = id;
      mesh.userData.clusterId = cid;

      scene.add(mesh);
      nodeMeshes.push(mesh);
      nodeEntryMap[id] = { sim, mesh, clusterId: cid };
    });

    const simLinks: SimLink[] = data.edges.map((e) => ({
      source: String(e.source),
      target: String(e.target),
    }));

    type EdgeObj = {
      line: THREE.Line;
      sourceId: string;
      targetId: string;
      isIntra: boolean;
    };

    const edgeObjs: EdgeObj[] = [];

    data.edges.forEach((edge) => {
      const sId = String(edge.source);
      const tId = String(edge.target);
      const sNode = data.nodes.find((n) => String(n.id) === sId);
      const tNode = data.nodes.find((n) => String(n.id) === tId);
      if (!sNode || !tNode) return;

      const sCid = (sNode.cluster_id ?? "default") as string;
      const tCid = (tNode.cluster_id ?? "default") as string;
      const isIntra = sCid === tCid;

      const mat = new THREE.LineBasicMaterial({
        color: isIntra ? intraEdgeColor : focusColor,
        transparent: true,
        opacity: isIntra ? 0.6 : 0.9,
      });

      const a = nodeEntryMap[sId].mesh.position;
      const b = nodeEntryMap[tId].mesh.position;
      const geom = new THREE.BufferGeometry().setFromPoints([
        a.clone(),
        b.clone(),
      ]);

      const line = new THREE.Line(geom, mat);
      line.visible = isIntra;

      scene.add(line);
      edgeObjs.push({ line, sourceId: sId, targetId: tId, isIntra });
    });

    const clusterSphereForce = () => {
      let nodes: SimNode[] = [];

      function force() {
        nodes.forEach((n) => {
          const info = clusters.get(n.clusterId);
          if (!info) return;
          const { center, radius } = info;

          const dx = n.x - center.x;
          const dy = n.y - center.y;
          const dz = n.z - center.z;
          let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;

          const targetR = radius * 0.9;

          const strength = 0.3;
          const delta = (targetR - dist) * strength;

          const ux = dx / dist;
          const uy = dy / dist;
          const uz = dz / dist;

          const damping = 0.9;
          n.vx = (n.vx ?? 0) * damping + ux * delta;
          n.vy = (n.vy ?? 0) * damping + uy * delta;
          n.vz = (n.vz ?? 0) * damping + uz * delta;
        });
      }

      (force as any).initialize = (ns: SimNode[]) => {
        nodes = ns;
      };

      return force as any;
    };
    const simulation = forceSimulation(simNodes as any)
      .force("charge", forceManyBody().strength(-5))
      //.force("center", forceCenter(0, 0, 0))
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => (d as SimNode).id)
          .distance((l: any) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            if (!s.clusterId || !t.clusterId) return 4;
            return s.clusterId === t.clusterId ? 2.5 : 9.0;
          })
          .strength((l: any) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            if (!s.clusterId || !t.clusterId) return 0.08;
            return s.clusterId === t.clusterId ? 0.12 : 0.04;
          })
      )
      .force("collide", forceCollide().radius(0.4).iterations(2))
      .force("clusterSphere", clusterSphereForce())
      .alpha(0.6)
      .restart();

    simulation.on("tick", () => {
      simNodes.forEach((n) => {
        const entry = nodeEntryMap[n.id];
        if (!entry) return;
        entry.mesh.position.set(n.x, n.y, n.z);
      });

      edgeObjs.forEach((e) => {
        const a = nodeEntryMap[e.sourceId].mesh.position;
        const b = nodeEntryMap[e.targetId].mesh.position;
        e.line.geometry.setFromPoints([a, b]);
        (e.line.geometry.attributes.position as any).needsUpdate = true;
      });
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;
    let focusedNodeId: string | null = null;

    const resetNodeColors = () => {
      nodeMeshes.forEach((mesh) => {
        const cid = mesh.userData.clusterId as string;
        const id = mesh.userData.id as string;
        const baseColor =
          id === focusedNodeId
            ? focusColor
            : cid && clusterColors[cid]
              ? clusterColors[cid]
              : defaultNodeColor;
        (mesh.material as THREE.MeshBasicMaterial).color.set(baseColor);
      });
    };

    const resetEdgeStyles = () => {
      edgeObjs.forEach((e) => {
        const connected =
          focusedNodeId &&
          (e.sourceId === focusedNodeId || e.targetId === focusedNodeId);

        const mat = e.line.material as THREE.LineBasicMaterial;

        if (e.isIntra) {
          e.line.visible = true;
          mat.color.set(connected ? focusColor : intraEdgeColor);
          mat.opacity = connected ? 1.0 : 0.6;
        } else {
          if (connected) {
            e.line.visible = true;
            mat.color.set(focusColor);
            mat.opacity = 1.0;
          } else {
            e.line.visible = false;
          }
        }
      });
    };

    resetNodeColors();
    resetEdgeStyles();

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const isects = raycaster.intersectObjects(nodeMeshes, false);

      if (hovered && (!isects.length || isects[0].object !== hovered)) {
        resetNodeColors();
        hovered = null;
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
      }

      if (isects.length) {
        const obj = isects[0].object as THREE.Mesh;
        hovered = obj;
        const id = obj.userData.id as string;

        if (id !== focusedNodeId) {
          (obj.material as THREE.MeshBasicMaterial).color.set(hoverColor);
        }

        if (tooltipRef.current) {
          tooltipRef.current.textContent = id ?? "";
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY + 10}px`;
          tooltipRef.current.style.opacity = "1";
        }
      }
    };
    renderer.domElement.addEventListener("mousemove", onMove);

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const m = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(m, camera);
      const isects = raycaster.intersectObjects(nodeMeshes, false);

      if (!isects.length) {
        focusedNodeId = null;
        resetNodeColors();
        resetEdgeStyles();
        return;
      }

      const mesh = isects[0].object as THREE.Mesh;
      const id = mesh.userData.id as string;

      if (focusedNodeId === id) {
        focusedNodeId = null;
      } else {
        focusedNodeId = id;
      }

      resetNodeColors();
      resetEdgeStyles();
    };
    renderer.domElement.addEventListener("click", onClick);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("mousemove", onMove);
      renderer.domElement.removeEventListener("click", onClick);
      simulation.stop();
      renderer.dispose();
      scene.clear();
    };
  }, [data]);

  return (
    <>
      <canvas ref={canvasRef} />
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          pointerEvents: "none",
          padding: "4px 8px",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 12,
          transform: "translate(-50%,-130%)",
          opacity: 0,
          transition: "opacity 120ms",
          zIndex: 10,
        }}
      />
    </>
  );
}
