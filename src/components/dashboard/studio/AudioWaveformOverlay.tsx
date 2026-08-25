import React, { useEffect, useRef } from "react";
import { Radio } from "lucide-react";

interface AudioWaveformOverlayProps {
  color?: string;
  barCount?: number;
  height?: number;
  style?: "bars" | "wave" | "dots";
}

export const AudioWaveformOverlay: React.FC<AudioWaveformOverlayProps> = ({
  color = "#3B82F6",
  barCount = 32,
  height = 80,
  style = "bars",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const barWidth = width / barCount;

      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

      if (style === "bars") {
        for (let i = 0; i < barCount; i++) {
          const sinValue = Math.sin(phase + i * 0.3);
          const barHeight = Math.abs(sinValue) * (canvas.height * 0.7) + 10;
          const x = i * barWidth;
          const y = (canvas.height - barHeight) / 2;

          ctx.beginPath();
          ctx.roundRect(x + 2, y, barWidth - 4, barHeight, 4);
          ctx.fill();
        }
      } else if (style === "wave") {
        ctx.beginPath();
        for (let x = 0; x < width; x += 5) {
          const y = canvas.height / 2 + Math.sin(phase + x * 0.05) * (canvas.height * 0.3);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      phase += 0.08;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [color, barCount, height, style]);

  return (
    <div className="relative w-full overflow-hidden bg-black/40 border border-white/10 p-4 flex items-center gap-3">
      <div className="p-2 bg-primary/20 text-primary shrink-0">
        <Radio className="w-5 h-5 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
          Forma de Onda de Áudio (Podcast / Rádio)
        </p>
        <canvas
          ref={canvasRef}
          width={400}
          height={height}
          className="w-full h-12 object-contain"
        />
      </div>
    </div>
  );
};
