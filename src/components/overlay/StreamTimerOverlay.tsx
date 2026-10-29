'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { TimerTemplateRenderer } from './timerTemplates';

interface StreamTimerOverlayProps {
  token: string;
}

const parseBool = (val: any, defaultVal = true): boolean => {
  if (val === undefined || val === null) return defaultVal;
  if (val === false || val === 0 || val === '0' || val === 'false') return false;
  return true;
};

export const StreamTimerOverlay: React.FC<StreamTimerOverlayProps> = ({ token }) => {
  const { socket, connected, joinOverlayRoom } = useSocket();

  const effectiveToken = token || 'demo-token';

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
  const [maxCapSeconds, setMaxCapSeconds] = useState(86400);

  const processedAlertIdsRef = useRef<Set<string>>(new Set());

  // 1. Initial fetch from API
  useEffect(() => {
    fetch(`/api/widgets/timer?token=${effectiveToken}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.timer) {
          const t = data.timer;
          if (t.title !== undefined) setTitle(t.title || 'SUBATHON COUNTDOWN 🔥');
          if (t.remainingSeconds !== undefined) setRemainingSeconds(t.remainingSeconds);
          if (t.isRunning !== undefined) setIsRunning(t.isRunning);
          if (t.rateMinutesPerUsd !== undefined) setRateMinutesPerUsd(t.rateMinutesPerUsd);
          if (t.glowColor) setGlowColor(t.glowColor);
          if (t.templateStyle) setTemplateStyle(t.templateStyle);
          const rawBg = t.showBackground !== undefined ? t.showBackground : t.show_background;
          setShowBackground(parseBool(rawBg, true));
          const rawAnim = t.showAnimation !== undefined ? t.showAnimation : t.show_animation;
          setShowAnimation(parseBool(rawAnim, true));
          const rawShowTitle = t.showTitle !== undefined ? t.showTitle : t.show_title;
          setShowTitle(parseBool(rawShowTitle, true));
          const rawShowDesc = t.showDescription !== undefined ? t.showDescription : t.show_description;
          setShowDescription(parseBool(rawShowDesc, true));
          setDescription(t.description || '');
          if (t.maxCapSeconds !== undefined) setMaxCapSeconds(t.maxCapSeconds);
        }
      })
      .catch((e) => console.error('[Timer Overlay] Error fetching timer state:', e));
  }, [effectiveToken]);

  // 2. Join overlay socket room
  useEffect(() => {
    if (effectiveToken) {
      joinOverlayRoom(effectiveToken);
    }
  }, [effectiveToken, connected, joinOverlayRoom]);

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
      }
    };

    // Handle manual timer updates from streamer dashboard
    const handleTimerUpdate = (payload: any) => {
      if (!payload) return;
      // Only process updates destined for our token or demo-token
      if (
        payload.token &&
        effectiveToken &&
        payload.token !== effectiveToken &&
        payload.token !== 'demo-token' &&
        effectiveToken !== 'demo-token'
      ) {
        return;
      }

      if (payload.title !== undefined) setTitle(payload.title);
      if (payload.remainingSeconds !== undefined) setRemainingSeconds(Number(payload.remainingSeconds));
      if (payload.isRunning !== undefined) setIsRunning(Boolean(payload.isRunning));
      if (payload.rateMinutesPerUsd !== undefined) setRateMinutesPerUsd(Number(payload.rateMinutesPerUsd));
      if (payload.glowColor) setGlowColor(payload.glowColor);
      if (payload.templateStyle) setTemplateStyle(payload.templateStyle);
      const rawBg = payload.showBackground !== undefined ? payload.showBackground : payload.show_background;
      if (rawBg !== undefined) setShowBackground(parseBool(rawBg, true));
      const rawAnim = payload.showAnimation !== undefined ? payload.showAnimation : payload.show_animation;
      if (rawAnim !== undefined) setShowAnimation(parseBool(rawAnim, true));
      const rawShowTitle = payload.showTitle !== undefined ? payload.showTitle : payload.show_title;
      if (rawShowTitle !== undefined) setShowTitle(parseBool(rawShowTitle, true));
      const rawShowDesc = payload.showDescription !== undefined ? payload.showDescription : payload.show_description;
      if (rawShowDesc !== undefined) setShowDescription(parseBool(rawShowDesc, true));
      if (payload.description !== undefined) setDescription(String(payload.description));
      if (payload.maxCapSeconds !== undefined) setMaxCapSeconds(Number(payload.maxCapSeconds));
    };

    socket.on('donation:alert', handleDonationAlert);
    socket.on('donation:paid', handleDonationAlert);
    socket.on('timer:update', handleTimerUpdate);

    return () => {
      socket.off('donation:alert', handleDonationAlert);
      socket.off('donation:paid', handleDonationAlert);
      socket.off('timer:update', handleTimerUpdate);
    };
  }, [socket, rateMinutesPerUsd, maxCapSeconds]);

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
      />
    </div>
  );
};
