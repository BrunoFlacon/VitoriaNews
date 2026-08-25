// CanvasRulers — Horizontal + Vertical rulers with tick marks, coordinate labels,
// and cursor crosshair. Positioned absolutely inside the canvas viewport container.
//
// The ruler canvases sit at left:RULER_SIZE and top:RULER_SIZE, so their internal
// coordinate origin is offset by RULER_SIZE from the container origin. All tick/cursor
// drawing compensates for this offset.
//
// Performance: canvas dimensions are only resized when they actually change.
// Cursor redraws happen via rAF to avoid layout thrash.

import React, { useRef, useEffect, useCallback } from "react";

const RULER_SIZE = 22;
const RULER_BG = "#1a1a2e";
const RULER_TEXT = "#9ca3af";
const RULER_TICK_MAJOR = "#d1d5db";
const RULER_TICK_MINOR = "#4b5563";
const RULER_BORDER = "#2d2d44";
const RULER_CANVAS_BG = "rgba(59,130,246,0.08)";

interface CanvasRulersProps {
  containerWidth: number;
  containerHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };
  /** Cursor position in canvas coords — updated at most ~30fps to avoid reflows */
  cursorCanvasPos?: { x: number; y: number } | null;
  visible?: boolean;
}

function getTickInterval(zoom: number): number {
  const target = 80;
  const raw = target / Math.max(zoom, 0.01);
  const nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  return nice.find((v) => v >= raw) ?? 5000;
}

