import React, { useState, useCallback } from "react";

interface SparklineCardProps {
  data: number[];
  labels?: string[];
  color?: string;
  width?: number;
  height?: number;
}

export const SparklineCard = ({
  data,
  labels,
  color = "#3b82f6",
  width = 120,
  height = 32,
}: SparklineCardProps) => {
  const id = React.useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!Array.isArray(data) || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${width},${height + 2} L0,${height + 2} Z`;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round((svgX / width) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setHoverIndex(clamped);
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [data.length, width]);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="opacity-60 group-hover:opacity-100 transition-opacity cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#spark-${id})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {hoverIndex !== null && (
          <>
            <circle cx={points[hoverIndex].x} cy={points[hoverIndex].y} r="3" fill={color} stroke="#0f172a" strokeWidth="1.5" />
            <line x1={points[hoverIndex].x} y1={0} x2={points[hoverIndex].x} y2={height} stroke={color} strokeWidth="0.5" strokeDasharray="2,2" opacity={0.4} />
          </>
        )}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
      </svg>
      {hoverIndex !== null && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: Math.min(tooltipPos.x + 10, width - 80),
            top: Math.max(tooltipPos.y - 32, 0),
          }}
        >
          <div className="bg-[#0f172a] border border-border/60 rounded-md px-2 py-1 shadow-xl backdrop-blur-sm">
            <p className="text-xs font-bold text-white whitespace-nowrap">
              {data[hoverIndex].toLocaleString()}
            </p>
            {labels?.[hoverIndex] && (
              <p className="text-[9px] text-muted-foreground whitespace-nowrap">
                {labels[hoverIndex]}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const randomWalk = (steps: number, trend: number): number[] => {
  let val = 50 + Math.random() * 20;
  const result: number[] = [Math.round(val)];
  for (let i = 1; i < steps; i++) {
    val += (Math.random() - 0.5) * 12 + trend;
    val = Math.max(5, Math.min(95, val));
    result.push(Math.round(val));
  }
  return result;
};

export const useSparklineData = (growth: string | number | undefined | null): number[] => {
  return React.useMemo(() => {
    const g = typeof growth === "string" ? parseFloat(growth) : (typeof growth === "number" ? growth : 0);
    const trend = isNaN(g) ? 0 : g > 0 ? 0.6 : g < 0 ? -0.6 : 0;
    return randomWalk(20, trend);
  }, [growth]);
};
