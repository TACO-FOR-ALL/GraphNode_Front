import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as d3Force from "d3-force";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SimNode extends d3Force.SimulationNodeDatum {
  id: number;
  group: number;
  z: number;
}
interface SimLink extends d3Force.SimulationLinkDatum<SimNode> {
  strength: number;
}

// ─── Data ────────────────────────────────────────────────────────────────────
function generateData() {
  const N = 55;
  const nodes: SimNode[] = Array.from({ length: N }, (_, i) => ({
    id: i,
    group: Math.floor(i / 11),
    z: 0,
  }));
  const links: SimLink[] = [];
  for (let i = 0; i < N; i++) {
    const gi = Math.floor(i / 11);
    for (let j = i + 1; j < Math.min((gi + 1) * 11, N); j++)
      if (Math.random() < 0.4)
        links.push({
          source: i,
          target: j,
          strength: Math.random() * 0.5 + 0.5,
        });
    for (let j = i + 1; j < N; j++)
      if (Math.floor(j / 11) !== gi && Math.random() < 0.03)
        links.push({
          source: i,
          target: j,
          strength: Math.random() * 0.3 + 0.1,
        });
  }
  return { nodes, links };
}

const { nodes: _NODES, links: LINKS } = generateData();

// Groups at different Z layers — narrow range so perspective scale stays subtle
const NODE_Z = new Map(
  _NODES.map((n) => [n.id, (n.group - 2) * 80 + (Math.random() - 0.5) * 40]),
);
const NODES: SimNode[] = _NODES.map((n) => ({
  ...n,
  z: NODE_Z.get(n.id) ?? 0,
}));

// Degree-based node sizing
const NODE_DEG = (() => {
  const d = new Map(NODES.map((n) => [n.id, 0]));
  LINKS.forEach((l) => {
    const s = l.source as number,
      t = l.target as number;
    d.set(s, (d.get(s) ?? 0) + 1);
    d.set(t, (d.get(t) ?? 0) + 1);
  });
  return d;
})();
const MAX_DEG = Math.max(...NODE_DEG.values());
const degScale = (id: number) =>
  1.0 + ((NODE_DEG.get(id) ?? 0) / MAX_DEG) * 1.4;

// ─── 3D Camera / Projection ───────────────────────────────────────────────────
interface Cam {
  theta: number;
  phi: number;
  zoom: number;
  panX: number;
  panY: number;
}
const CAM0: Cam = { theta: 0, phi: 0.22, zoom: 1, panX: 0, panY: 0 };

/**
 * Project 3D world point → 2D screen point.
 * theta = horizontal orbit (Y-axis rotation)
 * phi   = vertical orbit  (X-axis rotation)
 * Canvas always stays fixed; only projected coords change.
 */
function project(
  wx: number,
  wy: number,
  wz: number,
  cam: Cam,
  cx: number,
  cy: number,
) {
  const ct = Math.cos(cam.theta),
    st = Math.sin(cam.theta);
  const cp = Math.cos(cam.phi),
    sp = Math.sin(cam.phi);

  // Rotate around Y (horizontal orbit)
  const x1 = wx * ct + wz * st;
  const y1 = wy;
  const z1 = -wx * st + wz * ct;

  // Rotate around X (vertical tilt)
  const x2 = x1;
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;

  // Perspective projection — larger fov = subtler depth effect
  const fov = 1100;
  const depth = fov + z2 * cam.zoom;
  const persp = depth > 1 ? fov / depth : 0.01;

  return {
    sx: cx + cam.panX + x2 * cam.zoom * persp,
    sy: cy + cam.panY - y2 * cam.zoom * persp,
    scale: persp,
    rawZ: z2,
  };
}

