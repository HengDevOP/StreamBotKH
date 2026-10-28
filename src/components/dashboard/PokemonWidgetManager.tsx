'use client';

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Tv,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  Send,
  Radio,
  Sliders,
  Eye,
  Info,
  Youtube,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { POKEMON_ROSTER, PokemonMeta } from '../../utils/pokemonData';
import { PokemonStreamOverlay } from '../overlay/PokemonStreamOverlay';

interface PokemonWidgetManagerProps {
  streamerToken?: string;
}

export const PokemonWidgetManager: React.FC<PokemonWidgetManagerProps> = ({ streamerToken }) => {
  const token = streamerToken || 'demo_token';

  // Settings State
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [listenerActive, setListenerActive] = useState(false);
  const [defaultPokemon, setDefaultPokemon] = useState<number>(1); // Bulbasaur default
  const [allowedPokemon, setAllowedPokemon] = useState<number[]>([1, 4, 7, 25, 39, 54, 94, 133, 143, 149, 151, 448]);
  const [bubbleDuration, setBubbleDuration] = useState<number>(8);
  const [maxOnScreen, setMaxOnScreen] = useState<number>(12);
  const [walkSpeed, setWalkSpeed] = useState<string>('normal');
  const [scale, setScale] = useState<string>('medium');
  const [showName, setShowName] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>('transparent');
  const [overlayWidth, setOverlayWidth] = useState<number>(1920);
  const [overlayHeight, setOverlayHeight] = useState<number>(360);

  // Status & UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [listenerLoading, setListenerLoading] = useState(false);

  // Test Comment Form
  const [testAuthor, setTestAuthor] = useState('AshKetchum');
  const [testMessage, setTestMessage] = useState('Bulbasaur, I choose you! 🌱 Let’s win this stream!');
  const [testPokemonId, setTestPokemonId] = useState<number>(1);
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // 1. Fetch current settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/widgets/pokemon?token=${token}`);
      const data = await res.json();
      if (data.success && data.settings) {
        setYoutubeUrl(data.settings.youtubeUrl || '');
        setListenerActive(!!data.isListening || !!data.settings.listenerActive);
        setDefaultPokemon(data.settings.defaultPokemon || 1);
        if (Array.isArray(data.settings.allowedPokemon)) {
          setAllowedPokemon(data.settings.allowedPokemon);
        }
        setBubbleDuration(data.settings.bubbleDuration || 8);
        setMaxOnScreen(data.settings.maxOnScreen || 12);
        setWalkSpeed(data.settings.walkSpeed || 'normal');
        setScale(data.settings.scale || 'medium');
        setShowName(data.settings.showName !== false);
        setTheme(data.settings.theme || 'transparent');
        setOverlayWidth(data.settings.overlayWidth || 1920);
        setOverlayHeight(data.settings.overlayHeight || 360);
      }
    } catch (err) {
      console.error('[PokemonWidgetManager] Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  // 2. Save Settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/widgets/pokemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          youtubeUrl,
          defaultPokemon,
          allowedPokemon,
          bubbleDuration,
          maxOnScreen,
          walkSpeed,
          scale,
          showName,
          theme,
          overlayWidth,
          overlayHeight
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('[PokemonWidgetManager] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // 3. Toggle YouTube Live Comment Listener
  const handleToggleListener = async () => {
    try {
      setListenerLoading(true);
      const nextAction = listenerActive ? 'stop_listener' : 'start_listener';
      const res = await fetch('/api/widgets/pokemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: nextAction,
          youtubeUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setListenerActive(!listenerActive);
      } else {
        alert(data.error || 'Failed to toggle YouTube listener. Check your link.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error toggling YouTube listener');
    } finally {
      setListenerLoading(false);
    }
  };

  // 4. Send Test Comment
  const handleSendTestComment = async (customPokemonId?: number, customMessage?: string) => {
    try {
      setTestSending(true);
      const targetPokemon = customPokemonId || testPokemonId;
      const targetMessage = customMessage || testMessage;

      const res = await fetch('/api/widgets/pokemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'test_comment',
          author: testAuthor,
          message: targetMessage,
          pokemonId: targetPokemon
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestFeedback(`Spawned comment for ${testAuthor}!`);
        setTimeout(() => setTestFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Failed to send test comment:', err);
    } finally {
      setTestSending(false);
    }
  };

  // Quick preset test bursts
  const handleSimulateBurst = async () => {
    const burst = [
      { author: 'BulbaTrainer', msg: 'Bulbasaur is walking on our screen! 🌱', id: 1 },
      { author: 'KantoViewer', msg: 'Pika Pika! Super clutch play! ⚡', id: 25 },
      { author: 'SquirtleSquad', msg: 'Hydro pump stream hype! 💧', id: 7 },
      { author: 'FlameMaster', msg: 'Charmander is on fire! 🔥', id: 4 }
    ];
    for (let i = 0; i < burst.length; i++) {
      setTimeout(() => {
        handleSendTestComment(burst[i].id, burst[i].msg);
      }, i * 700);
    }
  };

  const togglePokemonInPool = (id: number) => {
    if (allowedPokemon.includes(id)) {
      if (allowedPokemon.length === 1) return; // Keep at least one
      setAllowedPokemon(allowedPokemon.filter((p) => p !== id));
    } else {
      setAllowedPokemon([...allowedPokemon, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. INTERACTIVE LIVE SCREEN SOURCE PREVIEW (MORE WIDTH THAN HEIGHT) */}
      {/* ============================================================== */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border border-emerald-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Gamepad2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                <span>2D Pokémon Screen Source Live Preview</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono">
                  {overlayWidth} × {overlayHeight} (Wide Aspect)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Live interactive canvas showing your 2D pixel avatars roaming left &amp; right with retro speech bubbles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateBurst}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-200 text-xs font-mono font-bold transition-colors"
            >
              <Sparkles size={13} className="text-emerald-400" />
              <span>Simulate Chat Burst</span>
            </button>
            <a
              href={`/overlay/pokemon/${token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs font-mono transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <span>Open OBS Link</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Live Scaled Preview Stage (Aspect ratio: wide 16:3 / 16:4) */}
        <div className="relative w-full rounded-2xl border-2 border-slate-800 bg-[#060911] overflow-hidden shadow-2xl">
          <div
            className="w-full relative"
            style={{
              aspectRatio: `${overlayWidth} / ${overlayHeight}`,
              minHeight: '260px',
              maxHeight: '400px'
            }}
          >
            {/* Live Pokémon Component (Real-Time Custom Settings Preview) */}
            <PokemonStreamOverlay
              token={token}
              isDemo={true}
              customSettings={{
                defaultPokemon,
                allowedPokemon,
                bubbleDuration,
                maxOnScreen,
                walkSpeed,
                scale,
                showName,
                theme,
                overlayWidth,
                overlayHeight
              }}
            />

            {/* Stage Info Badge (No dots) */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-2 pointer-events-none z-30 shadow-md">
              <span className="text-emerald-400 font-black tracking-wider uppercase">LIVE PREVIEW</span>
              <span className="text-slate-600">/</span>
              <span className="text-white font-bold">{POKEMON_ROSTER.find((p) => p.id === defaultPokemon)?.name || 'Bulbasaur'} Default</span>
            </div>
          </div>
        </div>

        {/* Quick Test Comment Dispatcher */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text"
              value={testAuthor}
              onChange={(e) => setTestAuthor(e.target.value)}
              placeholder="Viewer username"
              className="w-32 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Type viewer message..."
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
            <select
              value={testPokemonId}
              onChange={(e) => setTestPokemonId(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-750 text-xs font-mono text-emerald-400 focus:outline-none"
            >
              {POKEMON_ROSTER.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleSendTestComment()}
              disabled={testSending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
            >
              <Send size={13} />
              <span>{testSending ? 'Sending...' : 'Spawn Comment'}</span>
            </button>
            {testFeedback && (
              <span className="text-xs font-mono text-emerald-400 animate-fadeIn">{testFeedback}</span>
            )}
          </div>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* 2. YOUTUBE LIVE COMMENT LISTENER SETTINGS                      */}
      {/* ============================================================== */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <Youtube size={16} />
              </div>
              <h3 className="text-base font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                YouTube Live Stream Comment Listener
              </h3>
              {listenerActive ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LISTENING LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono">
                  STANDBY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Paste your YouTube Live link. When viewers comment in your YouTube chat, their personal 2D Pokémon will automatically spawn, roam, and show their message bubble!
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleToggleListener}
              disabled={listenerLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                listenerActive
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              }`}
            >
              <Radio size={13} className={listenerActive ? 'animate-pulse' : ''} />
              <span>{listenerLoading ? 'Connecting...' : listenerActive ? 'Stop Listener' : 'Start Live Listener'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-400">YouTube Live Stream URL or Video ID:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtube.com/live/..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-red-500/60"
            />
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-750 text-white font-mono text-xs font-bold transition-colors"
            >
              {saving ? 'Saving...' : 'Save URL'}
            </button>
          </div>
        </div>
      </Card>

      {/* ============================================================== */}
      {/* 3. 2D POKÉMON ROSTER & DEFAULT SELECTION                       */}
      {/* ============================================================== */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
              <span>Popular 2D Pixel Pokémon Roster</span>
              <span className="text-xs font-mono text-emerald-400">Bulbasaur (#1 Starter Featured)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select which Pokémon can spawn for your chat viewers. Set your favorite default Pokémon or allow random selection.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Default Pokémon:</span>
            <select
              value={defaultPokemon}
              onChange={(e) => setDefaultPokemon(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-750 text-emerald-400 font-bold focus:outline-none"
            >
              {POKEMON_ROSTER.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pokémon Grid */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
          {POKEMON_ROSTER.map((p) => {
            const isAllowed = allowedPokemon.includes(p.id);
            const isDefault = defaultPokemon === p.id;

            return (
              <div
                key={p.id}
                onClick={() => togglePokemonInPool(p.id)}
                className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-between text-center group select-none ${
                  isDefault
                    ? 'bg-emerald-950/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : isAllowed
                    ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/20 border-slate-900 opacity-40 hover:opacity-75'
                }`}
              >
                {/* Default Badge */}
                {isDefault && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono font-black text-[9px]">
                    DEFAULT
                  </div>
                )}

                {/* 2D Sprite */}
                <div className="w-14 h-14 flex items-center justify-center my-1 group-hover:scale-110 transition-transform">
                  <img
                    src={p.idleSpriteUrl || p.spriteUrl}
                    alt={p.name}
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    style={{ imageRendering: 'pixelated' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = p.fallbackSpriteUrl;
                    }}
                  />
                </div>

                <div className="w-full space-y-0.5">
                  <div className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">#{p.id}</div>
                </div>

                <div className="mt-2 w-full pt-1.5 border-t border-slate-800/80 flex items-center justify-center">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isAllowed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    {isAllowed ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ============================================================== */}
      {/* 4. CUSTOM SCREEN SOURCE & MOVEMENT SETTINGS                     */}
      {/* ============================================================== */}
      <Card className="p-5 sm:p-6 bg-[#090D18] border border-slate-800 space-y-5">
        <div className="pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
            Custom Screen Source &amp; Physics Settings
          </h3>
          <p className="text-xs text-slate-400">
            Configure the custom wide dimensions (more width than height), bubble duration, and movement speeds.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Dimension Width & Height */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Screen Width × Height (px):</span>
              <span className="text-emerald-400 font-bold">More Width Than Height</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={overlayWidth}
                onChange={(e) => setOverlayWidth(parseInt(e.target.value, 10) || 1920)}
                className="w-1/2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                placeholder="Width: 1920"
              />
              <span className="text-slate-500 font-mono">×</span>
              <input
                type="number"
                value={overlayHeight}
                onChange={(e) => setOverlayHeight(parseInt(e.target.value, 10) || 360)}
                className="w-1/2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                placeholder="Height: 360"
              />
            </div>
            <p className="text-[11px] text-slate-500">Recommended for OBS: 1920×360 or 1280×300</p>
          </div>

          {/* Bubble Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Speech Bubble Duration:</span>
              <span className="text-cyan-400 font-bold">{bubbleDuration} seconds</span>
            </label>
            <input
              type="range"
              min={3}
              max={20}
              step={1}
              value={bubbleDuration}
              onChange={(e) => setBubbleDuration(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>3s (Fast)</span>
              <span>8s (Recommended)</span>
              <span>20s (Long)</span>
            </div>
          </div>

          {/* Max on Screen */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Max Active Pokémon:</span>
              <span className="text-amber-400 font-bold">{maxOnScreen} avatars</span>
            </label>
            <input
              type="range"
              min={3}
              max={25}
              step={1}
              value={maxOnScreen}
              onChange={(e) => setMaxOnScreen(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>3</span>
              <span>12 (Optimal)</span>
              <span>25 (Crowded)</span>
            </div>
          </div>

          {/* Sprite Scale */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Sprite Size:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'small', label: 'Small (52px)' },
                { id: 'medium', label: 'Medium (72px)' },
                { id: 'large', label: 'Large (90px)' },
                { id: 'xlarge', label: 'Giant (110px)' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScale(s.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                    scale === s.id
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Walk Speed */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Movement Pacing:</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'slow', label: 'Slow & Chill' },
                { id: 'normal', label: 'Natural Walk' },
                { id: 'fast', label: 'Hyper Active' }
              ].map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWalkSpeed(w.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                    walkSpeed === w.id
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ground Platform Theme */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Ground Platform Theme:</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'transparent', label: 'Transparent (OBS)' },
                { id: 'pixel-grass', label: '8-Bit Grass' },
                { id: 'cyber-neon', label: 'Cyber Neon' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                    theme === t.id
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles: Show Name & Sound Effects */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-300">Show Viewer Name Plate</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-mono font-bold text-emerald-400 animate-fadeIn flex items-center gap-1">
                <Check size={13} className="text-emerald-400 stroke-[3]" />
                <span>Saved & Synced!</span>
              </span>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveSettings}
              disabled={saving}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs font-mono transition-all shadow-lg cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.4)]'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              }`}
            >
              {saving ? 'Saving...' : saveSuccess ? 'Settings Saved! ✓' : 'Save All Settings'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
