'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAudio } from '../../hooks/useAudio';

interface StreamWheelOverlayProps {
  token: string;
}

interface WheelSlice {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_SLICES: WheelSlice[] = [
  { id: '1', label: '1v1 Match', color: '#00F0FF' },
  { id: '2', label: 'Custom Song', color: '#A855F7' },
  { id: '3', label: 'Shoutout', color: '#10B981' },
  { id: '4', label: 'Discord VIP', color: '#F59E0B' },
  { id: '5', label: 'Wheel Reroll', color: '#EC4899' },
  { id: '6', label: 'GG Jackpot 👑', color: '#EF4444' }
];

export const StreamWheelOverlay: React.FC<StreamWheelOverlayProps> = ({ token }) => {
  const effectiveToken = token || 'demo-token';
  const { socket, joinOverlayRoom } = useSocket();
  const { playSynthNeonChime } = useAudio();

  const [slices, setSlices] = useState<WheelSlice[]>(DEFAULT_SLICES);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [currentRotation, setCurrentRotation] = useState<number>(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // 1. Verify Pro plan on initial fetch
  useEffect(() => {
    fetch(`/api/widgets/wheel?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.isLocked || !data.success) {
          setIsLocked(true);
          return;
        }
        setIsLocked(false);
      })
      .catch(() => {});
  }, [effectiveToken]);

  // 2. Join overlay room
  useEffect(() => {
    if (effectiveToken) {
      joinOverlayRoom(effectiveToken);
    }
  }, [effectiveToken, joinOverlayRoom]);

  // 3. Listen for wheel:spin socket event
  useEffect(() => {
    if (!socket) return;

    const handleWheelSpin = (payload: any) => {
      if (isLocked) return;
      if (payload.slices && Array.isArray(payload.slices)) {
        setSlices(payload.slices);
      }
      const rotation = Number(payload.totalRotation) || (currentRotation + 1800 + Math.floor(Math.random() * 360));
      setCurrentRotation(rotation);
      setIsSpinning(true);
      setWinner(null);
      playSynthNeonChime();

      setTimeout(() => {
        setIsSpinning(false);
        if (payload.winner) {
          setWinner(payload.winner);
        }
      }, 4000);
    };

    socket.on('wheel:spin', handleWheelSpin);
    return () => {
      socket.off('wheel:spin', handleWheelSpin);
    };
  }, [socket, isLocked, currentRotation, playSynthNeonChime]);

  if (isLocked) {
    return <div className="w-full h-full bg-transparent" />;
  }

  const sliceAngle = 360 / Math.max(1, slices.length);

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-6 select-none overflow-hidden">
      <div className="relative flex flex-col items-center justify-center">
        {/* Pointer Arrow at Top Center */}
        <div className="absolute -top-5 z-20 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[32px] border-t-amber-400 filter drop-shadow-[0_4px_12px_rgba(245,158,11,0.8)]" />

        {/* Rotating Circular Wheel */}
        <div
          className="relative w-72 h-72 sm:w-84 sm:h-84 rounded-full border-4 border-slate-700 shadow-2xl overflow-hidden"
          style={{
            transform: `rotate(${currentRotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.12, 0.8, 0.32, 1)' : 'none',
            boxShadow: '0 0 50px rgba(0, 240, 255, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.8)'
          }}
        >
          {slices.map((slice, idx) => {
            const rot = idx * sliceAngle;
            return (
              <div
                key={slice.id}
                className="absolute top-0 left-1/2 w-1/2 h-full origin-left overflow-hidden"
                style={{
                  transform: `rotate(${rot}deg)`,
                  backgroundColor: slice.color,
                  clipPath: `polygon(0 50%, 100% 0, 100% 100%)`
                }}
              >
                <div
                  className="absolute top-1/2 left-8 -translate-y-1/2 text-white font-['Chakra_Petch'] font-extrabold text-xs sm:text-sm tracking-wider drop-shadow-md whitespace-nowrap"
                  style={{ transform: `rotate(${sliceAngle / 2}deg)` }}
                >
                  {slice.label}
                </div>
              </div>
            );
          })}

          {/* Center Hub Logo */}
          <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-slate-950 border-4 border-cyan-400 shadow-xl flex items-center justify-center z-10">
            <span className="font-['Chakra_Petch'] font-bold text-cyan-400 text-xs">SPIN</span>
          </div>
        </div>

        {/* Winner Announcement Popup */}
        {winner && (
          <div className="mt-6 px-6 py-3 rounded-2xl bg-[#090D18]/95 border-2 border-amber-400 text-amber-300 font-['Chakra_Petch'] font-black text-lg tracking-wide shadow-2xl animate-in zoom-in-95 duration-200">
            🎉 WINNER: {winner}!
          </div>
        )}
      </div>
    </div>
  );
};
