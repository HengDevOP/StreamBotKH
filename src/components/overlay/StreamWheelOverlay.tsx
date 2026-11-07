'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAudio } from '../../hooks/useAudio';

interface StreamWheelOverlayProps {
  token: string;
}

export interface WheelSlice {
  id: string;
  label: string;
  color: string;
  percentage?: number;
}

const DEFAULT_SLICES: WheelSlice[] = [
  { id: '1', label: '1v1 Match', color: '#00F0FF', percentage: 20 },
  { id: '2', label: 'Custom Song', color: '#A855F7', percentage: 20 },
  { id: '3', label: 'Shoutout', color: '#10B981', percentage: 20 },
  { id: '4', label: 'Discord VIP', color: '#F59E0B', percentage: 15 },
  { id: '5', label: 'Wheel Reroll', color: '#EC4899', percentage: 15 },
  { id: '6', label: 'GG Jackpot 👑', color: '#EF4444', percentage: 10 }
];

export const StreamWheelOverlay: React.FC<StreamWheelOverlayProps> = ({ token }) => {
  const effectiveToken = token || 'demo-token';
  const { socket, joinOverlayRoom } = useSocket();
  const { playSound } = useAudio();

  const [slices, setSlices] = useState<WheelSlice[]>(DEFAULT_SLICES);
  const [spinSoundUrl, setSpinSoundUrl] = useState<string>('/sounds/neon-chime.mp3');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeOutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load initial settings & verify Pro plan
  useEffect(() => {
    fetch(`/api/widgets/wheel?token=${encodeURIComponent(effectiveToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.isLocked) {
          setIsLocked(true);
          return;
        }
        setIsLocked(false);
        if (data.settings) {
          if (Array.isArray(data.settings.slices) && data.settings.slices.length > 0) {
            setSlices(data.settings.slices);
          }
          if (data.settings.spinSoundUrl) {
            setSpinSoundUrl(data.settings.spinSoundUrl);
          }
        }
      })
      .catch(() => {});
  }, [effectiveToken]);

  // 2. Join overlay room
  useEffect(() => {
    if (effectiveToken) {
      joinOverlayRoom(effectiveToken);
    }
  }, [effectiveToken, joinOverlayRoom]);

  // 3. Listen for wheel:spin and wheel:settings_updated socket events
  useEffect(() => {
    if (!socket) return;

    const handleSettingsUpdated = (payload: any) => {
      if (Array.isArray(payload.slices) && payload.slices.length > 0) {
        setSlices(payload.slices);
      }
      if (payload.spinSoundUrl) {
        setSpinSoundUrl(payload.spinSoundUrl);
      }
    };

    const handleWheelSpin = (payload: any) => {
      if (isLocked) return;

      // Clear any pending timers
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (fadeOutTimeoutRef.current) clearTimeout(fadeOutTimeoutRef.current);

      if (payload.slices && Array.isArray(payload.slices) && payload.slices.length > 0) {
        setSlices(payload.slices);
      }

      const activeSound = payload.spinSoundUrl || spinSoundUrl || '/sounds/neon-chime.mp3';
      const targetRotation = Number(payload.totalRotation) || (currentRotation + 1800 + Math.floor(Math.random() * 360));

      // Step 1: Smooth fade in
      setIsVisible(true);
      setWinner(null);

      // Play sound
      playSound(activeSound, 0.9);

      // Step 2: Spin animation begins smoothly
      setTimeout(() => {
        setIsSpinning(true);
        setCurrentRotation(targetRotation);
      }, 100);

      // Step 3: When outcome finishes after 4s
      spinTimeoutRef.current = setTimeout(() => {
        setIsSpinning(false);
        if (payload.winner) {
          setWinner(payload.winner);
        }

        // Step 4: Await 5 seconds upon outcome, then smoothly fade out
        fadeOutTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);

          // Reset winner after fade-out transition finishes (750ms)
          setTimeout(() => {
            setWinner(null);
          }, 750);
        }, 5000);
      }, 4100);
    };

    socket.on('wheel:settings_updated', handleSettingsUpdated);
    socket.on('wheel:spin', handleWheelSpin);

    return () => {
      socket.off('wheel:settings_updated', handleSettingsUpdated);
      socket.off('wheel:spin', handleWheelSpin);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (fadeOutTimeoutRef.current) clearTimeout(fadeOutTimeoutRef.current);
    };
  }, [socket, isLocked, currentRotation, spinSoundUrl, playSound]);

  // Build SVG Pie Slices
  const svgSlices = useMemo(() => {
    if (slices.length === 0) return [];
    const count = slices.length;
    const anglePerSlice = 360 / count;

    return slices.map((slice, i) => {
      const startAngle = i * anglePerSlice;
      const endAngle = (i + 1) * anglePerSlice;

      const r = 160;
      const cx = 175;
      const cy = 175;

      const rad1 = ((startAngle - 90) * Math.PI) / 180;
      const rad2 = ((endAngle - 90) * Math.PI) / 180;

      const x1 = cx + r * Math.cos(rad1);
      const y1 = cy + r * Math.sin(rad1);
      const x2 = cx + r * Math.cos(rad2);
      const y2 = cy + r * Math.sin(rad2);

      const largeArc = anglePerSlice > 180 ? 1 : 0;
      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const midAngle = (startAngle + endAngle) / 2;
      const midRad = ((midAngle - 90) * Math.PI) / 180;
      const textR = 105;
      const tx = cx + textR * Math.cos(midRad);
      const ty = cy + textR * Math.sin(midRad);

      return {
        id: slice.id,
        label: slice.label,
        color: slice.color,
        pathData,
        tx,
        ty,
        midAngle
      };
    });
  }, [slices]);

  if (isLocked) {
    return <div className="w-full h-full bg-transparent" />;
  }

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      {/* Root Container: Fades in when spinning, awaits 5s on outcome, then smoothly fades out */}
      <div
        className={`relative flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
          isVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Pointer Arrow at Top Center */}
        <div className="absolute -top-5 z-20 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[30px] border-t-amber-400 filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.85)]" />

        {/* Vector SVG Circular Wheel Canvas */}
        <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
          <svg
            viewBox="0 0 350 350"
            className="w-full h-full drop-shadow-[0_0_40px_rgba(168,85,247,0.45)]"
            style={{
              transform: `rotate(${currentRotation}deg)`,
              transition: isSpinning
                ? 'transform 4s cubic-bezier(0.12, 0.8, 0.32, 1), filter 0.4s ease'
                : 'filter 0.4s ease',
              filter: winner ? 'blur(8px) brightness(0.7)' : 'none'
            }}
          >
            {svgSlices.map((s) => (
              <g key={s.id}>
                <path d={s.pathData} fill={s.color} stroke="#090D18" strokeWidth="3" />
                <text
                  x={s.tx}
                  y={s.ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${s.midAngle - 90}, ${s.tx}, ${s.ty})`}
                  fill="#FFFFFF"
                  fontWeight="bold"
                  fontSize="13"
                  fontFamily="Chakra Petch"
                  className="drop-shadow"
                >
                  {s.label.length > 15 ? `${s.label.slice(0, 14)}…` : s.label}
                </text>
              </g>
            ))}

            {/* Center Hub */}
            <circle cx="175" cy="175" r="32" fill="#090D18" stroke="#1E293B" strokeWidth="4" />
            <circle cx="175" cy="175" r="18" fill="#8B5CF6" />
          </svg>

          {/* Outcome Popup (centered over the blurred wheel until fade-out) */}
          {winner && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="max-w-[85%] px-6 py-4 rounded-2xl bg-[#090D18]/90 border border-purple-500/60 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
                <span className="text-[11px] font-mono uppercase tracking-widest text-purple-300 font-bold block">
                  REWARD OUTCOME
                </span>
                <span className="text-xl sm:text-2xl font-bold text-white font-['Chakra_Petch'] break-words">
                  {winner}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
