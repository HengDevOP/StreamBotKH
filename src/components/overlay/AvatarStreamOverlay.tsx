'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSocket } from '../../context/SocketContext';
import { AVATAR_ROSTER, AvatarItem, getAvatarById, getRandomAvatar } from '../../utils/avatarData';

export interface AvatarSettings {
  enabled: boolean;
  defaultAvatarId: string;
  customAvatarUrl?: string;
  customAvatarName?: string;
  allowedAvatars: string[];
  walkSpeed: string; // 'stationary' | 'slow' | 'normal' | 'fast'
  scale: string; // 'small' | 'medium' | 'large' | 'xlarge'
  bubbleDuration: number;
  maxOnScreen: number;
  showName: boolean;
  reactToDonations: boolean;
  reactToChat: boolean;
  soundEnabled: boolean;
  overlayWidth: number;
  overlayHeight: number;
}

export interface AvatarStreamOverlayProps {
  token: string;
  isDemo?: boolean;
  customSettings?: Partial<AvatarSettings>;
}

interface ActiveAvatar {
  id: string; // viewer username / unique key
  displayName: string;
  avatar: AvatarItem;
  customImg?: string;
  x: number; // percentage (5% to 92%)
  vx: number; // velocity (% per second)
  facing: 'left' | 'right';
  state: 'idle' | 'walking' | 'jumping' | 'celebrating';
  nextActionTime: number;
  message?: string;
  bubbleType?: 'chat' | 'donation';
  bubbleVisible: boolean;
  bubbleTimer?: NodeJS.Timeout;
  celebrateTimer?: NodeJS.Timeout;
  spawnTime: number;
}

