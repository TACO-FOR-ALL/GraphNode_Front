import { useEffect, useRef } from "react";
import * as d3 from "d3-force";
import { GraphData } from "@/types/GraphData";

type SimNode = d3.SimulationNodeDatum & {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
};
type SimLink = d3.SimulationLinkDatum<SimNode> & {
  source: string | SimNode;
  target: string | SimNode;
};

export default function Graph2D({ data }: { data: GraphData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const DPR = window.devicePixelRatio || 1;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width * DPR;
    canvas.height = height * DPR;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(DPR, DPR);

    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    const nodes: SimNode[] = data.nodes.map((n) => ({
      id: n.id,
      x: Math.random() * 400 - 200,
      y: Math.random() * 400 - 200,
    }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const links: SimLink[] = data.links.map((l) => ({
      source: nodeById.get(l.source)!,
      target: nodeById.get(l.target)!,
    }));

    const sim = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => (d as SimNode).id)
          .distance(60)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(0, 0))
      .alphaDecay(0.02);

    const R = 6;

    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const [wx, wy] = screenToWorld(mx, my);

      let hit: SimNode | null = null;
      for (const n of nodes) {
        const dx = n.x! - wx;
        const dy = n.y! - wy;
        if (dx * dx + dy * dy <= (R * 1.2) ** 2) {
          hit = n;
          break;
        }
      }
      if (!hit) return;

      focusOnNode(hit, { zoomTo: 1.5, ms: 450 });
    };
    canvas.addEventListener("click", onClick);

    let focusing = false;

    function focusOnNode(
      node: SimNode,
      opt: { zoomTo?: number; ms?: number } = {}
    ) {
      if (focusing) return;
      focusing = true;
      sim.stop();

      const startScale = scale;
      const startTX = translateX;
      const startTY = translateY;
      const endScale = opt.zoomTo ?? scale;
      const dur = opt.ms ?? 450;

      let t0 = 0;
      let rafId = 0;

      const savedDragging = dragging;
      dragging = false;
      const blockWheel = (e: WheelEvent) => e.preventDefault();
      canvas.addEventListener("wheel", blockWheel, { passive: false });

      const EPS = 0.001;

      const run = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;

        const wx = node.x!;
        const wy = node.y!;
        const endTX = -wx * endScale;
        const endTY = -wy * endScale;

        // 보간
        scale = startScale + (endScale - startScale) * ease;
        translateX = startTX + (endTX - startTX) * ease;
        translateY = startTY + (endTY - startTY) * ease;

        // 종료 판단은 근사치로
        const done =
          Math.abs(scale - endScale) < EPS &&
          Math.abs(translateX - endTX) < EPS &&
          Math.abs(translateY - endTY) < EPS;

        if (!done) {
          rafId = requestAnimationFrame(run);
        } else {
          scale = endScale;
          translateX = endTX;
          translateY = endTY;

          canvas.removeEventListener("wheel", blockWheel);
          dragging = savedDragging;
          focusing = false;
        }
      };
      rafId = requestAnimationFrame(run);
    }

    function screenToWorld(x: number, y: number) {
      return [
        (x - translateX - width / 2) / scale,
        (y - translateY - height / 2) / scale,
      ] as const;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 + translateX, height / 2 + translateY);
      ctx.scale(scale, scale);

      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1 / scale;
      for (const l of links) {
        const s = l.source as SimNode;
        const t = l.target as SimNode;
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.stroke();
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle = "#4aa8c0";
        ctx.arc(n.x!, n.y!, R, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const [wx, wy] = screenToWorld(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      let hit: SimNode | null = null;
      for (const n of nodes) {
        const dx = n.x! - wx;
        const dy = n.y! - wy;
        if (dx * dx + dy * dy <= (R * 1.2) ** 2) {
          hit = n;
          break;
        }
      }
      if (hit && tooltipRef.current) {
        tooltipRef.current.textContent = hit.id;
        tooltipRef.current.style.left = `${e.clientX + 10}px`;
        tooltipRef.current.style.top = `${e.clientY + 10}px`;
        tooltipRef.current.style.opacity = "1";
      } else if (tooltipRef.current) {
        tooltipRef.current.style.opacity = "0";
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (focusing) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoom = Math.exp(-e.deltaY * 0.0015);
      const [wx0, wy0] = screenToWorld(mouseX, mouseY);

      scale *= zoom;
      scale = Math.max(0.3, Math.min(4, scale));

      const [wx1, wy1] = screenToWorld(mouseX, mouseY);
      translateX += (wx1 - wx0) * scale;
      translateY += (wy1 - wy0) * scale;
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => (dragging = false);
    const onDrag = (e: MouseEvent) => {
      if (!dragging || focusing) return;
      translateX += e.clientX - lastX;
      translateY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    };

    let raf = 0;
    const tick = () => {
      sim.tick();
      draw();
      raf = requestAnimationFrame(tick);
    };
    tick();

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onDrag);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onDrag);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("click", onClick);
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
