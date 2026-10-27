'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAlertQueue } from '../../hooks/useAlertQueue';
import { NeonAlertCard } from './NeonAlertCard';

interface AlertBoxOverlayProps {
  overlayToken: string;
  mode?: 'all' | 'video-only' | 'alert-only';
}

export const AlertBoxOverlay: React.FC<AlertBoxOverlayProps> = ({ overlayToken, mode = 'all' }) => {
  const { socket, connected, joinOverlayRoom } = useSocket();
  const { currentAlert, pushAlert, dismissCurrentAlert, queueLength } = useAlertQueue();
  const [ready, setReady] = useState(false);
  const [overlayConfig, setOverlayConfig] = useState<any>(null);
  const [alertBoxes, setAlertBoxes] = useState<any[]>([]);
  const [urlMode, setUrlMode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode') || params.get('only') || params.get('type');
      if (m) setUrlMode(m.toLowerCase());
    }
  }, []);

  let activeMode: 'all' | 'video-only' | 'alert-only' = mode;
  if (urlMode === 'video') activeMode = 'video-only';
  else if (urlMode === 'alert') activeMode = 'alert-only';
  else if (urlMode === 'combo' || urlMode === 'all') activeMode = 'all';

  // Deduplication & alert tracking refs
  const processedAlertIdsRef = useRef<Set<string>>(new Set());
  const activeAlertIdRef = useRef<string | null>(null);

  // Pending video queue waiting for donation alert to finish
  const pendingVideosRef = useRef<Map<string, { payload: any; timer: NodeJS.Timeout }>>(new Map());

  const startQueuedVideo = (targetDonationId: string) => {
    let foundKey: string | null = null;
    let foundItem: { payload: any; timer: NodeJS.Timeout } | null = null;

    if (pendingVideosRef.current.has(targetDonationId)) {
      foundKey = targetDonationId;
      foundItem = pendingVideosRef.current.get(targetDonationId)!;
    } else {
      const entries = Array.from(pendingVideosRef.current.entries());
      if (entries.length > 0) {
        foundKey = entries[0][0];
        foundItem = entries[0][1];
      }
    }

    if (foundKey && foundItem) {
      clearTimeout(foundItem.timer);
      pendingVideosRef.current.delete(foundKey);
      console.log(`🎬 [Video Overlay] Donation alert finished! Now starting video playback for: "${foundKey}"`);
      pushAlert(foundItem.payload);
    }
  };

  useEffect(() => {
    // Fetch active condition alert boxes
    fetch('/api/alert-boxes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.alertBoxes) {
          setAlertBoxes(data.alertBoxes);
        }
      })
      .catch((e) => console.error('Error fetching alert boxes for overlay:', e));
  }, []);

  const speakAlertTTS = (
    headlineTemplate: string | undefined,
    donor: string,
    amount: number,
    currency: string,
    msg: string | undefined,
    type: string,
    clonedUrl?: string,
    volume?: number
  ) => {
    try {
      const template = headlineTemplate || '{donator} donated {amount} through superchat!';
      const formattedAmount = currency === 'KHR'
        ? `${Number(amount).toLocaleString()} Riel`
        : `${Number(amount)} dollars`;

      // 1. Format the headline announcement text
      const headline = template
        .replace(/\{donator\}/gi, donor)
        .replace(/\{name\}/gi, donor)
        .replace(/\{amount\}/gi, formattedAmount)
        .replace(/\{currency\}/gi, currency || 'dollars')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

      // 2. Clean the donor's message
      const cleanMsg = (msg || '')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

      // 3. Read BOTH headline announcement text AND donor message!
      const speechText = cleanMsg ? `${headline}. ${cleanMsg}` : headline;
      if (!speechText) return;

      const isKhmer = /[\u1780-\u17FF]/.test(speechText) || type.startsWith('kiritts');
      const lang = isKhmer ? 'km' : 'en';

      let audioUrl = '';
      if (type === 'cloned' && clonedUrl) {
        audioUrl = clonedUrl;
      } else {
        // Use our high-fidelity Neural TTS API (Edge-TTS Piseth & Sreymom Khmer models)
        audioUrl = `/api/tts?type=${encodeURIComponent(type)}&text=${encodeURIComponent(
          speechText.slice(0, 250)
        )}`;
      }

      if (audioUrl) {
        // Delay 700ms so alert chime sound plays first
        setTimeout(() => {
          const audio = new Audio(audioUrl);
          audio.volume = Math.min(1, Math.max(0, volume ?? 0.85));
          audio.play().catch((err) => console.warn('[Overlay TTS] Play error:', err));
        }, 700);
      }
    } catch (e) {
      console.error('Error in speakAlertTTS:', e);
    }
  };

  useEffect(() => {
    if (overlayToken) {
      joinOverlayRoom(overlayToken);
      setReady(true);

      // Fetch custom overlay settings from MongoDB
      fetch(`/api/overlays/token/${overlayToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.overlay) {
            setOverlayConfig(data.overlay);
          }
        })
        .catch((e) => console.error('Error fetching overlay config:', e));
    }
  }, [overlayToken, connected]);

  // Synchronized Voice TTS: Speaks headline & donor message exactly once when alert card appears
  useEffect(() => {
    if (!currentAlert) {
      activeAlertIdRef.current = null;
      return;
    }

    const alertId = currentAlert.donationId || `${currentAlert.donorName}-${currentAlert.amount}`;
    if (activeAlertIdRef.current === alertId) return;
    activeAlertIdRef.current = alertId;

    if (currentAlert.ttsEnabled) {
      speakAlertTTS(
        currentAlert.textTemplate,
        currentAlert.donorName || 'Supporter',
        Number(currentAlert.amount) || 0,
        currentAlert.currency || 'USD',
        currentAlert.donorMessage,
        currentAlert.ttsType || 'google',
        (currentAlert as any).clonedVoiceSampleUrl,
        currentAlert.soundVolume
      );
    }
  }, [currentAlert]);

  // Broadcast signal when a standard donation alert finishes so video sources start immediately
  const prevAlertRef = useRef<any>(null);
  useEffect(() => {
    if (prevAlertRef.current && !currentAlert) {
      const finished = prevAlertRef.current;
      if (!finished.isSecondStageVideo) {
        const finishedId = finished.donationId || `${finished.donorName}-${finished.amount}`;
        console.log(`⚡ [Overlay] Standard donation alert finished for: "${finishedId}". Broadcasting overlay:alert_finished.`);
        if (socket && overlayToken) {
          socket.emit('overlay:alert_finished', {
            donationId: finishedId,
            overlayToken
          });
        }
      }
    }
    prevAlertRef.current = currentAlert;
  }, [currentAlert, socket, overlayToken]);

  useEffect(() => {
    if (!socket) return;

    // Listen for donation alert finished signals (cross-source coordination)
    const handleAlertFinished = (data: any) => {
      if (!data?.donationId) return;
      console.log(`⚡ [Video Overlay] Received donation:alert_finished signal for "${data.donationId}"`);
      startQueuedVideo(data.donationId);
    };

    socket.on('donation:alert_finished', handleAlertFinished);

    const handleAlert = (payload: any) => {
      if (!payload) return;
      const alertId = payload.donationId || `${payload.donorName || 'donor'}-${payload.amount}-${payload.createdAt || Date.now()}`;

      // Deduplicate: ignore if this exact alert ID was processed within the last 15 seconds
      if (processedAlertIdsRef.current.has(alertId)) {
        console.log('⚡ [Overlay] Duplicate alert ignored:', alertId);
        return;
      }
      processedAlertIdsRef.current.add(alertId);
      setTimeout(() => {
        processedAlertIdsRef.current.delete(alertId);
      }, 15000);

      console.log('⚡ [Overlay] Live donation alert accepted:', alertId, payload);
      const tipAmount = Number(payload.amount) || 0;

      // Find highest active matching condition alert box
      const activeBoxes = alertBoxes.filter((b) => b.isEnabled);
      const matchingBox =
        activeBoxes
          .filter((b) => tipAmount >= (Number(b.minAmountCondition) || 0))
          .sort((a, b) => (Number(b.minAmountCondition) || 0) - (Number(a.minAmountCondition) || 0))[0] ||
        activeBoxes[0] ||
        overlayConfig;

      const finalPayload = {
        ...payload,
        donorMessage: payload.donorMessage ? payload.donorMessage.trim() : '',
        textTemplate: matchingBox?.textTemplate || payload.textTemplate,
        textColor: matchingBox?.textColor || payload.textColor,
        customGifUrl: matchingBox?.mediaUrl || payload.customGifUrl || payload.mediaUrl || overlayConfig?.mediaUrl,
        showImage: matchingBox ? matchingBox.showImage !== false : (payload.showImage !== undefined ? payload.showImage : true),
        fontFamily: matchingBox?.fontFamily || payload.fontFamily || 'Chakra Petch',
        fontSize: matchingBox?.fontSize || payload.fontSize || 28,
        layoutMode: matchingBox?.layoutMode || payload.layoutMode || 'top',
        animationStyle: matchingBox?.animationStyle || payload.animationStyle || 'fade',
        glowColor: matchingBox?.glowColor || payload.glowColor || overlayConfig?.glowColor || '#00F0FF',
        soundUrl: (matchingBox?.soundUrl && matchingBox.soundUrl !== '/sounds/neon-chime.mp3')
          ? matchingBox.soundUrl
          : (payload.soundUrl || matchingBox?.soundUrl || overlayConfig?.soundUrl || '/sounds/neon-chime.mp3'),
        soundVolume: matchingBox?.soundVolume ?? payload.soundVolume ?? overlayConfig?.soundVolume ?? 0.85,
        durationSeconds:
          matchingBox?.durationSeconds || payload.durationSeconds || overlayConfig?.durationSeconds || 8,
        ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : (payload.ttsEnabled !== undefined ? payload.ttsEnabled : true),
        ttsType: matchingBox?.ttsType || payload.ttsType || 'google',
        clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || payload.clonedVoiceSampleUrl
      };

      // Video alert condition checking ($0.25 to $50 minimum tip and enabled toggle)
      const tipAmountInUsd = payload.currency === 'KHR' ? tipAmount / 4000 : tipAmount;
      const minTipRequired = Number(payload.videoMinTipAmount ?? overlayConfig?.videoMinTipAmount ?? 0.25);
      const videoAlertsEnabled = payload.videoAlertEnabled !== undefined
        ? Boolean(payload.videoAlertEnabled)
        : (overlayConfig?.videoAlertEnabled !== false);

      const hasValidVideo = Boolean(payload.videoUrl) && tipAmountInUsd >= minTipRequired && videoAlertsEnabled;

      // ==============================================================
      // 1. DEDICATED VIDEO ALERT SOURCE (/overlay/video/[token]):
      // MUST queue until the donation alert finishes, and only then start video!
      // ==============================================================
      if (activeMode === 'video-only') {
        if (!hasValidVideo) {
          // Ignore tips without video on the dedicated video screen
          return;
        }

        const clipDuration = Math.max(5, (Number(payload.videoEndTime || 30) - Number(payload.videoStartTime || 0)));
        const videoPayload = {
          ...finalPayload,
          isSecondStageVideo: true,
          videoUrl: payload.videoUrl,
          videoTitle: payload.videoTitle,
          videoStartTime: Number(payload.videoStartTime) || 0,
          videoEndTime: Number(payload.videoEndTime) || 30,
          durationSeconds: clipDuration + 6,
          soundUrl: '',
          ttsEnabled: false
        };

        const donationAlertDuration = Number(finalPayload.durationSeconds) || 8;
        const key = payload.donationId || alertId;

        console.log(`⏳ [Video Overlay] Queuing video for "${key}". Waiting ${donationAlertDuration}s for donation alert to finish...`);

        // Set fallback timer matching donation alert duration (+0.5s buffer for transition)
        const timer = setTimeout(() => {
          console.log(`⏱️ [Video Overlay] Alert duration (${donationAlertDuration}s) timer elapsed for "${key}". Releasing video to playback.`);
          startQueuedVideo(key);
        }, (donationAlertDuration + 0.5) * 1000);

        pendingVideosRef.current.set(key, { payload: videoPayload, timer });
        return;
      }

      // ==============================================================
      // 2. DEDICATED DONATION ALERT SOURCE (/overlay/[token] or ?mode=alert):
      // Shows standard donation alert card, chime, and TTS.
      // Does NOT show the video clip because video belongs to the video source!
      // ==============================================================
      if (activeMode === 'alert-only') {
        pushAlert({
          ...finalPayload,
          isSecondStageVideo: false,
          videoUrl: undefined,
          durationSeconds: finalPayload.durationSeconds || 8
        });
        return;
      }

      // ==============================================================
      // 3. SEQUENTIAL COMBO SOURCE (?mode=all or ?mode=combo):
      // If a video meets condition, play Stage 1 (donation alert) first,
      // and queue Stage 2 (video) so it starts ONLY AFTER Stage 1 finishes!
      // ==============================================================
      if (hasValidVideo) {
        const clipDuration = Math.max(5, (Number(payload.videoEndTime || 30) - Number(payload.videoStartTime || 0)));
        const alertDuration = Number(finalPayload.durationSeconds) || 8;

        // Stage 1: Standard donation alert card, chime & TTS
        pushAlert({
          ...finalPayload,
          isSecondStageVideo: false,
          videoUrl: undefined,
          durationSeconds: alertDuration
        });

        // Stage 2: Video clip automatically queued behind Stage 1
        pushAlert({
          ...finalPayload,
          isSecondStageVideo: true,
          videoUrl: payload.videoUrl,
          videoTitle: payload.videoTitle,
          videoStartTime: Number(payload.videoStartTime) || 0,
          videoEndTime: Number(payload.videoEndTime) || 30,
          durationSeconds: clipDuration + 6,
          soundUrl: '',
          ttsEnabled: false
        });
      } else {
        // Standard single alert for regular tips without video
        pushAlert({
          ...finalPayload,
          isSecondStageVideo: false,
          durationSeconds: finalPayload.durationSeconds || 8,
          soundUrl: finalPayload.soundUrl,
          ttsEnabled: finalPayload.ttsEnabled
        });
      }
    };

    const handleTestAlert = (payload: any) => {
      if (!payload?.overlayToken || payload.overlayToken === overlayToken || overlayToken === 'demo-token' || payload.overlayToken === 'demo-token') {
        handleAlert(payload);
      }
    };

    socket.on('donation:alert', handleAlert);
    socket.on('donation:alert:test', handleTestAlert);

    return () => {
      socket.off('donation:alert', handleAlert);
      socket.off('donation:alert:test', handleTestAlert);
      socket.off('donation:alert_finished', handleAlertFinished);
      // Clean up any pending timers
      pendingVideosRef.current.forEach((item) => clearTimeout(item.timer));
      pendingVideosRef.current.clear();
    };
  }, [socket, pushAlert, overlayConfig, alertBoxes, overlayToken]);

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative select-none">
      {/* Active Alert Rendering */}
      {currentAlert ? (
        <NeonAlertCard alert={currentAlert} onEnded={dismissCurrentAlert} />
      ) : null}
    </div>
  );
};