export const AvatarStreamOverlay: React.FC<AvatarStreamOverlayProps> = ({
  token,
  isDemo = false,
  customSettings
}) => {
  const { socket, joinOverlayRoom } = useSocket();

  const [settings, setSettings] = useState<AvatarSettings>({
    enabled: true,
    defaultAvatarId: 'cyber-bot',
    customAvatarUrl: '',
    customAvatarName: '',
    allowedAvatars: [
      'cyber-bot',
      'party-parrot',
      'chibi-layla',
      'pusheen-snack',
      'pepe-dance',
      'alien-groove',
      'electric-mouse',
      'shadow-ghost',
      'gamer-layla',
      'pet-pet',
      'cozy-snorlax',
      'mystic-mew'
    ],
    walkSpeed: 'normal',
    scale: 'medium',
    bubbleDuration: 7,
    maxOnScreen: 10,
    showName: true,
    reactToDonations: true,
    reactToChat: true,
    soundEnabled: true,
    overlayWidth: 1920,
    overlayHeight: 360
  });

  const activeSettings = useMemo(() => {
    return {
      ...settings,
      ...(customSettings || {})
    };
  }, [settings, customSettings]);

  const [avatarsMap, setAvatarsMap] = useState<Map<string, ActiveAvatar>>(new Map());
  const avatarsRef = useRef<Map<string, ActiveAvatar>>(new Map());
  avatarsRef.current = avatarsMap;

  const settingsRef = useRef(activeSettings);
  settingsRef.current = activeSettings;

  // 1. Fetch settings from API
  useEffect(() => {
    if (!token) return;
    fetch(`/api/widgets/avatars?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings
          }));
        }
      })
      .catch((err) => console.error('[AvatarOverlay] Fetch error:', err));
  }, [token]);

  // Join overlay socket room
  useEffect(() => {
    if (token && joinOverlayRoom) {
      joinOverlayRoom(token);
    }
  }, [token, joinOverlayRoom]);

  // Determine avatar pixel size
  const avatarPixelSize = useMemo(() => {
    switch (activeSettings.scale) {
      case 'small':
        return 64;
      case 'large':
        return 120;
      case 'xlarge':
        return 150;
      case 'medium':
      default:
        return 90;
    }
  }, [activeSettings.scale]);

  // Determine base speed in % per second
  const getSpeedMultiplier = () => {
    switch (activeSettings.walkSpeed) {
      case 'stationary':
        return 0;
      case 'slow':
        return 2.5;
      case 'fast':
        return 8.5;
      case 'normal':
      default:
        return 4.5;
    }
  };

  // Helper to pick avatar for a viewer
  const resolveAvatarForViewer = (username: string, requestedAvatarId?: string): AvatarItem => {
    if (requestedAvatarId && requestedAvatarId !== 'default') {
      return getAvatarById(requestedAvatarId);
    }

    const pool = (activeSettings.allowedAvatars && activeSettings.allowedAvatars.length > 0)
      ? activeSettings.allowedAvatars
      : ['cyber-bot', 'party-parrot', 'chibi-layla', 'pusheen-snack'];

    // Consistent avatar based on username hash
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = (hash << 5) - hash + username.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % pool.length;
    return getAvatarById(pool[idx]);
  };

  // Spawn or update an avatar
  const handleTriggerAvatar = (
    authorName: string,
    message: string,
    type: 'chat' | 'donation' = 'chat',
    customAvatarId?: string
  ) => {
    const currentMap = new Map(avatarsRef.current);
    const now = Date.now();
    const speedMult = getSpeedMultiplier();

    let target = currentMap.get(authorName);

    if (!target) {
      // Respect max avatars limit
      if (currentMap.size >= activeSettings.maxOnScreen) {
        // Remove oldest avatar without active bubble
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        currentMap.forEach((av, key) => {
          if (!av.bubbleVisible && av.spawnTime < oldestTime) {
            oldestTime = av.spawnTime;
            oldestKey = key;
          }
        });
        if (oldestKey) {
          const removed = currentMap.get(oldestKey);
          if (removed?.bubbleTimer) clearTimeout(removed.bubbleTimer);
          if (removed?.celebrateTimer) clearTimeout(removed.celebrateTimer);
          currentMap.delete(oldestKey);
        }
      }

      const avatarItem = resolveAvatarForViewer(authorName, customAvatarId || activeSettings.defaultAvatarId);
      const startX = Math.random() * 70 + 15; // 15% to 85%
      const dir: 'left' | 'right' = Math.random() > 0.5 ? 'right' : 'left';
      const vx = speedMult === 0 ? 0 : (dir === 'right' ? speedMult : -speedMult);

      target = {
        id: authorName,
        displayName: authorName,
        avatar: avatarItem,
        customImg: activeSettings.customAvatarUrl || undefined,
        x: startX,
        vx,
        facing: dir,
        state: speedMult === 0 ? 'idle' : 'walking',
        nextActionTime: now + 3000 + Math.random() * 4000,
        message,
        bubbleType: type,
        bubbleVisible: true,
        spawnTime: now
      };
    } else {
      // Existing avatar: update speech bubble & react
      if (target.bubbleTimer) clearTimeout(target.bubbleTimer);
      if (target.celebrateTimer) clearTimeout(target.celebrateTimer);

      target.message = message;
      target.bubbleType = type;
      target.bubbleVisible = true;
    }

    if (type === 'donation') {
      target.state = 'celebrating';
      target.celebrateTimer = setTimeout(() => {
        const live = avatarsRef.current.get(authorName);
        if (live) {
          live.state = getSpeedMultiplier() === 0 ? 'idle' : 'walking';
          setAvatarsMap(new Map(avatarsRef.current));
        }
      }, 5000);
    }

    // Set bubble dismiss timer
    const durationMs = (activeSettings.bubbleDuration || 7) * 1000;
    target.bubbleTimer = setTimeout(() => {
      const live = avatarsRef.current.get(authorName);
      if (live) {
        live.bubbleVisible = false;
        setAvatarsMap(new Map(avatarsRef.current));
      }
    }, durationMs);

    currentMap.set(authorName, target);
    setAvatarsMap(currentMap);
  };

  // Trigger celebration on ALL active avatars for big stream tips
  const triggerAllAvatarsCelebration = (donor: string, amount: number, currency: string, msg: string) => {
    const currentMap = new Map(avatarsRef.current);
    if (currentMap.size === 0) {
      // Spawn donor avatar if none on screen
      handleTriggerAvatar(donor, `Donated ${currency === 'USD' ? '$' : ''}${amount} ${currency !== 'USD' ? currency : ''}: ${msg || 'Thank you!'}`, 'donation');
      return;
    }

    currentMap.forEach((av) => {
      av.state = 'celebrating';
      if (av.celebrateTimer) clearTimeout(av.celebrateTimer);
      av.celebrateTimer = setTimeout(() => {
        av.state = getSpeedMultiplier() === 0 ? 'idle' : 'walking';
        setAvatarsMap(new Map(avatarsRef.current));
      }, 5500);
    });

    // Also spawn or highlight donor
    handleTriggerAvatar(donor, `Donated ${currency === 'USD' ? '$' : ''}${amount} ${currency !== 'USD' ? currency : ''}! 🎉`, 'donation');
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onAvatarAction = (data: any) => {
      if (!data) return;
      if (data.type === 'chat') {
        if (!settingsRef.current.reactToChat) return;
        handleTriggerAvatar(data.author || 'Viewer', data.message || '', 'chat', data.avatarId);
      } else if (data.type === 'donation') {
        if (!settingsRef.current.reactToDonations) return;
        triggerAllAvatarsCelebration(data.donor || 'Donor', data.amount || 5, data.currency || 'USD', data.message || '');
      }
    };

    const onChatMessage = (data: any) => {
      if (!settingsRef.current.reactToChat) return;
      const author = data.author || data.user || data.username || 'Chatter';
      const text = data.message || data.text || '';
      if (!text) return;
      handleTriggerAvatar(author, text, 'chat');
    };

    const onDonationAlert = (data: any) => {
      if (!settingsRef.current.reactToDonations) return;
      const donor = data.donorName || data.donor || data.name || 'Supporter';
      const amount = data.amount || 0;
      const currency = data.currency || 'USD';
      const msg = data.message || 'Thank you for supporting!';
      triggerAllAvatarsCelebration(donor, amount, currency, msg);
    };

    const onSettingsUpdated = (newSettings: any) => {
      if (newSettings) {
        setSettings((prev) => ({ ...prev, ...newSettings }));
      }
    };

    socket.on('avatar:action', onAvatarAction);
    socket.on(`avatar:action:${token}`, onAvatarAction);
    socket.on('chat:message', onChatMessage);
    socket.on('donation:alert', onDonationAlert);
    socket.on('avatar:settings_updated', onSettingsUpdated);

    return () => {
      socket.off('avatar:action', onAvatarAction);
      socket.off(`avatar:action:${token}`, onAvatarAction);
      socket.off('chat:message', onChatMessage);
      socket.off('donation:alert', onDonationAlert);
      socket.off('avatar:settings_updated', onSettingsUpdated);
    };
  }, [socket, token]);

  // Initial Demo Avatars if in demo mode or empty
  useEffect(() => {
    if (isDemo && avatarsMap.size === 0) {
      const demoAvatars: Array<{ name: string; msg: string; id: string }> = [
        { name: 'StreamBot', msg: 'Welcome to the live stream! 🚀', id: 'cyber-bot' },
        { name: 'PixelFan', msg: 'Hype stream! GG! 🎮', id: 'chibi-layla' },
        { name: 'VibeLord', msg: 'Loving the playlist today 🔥', id: 'party-parrot' }
      ];

      demoAvatars.forEach((demo, idx) => {
        setTimeout(() => {
          handleTriggerAvatar(demo.name, demo.msg, 'chat', demo.id);
        }, idx * 400);
      });
    }
  }, [isDemo]);

  // 60FPS Physics Animation Loop (Wander left and right)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1); // clamp delta
      lastTime = time;

      const current = avatarsRef.current;
      if (current.size > 0) {
        let changed = false;
        const speedMult = getSpeedMultiplier();

        current.forEach((av) => {
          if (speedMult === 0) {
            if (av.vx !== 0) {
              av.vx = 0;
              av.state = 'idle';
              changed = true;
            }
            return;
          }

          // Random state decision
          if (time > av.nextActionTime && av.state !== 'celebrating') {
            const rand = Math.random();
            if (rand < 0.25) {
              // Pause & idle
              av.state = 'idle';
              av.vx = 0;
              av.nextActionTime = time + 2000 + Math.random() * 3000;
              changed = true;
            } else {
              // Pick direction
              const dir: 'left' | 'right' = Math.random() > 0.5 ? 'right' : 'left';
              av.facing = dir;
              av.vx = dir === 'right' ? speedMult : -speedMult;
              av.state = 'walking';
              av.nextActionTime = time + 3000 + Math.random() * 5000;
              changed = true;
            }
          }

          if (av.state === 'walking' || av.state === 'celebrating') {
            let nextX = av.x + av.vx * dt;

            // Boundary collision (turn around smoothly at 4% and 94%)
            if (nextX <= 4) {
              nextX = 4;
              av.facing = 'right';
              av.vx = Math.abs(speedMult);
              changed = true;
            } else if (nextX >= 94) {
              nextX = 94;
              av.facing = 'left';
              av.vx = -Math.abs(speedMult);
              changed = true;
            }

            av.x = nextX;
            changed = true;
          }
        });

        if (changed) {
          setAvatarsMap(new Map(current));
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeSettings.walkSpeed]);

  if (!activeSettings.enabled) {
    return null;
  }

  const avatarList = Array.from(avatarsMap.values());

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none pointer-events-none"
      style={{
        minHeight: '220px',
        background: 'transparent'
      }}
    >
      {/* Ground guide subtle line in demo mode */}
      {isDemo && (
        <div className="absolute bottom-2 left-0 right-0 h-px bg-white/10 pointer-events-none" />
      )}

      {/* Render active wanderer avatars */}
      {avatarList.map((av) => {
        const isCelebrating = av.state === 'celebrating';
        const displaySrc =
          isCelebrating && av.avatar.celebrateUrl
            ? av.avatar.celebrateUrl
            : av.customImg || av.avatar.avatarUrl;

        return (
          <div
            key={av.id}
            className="absolute bottom-4 flex flex-col items-center transition-transform duration-75"
            style={{
              left: `${av.x}%`,
              transform: 'translateX(-50%)',
              zIndex: isCelebrating ? 40 : 20
            }}
          >
            {/* Speech Bubble */}
            {av.bubbleVisible && av.message && (
              <div
                className={`mb-2 max-w-[240px] px-3 py-1.5 rounded-lg shadow-xl text-left relative transition-all duration-300 animate-in fade-in zoom-in-90 ${
                  av.bubbleType === 'donation'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black border border-yellow-300 font-medium'
                    : 'bg-[#18181b]/95 backdrop-blur-md text-white border border-[#27272a]'
                }`}
                style={{
                  fontSize: '12px',
                  lineHeight: '1.3'
                }}
              >
                {/* Author Name Tag */}
                {activeSettings.showName && (
                  <div
                    className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 truncate ${
                      av.bubbleType === 'donation' ? 'text-black/80' : 'text-neutral-400'
                    }`}
                  >
                    {av.displayName}
                  </div>
                )}

                {/* Message Body */}
                <div className="break-words font-medium">
                  {av.message}
                </div>

                {/* Speech Bubble Pointer */}
                <div
                  className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${
                    av.bubbleType === 'donation'
                      ? 'border-t-[6px] border-t-yellow-500'
                      : 'border-t-[6px] border-t-[#18181b]'
                  }`}
                />
              </div>
            )}

            {/* Avatar Character Sprite */}
            <div
              className={`relative flex items-center justify-center transition-all ${
                isCelebrating ? 'animate-bounce' : av.state === 'walking' ? 'animate-pulse' : ''
              }`}
              style={{
                width: `${avatarPixelSize}px`,
                height: `${avatarPixelSize}px`,
                transform: av.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)'
              }}
            >
              <img
                src={displaySrc}
                alt={av.displayName}
                className="w-full h-full object-contain filter drop-shadow-md"
                onError={(e) => {
                  // Fallback if image fails
                  (e.currentTarget as HTMLImageElement).src = '/images/streambot-thumbsup-sticker.png';
                }}
              />
            </div>

            {/* Persistent Name Tag below avatar */}
            {activeSettings.showName && !av.bubbleVisible && (
              <div className="mt-1 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] text-white/90 font-medium tracking-wide truncate max-w-[120px]">
                {av.displayName}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
