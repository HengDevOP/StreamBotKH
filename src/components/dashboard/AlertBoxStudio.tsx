'use client';

import React, { useState } from 'react';
import { Volume2, Sparkles, Send, Check, Settings2, Sliders, MessageSquare, Mic } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { AlertSettings } from '../../types/alert';
import { useAudio } from '../../hooks/useAudio';

interface AlertBoxStudioProps {
  initialSettings?: AlertSettings;
  onSave: (settings: Partial<AlertSettings>) => Promise<void>;
  onTriggerTest: () => Promise<void>;
}

export const AlertBoxStudio: React.FC<AlertBoxStudioProps> = ({
  initialSettings,
  onSave,
  onTriggerTest
}) => {
  const [templateStyle, setTemplateStyle] = useState(initialSettings?.template_style || 'neon-box');
  const [glowColor, setGlowColor] = useState(initialSettings?.glow_color || '#00F0FF');
  const [soundUrl, setSoundUrl] = useState(initialSettings?.sound_url || '/sounds/neon-chime.mp3');
  const [soundVolume, setSoundVolume] = useState(initialSettings?.sound_volume ?? 0.8);
  const [durationSeconds, setDurationSeconds] = useState(initialSettings?.duration_seconds ?? 8);
  const [minAmountAlert, setMinAmountAlert] = useState(initialSettings?.min_amount_alert ?? 1.0);
  const [ttsEnabled, setTtsEnabled] = useState((initialSettings?.tts_enabled ?? 1) === 1);
  const [ttsMinAmount, setTtsMinAmount] = useState(initialSettings?.tts_min_amount ?? 2.0);
  const [textTemplate, setTextTemplate] = useState(initialSettings?.text_template || '{name} dropped {amount}!');
  const [customGifUrl, setCustomGifUrl] = useState(initialSettings?.custom_gif_url || '');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testing, setTesting] = useState(false);

  const { playSound } = useAudio();

  const colorPresets = [
    { label: 'Cyber Cyan', hex: '#00F0FF', ring: 'ring-cyan-400' },
    { label: 'Neon Pink', hex: '#FF007A', ring: 'ring-pink-500' },
    { label: 'Electric Emerald', hex: '#00FF66', ring: 'ring-emerald-400' },
    { label: 'Hyper Yellow', hex: '#FFE600', ring: 'ring-yellow-400' },
    { label: 'Vivid Violet', hex: '#8A2BE2', ring: 'ring-purple-400' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        template_style: templateStyle as any,
        glow_color: glowColor,
        sound_url: soundUrl,
        sound_volume: soundVolume,
        duration_seconds: durationSeconds,
        min_amount_alert: minAmountAlert,
        tts_enabled: ttsEnabled ? 1 : 0,
        tts_min_amount: ttsMinAmount,
        text_template: textTemplate,
        custom_gif_url: customGifUrl
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      await onTriggerTest();
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sliders className="text-cyan-400" size={20} />
            Alert Box Studio
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Customize your live stream overlay animation, sound effects, and TTS</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestAlert}
            loading={testing}
            icon={<Send size={14} />}
          >
            Send Test Alert
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            icon={savedSuccess ? <Check size={14} /> : <Settings2 size={14} />}
          >
            {savedSuccess ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Visual Customizations */}
        <div className="space-y-5">
          {/* Template Style */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Alert Card Style
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'neon-box', title: 'Neon Cyber Box', desc: 'Sleek futuristic glowing border' },
                { id: 'cyber-glitch', title: 'Glitch Runner', desc: 'Cyberpunk animated glitch' },
                { id: 'glass-banner', title: 'Glass VIP', desc: 'Ultra-clean frosted glass badge' },
                { id: 'arcade', title: 'Retro Arcade', desc: 'Pixel gaming champion banner' },
              ].map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setTemplateStyle(tpl.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    templateStyle === tpl.id
                      ? 'border-cyan-400 bg-cyan-950/30 font-semibold'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <p className="text-sm font-bold text-white">{tpl.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{tpl.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Glow Color Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Color Accent
            </label>
            <div className="flex items-center gap-3">
              {colorPresets.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setGlowColor(c.hex)}
                  title={c.label}
                  className={`w-9 h-9 rounded-xl transition-transform flex items-center justify-center ${
                    glowColor === c.hex ? `scale-110 ring-2 ${c.ring}` : 'hover:scale-105 opacity-80'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {glowColor === c.hex && <Check size={14} className="text-slate-950 font-bold" />}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="color"
                  value={glowColor}
                  onChange={(e) => setGlowColor(e.target.value)}
                  className="w-9 h-9 rounded-xl bg-transparent cursor-pointer border border-slate-700"
                />
                <span className="text-xs font-mono text-slate-400 uppercase">{glowColor}</span>
              </div>
            </div>
          </div>

          {/* Custom GIF or Banner URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Custom Alert GIF / Mascot Image (Optional)
            </label>
            <input
              type="text"
              placeholder="https://media.giphy.com/.../giphy.gif"
              value={customGifUrl}
              onChange={(e) => setCustomGifUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors font-mono text-xs"
            />
          </div>

          {/* Alert Message Template */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Banner Headline Template
            </label>
            <input
              type="text"
              value={textTemplate}
              onChange={(e) => setTextTemplate(e.target.value)}
              placeholder="{name} dropped {amount}!"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1">Available placeholders: <code>{'{name}'}</code>, <code>{'{amount}'}</code></p>
          </div>
        </div>

        {/* Right Column: Audio & TTS Settings */}
        <div className="space-y-5">
          {/* Sound Effect Picker & Volume */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Volume2 size={16} className="text-cyan-400" />
                Alert Sound Effect
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => playSound(soundUrl, soundVolume)}
              >
                Preview Audio
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '/sounds/neon-chime.mp3', label: 'Neon Cyber Synth' },
                { id: 'synth', label: '8-Bit Arcade Ping' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSoundUrl(s.id);
                    playSound(s.id, soundVolume);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                    soundUrl === s.id
                      ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Sound Volume</span>
                <span className="font-mono text-cyan-400">{Math.round(soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
            </div>
          </div>

          {/* Text-To-Speech (TTS) Settings */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic size={16} className="text-pink-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Text-to-Speech (TTS)
                </span>
              </div>
              <Switch checked={ttsEnabled} onChange={setTtsEnabled} />
            </div>

            {ttsEnabled && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Minimum Tip Amount for TTS</span>
                    <span className="font-mono text-pink-400">${ttsMinAmount.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={ttsMinAmount}
                    onChange={(e) => setTtsMinAmount(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Prevents audio spam on smaller donations</p>
                </div>
              </div>
            )}
          </div>

          {/* Duration & Minimum Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Display Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="30"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(parseInt(e.target.value) || 8)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-slate-400 font-mono">seconds</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Min Amount for Alert
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={minAmountAlert}
                  onChange={(e) => setMinAmountAlert(parseFloat(e.target.value) || 1.0)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <span className="text-xs text-slate-400 font-mono">USD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