// ─── Camera Hook ──────────────────────────────────────────────────────────────
function useCameraControls(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  // camRef is read every animation frame — no React setState per frame
  const camRef = useRef<Cam>({ ...CAM0 });
  const [hudCam, setHudCam] = useState<Cam>({ ...CAM0 });
  const dragRef = useRef<{
    mode: "orbit" | "pan";
    sx: number;
    sy: number;
    sc: Cam;
  } | null>(null);
  const [cursor, setCursor] = useState("grab");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: MouseEvent) => {
      const isPan =
        e.button === 2 || (e.button === 0 && (e.ctrlKey || e.metaKey));
      dragRef.current = {
        mode: isPan ? "pan" : "orbit",
        sx: e.clientX,
        sy: e.clientY,
        sc: { ...camRef.current },
      };
      setCursor(isPan ? "move" : "crosshair");
      e.preventDefault();
    };

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.sx,
        dy = e.clientY - d.sy;
      if (d.mode === "orbit") {
        camRef.current = {
          ...camRef.current,
          theta: d.sc.theta + dx * 0.007,
          phi: Math.max(-1.45, Math.min(1.45, d.sc.phi - dy * 0.007)),
        };
      } else {
        camRef.current = {
          ...camRef.current,
          panX: d.sc.panX + dx,
          panY: d.sc.panY + dy,
        };
      }
      // throttle HUD update (not every pixel)
      setHudCam({ ...camRef.current });
    };

    const onUp = () => {
      dragRef.current = null;
      setCursor("grab");
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      camRef.current = {
        ...camRef.current,
        zoom: Math.max(0.08, Math.min(8, camRef.current.zoom * f)),
      };
      setHudCam({ ...camRef.current });
    };

    const onDbl = () => {
      camRef.current = { ...CAM0 };
      setHudCam({ ...CAM0 });
      setCursor("grab");
    };
    const noCtx = (e: Event) => e.preventDefault();

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("dblclick", onDbl);
    el.addEventListener("contextmenu", noCtx);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("dblclick", onDbl);
      el.removeEventListener("contextmenu", noCtx);
    };
  }, [containerRef]);

  const reset = useCallback(() => {
    camRef.current = { ...CAM0 };
    setHudCam({ ...CAM0 });
    setCursor("grab");
  }, []);

  return { camRef, hudCam, cursor, reset };
}

// ─── Camera HUD ───────────────────────────────────────────────────────────────
function CameraHUD({
  cam,
  onReset,
  hint,
}: {
  cam: Cam;
  onReset: () => void;
  hint: string;
}) {
  const tDeg = Math.round((cam.theta * 180) / Math.PI);
  const pDeg = Math.round((cam.phi * 180) / Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 14,
        right: 14,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 5,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", gap: 5, pointerEvents: "auto" }}>
        <span
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            background: "#ffffff0d",
            border: "1px solid #ffffff14",
            color: "#ffffff55",
            fontFamily: "monospace",
            fontSize: 10,
          }}
        >
          {Math.round(cam.zoom * 100)}% · θ{tDeg}° φ{pDeg}°
        </span>
        <button
          onClick={onReset}
          style={{
            padding: "3px 10px",
            borderRadius: 6,
            background: "#ffffff0d",
            border: "1px solid #ffffff14",
            color: "#ffffff55",
            fontFamily: "monospace",
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          RESET
        </button>
      </div>
      <span
        style={{ color: "#ffffff22", fontFamily: "monospace", fontSize: 9 }}
      >
        {hint}
      </span>
    </div>
  );
}

