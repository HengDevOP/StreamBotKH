'use client';

import React, { useEffect, useRef } from 'react';

interface MatrixBackgroundProps {
  className?: string;
  opacity?: number;
}

export const MatrixBackground: React.FC<MatrixBackgroundProps> = ({
  className = '',
  opacity = 0.28
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastDrawTime = 0;
    const targetFps = 28; // Cinematic, smooth Matrix falling speed (low CPU impact)
    const frameInterval = 1000 / targetFps;

    // Characters: Tech symbols, numbers, letters & StreamBotKH easter eggs ($, ៛, K, H, Q, R)
    const characters = '0123456789ABCDEF$៛KHQROBS><:;~*#+={}%';
    const charArray = characters.split('');

    const fontSize = 14;
    let columns = 0;
    let drops: number[] = [];

    const resizeCanvas = () => {
      // Use parent container dimensions
      const parent = canvas.parentElement;
      const width = parent ? parent.offsetWidth : window.innerWidth;
      // Cap height to viewport or upper 2400px so memory stays lightweight
      const height = parent ? Math.min(parent.offsetHeight, 3200) : window.innerHeight;

      canvas.width = width;
      canvas.height = height;

      columns = Math.floor(width / fontSize);
      drops = [];
      for (let i = 0; i < columns; i++) {
        // Random starting positions staggered vertically
        drops[i] = Math.floor(Math.random() * -100);
      }

      // Initial clear
      ctx.fillStyle = '#070A12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(draw);

      // Frame rate throttling for optimal battery and silky performance
      const elapsed = currentTime - lastDrawTime;
      if (elapsed < frameInterval) return;
      lastDrawTime = currentTime - (elapsed % frameInterval);

      if (!canvas || !ctx) return;

      // Semi-transparent overlay to produce iconic fading Matrix trails
      ctx.fillStyle = 'rgba(7, 10, 18, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "Chakra Petch", "Courier New", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        if (y > 0 && y < canvas.height + fontSize) {
          // Leading drop: bright white / electric cyan highlight
          if (Math.random() > 0.88) {
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
            ctx.shadowBlur = 8;
          } else {
            // Trail character: Cyber Cyan (#00F0FF) / Sky Blue (#0284C7)
            ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
            ctx.shadowBlur = 0;
          }

          ctx.fillText(text, x, y);
        }

        // Reset drop to top with random delay after reaching bottom
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div
      className={`home-matrix-container pointer-events-none absolute inset-0 overflow-hidden -z-10 ${className}`}
      style={{
        opacity,
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.2) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.2) 100%)'
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
