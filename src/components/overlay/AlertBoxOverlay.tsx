'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAlertQueue } from '../../hooks/useAlertQueue';
import { NeonAlertCard } from './NeonAlertCard';
import { normalizeCurrencyAndSymbols, khmerNumberToWords } from '../../utils/ttsHelper';

interface AlertBoxOverlayProps {
  overlayToken: string;
  mode?: 'all' | 'video-only' | 'alert-only';
  boxId?: string;
}

export const AlertBoxOverlay: React.FC<AlertBoxOverlayProps> = ({ overlayToken, mode = 'all', boxId }) => {
  const { socket, connected, joinOverlayRoom } = useSocket();
  const { currentAlert, pushAlert, dismissCurrentAlert, pauseQueue, resumeQueue, queueLength } = useAlertQueue();
  const [ready, setReady] = useState(false);
  const [overlayConfig, setOverlayConfig] = useState<any>(null);
  const [alertBoxes, setAlertBoxes] = useState<any[]>([]);
  const [urlMode, setUrlMode] = useState<string | null>(null);
  const [urlBoxId, setUrlBoxId] = useState<string | null>(null);

  const videoWaitingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('mode') || params.get('only') || params.get('type');
      if (m) setUrlMode(m.toLowerCase());
      const b = params.get('boxId') || params.get('box') || params.get('box_id') || params.get('id');
      if (b) setUrlBoxId(b.trim());
    }
  }, []);

  const activeBoxId = boxId || urlBoxId;

  let activeMode: 'all' | 'video-only' | 'alert-only' = mode;
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/overlay/video') || pathname.includes('/widget/video')) {
      activeMode = 'video-only';
    } else if (
      pathname.includes('/overlay/alert') ||
      pathname.includes('/widget/alert')
    ) {
      activeMode = 'alert-only';
    } else if (pathname.includes('/overlay/combo') || pathname.includes('/overlay/all')) {
      activeMode = 'all';
    }
  }

  if (urlMode === 'video') activeMode = 'video-only';
  else if (urlMode === 'alert') activeMode = 'alert-only';
  else if (urlMode === 'combo' || urlMode === 'all') activeMode = 'all';

  // Deduplication & alert tracking refs
  const processedAlertIdsRef = useRef<Set<string>>(new Set());
  const activeAlertIdRef = useRef<string | null>(null);
  const currentTtsAudioRef = useRef<HTMLAudioElement | null>(null);

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
    // Fetch active condition alert boxes for this streamer's overlay token
    const tokenParam = overlayToken ? `?token=${encodeURIComponent(overlayToken)}` : '';
    fetch(`/api/alert-boxes${tokenParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.alertBoxes) {
          setAlertBoxes(data.alertBoxes);
        }
      })
      .catch((e) => console.error('Error fetching alert boxes for overlay:', e));
  }, [overlayToken]);

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
      const isKhmer =
        /[\u1780-\u17FF]/.test(donor + ' ' + (msg || '') + ' ' + (headlineTemplate || '')) ||
        type.startsWith('kiritts') ||
        type.includes('piseth') ||
        type.includes('sreymom');

      const hasCurrencyTag = template.toLowerCase().includes('{currency}');
      const formattedAmount = currency === 'KHR'
        ? (isKhmer
            ? (hasCurrencyTag ? khmerNumberToWords(amount) : `${khmerNumberToWords(amount)} រៀល`)
            : `${Number(amount).toLocaleString()} riel`)
        : (isKhmer
            ? (hasCurrencyTag ? khmerNumberToWords(amount) : `${khmerNumberToWords(amount)} ដុល្លារ`)
            : `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${Number(amount) === 1 ? 'dollar' : 'dollars'}`);

      // 1. Format the headline announcement text
      let headline = template
        .replace(/\{donator\}/gi, donor)
        .replace(/\{name\}/gi, donor)
        .replace(/\{amount\}/gi, formattedAmount)
        .replace(
          /\{currency\}/gi,
          isKhmer
            ? (currency === 'KHR' ? 'រៀល' : 'ដុល្លារ')
            : (currency === 'KHR' ? 'riel' : (Number(amount) === 1 ? 'dollar' : 'dollars'))
        )
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

      // 2. Clean the donor's message (verify meaningful content: not empty, not "None")
      const isMeaningful = Boolean(
        msg &&
        typeof msg === 'string' &&
        msg.trim() &&
        msg.trim().toLowerCase() !== 'none' &&
        msg.trim().toLowerCase() !== '(none)' &&
        msg.trim().toLowerCase() !== 'null' &&
        msg.trim().toLowerCase() !== 'undefined'
      );

      const cleanMsg = isMeaningful
        ? (msg || '')
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
            .trim()
        : '';

      // 3. Normalize currency symbols ($ -> dollars/ដុល្លារ, ៛ -> riel/រៀល) on headline and message
      headline = normalizeCurrencyAndSymbols(headline, isKhmer);
      const normalizedMsg = cleanMsg ? normalizeCurrencyAndSymbols(cleanMsg, isKhmer) : '';

      // 4. If there is no message value, speak ONLY the headline title!
      const speechText = normalizedMsg ? `${headline}. ${normalizedMsg}` : headline;
      if (!speechText) return;

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
        // Stop any previous lingering TTS audio
        if (currentTtsAudioRef.current) {
          try {
            currentTtsAudioRef.current.pause();
            currentTtsAudioRef.current.currentTime = 0;
          } catch (e) {}
          currentTtsAudioRef.current = null;
        }

        // Delay 700ms so alert chime sound plays first
        setTimeout(() => {
          const audio = new Audio(audioUrl);
          currentTtsAudioRef.current = audio;
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
      // When alert card disappears, stop any ongoing TTS speech so it never overlaps into next alert
      if (currentTtsAudioRef.current) {
        try {
          currentTtsAudioRef.current.pause();
          currentTtsAudioRef.current.currentTime = 0;
        } catch (e) {}
        currentTtsAudioRef.current = null;
      }
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

  // Cross-overlay synchronization: broadcast finished signals and coordinate queue waiting
  const prevAlertRef = useRef<any>(null);
  useEffect(() => {
    if (prevAlertRef.current && !currentAlert) {
      const finished = prevAlertRef.current;
      const finishedId = finished.donationId || `${finished.donorName}-${finished.amount}`;

      if (finished.isSecondStageVideo) {
        // Video finished on video source or combo! Broadcast so donation source queue can advance
        console.log(`🎬 [Overlay] Video playback completed for: "${finishedId}". Broadcasting overlay:video_finished.`);
        if (socket && overlayToken) {
          socket.emit('overlay:video_finished', {
            donationId: finishedId,
            overlayToken
          });
        }
      } else {
        // Donation alert card finished! Broadcast so video source can immediately start playback
        console.log(`⚡ [Overlay] Donation alert card finished for: "${finishedId}". Broadcasting overlay:alert_finished.`);
        if (socket && overlayToken) {
          socket.emit('overlay:alert_finished', {
            donationId: finishedId,
            overlayToken
          });
        }

        // On dedicated donation alert source, if a video is attached, pause queue until the video completes on video source
        if (activeMode === 'alert-only' && (finished.hasAttachedVideo || finished.upcomingVideo)) {
          console.log(`⏳ [Donation Overlay] Video is now queued to play on video source. Pausing donation queue until video completes...`);
          pauseQueue();

          if (videoWaitingTimerRef.current) clearTimeout(videoWaitingTimerRef.current);
          const clipSeconds = Number(finished.videoClipDuration) || 30;
          // Auto-resume fallback in case video source is not listening or fails
          videoWaitingTimerRef.current = setTimeout(() => {
            console.log(`⏱️ [Donation Overlay] Safety buffer elapsed. Auto-resuming donation queue.`);
            resumeQueue();
          }, (clipSeconds + 10) * 1000);
        }
      }
    }
    prevAlertRef.current = currentAlert;
  }, [currentAlert, socket, overlayToken, activeMode, pauseQueue, resumeQueue]);

  useEffect(() => {
    if (!socket) return;

    // Listen for donation alert finished signals (starts queued video on dedicated video source)
    const handleAlertFinished = (data: any) => {
      if (!data?.donationId) return;
      console.log(`⚡ [Video Overlay] Received donation:alert_finished signal for "${data.donationId}". Starting video playback now.`);
      startQueuedVideo(data.donationId);
    };

    // Listen for video finished signals (resumes paused queue on donation alert source)
    const handleVideoFinished = (data: any) => {
      console.log(`🎬 [Donation Overlay] Received donation:video_finished signal for "${data?.donationId}". Resuming donation queue.`);
      if (videoWaitingTimerRef.current) {
        clearTimeout(videoWaitingTimerRef.current);
        videoWaitingTimerRef.current = null;
      }
      resumeQueue();
    };

    socket.on('donation:alert_finished', handleAlertFinished);
    socket.on('donation:video_finished', handleVideoFinished);

    const handleAlert = (payload: any) => {
      if (!payload) return;
      const alertId = payload.donationId || `${payload.donorName || 'donor'}-${payload.amount}-${payload.createdAt || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // Deduplicate: ignore if the exact duplicate socket packet was received within 800ms
      if (processedAlertIdsRef.current.has(alertId)) {
        console.log('⚡ [Overlay] Duplicate socket packet ignored:', alertId);
        return;
      }
      processedAlertIdsRef.current.add(alertId);
      setTimeout(() => {
        processedAlertIdsRef.current.delete(alertId);
      }, 800);

      console.log('⚡ [Overlay] Live donation alert accepted:', alertId, payload);
      const tipAmount = Number(payload.amount) || 0;
      const tipAmountInUsd = payload.currency === 'KHR' ? tipAmount / 4000 : tipAmount;

      // Find highest active matching condition alert box (sorted descending by condition threshold)
      const activeBoxes = alertBoxes.filter((b) => b.isEnabled);
      const matchingBoxes = activeBoxes
        .filter((b) => tipAmountInUsd >= ((Number(b.minAmountCondition) || 0) - 0.0001))
        .sort((a, b) => (Number(b.minAmountCondition) || 0) - (Number(a.minAmountCondition) || 0));

      // The highest box whose condition threshold is met (e.g. >= 0.10 picks 0.10, >= 0.01 picks 0.01)
      const conditionMatchedBox =
        (payload.boxId ? activeBoxes.find((b) => String(b._id) === String(payload.boxId)) : null) ||
        matchingBoxes[0] ||
        (activeBoxes.length > 0 ? activeBoxes[activeBoxes.length - 1] : null);

      const resolvedBoxId = payload.boxId || (conditionMatchedBox?._id ? String(conditionMatchedBox._id) : null);

      // If this overlay is dedicated to a specific box (via ?boxId=... or /overlay/box/...),
      // verify if this alert belongs to THIS specific box!
      if (activeBoxId) {
        if (payload.isTest) {
          // If this test alert was sent for a different specific box, ignore it
          if (payload.boxId && String(payload.boxId) !== String(activeBoxId)) {
            console.log(`⚡ [Overlay] Dedicated box (${activeBoxId}) ignoring test alert for box (${payload.boxId})`);
            return;
          }
        } else {
          // For real donations: only fire if the condition matched this specific dedicated box!
          if (resolvedBoxId && String(resolvedBoxId) !== String(activeBoxId)) {
            console.log(`⚡ [Overlay] Dedicated box (${activeBoxId}) ignoring alert matched to box (${resolvedBoxId})`);
            return;
          }
        }
      }

      // If activeBoxId is specified on this overlay instance, prioritize its custom appearance & rules
      const dedicatedBox = activeBoxId ? activeBoxes.find((b) => String(b._id) === String(activeBoxId)) : null;
      const matchingBox = dedicatedBox || conditionMatchedBox || overlayConfig;

      const rawMsg = payload.donorMessage || payload.donor_message || payload.message || '';
      const isMeaningful = Boolean(
        rawMsg &&
        typeof rawMsg === 'string' &&
        rawMsg.trim() &&
        rawMsg.trim().toLowerCase() !== 'none' &&
        rawMsg.trim().toLowerCase() !== '(none)' &&
        rawMsg.trim().toLowerCase() !== 'null' &&
        rawMsg.trim().toLowerCase() !== 'undefined'
      );
      const resolvedDonorMessage = isMeaningful ? rawMsg.trim() : '';

      const isTestAlert = Boolean(payload.isTest);
      const rawVoice = (isTestAlert && (payload.ttsType || payload.ttsVoice))
        ? (payload.ttsType || payload.ttsVoice)
        : (matchingBox?.ttsType || payload.ttsType || payload.ttsVoice || 'google');

      const finalPayload = {
        ...payload,
        templateStyle: (isTestAlert && payload.templateStyle)
          ? payload.templateStyle
          : (matchingBox?.templateStyle || payload.templateStyle || overlayConfig?.templateStyle || 'neon-box'),
        donorColor: (isTestAlert && payload.donorColor)
          ? payload.donorColor
          : (matchingBox?.donorColor || payload.donorColor),
        amountColor: (isTestAlert && payload.amountColor)
          ? payload.amountColor
          : (matchingBox?.amountColor || payload.amountColor),
        donorMessage: resolvedDonorMessage,
        donor_message: resolvedDonorMessage,
        message: resolvedDonorMessage,
        textTemplate: (isTestAlert && payload.textTemplate)
          ? payload.textTemplate
          : (matchingBox?.textTemplate || payload.textTemplate || '{donator} donated {amount} through superchat!'),
        textColor: (isTestAlert && payload.textColor)
          ? payload.textColor
          : (matchingBox?.textColor || payload.textColor || '#FFFFFF'),
        customGifUrl: matchingBox?.mediaUrl || payload.customGifUrl || payload.mediaUrl || overlayConfig?.mediaUrl,
        mediaUrl: matchingBox?.mediaUrl || payload.mediaUrl || payload.customGifUrl || overlayConfig?.mediaUrl,
        showImage: matchingBox ? matchingBox.showImage !== false : (payload.showImage !== undefined ? payload.showImage : true),
        fontFamily: (isTestAlert && payload.fontFamily)
          ? payload.fontFamily
          : (matchingBox?.fontFamily || payload.fontFamily || 'Chakra Petch'),
        fontSize: (isTestAlert && payload.fontSize)
          ? payload.fontSize
          : (matchingBox?.fontSize || payload.fontSize || 28),
        layoutMode: (isTestAlert && payload.layoutMode)
          ? payload.layoutMode
          : (matchingBox?.layoutMode || payload.layoutMode || 'top'),
        animationStyle: (isTestAlert && payload.animationStyle)
          ? payload.animationStyle
          : (matchingBox?.animationStyle || payload.animationStyle || 'fade'),
        glowColor: (isTestAlert && payload.glowColor)
          ? payload.glowColor
          : (matchingBox?.glowColor || payload.glowColor || overlayConfig?.glowColor || '#00F0FF'),
        soundUrl: (isTestAlert && payload.soundUrl && !payload.soundUrl.includes('neon-chime'))
          ? payload.soundUrl
          : ((matchingBox?.soundUrl && !matchingBox.soundUrl.includes('neon-chime'))
              ? matchingBox.soundUrl
              : (payload.soundUrl && !payload.soundUrl.includes('neon-chime')
                  ? payload.soundUrl
                  : (overlayConfig?.soundUrl && !overlayConfig.soundUrl.includes('neon-chime')
                      ? overlayConfig.soundUrl
                      : '/sounds/cash-register-kaching.mp3'))),
        soundVolume: (isTestAlert && payload.soundVolume !== undefined)
          ? payload.soundVolume
          : (matchingBox?.soundVolume ?? payload.soundVolume ?? overlayConfig?.soundVolume ?? 0.85),
        durationSeconds:
          (isTestAlert && payload.durationSeconds)
            ? payload.durationSeconds
            : (matchingBox?.durationSeconds || payload.durationSeconds || overlayConfig?.durationSeconds || 8),
        ttsEnabled: matchingBox?.ttsEnabled !== undefined ? matchingBox.ttsEnabled : (payload.ttsEnabled !== undefined ? payload.ttsEnabled : true),
        ttsType: rawVoice,
        clonedVoiceSampleUrl: matchingBox?.clonedVoiceSampleUrl || payload.clonedVoiceSampleUrl
      };

      // Video alert condition checking ($0.25 to $50 minimum tip and enabled toggle)
      const minTipRequired = Number(payload.videoMinTipAmount ?? overlayConfig?.videoMinTipAmount ?? 0.25);
      const videoAlertsEnabled = payload.videoAlertEnabled !== undefined
        ? Boolean(payload.videoAlertEnabled)
        : (overlayConfig?.videoAlertEnabled !== undefined ? Boolean(overlayConfig.videoAlertEnabled) : true);

      const isVideoTest = Boolean(payload.isVideoTest || (isTestAlert && payload.videoUrl));
      // For test video alerts: bypass minimum tip amount & video alert enabled checks!
      const hasValidVideo = Boolean(payload.videoUrl) && (isVideoTest || (tipAmountInUsd >= minTipRequired && videoAlertsEnabled));
      const clipDuration = Math.max(5, (Number(payload.videoEndTime || 30) - Number(payload.videoStartTime || 0)));
      const alertDuration = Number(finalPayload.durationSeconds) || 8;

      // ==============================================================
      // 1. DEDICATED VIDEO ALERT SOURCE (/overlay/video/[token] or ?mode=video):
      // Displays the YouTube video clip only.
      // Queues the video until the donation alert finishes on the donation source URL!
      // ==============================================================
      if (activeMode === 'video-only') {
        if (!hasValidVideo) {
          // Ignore tips without video on the dedicated video screen
          return;
        }

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

        const key = payload.donationId || alertId;
        console.log(`⏳ [Video Overlay] Queuing video for "${key}". Waiting ${alertDuration}s for donation alert to finish on donation source...`);

        // Set fallback timer matching donation alert duration (+1.5s buffer for transition)
        const timer = setTimeout(() => {
          console.log(`⏱️ [Video Overlay] Fallback timer elapsed for "${key}". Releasing video to playback.`);
          startQueuedVideo(key);
        }, (alertDuration + 1.5) * 1000);

        pendingVideosRef.current.set(key, { payload: videoPayload, timer });
        return;
      }

      // ==============================================================
      // 2. DEDICATED DONATION ALERT SOURCE (/overlay/alert/[token] or ?mode=alert):
      // Displays the donation alert card, plays sound chime, and speaks TTS!
      // If a video is attached, shows "🎬 Media Share Video Queued Next" badge.
      // When this card finishes, it signals the video source to start playing the video,
      // and pauses the donation queue until the video finishes!
      // ==============================================================
      if (activeMode === 'alert-only') {
        console.log(`📢 [Donation Overlay] Received donation alert for "${finalPayload.donorName}" ($${finalPayload.amount}). Video attached: ${hasValidVideo ? 'YES' : 'NO'}`);

        pushAlert({
          ...finalPayload,
          isSecondStageVideo: false,
          upcomingVideo: hasValidVideo,
          videoUrl: undefined,
          durationSeconds: alertDuration,
          hasAttachedVideo: hasValidVideo,
          videoClipDuration: clipDuration
        });
        return;
      }

      // ==============================================================
      // 3. SEQUENTIAL COMBO SOURCE (?mode=all or /overlay/[token]):
      // If a video is attached to the donation:
      // Stage 1: Start the Donation Alert FIRST (card, chime & TTS).
      // Stage 2: Put the Video Alert in the queue directly next in line.
      // The queue strictly WAITS until the video finishes before the next incoming alert plays!
      // ==============================================================
      if (hasValidVideo) {
        console.log(`🎬 [Integrated Combo Overlay] Tip attached with video alert!`);
        console.log(`   - Stage 1: Starting Donation Alert first (${alertDuration}s) for "${finalPayload.donorName}" ($${finalPayload.amount})`);
        console.log(`   - Stage 2: Queued Video Alert next (${clipDuration}s). Next incoming alerts will wait in queue until video finishes.`);

        // Stage 1: Standard donation alert card, chime & TTS
        pushAlert({
          ...finalPayload,
          isSecondStageVideo: false,
          upcomingVideo: true,
          videoUrl: undefined,
          durationSeconds: alertDuration
        });

        // Stage 2: Video clip automatically queued directly behind Stage 1
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
          videoUrl: undefined,
          durationSeconds: alertDuration,
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
      socket.off('donation:video_finished', handleVideoFinished);
      if (videoWaitingTimerRef.current) clearTimeout(videoWaitingTimerRef.current);
      pendingVideosRef.current.forEach((item) => clearTimeout(item.timer));
      pendingVideosRef.current.clear();
    };
  }, [socket, pushAlert, overlayConfig, alertBoxes, overlayToken, activeBoxId]);

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative select-none">
      {/* Active Alert Rendering */}
      {currentAlert ? (
        <NeonAlertCard
          key={currentAlert.donationId || (currentAlert as any).id || `${currentAlert.donorName}-${currentAlert.amount}-${(currentAlert as any).createdAt || ''}`}
          alert={currentAlert}
          onEnded={dismissCurrentAlert}
        />
      ) : null}
    </div>
  );
};
