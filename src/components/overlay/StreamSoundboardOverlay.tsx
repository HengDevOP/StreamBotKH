'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Volume2,
  Megaphone,
  Smile,
  DollarSign,
  Trophy,
  Frown,
  Sparkles,
  Flame,
  Zap,
  Bell,
  AlertCircle,
  Skull,
  TrendingUp,
  Radio,
  Crosshair,
  Activity,
  Mic,
  Music
} from 'lucide-react';
import { triggerSoundEffect, stopAllActiveSounds } from '@/utils/soundboardSynth';

interface StreamSoundboardOverlayProps {
  token: string;
}

interface ActiveSoundAlert {
  id: string;
  title: string;
  category: string;
  color: string;
  iconName: string;
  durationSeconds: number;
}

export const StreamSoundboardOverlay: React.FC<StreamSoundboardOverlayProps> = ({ token }) => {
  const [activeAlert, setActiveAlert] = useState<ActiveSoundAlert | null>(null);
  const [outputMode, setOutputMode] = useState<string>('both'); // 'local', 'overlay', 'both'
  const activeAlertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to render matching icon
  const renderIcon = (name: string, size = 28) => {
    switch (name) {
      case 'Megaphone':
        return <Megaphone size={size} />;
      case 'Smile':
        return <Smile size={size} />;
      case 'DollarSign':
        return <DollarSign size={size} />;
      case 'Trophy':
        return <Trophy size={size} />;
      case 'Frown':
        return <Frown size={size} />;
      case 'Sparkles':
        return <Sparkles size={size} />;
      case 'Flame':
        return <Flame size={size} />;
      case 'Zap':
        return <Zap size={size} />;
      case 'Bell':
        return <Bell size={size} />;
      case 'AlertCircle':
        return <AlertCircle size={size} />;
      case 'Skull':
        return <Skull size={size} />;
      case 'TrendingUp':
        return <TrendingUp size={size} />;
      case 'Radio':
        return <Radio size={size} />;
      case 'Crosshair':
        return <Crosshair size={size} />;
      case 'Activity':
        return <Activity size={size} />;
      case 'Mic':
        return <Mic size={size} />;
      default:
        return <Volume2 size={size} />;
    }
  };

  useEffect(() => {
    const effectiveToken = token || 'demo-token';

    // Fetch initial settings to know output mode
    fetch(`/api/soundboard?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setOutputMode(data.settings.outputMode || 'both');
        }
      })
      .catch(() => {});

    // Connect socket
    const socket: Socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      socket.emit('join:overlay', { overlayToken: effectiveToken });
    });

    socket.on('soundboard:update', () => {
      fetch(`/api/soundboard?token=${effectiveToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings) {
            setOutputMode(data.settings.outputMode || 'both');
          }
        })
        .catch(() => {});
    });

    socket.on('soundboard:stop', () => {
      stopAllActiveSounds();
      setActiveAlert(null);
      if (activeAlertTimerRef.current) {
        clearTimeout(activeAlertTimerRef.current);
      }
    });

    socket.on('soundboard:play', (payload: any) => {
      if (!payload) return;

      // 1. Audio playback inside OBS if enabled
      const allowObsAudio = outputMode === 'overlay' || outputMode === 'both';
      if (allowObsAudio && payload.soundUrl) {
        triggerSoundEffect(
          payload.soundId || 'sound',
          payload.soundUrl,
          payload.volume ?? 0.8,
          payload.masterVolume ?? 0.8
        );
      }

      // 2. Visual banner on stream if enabled
      if (payload.showVisualAlert !== false) {
        const alertItem: ActiveSoundAlert = {
          id: String(Date.now()),
          title: payload.title || 'Sound Effect',
          category: payload.category || 'Soundboard',
          color: payload.color || '#00F0FF',
          iconName: payload.iconName || 'Volume2',
          durationSeconds: payload.durationSeconds || 2.0
        };

        setActiveAlert(alertItem);

        if (activeAlertTimerRef.current) {
          clearTimeout(activeAlertTimerRef.current);
        }

        const durMs = Math.max(1500, (payload.durationSeconds || 2.0) * 1000 + 400);
        activeAlertTimerRef.current = setTimeout(() => {
          setActiveAlert(null);
        }, durMs);
      }
    });

    return () => {
      socket.disconnect();
      if (activeAlertTimerRef.current) {
        clearTimeout(activeAlertTimerRef.current);
      }
    };
  }, [token, outputMode]);

  if (!activeAlert) {
    return <div className="w-full h-full bg-transparent" />;
  }

  const alertColor = activeAlert.color || '#00F0FF';

  return (
    <div className="w-full h-screen bg-transparent pointer-events-none flex items-start justify-center p-8 overflow-hidden select-none">
      {/* Soundboard Pop-in Banner */}
      <div
        className="relative flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-300 backdrop-blur-xl border-2"
        style={{
          backgroundColor: 'rgba(9, 13, 24, 0.92)',
          borderColor: alertColor,
          boxShadow: `0 0 35px ${alertColor}60, 0 10px 40px rgba(0,0,0,0.8)`
        }}
      >
        {/* Glowing Corner Accents */}
        <div
          className="absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full"
          style={{ backgroundColor: alertColor, boxShadow: `0 0 10px ${alertColor}` }}
        />
        <div
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-full"
          style={{ backgroundColor: alertColor, boxShadow: `0 0 10px ${alertColor}` }}
        />

        {/* Icon Circle */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center relative shrink-0"
          style={{
            backgroundColor: `${alertColor}20`,
            border: `1.5px solid ${alertColor}80`,
            color: alertColor
          }}
        >
          <div className="animate-bounce">{renderIcon(activeAlert.iconName, 28)}</div>
          {/* Animated pulsing wave rings */}
          <div
            className="absolute inset-0 rounded-xl animate-ping opacity-40 pointer-events-none"
            style={{ border: `2px solid ${alertColor}` }}
          />
        </div>

        {/* Text & Waveform Info */}
        <div className="flex flex-col pr-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${alertColor}25`,
                color: alertColor
              }}
            >
              SOUNDBOARD • {activeAlert.category}
            </span>
          </div>

          <div
            className="text-2xl font-black tracking-wide font-sans mt-0.5 drop-shadow-md text-white"
            style={{ textShadow: `0 0 12px ${alertColor}80` }}
          >
            {activeAlert.title}
          </div>
        </div>

        {/* Animated Equalizer Waveform Bars */}
        <div className="flex items-end gap-1 h-8 pl-3 border-l border-slate-700/60">
          {[0.4, 0.9, 0.6, 1.0, 0.5, 0.8].map((initHeight, idx) => (
            <div
              key={idx}
              className="w-1.5 rounded-full"
              style={{
                backgroundColor: alertColor,
                height: `${initHeight * 100}%`,
                animation: `pulse 0.6s ease-in-out infinite alternate ${idx * 0.12}s`,
                boxShadow: `0 0 8px ${alertColor}`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
