'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAudio } from '../../hooks/useAudio';
import { TimerTemplateRenderer } from './timerTemplates';

interface StreamTimerOverlayProps {
  token: string;
}

interface FloatingBonus {
  id: string;
  text: string;
  donorName?: string;
}

export const StreamTimerOverlay: React.FC<StreamTimerOverlayProps> = ({ token }) => {
  const { socket, joinOverlayRoom } = useSocket();
  const { playSound } = useAudio();

  const [title, setTitle] = useState('SUBATHON COUNTDOWN 🔥');
  const [remainingSeconds, setRemainingSeconds] = useState(7200);
  const [isRunning, setIsRunning] = useState(true);
  const [rateMinutesPerUsd, setRateMinutesPerUsd] = useState(10.0);
  const [glowColor, setGlowColor] = useState('#00F0FF');
  const [templateStyle, setTemplateStyle] = useState('cyber-neon');
  const [showBackground, setShowBackground] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [description, setDescription] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [maxCapSeconds, setMaxCapSeconds] = useState(86400);

  // Floating bonus popup queue
  const [floatingBonuses, setFloatingBonuses] = useState<FloatingBonus[]>([]);
  const processedAlertIdsRef = useRef<Set<string>>(new Set());

  // 1. Initial fetch from API
  useEffect(() => {
    fetch(`/api/widgets/timer?token=${token || 'demo-token'}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.timer) {
          const t = data.timer;
          setTitle(t.title || 'SUBATHON COUNTDOWN 🔥');
          setRemainingSeconds(t.remainingSeconds ?? 7200);
          setIsRunning(t.isRunning ?? true);
          setRateMinutesPerUsd(t.rateMinutesPerUsd ?? 10.0);
          setGlowColor(t.glowColor || '#00F0FF');
          setTemplateStyle(t.templateStyle || 'cyber-neon');
          setShowBackground(t.showBackground !== false);
          setShowAnimation(t.showAnimation !== false);
          setShowTitle(t.showTitle !== false);
          setShowDescription(t.showDescription !== false);
          setDescription(t.description || '');
          setSoundEnabled(t.soundEnabled ?? true);
          setMaxCapSeconds(t.maxCapSeconds ?? 86400);
        }
      })
      .catch((e) => console.error('[Timer Overlay] Error fetching timer state:', e));
  }, [token]);

  // 2. Join overlay socket room
  useEffect(() => {
    if (token) {
      joinOverlayRoom(token);
    }
  }, [token, joinOverlayRoom]);

  // 3. Countdown loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // 4. Socket listeners for real-time donations and manual timer updates
  useEffect(() => {
    if (!socket) return;

    // Handle incoming live donations: calculate and add time based on rate
    const handleDonationAlert = (payload: any) => {
      if (!payload) return;
      const alertId = payload.donationId || `${payload.donorName}-${payload.amount}-${Date.now()}`;
      if (processedAlertIdsRef.current.has(alertId)) return;
      processedAlertIdsRef.current.add(alertId);
      setTimeout(() => processedAlertIdsRef.current.delete(alertId), 15000);

      const tipAmount = Number(payload.amount) || 0;
      if (tipAmount <= 0) return;

      const currency = payload.currency || 'USD';
      // Normalize to USD equivalent (4,000 KHR = $1.00 USD)
      const amountInUsd = currency === 'KHR' ? tipAmount / 4000 : tipAmount;
      const minutesToAdd = amountInUsd * rateMinutesPerUsd;
      const secondsToAdd = Math.round(minutesToAdd * 60);

      if (secondsToAdd > 0) {
        setRemainingSeconds((prev) => {
          const next = Math.min(maxCapSeconds || 86400, prev + secondsToAdd);
          return next;
        });

        // Trigger floating banner
        const bonusFormatted = formatAddedTime(secondsToAdd);
        const donor = payload.donorName || 'Supporter';
        const formattedAmount = currency === 'KHR' ? `${tipAmount.toLocaleString()} ៛` : `$${tipAmount.toFixed(2)}`;
        const bonusText = `+${bonusFormatted} (${formattedAmount} from ${donor})`;

        const bonusId = `bonus-${Date.now()}`;
        setFloatingBonuses((prev) => [...prev, { id: bonusId, text: bonusText, donorName: donor }]);
        setTimeout(() => {
          setFloatingBonuses((prev) => prev.filter((b) => b.id !== bonusId));
        }, 4500);

        if (soundEnabled) {
          playSound('/sounds/neon-chime.mp3', 0.85);
        }
      }
    };

    // Handle manual timer updates from streamer dashboard
    const handleTimerUpdate = (payload: any) => {
      if (!payload) return;
      if (payload.title !== undefined) setTitle(payload.title);
      if (payload.remainingSeconds !== undefined) setRemainingSeconds(Number(payload.remainingSeconds));
      if (payload.isRunning !== undefined) setIsRunning(Boolean(payload.isRunning));
      if (payload.rateMinutesPerUsd !== undefined) setRateMinutesPerUsd(Number(payload.rateMinutesPerUsd));
      if (payload.glowColor) setGlowColor(payload.glowColor);
      if (payload.templateStyle) setTemplateStyle(payload.templateStyle);
      if (payload.showBackground !== undefined) setShowBackground(Boolean(payload.showBackground));
      if (payload.showAnimation !== undefined) setShowAnimation(Boolean(payload.showAnimation));
      if (payload.showTitle !== undefined) setShowTitle(Boolean(payload.showTitle));
      if (payload.showDescription !== undefined) setShowDescription(Boolean(payload.showDescription));
      if (payload.description !== undefined) setDescription(String(payload.description));
      if (payload.soundEnabled !== undefined) setSoundEnabled(Boolean(payload.soundEnabled));
      if (payload.maxCapSeconds !== undefined) setMaxCapSeconds(Number(payload.maxCapSeconds));

      if (payload.addedSeconds && payload.addedSeconds > 0) {
        const bonusFormatted = formatAddedTime(payload.addedSeconds);
        const bonusText = payload.donorName
          ? `+${bonusFormatted} (${payload.tipAmount ? `$${payload.tipAmount}` : ''} from ${payload.donorName})`
          : `+${bonusFormatted}`;
        const bonusId = `bonus-${Date.now()}`;
        setFloatingBonuses((prev) => [...prev, { id: bonusId, text: bonusText, donorName: payload.donorName }]);
        setTimeout(() => {
          setFloatingBonuses((prev) => prev.filter((b) => b.id !== bonusId));
        }, 4500);

        if (soundEnabled) {
          playSound('/sounds/neon-chime.mp3', 0.85);
        }
      }
    };

    socket.on('donation:alert', handleDonationAlert);
    socket.on('donation:paid', handleDonationAlert);
    socket.on('timer:update', handleTimerUpdate);

    return () => {
      socket.off('donation:alert', handleDonationAlert);
      socket.off('donation:paid', handleDonationAlert);
      socket.off('timer:update', handleTimerUpdate);
    };
  }, [socket, rateMinutesPerUsd, maxCapSeconds, soundEnabled, playSound]);

  const formatAddedTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds > 0 ? `${seconds}s` : ''}`;
    return `${seconds}s`;
  };

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative select-none">
      <TimerTemplateRenderer
        title={title}
        remainingSeconds={remainingSeconds}
        isRunning={isRunning}
        rateMinutesPerUsd={rateMinutesPerUsd}
        glowColor={glowColor}
        templateStyle={templateStyle}
        showBackground={showBackground}
        showAnimation={showAnimation}
        showTitle={showTitle}
        showDescription={showDescription}
        description={description}
        floatingBonuses={floatingBonuses}
      />
    </div>
  );
};
