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
  color: number;
  intraEdgeCount: number;
};

type SimCluster = {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  vx?: number;
  vy?: number;
  vz?: number;
};

export default function Graph3D({ data }: { data: GraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x000000);
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    camera.position.set(0, 0, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvasRef.current,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1000;

    // 2. Configuration
    const clusterColors: Record<string, number> = {
      cluster_1: 0x4aa8c0, // Blue
      cluster_2: 0xe74c3c, // Red
      cluster_3: 0x2ecc71, // Green
      cluster_4: 0xf39c12, // Orange
      cluster_5: 0x9b59b6, // Purple
    };
    const defaultNodeColor = 0x767676;
    const focusColor = 0xff4d4f;
    const hoverColor = 0xffcc00;
    // const intraEdgeColor = 0xb3b3b3;  //for dark background
    // const interEdgeColor = 0xffffff; // White
    const intraEdgeColor = 0x999999; // Darkened for white background
    const interEdgeColor = 0x333333; // Changed from white to dark gray

    // 3. Process Clusters
    const clusters = new Map<string, ClusterInfo>();

    data.nodes.forEach((n) => {
      const cid = (n.cluster_id ?? "default") as string;
      if (!clusters.has(cid)) {
        clusters.set(cid, {
          center: new THREE.Vector3(0, 0, 0),
          radius: 0,
          nodeIds: [],
          intraEdgeCount: 0,
          color: clusterColors[cid] || defaultNodeColor,
        });
      }
      clusters.get(cid)!.nodeIds.push(String(n.id));
    });

    // Count intra-cluster edges
    const nodeToClusterMap = new Map<string, string>();
    data.nodes.forEach((n) => {
      nodeToClusterMap.set(String(n.id), (n.cluster_id ?? "default") as string);
    });

    data.edges.forEach((edge) => {
      const sourceCid = nodeToClusterMap.get(String(edge.source));
      const targetCid = nodeToClusterMap.get(String(edge.target));
      if (sourceCid && sourceCid === targetCid) {
        clusters.get(sourceCid)!.intraEdgeCount++;
      }
    });

    const clusterIds = Array.from(clusters.keys());

    clusterIds.forEach((cid, idx) => {
      const info = clusters.get(cid)!;
      // By removing the deterministic layout calculation,
      // all clusters will start at their default position (0,0,0).
      // The cluster simulation will then push them apart organically
      // based on repulsion and attraction forces.

      // --- CRITICAL FIX 1: DENSITY NORMALIZATION ---
      // Use Cubic Root (Math.cbrt) instead of Sqrt.
      // This ensures 3D volume scales proportionally to node count.
      // This makes small clusters feel as "dense" as the big blue one.
      const nodeCount = info.nodeIds.length;
      const edgeCount = info.intraEdgeCount;
      const baseRadius = 5; // Minimum size for tiny clusters
      const nodeVolumeFactor = 8.0;
      const edgeVolumeFactor = 0.8; // Edges have less impact

      // Radius ~ CubeRoot(N). This keeps constant density.
      const nodeRadius = Math.pow(nodeCount, 1 / 3) * nodeVolumeFactor;
      const edgeRadius = Math.pow(edgeCount, 1 / 3) * edgeVolumeFactor;
      info.radius = baseRadius + nodeRadius + edgeRadius;
    });

    // --- NEW: Calculate Inter-Cluster Edge Counts ---
    const interClusterEdgeCounts: Record<string, Record<string, number>> = {};
    clusterIds.forEach((id1) => {
      interClusterEdgeCounts[id1] = {}; // Initialize inner object for id1
      clusterIds.forEach((id2) => {
        interClusterEdgeCounts[id1][id2] = 0; // Then set value for each id2
      });
    });

    const simClusters: SimCluster[] = [];
    // Calculate edge count per node for sizing
    const nodeEdgeCounts = new Map<string, number>();
    data.nodes.forEach((n) => nodeEdgeCounts.set(String(n.id), 0));
    data.edges.forEach((edge) => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      nodeEdgeCounts.set(sourceId, (nodeEdgeCounts.get(sourceId) ?? 0) + 1);
      nodeEdgeCounts.set(targetId, (nodeEdgeCounts.get(targetId) ?? 0) + 1);
    });

    const maxEdgeCount = Math.max(...Array.from(nodeEdgeCounts.values()), 1);
    const MIN_NODE_RADIUS = 0.6;
    const MAX_NODE_RADIUS = 0.9;

    const getNodeRadius = (nodeId: string) => {
      const count = nodeEdgeCounts.get(nodeId) ?? 0;
      const scale = Math.sqrt(count / maxEdgeCount); // Use sqrt for less extreme scaling
      return MIN_NODE_RADIUS + (MAX_NODE_RADIUS - MIN_NODE_RADIUS) * scale;
    };

    // 4. Create Visuals

    const nodeMeshes: THREE.Mesh[] = [];
    const simNodes: SimNode[] = [];
    const nodeEntryMap: Record<
      string,
      { sim: SimNode; mesh: THREE.Mesh; clusterId: string }
    > = {};

    // -- A. Cluster Boundary Spheres
    clusterIds.forEach((cid) => {
      const info = clusters.get(cid)!;
      simClusters.push({
        id: cid,
        x: info.center.x,
        y: info.center.y,
        z: info.center.z,
        radius: info.radius,
      });

      const geometry = new THREE.SphereGeometry(info.radius, 48, 48);
      const material = new THREE.MeshBasicMaterial({
        color: info.color,
        transparent: true,
        opacity: 0.02,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(info.center);
      sphere.userData = { isClusterSphere: true, clusterId: cid }; // Tag for cluster sim
      scene.add(sphere);

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: info.color,
        transparent: true,
        opacity: 0.15,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.copy(info.center);
      wireframe.userData = { isClusterSphere: true, clusterId: cid }; // Tag for cluster sim
      scene.add(wireframe);
    });

    // -- B. Nodes (Start exactly at center)
    // Starting them at center prevents them from getting stuck outside initially
    data.nodes.forEach((node) => {
      const id = String(node.id);
      const cid = (node.cluster_id ?? "default") as string;
      const cluster = clusters.get(cid)!;

      // Initialize randomly inside
      const r = Math.cbrt(Math.random()) * (cluster.radius * 0.5);
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const x = cluster.center.x + r * Math.sin(phi) * Math.cos(theta);
      const y = cluster.center.y + r * Math.sin(phi) * Math.sin(theta);
      const z = cluster.center.z + r * Math.cos(phi);

      const sim: SimNode = { id, clusterId: cid, x, y, z };
      simNodes.push(sim);

      const color = cluster.color;
      const radius = getNodeRadius(id);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 12, 12),
        new THREE.MeshBasicMaterial({ color })
      );
      mesh.position.set(x, y, z);
      mesh.userData = { id, clusterId: cid };

      scene.add(mesh);
      nodeMeshes.push(mesh);
      nodeEntryMap[id] = { sim, mesh, clusterId: cid };
    });

    // -- C. Edges
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
      const sNode = nodeEntryMap[sId];
      const tNode = nodeEntryMap[tId];
      if (!sNode || !tNode) return;

      const isIntra = sNode.clusterId === tNode.clusterId; // This is correct here

      const mat = new THREE.LineBasicMaterial({
        color: isIntra ? intraEdgeColor : interEdgeColor,
        transparent: true,
        opacity: isIntra ? 0.2 : 0.05,
      });

      const geom = new THREE.BufferGeometry().setFromPoints([
        sNode.mesh.position,
        tNode.mesh.position,
      ]);

      const line = new THREE.Line(geom, mat);
      scene.add(line);
      edgeObjs.push({ line, sourceId: sId, targetId: tId, isIntra });
    });

    // Calculate inter-cluster edge counts (moved here, after nodeEntryMap is populated)
    data.edges.forEach((edge) => {
      const sourceId = String(edge.source);
      const targetId = String(edge.target);
      const sourceCid = nodeEntryMap[sourceId]?.clusterId;
      const targetCid = nodeEntryMap[targetId]?.clusterId;
      if (sourceCid && targetCid && sourceCid !== targetCid) {
        interClusterEdgeCounts[sourceCid][targetCid] =
          (interClusterEdgeCounts[sourceCid][targetCid] || 0) + 1;
      }
    });

    // 5. Physics Forces

    // --- CRITICAL FIX 2: STRONGER LOCAL GRAVITY ---
    // This force now scales with distance. The further you are from center, the harder the pull.
    const clusterGravityForce = (alpha: number) => {
      simNodes.forEach((n) => {
        const cluster = clusters.get(n.clusterId);
        if (!cluster) return;

        // Linear pull towards center
        // Strong enough to counteract local repulsion, but weak enough to allow spread
        const k = 0.3 * alpha; // Increased from 0.2 to 0.3 for a stronger pull

        n.vx = (n.vx ?? 0) + (cluster.center.x - n.x) * k;
        n.vy = (n.vy ?? 0) + (cluster.center.y - n.y) * k;
        n.vz = (n.vz ?? 0) + (cluster.center.z - n.z) * k;
      });
    };

    // --- CRITICAL FIX 3: CONTAINMENT WALL ---
    const clusterContainmentForce = (alpha: number) => {
      simNodes.forEach((n) => {
        const cluster = clusters.get(n.clusterId);
        if (!cluster) return;

        const dx = n.x - cluster.center.x;
        const dy = n.y - cluster.center.y;
        const dz = n.z - cluster.center.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;

        // Soft boundary starts at 85% of radius
        const limit = cluster.radius * 0.85;

        if (dist > limit) {
          // If outside limit, push back
          const strength = 0.5 * alpha;
          const overlap = dist - limit;

          const ux = dx / dist;
          const uy = dy / dist;
          const uz = dz / dist;

          n.vx = (n.vx ?? 0) - ux * overlap * strength;
          n.vy = (n.vy ?? 0) - uy * overlap * strength;
          n.vz = (n.vz ?? 0) - uz * overlap * strength;
        }
      });
    };

    // 6. Simulation
    const simulation = forceSimulation(simNodes as any)
      // --- CRITICAL FIX 4: DISTANCE MAX ---
      // This is the most important change.
      // We set distanceMax to roughly the max diameter of a cluster (e.g., 60).
      // This prevents the Blue Cluster from repelling the Red Cluster nodes.
      // They will ignore each other physics-wise.
      .force("charge", forceManyBody().strength(-8).distanceMax(50))

      .force("collide", forceCollide().radius(0.6).iterations(1))
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(
            (l: any) => (l.source.clusterId === l.target.clusterId ? 5 : 50) // Inter-cluster link distance
          )
          .strength((l: any) => {
            const source = l.source as SimNode;
            const target = l.target as SimNode;
            // Weaker strength for inter-cluster links
            return source.clusterId === target.clusterId ? 0.15 : 0.08;
          })
      )
      .force("clusterGravity", clusterGravityForce)
      .force("clusterContainment", clusterContainmentForce)
      .alpha(1)
      .restart();

    // --- NEW: Cluster Repulsion Simulation ---
    const interClusterAttractionForce = (alpha: number) => {
      simClusters.forEach((cluster1) => {
        simClusters.forEach((cluster2) => {
          if (cluster1.id === cluster2.id) return;
          const edgeCount =
            interClusterEdgeCounts[cluster1.id][cluster2.id] || 0;
          if (edgeCount > 0) {
            const dx = cluster2.x - cluster1.x;
            const dy = cluster2.y - cluster1.y;
            const dz = cluster2.z - cluster1.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9; // Use 1e-9 to prevent division by zero
            const strength = 0.04 * edgeCount * alpha; // Significantly increased strength (from 0.001 to 0.1)
            cluster1.vx = (cluster1.vx ?? 0) + (dx / dist) * strength;
            cluster1.vy = (cluster1.vy ?? 0) + (dy / dist) * strength;
            cluster1.vz = (cluster1.vz ?? 0) + (dz / dist) * strength;
          }
        });
      });
    };

    // --- NEW: Global Centering Force for Clusters ---
    // This force gently pulls all clusters towards the center of the scene,
    // preventing unconnected clusters from drifting too far away.
    const globalClusterCenteringForce = (alpha: number) => {
      const k = 0.005 * alpha; // A very gentle pull towards the origin (0,0,0)
      simClusters.forEach((c) => {
        c.vx = (c.vx ?? 0) - c.x * k;
        c.vy = (c.vy ?? 0) - c.y * k;
        c.vz = (c.vz ?? 0) - c.z * k;
      });
    };

    const clusterSim = forceSimulation(simClusters as any)
      .force(
        "charge",
        forceManyBody()
          .strength(-1) // Reduced repulsion to allow attraction to be more effective
          .distanceMax(500)
      )
      .force("interClusterAttraction", interClusterAttractionForce)
      .force("globalCentering", globalClusterCenteringForce)
      .force(
        "collide",
        forceCollide()
          .radius((c: any) => c.radius * 1.2) // Use radius + 20% padding
          .strength(0.8)
      )
      .alpha(0.5)
      .restart();

    // 7. Animation
    clusterSim.on("tick", () => {
      simClusters.forEach((sc) => {
        clusters.get(sc.id)!.center.set(sc.x, sc.y, sc.z);
      });
    });
    simulation.on("tick", () => {
      simNodes.forEach((n) => {
        const entry = nodeEntryMap[n.id];
        if (entry) {
          entry.mesh.position.set(n.x, n.y, n.z);
        }
      });

      // Update cluster sphere positions from the cluster simulation
      scene.children.forEach((child) => {
        if (child.userData.isClusterSphere) {
          const cid = child.userData.clusterId;
          const clusterInfo = clusters.get(cid);
          if (clusterInfo) child.position.copy(clusterInfo.center);
        }
      });

      edgeObjs.forEach((e) => {
        const a = nodeEntryMap[e.sourceId].mesh.position;
        const b = nodeEntryMap[e.targetId].mesh.position;
        e.line.geometry.setFromPoints([a, b]);
        (e.line.geometry.attributes.position as any).needsUpdate = true;
      });
    });

    // 8. Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;
    let focusedNodeId: string | null = null;

    const resetNodeColors = () => {
      nodeMeshes.forEach((mesh) => {
        const id = mesh.userData.id;
        const cid = mesh.userData.clusterId;
        let c = clusters.get(cid)?.color ?? defaultNodeColor;

        if (focusedNodeId) {
          if (id === focusedNodeId) c = focusColor;
          // When a node is focused, other nodes now retain their original color
          // instead of turning gray, so the else statement is removed.
        }
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(c);
      });
    };
    resetNodeColors();

    const resetEdgeStyles = () => {
      edgeObjs.forEach((edge) => {
        const mat = edge.line.material as THREE.LineBasicMaterial;
        const isConnected =
          focusedNodeId &&
          (edge.sourceId === focusedNodeId || edge.targetId === focusedNodeId);

        mat.color.setHex(
          isConnected
            ? focusColor
            : edge.isIntra
              ? intraEdgeColor
              : interEdgeColor
        );
        mat.opacity = isConnected ? 0.8 : edge.isIntra ? 0.3 : 0.03;
      });
    };
    resetEdgeStyles();

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const isects = raycaster.intersectObjects(nodeMeshes, false);

      if (hovered && (!isects.length || isects[0].object !== hovered)) {
        if (!focusedNodeId) resetNodeColors();
        hovered = null;
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
      }

      if (isects.length) {
        const obj = isects[0].object as THREE.Mesh;
        hovered = obj;
        if (!focusedNodeId)
          (obj.material as THREE.MeshBasicMaterial).color.setHex(hoverColor);

        if (tooltipRef.current) {
          tooltipRef.current.textContent = obj.userData.id;
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY + 10}px`;
          tooltipRef.current.style.opacity = "1";
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const isects = raycaster.intersectObjects(nodeMeshes, false);

      if (isects.length > 0) {
        const id = isects[0].object.userData.id;
        focusedNodeId = focusedNodeId === id ? null : id;
      } else {
        focusedNodeId = null;
      }
      resetNodeColors();
      resetEdgeStyles();
    };

    renderer.domElement.addEventListener("mousemove", onMove);
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
      clusterSim.stop();
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
          padding: "6px 10px",
          background: "rgba(0,0,0,0.8)",
          color: "#fff",
          borderRadius: 4,
          fontSize: 12,
          opacity: 0,
          transition: "opacity 0.2s",
          zIndex: 10,
        }}
      />
    </>
  );
}
