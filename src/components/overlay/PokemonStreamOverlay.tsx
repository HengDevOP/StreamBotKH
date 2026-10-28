'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { POKEMON_ROSTER, PokemonMeta, getPokemonById, getRandomPokemon } from '../../utils/pokemonData';

export interface PokemonSettings {
  defaultPokemon: number;
  allowedPokemon: number[];
  bubbleDuration: number;
  maxOnScreen: number;
  walkSpeed: string;
  scale: string;
  showName: boolean;
  theme: string;
  overlayWidth: number;
  overlayHeight: number;
}

export interface PokemonStreamOverlayProps {
  token: string;
  isDemo?: boolean;
  customSettings?: Partial<PokemonSettings>;
}

interface ActiveAvatar {
  id: string; // viewer username
  displayName: string;
  pokemon: PokemonMeta;
  x: number; // in percentage (0 to 100)
  vx: number; // velocity (% per second)
  facing: 'left' | 'right';
  state: 'idle' | 'walking' | 'bouncing';
  nextActionTime: number;
  message: string;
  bubbleVisible: boolean;
  bubbleFadeTimeout?: NodeJS.Timeout;
  spawnTime: number;
  isNewSpawn: boolean;
}

export const PokemonStreamOverlay: React.FC<PokemonStreamOverlayProps> = ({
  token,
  isDemo = false,
  customSettings
}) => {
  const { socket } = useSocket();
  const [avatars, setAvatars] = useState<Map<string, ActiveAvatar>>(new Map());
  const [settings, setSettings] = useState<PokemonSettings>({
    defaultPokemon: 1, // Bulbasaur
    allowedPokemon: [1, 4, 7, 25, 39, 54, 94, 133, 143, 149, 151, 448],
    bubbleDuration: 8,
    maxOnScreen: 12,
    walkSpeed: 'normal',
    scale: 'medium',
    showName: true,
    theme: 'transparent',
    overlayWidth: 1920,
    overlayHeight: 360
  });

  const activeSettings: PokemonSettings = {
    ...settings,
    ...(customSettings || {})
  };

  const avatarsRef = useRef<Map<string, ActiveAvatar>>(new Map());
  avatarsRef.current = avatars;

  const settingsRef = useRef(activeSettings);
  settingsRef.current = activeSettings;

  // 1. Fetch Streamer Pokémon Settings from Database
  useEffect(() => {
    if (!token) return;
    fetch(`/api/widgets/pokemon?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings
          }));
        }
      })
      .catch(() => {});
  }, [token]);

  // 2. Spawn or update avatar when a comment arrives
  const handleIncomingComment = (comment: {
    author: string;
    message: string;
    pokemonId?: number;
  }) => {
    if (!comment || !comment.author) return;

    const key = comment.author.trim().toLowerCase();
    const current = avatarsRef.current.get(key);
    const currSettings = settingsRef.current;

    if (current) {
      // Viewer already exists! Trigger new bubble and cheerful hop
      if (current.bubbleFadeTimeout) clearTimeout(current.bubbleFadeTimeout);

      const fadeTimer = setTimeout(() => {
        setAvatars((prev) => {
          const updated = new Map(prev);
          const av = updated.get(key);
          if (av) {
            updated.set(key, { ...av, bubbleVisible: false });
          }
          return updated;
        });
      }, currSettings.bubbleDuration * 1000);

      setAvatars((prev) => {
        const updated = new Map(prev);
        const av = updated.get(key);
        if (av) {
          const speedMultiplier =
            currSettings.walkSpeed === 'slow' ? 0.6 : currSettings.walkSpeed === 'fast' ? 1.7 : 1.1;
          const baseSpeed = (2.5 + Math.random() * 2.0) * speedMultiplier;
          updated.set(key, {
            ...av,
            displayName: comment.author,
            message: comment.message,
            bubbleVisible: true,
            bubbleFadeTimeout: fadeTimer,
            state: 'bouncing',
            nextActionTime: Date.now() + 800,
            vx: (av.facing === 'right' ? 1 : -1) * baseSpeed
          });
        }
        return updated;
      });
    } else {
      // New viewer! Pick requested or assigned Pokemon (defaulting to Bulbasaur or roster pool)
      let selectedMeta: PokemonMeta;
      if (comment.pokemonId) {
        selectedMeta = getPokemonById(comment.pokemonId);
      } else if (currSettings.defaultPokemon) {
        selectedMeta = getPokemonById(currSettings.defaultPokemon);
      } else {
        selectedMeta = getRandomPokemon(currSettings.allowedPokemon);
      }

      // Check max limit: remove oldest inactive avatar if exceeded
      if (avatarsRef.current.size >= currSettings.maxOnScreen) {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        avatarsRef.current.forEach((av, k) => {
          if (!av.bubbleVisible && av.spawnTime < oldestTime) {
            oldestTime = av.spawnTime;
            oldestKey = k;
          }
        });
        if (oldestKey) {
          avatarsRef.current.delete(oldestKey);
        }
      }

      // Spawn at a random position along the wide screen (10% to 90%)
      const startX = 10 + Math.random() * 80;
      const initialFacing: 'left' | 'right' = Math.random() > 0.5 ? 'right' : 'left';
      const speedMultiplier =
        currSettings.walkSpeed === 'slow' ? 0.6 : currSettings.walkSpeed === 'fast' ? 1.7 : 1.1;
      const initialSpeed = (2.5 + Math.random() * 2.0) * speedMultiplier;

      const fadeTimer = setTimeout(() => {
        setAvatars((prev) => {
          const updated = new Map(prev);
          const av = updated.get(key);
          if (av) {
            updated.set(key, { ...av, bubbleVisible: false });
          }
          return updated;
        });
      }, currSettings.bubbleDuration * 1000);

      const newAvatar: ActiveAvatar = {
        id: key,
        displayName: comment.author,
        pokemon: selectedMeta,
        x: startX,
        vx: (initialFacing === 'right' ? 1 : -1) * initialSpeed,
        facing: initialFacing,
        state: 'bouncing',
        nextActionTime: Date.now() + 800,
        message: comment.message,
        bubbleVisible: true,
        bubbleFadeTimeout: fadeTimer,
        spawnTime: Date.now(),
        isNewSpawn: true
      };

      setAvatars((prev) => {
        const updated = new Map(prev);
        updated.set(key, newAvatar);
        return updated;
      });

      // Clear new spawn puff after 1 second
      setTimeout(() => {
        setAvatars((prev) => {
          const updated = new Map(prev);
          const av = updated.get(key);
          if (av) {
            updated.set(key, { ...av, isNewSpawn: false });
          }
          return updated;
        });
      }, 1000);
    }
  };

  // 3. Listen to Socket.IO real-time comment and settings update events
  useEffect(() => {
    if (!socket || !token) return;

    socket.emit('join-overlay', token);

    const onComment = (data: any) => {
      handleIncomingComment(data);
    };

    const onSettingsUpdate = (data: any) => {
      if (data) {
        setSettings((prev) => ({
          ...prev,
          ...data
        }));
      }
    };

    socket.on('pokemon:comment', onComment);
    socket.on(`pokemon:comment:${token}`, onComment);
    socket.on('pokemon:settings_updated', onSettingsUpdate);
    socket.on(`pokemon:settings_updated:${token}`, onSettingsUpdate);

    return () => {
      socket.off('pokemon:comment', onComment);
      socket.off(`pokemon:comment:${token}`, onComment);
      socket.off('pokemon:settings_updated', onSettingsUpdate);
      socket.off(`pokemon:settings_updated:${token}`, onSettingsUpdate);
    };
  }, [socket, token]);

  // 4. Demo Mode: Periodically spawn sample comments for preview
  useEffect(() => {
    if (!isDemo) return;

    // Seed initial default Pokémon immediately
    const initialDefault = settingsRef.current.defaultPokemon || 1;
    handleIncomingComment({
      author: 'RedAsh99',
      message: 'Bulbasaur let’s go! Seed Pokémon best starter! 🌱🔥',
      pokemonId: initialDefault
    });

    const demoInterval = setInterval(() => {
      const allowed = settingsRef.current.allowedPokemon || [1, 4, 7, 25, 39, 54, 94, 133, 143, 149, 151, 448];
      const pickPokemonId = allowed[Math.floor(Math.random() * allowed.length)];
      const demoMessages = [
        { author: 'MistyKanto', message: 'Water pulse incoming! 💧' },
        { author: 'BrockPewter', message: 'Level up this livestream! ⚡' },
        { author: 'OakProfessor', message: 'Remember to check your PokéDex! 📚' },
        { author: 'GaryOak01', message: 'Smell ya later chat! 🏆' },
        { author: 'SabrinaPsychic', message: 'Can you defeat the gym leader? 🔮' },
        { author: 'EeveeFan', message: 'Which evolution next? ✨' }
      ];
      const pick = demoMessages[Math.floor(Math.random() * demoMessages.length)];
      handleIncomingComment({
        author: pick.author,
        message: pick.message,
        pokemonId: pickPokemonId
      });
    }, 6000);

    return () => clearInterval(demoInterval);
  }, [isDemo]);

  // 5. Game Loop (RequestAnimationFrame): Move Pokémon left/right, idle/walk AI
  useEffect(() => {
    let lastTime = Date.now();
    let animId: number;

    const updatePhysics = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const currSettings = settingsRef.current;
      const speedMultiplier =
        currSettings.walkSpeed === 'slow' ? 0.6 : currSettings.walkSpeed === 'fast' ? 1.7 : 1.1;

      setAvatars((prev) => {
        if (prev.size === 0) return prev;
        let hasChanges = false;
        const nextMap = new Map<string, ActiveAvatar>();

        prev.forEach((avatar, key) => {
          let { x, vx, facing, state, nextActionTime } = avatar;

          // AI State Transition: Switch between idle (AFK) and walking
          if (now >= nextActionTime) {
            if (state === 'bouncing') {
              // Finish celebratory bounce, immediately start walking!
              state = 'walking';
              const baseSpeed = (2.5 + Math.random() * 2.0) * speedMultiplier;
              if (Math.abs(vx) < 0.5) {
                facing = Math.random() > 0.5 ? 'right' : 'left';
                vx = (facing === 'right' ? 1 : -1) * baseSpeed;
              }
              nextActionTime = now + 4000 + Math.random() * 4000;
              hasChanges = true;
            } else if (state === 'idle') {
              // Start walking left or right
              state = 'walking';
              facing = Math.random() > 0.5 ? 'right' : 'left';
              const baseSpeed = (2.5 + Math.random() * 2.0) * speedMultiplier;
              vx = (facing === 'right' ? 1 : -1) * baseSpeed;
              nextActionTime = now + 4000 + Math.random() * 5000;
              hasChanges = true;
            } else {
              // Pause and go AFK (idle)
              state = 'idle';
              vx = 0;
              nextActionTime = now + 2000 + Math.random() * 3000;
              hasChanges = true;
            }
          }

          // Movement Physics
          if (state === 'walking') {
            x += vx * dt;

            // Screen Boundaries: Keep between 4% and 94% of the wide screen
            if (x <= 4) {
              x = 4;
              facing = 'right';
              const baseSpeed = (2.5 + Math.random() * 1.5) * speedMultiplier;
              vx = Math.abs(vx) > 0.5 ? Math.abs(vx) : baseSpeed;
            } else if (x >= 94) {
              x = 94;
              facing = 'left';
              const baseSpeed = (2.5 + Math.random() * 1.5) * speedMultiplier;
              vx = -Math.abs(vx) < -0.5 ? -Math.abs(vx) : -baseSpeed;
            }
            hasChanges = true;
          }

          nextMap.set(key, {
            ...avatar,
            x,
            vx,
            facing,
            state,
            nextActionTime
          });
        });

        return hasChanges ? nextMap : prev;
      });

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Sprite Scale Resolution
  const getSpriteSize = () => {
    switch (activeSettings.scale) {
      case 'small':
        return { w: 52, h: 52, scaleStyle: 'scale-90' };
      case 'large':
        return { w: 90, h: 90, scaleStyle: 'scale-125' };
      case 'xlarge':
        return { w: 110, h: 110, scaleStyle: 'scale-150' };
      default:
        return { w: 72, h: 72, scaleStyle: 'scale-100' };
    }
  };

  const spriteSize = getSpriteSize();

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none font-sans ${
        activeSettings.theme === 'pixel-grass'
          ? 'bg-gradient-to-b from-sky-400/20 via-transparent to-emerald-950/40'
          : activeSettings.theme === 'cyber-neon'
          ? 'bg-gradient-to-b from-purple-950/30 via-slate-950/20 to-cyan-950/50'
          : 'bg-transparent'
      }`}
      style={{
        minHeight: '260px'
      }}
    >
      {/* Ground Walking Line / Platform */}
      <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none flex flex-col justify-end">
        {activeSettings.theme === 'pixel-grass' && (
          <div className="w-full h-3 bg-[#48bb78] border-t-2 border-[#2f855a] shadow-[0_-2px_6px_rgba(72,187,120,0.4)]" />
        )}
        {activeSettings.theme === 'cyber-neon' && (
          <div className="w-full h-2 bg-cyan-400/80 shadow-[0_0_12px_#00F0FF] border-t border-cyan-300" />
        )}
      </div>

      {/* Keyframe Styles for Timeloop Chat Bubble & Movement */}
      <style>{`
        @keyframes pokemon-walk-step {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes pokemon-bounce-hop {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-16px) scale(1.08);
          }
        }
        @keyframes bubble-spawn-pop {
          0% {
            opacity: 0;
            transform: scale(0.12) translateY(20px);
          }
          65% {
            opacity: 1;
            transform: scale(1.06) translateY(-4px);
          }
          85% {
            transform: scale(0.97) translateY(1px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes bubble-float-timeloop {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes small-bubble-timeloop {
          0%, 100% {
            transform: scale(0.75) translateY(0);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.35) translateY(-2px);
            opacity: 1;
          }
        }
        @keyframes med-bubble-timeloop {
          0%, 100% {
            transform: scale(1.25) translateY(-1px);
            opacity: 1;
          }
          50% {
            transform: scale(0.8) translateY(1px);
            opacity: 0.7;
          }
        }
      `}</style>

      {/* Render Active Pokémon Avatars */}
      {Array.from(avatars.values()).map((av) => {
        const isFacingLeft = av.facing === 'left';
        const isBouncing = av.state === 'bouncing';
        const isFarLeft = av.x < 15;
        const isFarRight = av.x > 85;
        const bubbleAlignClass = isFarLeft
          ? 'left-0 translate-x-0 items-start'
          : isFarRight
          ? 'right-0 translate-x-0 items-end'
          : 'left-1/2 -translate-x-1/2 items-center';

        return (
          <div
            key={av.id}
            className="absolute bottom-5 pointer-events-none"
            style={{
              left: `${av.x}%`,
              transform: 'translateX(-50%)',
              zIndex: Math.floor(av.x) + (av.bubbleVisible ? 50 : 10)
            }}
          >
            {/* ============================================================== */}
            {/* RETRO PIXEL SPEECH BUBBLE (TIMELOOP SMALL -> BIG BUBBLE)        */}
            {/* ============================================================== */}
            {av.bubbleVisible && (
              <div
                className={`absolute bottom-full mb-2 flex flex-col pointer-events-none z-50 ${bubbleAlignClass}`}
                style={{
                  minWidth: '160px',
                  maxWidth: '320px'
                }}
              >
                {/* Outer wrapper: Animates from small to big on spawn */}
                <div className="relative animate-[bubble-spawn-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]">
                  {/* Big Main Speech Bubble with continuous timeloop float */}
                  <div className="relative animate-[bubble-float-timeloop_2.4s_ease-in-out_infinite] bg-white text-slate-900 px-3.5 py-2.5 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.65)] border-[3px] border-black flex flex-col gap-0.5">
                    {/* Viewer Name Badge (Clean, without dot) */}
                    {activeSettings.showName && (
                      <div className="flex items-center gap-1.5 pb-0.5 border-b border-slate-200">
                        <span
                          className="text-[9px] font-mono font-black uppercase tracking-wider px-1.5 py-0.2 rounded"
                          style={{
                            backgroundColor: `${av.pokemon.primaryColor}25`,
                            color: av.pokemon.secondaryColor || av.pokemon.primaryColor
                          }}
                        >
                          {av.displayName}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-slate-500">{av.pokemon.name}</span>
                      </div>
                    )}

                    {/* Comment Message Body */}
                    <p className="text-xs font-bold text-slate-900 leading-snug break-words font-mono">
                      {av.message}
                    </p>
                  </div>

                  {/* Animated Timeloop Stem: Small bubble & Medium bubble connecting Pokemon to Big Bubble */}
                  <div
                    className="absolute -bottom-3.5 flex flex-col items-center pointer-events-none"
                    style={{
                      left: isFarLeft ? '24px' : isFarRight ? 'calc(100% - 24px)' : '50%',
                      transform: isFarLeft || isFarRight ? 'none' : 'translateX(-50%)'
                    }}
                  >
                    {/* Medium Bubble */}
                    <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-black shadow-sm animate-[med-bubble-timeloop_2s_ease-in-out_infinite]" />
                    {/* Small Bubble (closest to Pokemon) */}
                    <div className="w-1.5 h-1.5 rounded-full bg-white border border-black shadow-sm mt-0.5 animate-[small-bubble-timeloop_2s_ease-in-out_infinite_0.35s]" />
                  </div>
                </div>
              </div>
            )}

            {/* Viewer Name Plate (Clean badge, NO DOT) */}
            {activeSettings.showName && !av.bubbleVisible && (
              <div
                className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md bg-slate-950/90 border border-slate-800 text-[10px] font-mono font-bold shadow-md"
                style={{
                  color: av.pokemon.primaryColor
                }}
              >
                {av.displayName}
              </div>
            )}

            {/* Pokéball Sparkle Effect on initial spawn */}
            {av.isNewSpawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
                <div
                  className="w-12 h-12 rounded-full border-2 border-white shadow-[0_0_15px_#ffffff]"
                  style={{ backgroundColor: `${av.pokemon.primaryColor}60` }}
                />
              </div>
            )}

            {/* ============================================================== */}
            {/* 2D POKÉMON PIXEL SPRITE                                       */}
            {/* ============================================================== */}
            <div
              className={`flex items-end justify-center transition-transform ${
                isBouncing
                  ? 'animate-[pokemon-bounce-hop_0.6s_ease-in-out]'
                  : av.state === 'walking'
                  ? 'animate-[pokemon-walk-step_0.32s_infinite_ease-in-out]'
                  : ''
              }`}
              style={{
                width: `${spriteSize.w}px`,
                height: `${spriteSize.h}px`
              }}
            >
              <img
                src={av.state === 'idle' ? (av.pokemon.idleSpriteUrl || av.pokemon.spriteUrl) : av.pokemon.spriteUrl}
                alt={av.pokemon.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = av.pokemon.fallbackSpriteUrl;
                }}
                className={`w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transition-transform duration-100 ${
                  av.state === 'idle'
                    ? 'scale-x-100' // Looking directly at the front screen!
                    : isFacingLeft
                    ? 'scale-x-[-1]'
                    : 'scale-x-100'
                }`}
                style={{
                  imageRendering: 'pixelated'
                }}
              />
            </div>

            {/* Pixel Footprint Shadow */}
            <div className="w-10 h-2 bg-black/40 rounded-full blur-[1px] mx-auto mt-[-3px]" />
          </div>
        );
      })}
    </div>
  );
};