// ─── Canvas polygon helper ────────────────────────────────────────────────────
function drawPoly(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rot: number,
) {
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ─── STYLE 1 · COSMOS ─────────────────────────────────────────────────────────
const COSMOS_PAL = [
  ["#a78bfa", "#4c1d95"],
  ["#60a5fa", "#1e3a8a"],
  ["#34d399", "#064e3b"],
  ["#f472b6", "#831843"],
  ["#fbbf24", "#78350f"],
];

function CosmosGraph({
  width,
  height,
  camRef,
}: {
  width: number;
  height: number;
  camRef: React.RefObject<Cam>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || width === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const cx = width / 2,
      cy = height / 2;

    const nodes: SimNode[] = NODES.map((n) => ({ ...n }));
    const links: SimLink[] = LINKS.map((l) => ({ ...l }));
    const nodeBaseR = (n: SimNode) => 2 + degScale(n.id) * 3;

    // Force center at (0,0) so graph projects to screen center
    const sim = d3Force
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3Force
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(60)
          .strength((l) => l.strength * 0.3),
      )
      .force(
        "charge",
        d3Force
          .forceManyBody<SimNode>()
          .strength((d) => -60 - (NODE_DEG.get(d.id) ?? 0) * 8),
      )
      .force("center", d3Force.forceCenter(0, 0))
      .force(
        "col",
        d3Force.forceCollide<SimNode>().radius((d) => nodeBaseR(d) * 1.4 + 4),
      )
      .alphaDecay(0.015);

    // 3D star field
    const stars = Array.from({ length: 250 }, () => ({
      wx: (Math.random() - 0.5) * 2400,
      wy: (Math.random() - 0.5) * 2400,
      wz: (Math.random() - 0.5) * 1200,
      r: Math.random() * 1.4 + 0.2,
      baseOp: Math.random() * 0.65 + 0.2,
      spd: Math.random() * 0.015 + 0.004,
      ph: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    function render() {
      t += 0.016;
      sim.tick();
      const cam = camRef.current;

      ctx.fillStyle = "#020008";
      ctx.fillRect(0, 0, width, height);

      // Stars
      stars.forEach((s) => {
        const p = project(s.wx, s.wy, s.wz, cam, cx, cy);
        if (p.scale < 0.05) return;
        const op =
          s.baseOp *
          (0.5 + 0.5 * Math.sin(t * s.spd * 60 + s.ph)) *
          Math.min(1, p.scale * 2.5);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, s.r * p.scale * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op.toFixed(2)})`;
        ctx.fill();
      });

      // Project all nodes
      const proj = nodes.map((n) => {
        const p = project(n.x ?? 0, -(n.y ?? 0), n.z, cam, cx, cy);
        return { n, p, r: nodeBaseR(n) * p.scale * 1.5 };
      });
      proj.sort((a, b) => a.p.rawZ - b.p.rawZ); // back → front

      // Edges
      links.forEach((l) => {
        const s = l.source as SimNode,
          tgt = l.target as SimNode;
        const ps = project(s.x ?? 0, -(s.y ?? 0), s.z, cam, cx, cy);
        const pt = project(tgt.x ?? 0, -(tgt.y ?? 0), tgt.z, cam, cx, cy);
        const sc = (ps.scale + pt.scale) / 2;
        const col = COSMOS_PAL[s.group][0];
        ctx.beginPath();
        ctx.strokeStyle =
          col +
          Math.round(Math.max(35, l.strength * 130))
            .toString(16)
            .padStart(2, "0");
        ctx.lineWidth = Math.max(0.6, l.strength * 1.1 * sc * 1.5);
        ctx.moveTo(ps.sx, ps.sy);
        ctx.lineTo(pt.sx, pt.sy);
        ctx.stroke();
      });

      // Nodes
      proj.forEach(({ n, p, r }) => {
        if (r < 0.5) return;
        const pal = COSMOS_PAL[n.group];
        const pulse = 1 + 0.07 * Math.sin(t + n.id * 0.65);
        const rp = r * pulse;

        const glow = ctx.createRadialGradient(
          p.sx,
          p.sy,
          0,
          p.sx,
          p.sy,
          rp * 1.5,
        );
        glow.addColorStop(0, pal[0] + "55");
        glow.addColorStop(1, pal[0] + "00");
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rp * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        const core = ctx.createRadialGradient(
          p.sx - rp * 0.3,
          p.sy - rp * 0.3,
          0,
          p.sx,
          p.sy,
          rp,
        );
        core.addColorStop(0, "#fff");
        core.addColorStop(0.28, pal[0]);
        core.addColorStop(1, pal[1]);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rp, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.shadowColor = pal[0];
        ctx.shadowBlur = rp * 1.2;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rp * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(render);
    }
    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      sim.stop();
    };
  }, [width, height, camRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block" }}
    />
  );
}

// ─── STYLE 2 · PLASMA ─────────────────────────────────────────────────────────
const PLASMA_COL = ["#00fff7", "#ff00e5", "#7fff00", "#ff6600", "#a855f7"];
const PLASMA_DARK = ["#004d4a", "#4d0045", "#1a3300", "#4d1f00", "#2a0066"];

function PlasmaGraph({
  width,
  height,
  camRef,
}: {
  width: number;
  height: number;
  camRef: React.RefObject<Cam>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || width === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const cx = width / 2,
      cy = height / 2;

    const nodes: SimNode[] = NODES.map((n) => ({ ...n }));
    const links: SimLink[] = LINKS.map((l) => ({ ...l }));
    const nodeBaseR = (n: SimNode) => 2 + degScale(n.id) * 3;

    const sim = d3Force
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3Force
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(55)
          .strength((l) => l.strength * 0.35),
      )
      .force(
        "charge",
        d3Force
          .forceManyBody<SimNode>()
          .strength((d) => -60 - (NODE_DEG.get(d.id) ?? 0) * 8),
      )
      .force("center", d3Force.forceCenter(0, 0))
      .force(
        "col",
        d3Force.forceCollide<SimNode>().radius((d) => nodeBaseR(d) + 4),
      )
      .alphaDecay(0.014);

    // Particles on edges
    const particles = Array.from({ length: 150 }, () => {
      const li = Math.floor(Math.random() * LINKS.length);
      return {
        progress: Math.random(),
        linkIdx: li,
        spd: Math.random() * 0.007 + 0.002,
        size: Math.random() * 1.4 + 0.8,
      };
    });

    let t = 0;
    function render() {
      t += 0.016;
      sim.tick();
      const cam = camRef.current;

      ctx.fillStyle = "rgba(2,0,10,0.18)";
      ctx.fillRect(0, 0, width, height);

      const proj = nodes.map((n) => {
        const p = project(n.x ?? 0, -(n.y ?? 0), n.z, cam, cx, cy);
        return { n, p, r: nodeBaseR(n) * p.scale * 1.5 };
      });
      proj.sort((a, b) => a.p.rawZ - b.p.rawZ);

      // Edges
      links.forEach((l) => {
        const s = l.source as SimNode,
          tgt = l.target as SimNode;
        const ps = project(s.x ?? 0, -(s.y ?? 0), s.z, cam, cx, cy);
        const pt = project(tgt.x ?? 0, -(tgt.y ?? 0), tgt.z, cam, cx, cy);
        const sc = (ps.scale + pt.scale) / 2;
        const c1 = PLASMA_COL[s.group],
          c2 = PLASMA_COL[tgt.group];
        const g = ctx.createLinearGradient(ps.sx, ps.sy, pt.sx, pt.sy);
        g.addColorStop(0, c1 + "44");
        g.addColorStop(0.5, c1 + "88");
        g.addColorStop(1, c2 + "44");
        ctx.beginPath();
        ctx.strokeStyle = g;
        ctx.lineWidth = l.strength * 1.3 * sc * 1.5;
        ctx.shadowColor = c1;
        ctx.shadowBlur = 4;
        ctx.moveTo(ps.sx, ps.sy);
        ctx.lineTo(pt.sx, pt.sy);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Particles
      particles.forEach((p) => {
        const l = links[p.linkIdx];
        if (!l) return;
        const s = l.source as SimNode,
          tgt = l.target as SimNode;
        const ps = project(s.x ?? 0, -(s.y ?? 0), s.z, cam, cx, cy);
        const pt = project(tgt.x ?? 0, -(tgt.y ?? 0), tgt.z, cam, cx, cy);
        p.progress = (p.progress + p.spd) % 1;
        const px = ps.sx + (pt.sx - ps.sx) * p.progress;
        const py = ps.sy + (pt.sy - ps.sy) * p.progress;
        const sc = ps.scale + (pt.scale - ps.scale) * p.progress;
        const col = PLASMA_COL[s.group];
        ctx.beginPath();
        ctx.arc(px, py, p.size * sc * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Nodes
      proj.forEach(({ n, p, r }) => {
        if (r < 0.5) return;
        const col = PLASMA_COL[n.group],
          dark = PLASMA_DARK[n.group];
        const pulse = 1 + 0.09 * Math.sin(t * 2 + n.id * 0.75);
        const rp = r * pulse;

        const glow = ctx.createRadialGradient(
          p.sx,
          p.sy,
          0,
          p.sx,
          p.sy,
          rp * 1.5,
        );
        glow.addColorStop(0, col + "38");
        glow.addColorStop(1, col + "00");
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rp * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        const core = ctx.createRadialGradient(
          p.sx - rp * 0.2,
          p.sy - rp * 0.2,
          0,
          p.sx,
          p.sy,
          rp,
        );
        core.addColorStop(0, "#fff");
        core.addColorStop(0.28, col);
        core.addColorStop(1, dark);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rp, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.shadowColor = col;
        ctx.shadowBlur = rp * 1.0;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rp + 2, 0, Math.PI * 2);
        ctx.strokeStyle = col + "88";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(render);
    }

    ctx.fillStyle = "#02000a";
    ctx.fillRect(0, 0, width, height);
    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      sim.stop();
    };
  }, [width, height, camRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block" }}
    />
  );
}

// ─── STYLE 3 · CRYSTAL ───────────────────────────────────────────────────────
const CRYSTAL_PAL = [
  { c: "#00d4ff", d: "#004466" },
  { c: "#b06bff", d: "#330066" },
  { c: "#00ff99", d: "#004433" },
  { c: "#ffd700", d: "#554400" },
  { c: "#ff69b4", d: "#550033" },
];
const CRYSTAL_SIDES = [6, 4, 6, 8, 6];

function CrystalGraph({
  width,
  height,
  camRef,
}: {
  width: number;
  height: number;
  camRef: React.RefObject<Cam>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || width === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const cx = width / 2,
      cy = height / 2;

    const nodes: SimNode[] = NODES.map((n) => ({ ...n }));
    const links: SimLink[] = LINKS.map((l) => ({ ...l }));
    const nodeBaseR = (n: SimNode) => 2 + degScale(n.id) * 3;

    const sim = d3Force
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3Force
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(55)
          .strength((l) => l.strength * 0.28),
      )
      .force(
        "charge",
        d3Force
          .forceManyBody<SimNode>()
          .strength((d) => -60 - (NODE_DEG.get(d.id) ?? 0) * 8),
      )
      .force("center", d3Force.forceCenter(0, 0))
      .force(
        "col",
        d3Force.forceCollide<SimNode>().radius((d) => nodeBaseR(d) * 1.5 + 4),
      )
      .alphaDecay(0.014);

    let t = 0;
    function render() {
      t += 0.016;
      sim.tick();
      const cam = camRef.current;

      // Grid background
      ctx.fillStyle = "#020c18";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#ffffff07";
      ctx.lineWidth = 0.5;
      const gs = 44;
      for (let x = cx % gs; x < width; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = cy % gs; y < height; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const proj = nodes.map((n) => {
        const p = project(n.x ?? 0, -(n.y ?? 0), n.z, cam, cx, cy);
        return { n, p, r: nodeBaseR(n) * p.scale * 1.5 };
      });
      proj.sort((a, b) => a.p.rawZ - b.p.rawZ);

      // Edges (curved)
      links.forEach((l) => {
        const s = l.source as SimNode,
          tgt = l.target as SimNode;
        const ps = project(s.x ?? 0, -(s.y ?? 0), s.z, cam, cx, cy);
        const pt = project(tgt.x ?? 0, -(tgt.y ?? 0), tgt.z, cam, cx, cy);
        const sc = (ps.scale + pt.scale) / 2;
        const col = CRYSTAL_PAL[s.group].c;
        const mx = (ps.sx + pt.sx) / 2,
          my = (ps.sy + pt.sy) / 2 - 15 * sc * 1.5;
        ctx.beginPath();
        ctx.moveTo(ps.sx, ps.sy);
        ctx.quadraticCurveTo(mx, my, pt.sx, pt.sy);
        ctx.strokeStyle =
          col +
          Math.round(l.strength * 70)
            .toString(16)
            .padStart(2, "0");
        ctx.lineWidth = l.strength * 1.4 * sc * 1.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Nodes
      proj.forEach(({ n, p, r }) => {
        if (r < 0.5) return;
        const pal = CRYSTAL_PAL[n.group];
        const sides = CRYSTAL_SIDES[n.group];
        const rot = t * 0.28 + n.id * 0.38;
        const pulse = 1 + 0.055 * Math.sin(t * 1.4 + n.id * 0.55);
        const rp = r * pulse;

        // Outer glow circle
        const glow = ctx.createRadialGradient(
          p.sx,
          p.sy,
          0,
          p.sx,
          p.sy,
          rp * 1.5,
        );
        glow.addColorStop(0, pal.c + "45");
        glow.addColorStop(1, pal.c + "00");
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, rp * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Outer polygon (bloom)
        drawPoly(ctx, p.sx, p.sy, rp * 1.38, sides, rot);
        ctx.fillStyle = pal.c + "28";
        ctx.shadowColor = pal.c;
        ctx.shadowBlur = rp * 1.0;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Main polygon
        drawPoly(ctx, p.sx, p.sy, rp, sides, rot);
        const grad = ctx.createRadialGradient(
          p.sx - rp * 0.3,
          p.sy - rp * 0.3,
          0,
          p.sx,
          p.sy,
          rp,
        );
        grad.addColorStop(0, "#fff");
        grad.addColorStop(0.35, pal.c);
        grad.addColorStop(1, pal.d);
        ctx.fillStyle = grad;
        ctx.strokeStyle = pal.c + "cc";
        ctx.lineWidth = 1.3;
        ctx.shadowColor = pal.c;
        ctx.shadowBlur = rp * 0.8;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner facet
        drawPoly(ctx, p.sx, p.sy, rp * 0.48, sides, rot + Math.PI / sides);
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fill();
      });

      rafRef.current = requestAnimationFrame(render);
    }
    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      sim.stop();
    };
  }, [width, height, camRef]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block" }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Style = "cosmos" | "plasma" | "crystal";
const BG: Record<Style, string> = {
  cosmos: "#020008",
  plasma: "#02000a",
  crystal: "#020c18",
};

export default function GraphTestPage() {
  const { t } = useTranslation();
  const [style, setStyle] = useState<Style>("cosmos");
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { camRef, hudCam, cursor, reset } = useCameraControls(containerRef);

  const STYLES = [
    {
      id: "cosmos" as Style,
      label: t("graphLab.styles.cosmos"),
      desc: t("graphLab.styles.cosmosDesc"),
    },
    {
      id: "plasma" as Style,
      label: t("graphLab.styles.plasma"),
      desc: t("graphLab.styles.plasmaDesc"),
    },
    {
      id: "crystal" as Style,
      label: t("graphLab.styles.crystal"),
      desc: t("graphLab.styles.crystalDesc"),
    },
  ];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: BG[style] }}
    >
      {/* Header — matches app header style */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-base-border bg-bg-primary shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-bold text-text-primary tracking-widest font-mono">
            ◈ {t("graphLab.title")}
          </span>
          <span className="text-[10px] text-text-tertiary font-mono">
            {NODES.length} nodes · {LINKS.length} edges
          </span>
        </div>
        <div className="flex gap-1">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono tracking-wider transition-all duration-150 ${
                style === s.id
                  ? "bg-primary/15 border border-primary/40 text-primary"
                  : "border border-transparent text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary"
              }`}
            >
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-text-tertiary font-mono min-w-[150px] text-right">
          {STYLES.find((s) => s.id === style)?.desc}
        </span>
      </div>

      {/* Viewport — canvas fills this, no CSS transform applied */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          background: BG[style],
          cursor,
          userSelect: "none",
        }}
      >
        {size.w > 0 && (
          <>
            {style === "cosmos" && (
              <CosmosGraph width={size.w} height={size.h} camRef={camRef} />
            )}
            {style === "plasma" && (
              <PlasmaGraph width={size.w} height={size.h} camRef={camRef} />
            )}
            {style === "crystal" && (
              <CrystalGraph width={size.w} height={size.h} camRef={camRef} />
            )}
          </>
        )}
        <CameraHUD cam={hudCam} onReset={reset} hint={t("graphLab.hudHint")} />
      </div>
    </div>
  );
}
