import { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import threadRepo from "@/managers/threadRepo";
import NodeChatPreview from "./NodeChatPreview";
import ZoomControls from "./ZoomControls";

import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCollide,
  forceX,
  forceY,
  forceZ,
} from "d3-force-3d";
import { GraphSnapshot } from "@/types/GraphData";

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
  name: string;
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

const THEME_STYLES = {
  dark: {
    background: 0x05070d,
    star: {
      color: 0xffffff,
      size: 1.2,
      opacity: 0.7,
      count: 2200,
    },
    dust: {
      color: 0xbcd1ff,
      size: 2.2,
      opacity: 0.2,
      count: 900,
    },
    edgeIntra: 0x999999,
    edgeInter: 0x333333,
    labelText: "rgba(170, 180, 190, 0.95)",
  },
  light: {
    background: 0xffffff,
    star: {
      color: 0x8aa0b8,
      size: 1.1,
      opacity: 0.45,
      count: 1600,
    },
    dust: {
      color: 0xc9d8ea,
      size: 2.0,
      opacity: 0.22,
      count: 700,
    },
    edgeIntra: 0x8a8a8a,
    edgeInter: 0x4a4a4a,
    labelText: "rgba(70, 80, 90, 0.95)",
  },
} as const;

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const createRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const truncateLabel = (text: string, max = 10) =>
  text.length > max ? text.slice(0, max) : text;

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
};