export const CanvasRulers: React.FC<CanvasRulersProps> = ({
  containerWidth,
  containerHeight,
  canvasWidth,
  canvasHeight,
  zoom,
  panOffset,
  cursorCanvasPos,
  visible = true,
}) => {
  const hRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef<HTMLCanvasElement>(null);

  // Cursor position in a ref for lightweight rAF redraws
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const cursorRafRef = useRef<number>(0);
  cursorRef.current = cursorCanvasPos ?? null;

  // Canvas-left-edge in the container (flex-centered)
  const originX = containerWidth / 2 - (canvasWidth * zoom) / 2 + panOffset.x;
  const originY = containerHeight / 2 - (canvasHeight * zoom) / 2 + panOffset.y;

  // ── Full horizontal ruler draw (ticks + labels + cursor) ──────────
  const drawHRuler = useCallback(() => {
    const cvs = hRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = containerWidth - RULER_SIZE;
    if (w <= 0) return; // not ready yet

    // Only resize canvas when dimensions actually changed (avoids forced reflow)
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(RULER_SIZE * dpr);
    if (cvs.width !== targetW || cvs.height !== targetH) {
      cvs.width = targetW;
      cvs.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = RULER_BG;
    ctx.fillRect(0, 0, w, RULER_SIZE);

    // Canvas fill area (where the design canvas is visible)
    // The ruler canvas is offset by RULER_SIZE, so the canvas left in ruler coords is originX - RULER_SIZE
    const canvasStartVX = originX - RULER_SIZE;
    const canvasEndVX = canvasStartVX + canvasWidth * zoom;
    if (canvasEndVX > 0 && canvasStartVX < w) {
      ctx.fillStyle = RULER_CANVAS_BG;
      ctx.fillRect(
        Math.max(0, canvasStartVX), 0,
        Math.min(w, canvasEndVX) - Math.max(0, canvasStartVX),
        RULER_SIZE,
      );
    }

    const interval = getTickInterval(zoom);
    const minorInterval = Math.max(1, interval / 5);

    // Iterate canvas coordinates that are visible in the ruler
    const minCoord = Math.floor(-originX / zoom);
    const maxCoord = Math.ceil((w - originX) / zoom);

    for (let c = minCoord; c <= maxCoord; c += minorInterval) {
      const rc = Math.round(c * 1000) / 1000;
      if (rc < 0 || rc > canvasWidth) continue;
      const vx = originX - RULER_SIZE + rc * zoom;
      if (vx < 0 || vx > w) continue;

      const isMajor = Math.abs(rc % interval) < 0.01 || Math.abs(rc % interval - interval) < 0.01;
      const tickH = isMajor ? RULER_SIZE * 0.7 : RULER_SIZE * 0.35;

      ctx.strokeStyle = isMajor ? RULER_TICK_MAJOR : RULER_TICK_MINOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(vx) + 0.5, RULER_SIZE);
      ctx.lineTo(Math.round(vx) + 0.5, RULER_SIZE - tickH);
      ctx.stroke();

      // Number labels on major ticks
      if (isMajor) {
        ctx.fillStyle = RULER_TEXT;
        ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(Math.round(rc)), vx, 3);
      }
    }

    // Bottom border
    ctx.strokeStyle = RULER_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE - 0.5);
    ctx.lineTo(w, RULER_SIZE - 0.5);
    ctx.stroke();

    // Cursor indicator
    const cur = cursorRef.current;
    if (cur && cur.x >= 0 && cur.x <= canvasWidth) {
      const cvx = originX - RULER_SIZE + cur.x * zoom;
      if (cvx >= 0 && cvx <= w) {
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(Math.round(cvx) + 0.5, 0);
        ctx.lineTo(Math.round(cvx) + 0.5, RULER_SIZE);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [containerWidth, canvasWidth, zoom, originX]);

  // ── Full vertical ruler draw ──────────────────────────────────────
  const drawVRuler = useCallback(() => {
    const cvs = vRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const h = containerHeight - RULER_SIZE;
    if (h <= 0) return;

    const targetW = Math.round(RULER_SIZE * dpr);
    const targetH = Math.round(h * dpr);
    if (cvs.width !== targetW || cvs.height !== targetH) {
      cvs.width = targetW;
      cvs.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = RULER_BG;
    ctx.fillRect(0, 0, RULER_SIZE, h);

    // Canvas fill area
    const canvasStartVY = originY - RULER_SIZE;
    const canvasEndVY = canvasStartVY + canvasHeight * zoom;
    if (canvasEndVY > 0 && canvasStartVY < h) {
      ctx.fillStyle = RULER_CANVAS_BG;
      ctx.fillRect(
        0, Math.max(0, canvasStartVY),
        RULER_SIZE,
        Math.min(h, canvasEndVY) - Math.max(0, canvasStartVY),
      );
    }

    const interval = getTickInterval(zoom);
    const minorInterval = Math.max(1, interval / 5);

    const minCoord = Math.floor(-originY / zoom);
    const maxCoord = Math.ceil((h - originY) / zoom);

    for (let c = minCoord; c <= maxCoord; c += minorInterval) {
      const rc = Math.round(c * 1000) / 1000;
      if (rc < 0 || rc > canvasHeight) continue;
      const vy = originY - RULER_SIZE + rc * zoom;
      if (vy < 0 || vy > h) continue;

      const isMajor = Math.abs(rc % interval) < 0.01 || Math.abs(rc % interval - interval) < 0.01;
      const tickW = isMajor ? RULER_SIZE * 0.7 : RULER_SIZE * 0.35;

      ctx.strokeStyle = isMajor ? RULER_TICK_MAJOR : RULER_TICK_MINOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE, Math.round(vy) + 0.5);
      ctx.lineTo(RULER_SIZE - tickW, Math.round(vy) + 0.5);
      ctx.stroke();

      // Number labels on major ticks (rotated)
      if (isMajor) {
        ctx.save();
        ctx.fillStyle = RULER_TEXT;
        ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.translate(10, vy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(String(Math.round(rc)), 0, 0);
        ctx.restore();
      }
    }

    // Right border
    ctx.strokeStyle = RULER_BORDER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE - 0.5, 0);
    ctx.lineTo(RULER_SIZE - 0.5, h);
    ctx.stroke();

    // Cursor indicator
    const cur = cursorRef.current;
    if (cur && cur.y >= 0 && cur.y <= canvasHeight) {
      const cvy = originY - RULER_SIZE + cur.y * zoom;
      if (cvy >= 0 && cvy <= h) {
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, Math.round(cvy) + 0.5);
        ctx.lineTo(RULER_SIZE, Math.round(cvy) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [containerHeight, canvasHeight, zoom, originY]);

  // Full redraw when layout/zoom/pan changes
  useEffect(() => {
    if (!visible) return;
    drawHRuler();
    drawVRuler();
  }, [visible, drawHRuler, drawVRuler]);

  // Cursor-only redraw via rAF — lightweight (no canvas resize)
  useEffect(() => {
    if (!visible || !cursorCanvasPos) return;
    if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    cursorRafRef.current = requestAnimationFrame(() => {
      drawHRuler();
      drawVRuler();
    });
    return () => {
      if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    };
  }, [visible, cursorCanvasPos, drawHRuler, drawVRuler]);

  useEffect(() => {
    return () => {
      if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Corner box (where rulers meet) */}
      <div
        className="absolute top-0 left-0 z-[5] pointer-events-none"
        style={{
          width: RULER_SIZE,
          height: RULER_SIZE,
          background: RULER_BG,
          borderRight: `1px solid ${RULER_BORDER}`,
          borderBottom: `1px solid ${RULER_BORDER}`,
        }}
      />
      {/* Horizontal ruler */}
      <canvas
        ref={hRef}
        className="absolute z-[5] pointer-events-none"
        style={{
          top: 0,
          left: RULER_SIZE,
          width: containerWidth - RULER_SIZE,
          height: RULER_SIZE,
        }}
      />
      {/* Vertical ruler */}
      <canvas
        ref={vRef}
        className="absolute z-[5] pointer-events-none"
        style={{
          top: RULER_SIZE,
          left: 0,
          width: RULER_SIZE,
          height: containerHeight - RULER_SIZE,
        }}
      />
    </>
  );
};

export { RULER_SIZE };
