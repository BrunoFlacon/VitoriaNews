import React, { useEffect, useRef } from 'react';

export const MatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=';
    const fontSize = 14;
    let width = 0;
    let height = 0;
    let columns = 0;
    let drops: number[] = [];

    const initCanvas = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.ceil(width / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.random() * -height);
    };

    initCanvas();

    let animationFrameId: number;
    let skipFrame = false;

    const draw = () => {
      skipFrame = !skipFrame;
      if (skipFrame) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    const handleResize = () => {
      requestAnimationFrame(() => {
        initCanvas();
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.15, willChange: 'transform' }}
    />
  );
};