export default function Graph3D({
  data,
  zoomToClusterId,
  onClusterClick,
  theme = "dark",
  avatarUrl,
}: {
  data: GraphSnapshot;
  zoomToClusterId?: string | null;
  onClusterClick?: (clusterId: string) => void;
  theme?: "dark" | "light";
  avatarUrl?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const nodeOrigIdMapRef = useRef<Map<string, string>>(new Map());
  const setSelectedNodeIdRef = useRef(setSelectedNodeId);
  setSelectedNodeIdRef.current = setSelectedNodeId;
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const clustersRef = useRef<Map<string, ClusterInfo> | null>(null);
  const zoomAnimationRef = useRef<number | null>(null);
  const isZoomAnimatingRef = useRef(false);
  const zoomTargetRef = useRef<string | null>(null);
  const onClusterClickRef = useRef<((clusterId: string) => void) | undefined>(
    undefined,
  );
  const focusedClusterIdRef = useRef<string | null>(null);
  const isFocusModeRef = useRef(false);
  const nodeMeshesRef = useRef<THREE.Mesh[]>([]);
  const edgeObjsRef = useRef<
    Array<{
      line: THREE.Line;
      sourceId: string;
      targetId: string;
      isIntra: boolean;
      clusterId?: string;
    }>
  >([]);
  const clusterObjectsRef = useRef<THREE.Object3D[]>([]);
  const clusterLabelsRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const nodeLabelsRef = useRef<Map<string, THREE.Sprite>>(new Map());
  const nodeLabelTextRef = useRef<Map<string, string>>(new Map());
  const nodeTitleCacheRef = useRef<Map<string, string>>(new Map());
  const labelFetchInFlightRef = useRef<Set<string>>(new Set());
  const focusLabelUpdaterRef = useRef<((clusterId: string) => void) | null>(
    null,
  );
  const simulationRef = useRef<any>(null);
  const clusterSimRef = useRef<any>(null);
  const focusSimRef = useRef<any>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<SimLink[]>([]);
  const nodeEntryMapRef = useRef<
    Record<string, { sim: SimNode; mesh: THREE.Mesh; clusterId: string }>
  >({});
  const updateSceneRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onClusterClickRef.current = onClusterClick;
  }, [onClusterClick]);

  const zoomToCluster = useCallback((clusterId: string, focusAfter = false) => {
    if (isFocusModeRef.current && focusedClusterIdRef.current === clusterId) {
      return;
    }
    if (isZoomAnimatingRef.current && zoomTargetRef.current === clusterId) {
      return;
    }
    const clusters = clustersRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!clusters || !camera || !controls) return;

    const info = clusters.get(clusterId);
    if (!info) return;

    if (zoomAnimationRef.current) {
      cancelAnimationFrame(zoomAnimationRef.current);
    }

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endTarget = info.center.clone();

    const fov = (camera.fov * Math.PI) / 180;
    const distance = Math.max(
      40,
      Math.min(1000, (info.radius / Math.tan(fov / 2)) * 1.6),
    );

    let direction = startPos.clone().sub(startTarget);
    if (direction.lengthSq() < 1e-6) direction.set(0, 0, 1);
    direction.normalize();
    const endPos = endTarget.clone().add(direction.multiplyScalar(distance));

    const duration = 800;
    const startTime = performance.now();
    isZoomAnimatingRef.current = true;
    zoomTargetRef.current = clusterId;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      camera.position.lerpVectors(startPos, endPos, ease);
      controls.target.lerpVectors(startTarget, endTarget, ease);
      controls.update();

      if (t < 1) {
        zoomAnimationRef.current = requestAnimationFrame(animate);
      } else {
        isZoomAnimatingRef.current = false;
        zoomTargetRef.current = null;
        zoomAnimationRef.current = null;
        if (focusAfter) {
          enterFocus(clusterId);
        }
      }
    };

    zoomAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  const enterFocus = useCallback((clusterId: string) => {
    if (focusedClusterIdRef.current === clusterId && isFocusModeRef.current) {
      return;
    }

    const clusters = clustersRef.current;
    if (!clusters) return;

    focusedClusterIdRef.current = clusterId;
    isFocusModeRef.current = true;

    clusterObjectsRef.current.forEach((obj) => {
      obj.visible = false;
    });
    clusterLabelsRef.current.forEach((label) => {
      label.visible = false;
    });

    nodeMeshesRef.current.forEach((mesh) => {
      mesh.visible = mesh.userData.clusterId === clusterId;
    });
    edgeObjsRef.current.forEach((edge) => {
      edge.line.visible = edge.isIntra && edge.clusterId === clusterId;
    });

    nodeLabelsRef.current.forEach((label) => {
      label.visible = false;
    });
    focusLabelUpdaterRef.current?.(clusterId);

    if (clusterSimRef.current) clusterSimRef.current.stop();
    if (simulationRef.current) simulationRef.current.stop();
    if (focusSimRef.current) focusSimRef.current.stop();

    const focusNodes = simNodesRef.current.filter(
      (n) => n.clusterId === clusterId,
    );
    const focusLinks = simLinksRef.current.filter((l) => {
      const sId = typeof l.source === "string" ? l.source : String(l.source.id);
      const tId = typeof l.target === "string" ? l.target : String(l.target.id);
      const sEntry = nodeEntryMapRef.current[sId];
      const tEntry = nodeEntryMapRef.current[tId];
      return sEntry?.clusterId === clusterId && tEntry?.clusterId === clusterId;
    });

    const focusInfo = clusters.get(clusterId);
    const focusCenter = focusInfo?.center.clone() ?? new THREE.Vector3(0, 0, 0);

    const focusCenterForce = (alpha: number) => {
      const k = 0.05 * alpha;
      focusNodes.forEach((n) => {
        n.vx = (n.vx ?? 0) + (focusCenter.x - n.x) * k;
        n.vy = (n.vy ?? 0) + (focusCenter.y - n.y) * k;
        n.vz = (n.vz ?? 0) + (focusCenter.z - n.z) * k;
      });
    };

    const focusSim = forceSimulation(focusNodes as any, 3)
      .force("charge", forceManyBody().strength(-3).distanceMax(120))
      .force("collide", forceCollide().radius(0.7).iterations(1))
      .force(
        "link",
        forceLink(focusLinks as any)
          .id((d: any) => d.id)
          .distance(8)
          .strength(0.3),
      )
      .force("focusCenter", focusCenterForce)
      .alpha(1)
      .restart();

    focusSim.on("tick", () => {
      updateSceneRef.current?.();
    });

    focusSimRef.current = focusSim;
  }, []);

  const exitFocus = useCallback(() => {
    if (!isFocusModeRef.current) return;
    isFocusModeRef.current = false;
    focusedClusterIdRef.current = null;

    if (focusSimRef.current) {
      focusSimRef.current.stop();
      focusSimRef.current = null;
    }

    clusterObjectsRef.current.forEach((obj) => {
      obj.visible = true;
    });
    clusterLabelsRef.current.forEach((label) => {
      label.visible = true;
    });
    nodeMeshesRef.current.forEach((mesh) => {
      mesh.visible = true;
    });
    edgeObjsRef.current.forEach((edge) => {
      edge.line.visible = true;
    });
    nodeLabelsRef.current.forEach((label) => {
      label.visible = false;
    });

    if (simulationRef.current) simulationRef.current.alpha(1).restart();
    if (clusterSimRef.current) clusterSimRef.current.alpha(0.5).restart();
  }, []);

  // 줌 컨트롤 핸들러
  const handleZoomIn = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const direction = camera.position.clone().sub(controls.target).normalize();
    const currentDistance = camera.position.distanceTo(controls.target);
    const newDistance = Math.max(20, currentDistance / 1.3);
    camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
    controls.update();
    setZoomLevel((prev) => Math.min(prev * 1.3, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const direction = camera.position.clone().sub(controls.target).normalize();
    const currentDistance = camera.position.distanceTo(controls.target);
    const newDistance = Math.min(1000, currentDistance * 1.3);
    camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
    controls.update();
    setZoomLevel((prev) => Math.max(prev / 1.3, 0.1));
  }, []);

  const handleZoomReset = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    camera.position.set(0, 0, 200);
    controls.target.set(0, 0, 0);
    controls.update();
    setZoomLevel(1);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1) 씬/렌더러/카메라 초기화
    const scene = new THREE.Scene();
    const activeTheme = THEME_STYLES[theme];
    scene.background = new THREE.Color(activeTheme.background);
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      5000,
    );
    camera.position.set(0, 0, 200);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvasRef.current,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // 조명 추가 (입체감을 위해)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(100, 100, 100);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-100, -50, -100);
    scene.add(directionalLight2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1000;
    cameraRef.current = camera;
    controlsRef.current = controls;

    const addStarfield = () => {
      const starCount = activeTheme.star.count;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const radius = 1800 + Math.random() * 1400;
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const material = new THREE.PointsMaterial({
        color: activeTheme.star.color,
        size: activeTheme.star.size,
        transparent: true,
        opacity: activeTheme.star.opacity,
        depthWrite: false,
      });
      const stars = new THREE.Points(geometry, material);
      scene.add(stars);

      const dustCount = activeTheme.dust.count;
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i += 1) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const radius = 900 + Math.random() * 900;
        dustPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        dustPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        dustPositions[i * 3 + 2] = radius * Math.cos(phi);
      }
      const dustGeom = new THREE.BufferGeometry();
      dustGeom.setAttribute(
        "position",
        new THREE.BufferAttribute(dustPositions, 3),
      );
      const dustMat = new THREE.PointsMaterial({
        color: activeTheme.dust.color,
        size: activeTheme.dust.size,
        transparent: true,
        opacity: activeTheme.dust.opacity,
        depthWrite: false,
      });
      const dust = new THREE.Points(dustGeom, dustMat);
      scene.add(dust);
    };
    addStarfield();

    // 2) 시각화 기본 설정
    const clusterColors: Record<string, number> = {
      cluster_1: 0x4aa8c0, // 파랑
      cluster_2: 0xe74c3c, // 빨강
      cluster_3: 0x2ecc71, // 초록
      cluster_4: 0xf39c12, // 주황
      cluster_5: 0x9b59b6, // 보라
    };
    const defaultNodeColor = 0x767676;
    const focusColor = 0xff4d4f;
    const hoverColor = 0xffcc00;
    const intraEdgeColor = activeTheme.edgeIntra;
    const interEdgeColor = activeTheme.edgeInter;

    const axesHelper = new THREE.AxesHelper(120);
    if (Array.isArray(axesHelper.material)) {
      axesHelper.material.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = 0.12;
      });
    } else {
      axesHelper.material.transparent = true;
      axesHelper.material.opacity = 0.12;
    }
    scene.add(axesHelper);

    const createClusterLabel = (text: string, color: number) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const fontSize = 48;
      const paddingX = 28;
      const paddingY = 18;
      ctx.font = `600 ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
      const metrics = ctx.measureText(text);
      const textWidth = Math.ceil(metrics.width);
      canvas.width = textWidth + paddingX * 2;
      canvas.height = fontSize + paddingY * 2;

      ctx.font = `600 ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const radius = Math.min(18, canvas.height / 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0)";
      ctx.strokeStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${
        color & 255
      }, 0.6)`;
      ctx.lineWidth = 6;
      drawRoundedRect(ctx, canvas.width, canvas.height, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = activeTheme.labelText;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });
      return new THREE.Sprite(material);
    };

    const createNodeLabel = (text: string) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const labelText = truncateLabel(text, 10);
      const scale = 2;
      const fontSize = 28 * scale;
      const paddingX = 14 * scale;
      const paddingY = 10 * scale;

      ctx.font = `600 ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
      const metrics = ctx.measureText(labelText);
      const textWidth = Math.ceil(metrics.width);
      canvas.width = textWidth + paddingX * 2;
      canvas.height = fontSize + paddingY * 2;

      ctx.font = `600 ${fontSize}px "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const radius = Math.min(10, canvas.height / 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0)";
      ctx.strokeStyle = "rgba(17, 17, 17, 0.2)";
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, canvas.width, canvas.height, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = activeTheme.labelText;
      ctx.fillText(labelText, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.85,
      });
      return new THREE.Sprite(material);
    };

    const clusterNameById = new Map<string, string>();
    data.clusters.forEach((cluster) => {
      if (cluster?.id) clusterNameById.set(cluster.id, cluster.name);
    });
    data.nodes.forEach((node) => {
      const cid = (node.clusterId ?? "default") as string;
      const name =
        clusterNameById.get(cid) || (node.clusterName ? node.clusterName : cid);
      clusterNameById.set(cid, name);
    });

    // 3) 클러스터 메타 계산
    const clusters = new Map<string, ClusterInfo>();
    clustersRef.current = clusters;

    data.nodes.forEach((n) => {
      const cid = (n.clusterId ?? "default") as string;
      if (!clusters.has(cid)) {
        clusters.set(cid, {
          center: new THREE.Vector3(0, 0, 0),
          radius: 0,
          nodeIds: [],
          intraEdgeCount: 0,
          color: clusterColors[cid] || defaultNodeColor,
          name: clusterNameById.get(cid) || cid,
        });
      }
      clusters.get(cid)!.nodeIds.push(String(n.id));
    });

    // 클러스터 내부 엣지 수 집계
    const nodeToClusterMap = new Map<string, string>();
    data.nodes.forEach((n) => {
      nodeToClusterMap.set(String(n.id), (n.clusterId ?? "default") as string);
    });

    data.edges.forEach((edge) => {
      const sourceCid = nodeToClusterMap.get(String(edge.source));
      const targetCid = nodeToClusterMap.get(String(edge.target));
      if (sourceCid && sourceCid === targetCid) {
        clusters.get(sourceCid)!.intraEdgeCount++;
      }
    });

    const clusterIds = Array.from(clusters.keys());

    clusterIds.forEach((cid) => {
      const info = clusters.get(cid)!;

      // 밀도 정규화: 3D 부피 기준 반지름 계산
      const nodeCount = info.nodeIds.length;
      const edgeCount = info.intraEdgeCount;
      const baseRadius = 5; // 최소 반지름
      const nodeVolumeFactor = 8.0;
      const edgeVolumeFactor = 0.8; // 엣지 영향도 낮게

      // 반지름 ~ cubeRoot(N) (밀도 유지)
      const nodeRadius = Math.pow(nodeCount, 1 / 3) * nodeVolumeFactor;
      const edgeRadius = Math.pow(edgeCount, 1 / 3) * edgeVolumeFactor;
      info.radius = baseRadius + nodeRadius + edgeRadius;
    });

    const totalClusters = Math.max(clusterIds.length, 1);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const maxClusterRadius = Math.max(
      ...clusterIds.map((cid) => clusters.get(cid)!.radius),
      1,
    );
    const spread = Math.max(120, maxClusterRadius * 3);

    clusterIds.forEach((cid, idx) => {
      const info = clusters.get(cid)!;
      const t = (idx + 0.5) / totalClusters;
      const z = 1 - 2 * t;
      const radiusXY = Math.sqrt(1 - z * z);
      const theta = goldenAngle * idx;
      const rng = createRng(hashString(`cluster:${cid}`));
      const r = Math.cbrt(rng()) * spread;
      info.center.set(
        radiusXY * Math.cos(theta) * r,
        radiusXY * Math.sin(theta) * r,
        z * r,
      );
    });

    const clusterXTargets = new Map<string, number>();
    const clusterYTargets = new Map<string, number>();
    const clusterZTargets = new Map<string, number>();
    clusterIds.forEach((cid) => {
      const rngX = createRng(hashString(`cluster-x:${cid}`));
      const rngY = createRng(hashString(`cluster-y:${cid}`));
      const rngZ = createRng(hashString(`cluster-z:${cid}`));
      clusterXTargets.set(cid, (rngX() - 0.5) * spread);
      clusterYTargets.set(cid, (rngY() - 0.5) * spread);
      clusterZTargets.set(cid, (rngZ() - 0.5) * spread);
    });

    // 클러스터 간 엣지 수 초기화
    const interClusterEdgeCounts: Record<string, Record<string, number>> = {};
    clusterIds.forEach((id1) => {
      interClusterEdgeCounts[id1] = {}; // 내부 맵 초기화
      clusterIds.forEach((id2) => {
        interClusterEdgeCounts[id1][id2] = 0; // 기본값 0
      });
    });

    const simClusters: SimCluster[] = [];
    // 노드 크기 계산용 엣지 수 집계
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
      const scale = Math.sqrt(count / maxEdgeCount); // 과도한 차이 완화
      return MIN_NODE_RADIUS + (MAX_NODE_RADIUS - MIN_NODE_RADIUS) * scale;
    };

    // 4. Create Visuals

    const nodeMeshes: THREE.Mesh[] = [];
    const simNodes: SimNode[] = [];
    const nodeEntryMap: Record<
      string,
      { sim: SimNode; mesh: THREE.Mesh; clusterId: string }
    > = {};
    const clusterLabels = new Map<string, THREE.Sprite>();
    const labelMeshes: THREE.Sprite[] = [];
    const clusterObjects: THREE.Object3D[] = [];

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
        opacity: 0.01,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(info.center);
      sphere.userData = { isClusterSphere: true, clusterId: cid }; // Tag for cluster sim
      scene.add(sphere);
      clusterObjects.push(sphere);

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: info.color,
        transparent: true,
        opacity: 0.08,
      });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.copy(info.center);
      wireframe.userData = { isClusterSphere: true, clusterId: cid }; // Tag for cluster sim
      scene.add(wireframe);
      clusterObjects.push(wireframe);

      const label = createClusterLabel(info.name, info.color);
      if (label) {
        const labelHeight = Math.max(4, Math.min(12, info.radius * 0.25)) * 0.5;
        const labelMaterial = label.material as THREE.SpriteMaterial;
        const mapImage = labelMaterial.map?.image as
          | HTMLCanvasElement
          | undefined;
        const aspect = mapImage ? mapImage.width / mapImage.height : 3;
        label.scale.set(labelHeight * aspect, labelHeight, 1);
        label.position.copy(info.center);
        label.position.y += info.radius + labelHeight * 0.9;
        label.userData = { isClusterLabel: true, clusterId: cid };
        scene.add(label);
        clusterLabels.set(cid, label);
        labelMeshes.push(label);
      }
    });

    clusterLabelsRef.current = clusterLabels;
    clusterObjectsRef.current = clusterObjects;

    // -- B. Nodes (Start exactly at center)
    // Starting them at center prevents them from getting stuck outside initially
    const nodeOrigIdById = new Map<string, string>();
    data.nodes.forEach((node) => {
      nodeOrigIdById.set(String(node.id), node.origId);
      nodeOrigIdMapRef.current.set(String(node.id), node.origId);
      const id = String(node.id);
      const cid = (node.clusterId ?? "default") as string;
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
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.3,
          roughness: 0.4,
        }),
      );
      mesh.position.set(x, y, z);
      mesh.userData = { id, clusterId: cid, radius };

      scene.add(mesh);
      nodeMeshes.push(mesh);
      nodeEntryMap[id] = { sim, mesh, clusterId: cid };
    });

    nodeMeshesRef.current = nodeMeshes;
    simNodesRef.current = simNodes;
    nodeEntryMapRef.current = nodeEntryMap;

    // -- C. Edges
    const simLinks: SimLink[] = data.edges.map((e) => ({
      source: String(e.source),
      target: String(e.target),
    }));
    simLinksRef.current = simLinks;

    type EdgeObj = {
      line: THREE.Line;
      sourceId: string;
      targetId: string;
      isIntra: boolean;
      clusterId?: string;
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
        opacity: isIntra ? 0.28 : 0.07,
      });

      const geom = new THREE.BufferGeometry().setFromPoints([
        sNode.mesh.position,
        tNode.mesh.position,
      ]);

      const line = new THREE.Line(geom, mat);
      scene.add(line);
      edgeObjs.push({
        line,
        sourceId: sId,
        targetId: tId,
        isIntra,
        clusterId: isIntra ? sNode.clusterId : undefined,
      });
    });

    edgeObjsRef.current = edgeObjs;

    const setNodeLabel = (nodeId: string, text: string, clusterId: string) => {
      const trimmed = truncateLabel(text, 10);
      const existingText = nodeLabelTextRef.current.get(nodeId);
      let label = nodeLabelsRef.current.get(nodeId) ?? null;

      if (!label || existingText !== trimmed) {
        if (label) {
          scene.remove(label);
          if (label.material instanceof THREE.SpriteMaterial) {
            label.material.map?.dispose();
            label.material.dispose();
          }
        }
        const newLabel = createNodeLabel(trimmed);
        if (!newLabel) return;
        newLabel.userData = { isNodeLabel: true, nodeId, clusterId };
        const labelMaterial = newLabel.material as THREE.SpriteMaterial;
        const mapImage = labelMaterial.map?.image as
          | HTMLCanvasElement
          | undefined;
        const aspect = mapImage ? mapImage.width / mapImage.height : 3;
        const labelHeight = 0.9;
        newLabel.scale.set(labelHeight * aspect, labelHeight, 1);
        scene.add(newLabel);
        nodeLabelsRef.current.set(nodeId, newLabel);
        nodeLabelTextRef.current.set(nodeId, trimmed);
        label = newLabel;
      }

      label.visible =
        isFocusModeRef.current && focusedClusterIdRef.current === clusterId;
    };

    const ensureNodeLabel = async (nodeId: string, clusterId: string) => {
      const cached = nodeTitleCacheRef.current.get(nodeId);
      if (cached) {
        setNodeLabel(nodeId, cached, clusterId);
        return;
      }
      if (labelFetchInFlightRef.current.has(nodeId)) return;
      labelFetchInFlightRef.current.add(nodeId);

      const origId = nodeOrigIdById.get(nodeId);
      const fallback = origId ?? nodeId;
      try {
        if (origId) {
          const thread = await threadRepo.getThreadById(origId);
          const title = thread?.title || fallback;
          nodeTitleCacheRef.current.set(nodeId, title);
          if (
            isFocusModeRef.current &&
            focusedClusterIdRef.current === clusterId
          ) {
            setNodeLabel(nodeId, title, clusterId);
          }
        } else {
          nodeTitleCacheRef.current.set(nodeId, fallback);
          if (
            isFocusModeRef.current &&
            focusedClusterIdRef.current === clusterId
          ) {
            setNodeLabel(nodeId, fallback, clusterId);
          }
        }
      } catch {
        nodeTitleCacheRef.current.set(nodeId, fallback);
        if (
          isFocusModeRef.current &&
          focusedClusterIdRef.current === clusterId
        ) {
          setNodeLabel(nodeId, fallback, clusterId);
        }
      } finally {
        labelFetchInFlightRef.current.delete(nodeId);
      }
    };

    const updateFocusLabels = (clusterId: string) => {
      nodeLabelsRef.current.forEach((label) => {
        label.visible = false;
      });
      Object.entries(nodeEntryMap).forEach(([nodeId, entry]) => {
        if (entry.clusterId !== clusterId) return;
        void ensureNodeLabel(nodeId, clusterId);
      });
    };

    focusLabelUpdaterRef.current = updateFocusLabels;

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
    const simulation = forceSimulation(simNodes as any, 3)
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
            (l: any) => (l.source.clusterId === l.target.clusterId ? 5 : 50), // Inter-cluster link distance
          )
          .strength((l: any) => {
            const source = l.source as SimNode;
            const target = l.target as SimNode;
            // Weaker strength for inter-cluster links
            return source.clusterId === target.clusterId ? 0.15 : 0.08;
          }),
      )
      .force("clusterGravity", clusterGravityForce)
      .force("clusterContainment", clusterContainmentForce)
      .alpha(1)
      .restart();
    simulationRef.current = simulation;

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

    const clusterSim = forceSimulation(simClusters as any, 3)
      .force("charge", forceManyBody().strength(-5).distanceMax(1200))
      // .force(
      //   "xSpread",
      //   forceX((c: any) => clusterXTargets.get(c.id) ?? 0).strength(0.04),
      // )
      // .force(
      //   "ySpread",
      //   forceY((c: any) => clusterYTargets.get(c.id) ?? 0).strength(0.04),
      // )
      // .force(
      //   "zSpread",
      //   forceZ((c: any) => clusterZTargets.get(c.id) ?? 0).strength(0.04),
      // )
      .force("interClusterAttraction", interClusterAttractionForce)
      .force("globalCentering", globalClusterCenteringForce)
      .force(
        "collide",
        forceCollide()
          .radius((c: any) => c.radius * 1.2) // Use radius + 20% padding
          .strength(0.8),
      )
      .alpha(0.5)
      .restart();
    clusterSimRef.current = clusterSim;

    const updateScene = () => {
      simNodes.forEach((n) => {
        const entry = nodeEntryMap[n.id];
        if (entry) {
          entry.mesh.position.set(n.x, n.y, n.z);
        }
      });

      if (!isFocusModeRef.current) {
        // Update cluster sphere positions from the cluster simulation
        clusterObjects.forEach((child) => {
          if (child.userData.isClusterSphere) {
            const cid = child.userData.clusterId;
            const clusterInfo = clusters.get(cid);
            if (clusterInfo) child.position.copy(clusterInfo.center);
          }
        });
      }

      edgeObjs.forEach((e) => {
        if (!e.line.visible) return;
        const a = nodeEntryMap[e.sourceId].mesh.position;
        const b = nodeEntryMap[e.targetId].mesh.position;
        e.line.geometry.setFromPoints([a, b]);
        (e.line.geometry.attributes.position as any).needsUpdate = true;
      });

      nodeLabelsRef.current.forEach((label, nodeId) => {
        if (!label.visible) return;
        const entry = nodeEntryMap[nodeId];
        if (!entry) return;
        const radius = entry.mesh.userData?.radius ?? 1;
        label.position.set(
          entry.mesh.position.x,
          entry.mesh.position.y + radius + label.scale.y * 0.6,
          entry.mesh.position.z,
        );
      });
    };
    updateSceneRef.current = updateScene;

    // 7. Animation
    clusterSim.on("tick", () => {
      if (isFocusModeRef.current) return;

      simClusters.forEach((sc) => {
        clusters.get(sc.id)!.center.set(sc.x, sc.y, sc.z);

        const label = clusterLabels.get(sc.id);
        if (label) {
          const info = clusters.get(sc.id);
          if (info) {
            label.position.copy(info.center);
            label.position.y += info.radius + label.scale.y * 0.9;
          }
        }
      });
    });
    simulation.on("tick", () => {
      updateScene();
    });

    // 8. Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode: THREE.Mesh | null = null;
    let hoveredLabel: THREE.Sprite | null = null;
    let focusedNodeId: string | null = null;
    const interactiveObjects: THREE.Object3D[] = [
      ...nodeMeshes,
      ...labelMeshes,
    ];

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
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(c);
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
              : interEdgeColor,
        );
        mat.opacity = isConnected ? 0.8 : edge.isIntra ? 0.35 : 0.05;
      });
    };
    resetEdgeStyles();

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const isects = raycaster.intersectObjects(interactiveObjects, false);

      if (!isects.length) {
        if (hoveredNode && !focusedNodeId) resetNodeColors();
        hoveredNode = null;
        hoveredLabel = null;
        renderer.domElement.style.cursor = "default";
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
        return;
      }

      const obj = isects[0].object as THREE.Object3D;
      const isLabel = Boolean(obj.userData?.isClusterLabel);

      if (isLabel) {
        if (hoveredNode && !focusedNodeId) resetNodeColors();
        hoveredNode = null;
        hoveredLabel = obj as THREE.Sprite;
        renderer.domElement.style.cursor = "pointer";

        const cid = obj.userData.clusterId as string;
        const labelText = clusters.get(cid)?.name ?? cid;
        if (tooltipRef.current) {
          tooltipRef.current.textContent = labelText;
          tooltipRef.current.style.left = `${e.clientX + 10}px`;
          tooltipRef.current.style.top = `${e.clientY + 10}px`;
          tooltipRef.current.style.opacity = "1";
        }
        return;
      }

      const mesh = obj as THREE.Mesh;
      if (hoveredLabel) {
        hoveredLabel = null;
      }
      if (hoveredNode && hoveredNode !== mesh && !focusedNodeId) {
        resetNodeColors();
      }
      hoveredNode = mesh;
      renderer.domElement.style.cursor = "pointer";

      if (!focusedNodeId) {
        (mesh.material as THREE.MeshStandardMaterial).color.setHex(hoverColor);
      }

      if (tooltipRef.current) {
        tooltipRef.current.textContent = mesh.userData.id;
        tooltipRef.current.style.left = `${e.clientX + 10}px`;
        tooltipRef.current.style.top = `${e.clientY + 10}px`;
        tooltipRef.current.style.opacity = "1";
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const isects = raycaster.intersectObjects(interactiveObjects, false);

      if (isects.length > 0) {
        const obj = isects[0].object as THREE.Object3D;
        if (obj.userData?.isClusterLabel) {
          const cid = obj.userData.clusterId as string;
          if (cid) {
            zoomToCluster(cid, true);
            onClusterClickRef.current?.(cid);
          }
          return;
        }

        const id = obj.userData.id;
        focusedNodeId = focusedNodeId === id ? null : id;

        // 노드 클릭 시 채팅 미리보기 표시
        if (focusedNodeId) {
          const origId = nodeOrigIdById.get(focusedNodeId);
          if (origId) {
            setSelectedNodeIdRef.current(origId);
          }
        } else {
          setSelectedNodeIdRef.current(null);
        }
      } else {
        if (isFocusModeRef.current) {
          exitFocus();
          resetNodeColors();
          resetEdgeStyles();
          if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
          return;
        }
        focusedNodeId = null;
        setSelectedNodeIdRef.current(null);
      }
      resetNodeColors();
      resetEdgeStyles();
    };

    renderer.domElement.addEventListener("mousemove", onMove);
    renderer.domElement.addEventListener("click", onClick);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusModeRef.current) {
        exitFocus();
        resetNodeColors();
        resetEdgeStyles();
        if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
      }
    };
    window.addEventListener("keydown", onKeyDown);

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
      window.removeEventListener("keydown", onKeyDown);
      if (zoomAnimationRef.current) {
        cancelAnimationFrame(zoomAnimationRef.current);
        zoomAnimationRef.current = null;
      }
      isZoomAnimatingRef.current = false;
      zoomTargetRef.current = null;
      if (focusSimRef.current) {
        focusSimRef.current.stop();
        focusSimRef.current = null;
      }
      nodeLabelsRef.current.forEach((label) => {
        scene.remove(label);
        if (label.material instanceof THREE.SpriteMaterial) {
          label.material.map?.dispose();
          label.material.dispose();
        }
      });
      nodeLabelsRef.current.clear();
      nodeLabelTextRef.current.clear();
      nodeTitleCacheRef.current.clear();
      labelFetchInFlightRef.current.clear();
      focusLabelUpdaterRef.current = null;
      isFocusModeRef.current = false;
      focusedClusterIdRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      clustersRef.current = null;
      updateSceneRef.current = null;
      simulation.stop();
      clusterSim.stop();
      renderer.dispose();
      scene.clear();
    };
  }, [data, theme]);

  useEffect(() => {
    if (!zoomToClusterId) return;
    zoomToCluster(zoomToClusterId, true);
  }, [zoomToClusterId, zoomToCluster]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
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
      {/* 줌 컨트롤 */}
      <ZoomControls
        scale={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />
      {/* 노드 클릭 시 채팅 미리보기 */}
      {selectedNodeId && (
        <NodeChatPreview
          threadId={selectedNodeId}
          avatarUrl={avatarUrl ?? null}
          onClose={() => setSelectedNodeId(null)}
          onExpand={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
