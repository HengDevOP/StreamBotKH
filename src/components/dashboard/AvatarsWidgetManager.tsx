'use client';

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Copy,
  Check,
  ExternalLink,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  Eye,
  MessageSquare,
  Gift,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AVATAR_ROSTER, AvatarItem } from '../../utils/avatarData';
import { AvatarStreamOverlay, AvatarSettings } from '../overlay/AvatarStreamOverlay';

interface AvatarsWidgetManagerProps {
  streamerToken?: string;
}

export const AvatarsWidgetManager: React.FC<AvatarsWidgetManagerProps> = ({ streamerToken }) => {
  const token = streamerToken || 'demo-token';

  // Settings State
  const [enabled, setEnabled] = useState(true);
  const [defaultAvatarId, setDefaultAvatarId] = useState('cyber-bot');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [customAvatarName, setCustomAvatarName] = useState('');
  const [allowedAvatars, setAllowedAvatars] = useState<string[]>([
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
  ]);
  const [walkSpeed, setWalkSpeed] = useState<string>('normal');
  const [scale, setScale] = useState<string>('medium');
  const [bubbleDuration, setBubbleDuration] = useState<number>(7);
  const [maxOnScreen, setMaxOnScreen] = useState<number>(10);
  const [showName, setShowName] = useState<boolean>(true);
  const [reactToDonations, setReactToDonations] = useState<boolean>(true);
  const [reactToChat, setReactToChat] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Status & UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Test Simulation State
  const [testAuthor, setTestAuthor] = useState('StreamViewer');
  const [testMessage, setTestMessage] = useState('Hype stream! The avatars are walking! 🔥');
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Preview key to force re-mounting preview when reset
  const [previewKey, setPreviewKey] = useState(0);

  // 1. Fetch current settings from backend
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/widgets/avatars?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        setEnabled(s.enabled !== false);
        setDefaultAvatarId(s.defaultAvatarId || 'cyber-bot');
        setCustomAvatarUrl(s.customAvatarUrl || '');
        setCustomAvatarName(s.customAvatarName || '');
        if (Array.isArray(s.allowedAvatars)) {
          setAllowedAvatars(s.allowedAvatars);
        }
        setWalkSpeed(s.walkSpeed || 'normal');
        setScale(s.scale || 'medium');
        setBubbleDuration(s.bubbleDuration || 7);
        setMaxOnScreen(s.maxOnScreen || 10);
        setShowName(s.showName !== false);
        setReactToDonations(s.reactToDonations !== false);
        setReactToChat(s.reactToChat !== false);
        setSoundEnabled(s.soundEnabled !== false);
      }
    } catch (err) {
      console.error('[AvatarsWidgetManager] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  // 2. Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/widgets/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          enabled,
          defaultAvatarId,
          customAvatarUrl,
          customAvatarName,
          allowedAvatars,
          walkSpeed,
          scale,
          bubbleDuration,
          maxOnScreen,
          showName,
          reactToDonations,
          reactToChat,
          soundEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('[AvatarsWidgetManager] Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // 3. Send Test Comment
  const handleSendTestComment = async (customAvatar?: string, customMsg?: string) => {
    try {
      setTestSending(true);
      const res = await fetch('/api/widgets/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'test_comment',
          author: testAuthor,
          message: customMsg || testMessage,
          avatarId: customAvatar || defaultAvatarId
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestFeedback(`Test message sent!`);
        setTimeout(() => setTestFeedback(null), 2500);
      }
    } catch (err) {
      console.error('[AvatarsWidgetManager] Test error:', err);
    } finally {
      setTestSending(false);
    }
  };

  // 4. Send Test Donation
  const handleSendTestDonation = async () => {
    try {
      setTestSending(true);
      const res = await fetch('/api/widgets/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'test_donation',
          donor: testAuthor || 'GenerousViewer',
          amount: 10,
          currency: 'USD',
          message: 'Super hyped for this stream! 🎉',
          avatarId: defaultAvatarId
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestFeedback(`Celebration triggered!`);
        setTimeout(() => setTestFeedback(null), 2500);
      }
    } catch (err) {
      console.error('[AvatarsWidgetManager] Test donation error:', err);
    } finally {
      setTestSending(false);
    }
  };

  // OBS Overlay URL
  const overlayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/overlay/avatars/${token}`
    : `/overlay/avatars/${token}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAvatarInPool = (id: string) => {
    if (allowedAvatars.includes(id)) {
      if (allowedAvatars.length <= 1) return; // Keep at least one
      setAllowedAvatars(allowedAvatars.filter((item) => item !== id));
    } else {
      setAllowedAvatars([...allowedAvatars, id]);
    }
  };

  const currentPreviewSettings: Partial<AvatarSettings> = {
    enabled,
    defaultAvatarId,
    customAvatarUrl,
    customAvatarName,
    allowedAvatars,
    walkSpeed,
    scale,
    bubbleDuration,
    maxOnScreen,
    showName,
    reactToDonations,
    reactToChat,
    soundEnabled
  };

  return (
    <div className="space-y-6">
      {/* Header & OBS Link */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Stream Avatars</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-[#262626]">
                Overlay Widget
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Interactive stream characters that walk across your screen, display viewer chat messages, and celebrate donations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-white hover:bg-neutral-200 text-black font-medium text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </div>

        {/* OBS Browser Source URL Box */}
        <div className="pt-3 border-t border-[#262626] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#0f0f0f] border border-[#262626] rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 truncate">
            <span className="text-neutral-500 select-none">OBS URL:</span>
            <span className="truncate">{overlayUrl}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleCopyUrl}
              variant="outline"
              className="text-xs px-3 py-2 h-auto border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-white flex items-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </Button>
            <a
              href={overlayUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2 border border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-neutral-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Open</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live Stage Preview */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-neutral-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Live Stage Preview</span>
            <span className="text-[11px] text-neutral-500">(1920 × 360 px standard)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-[#1a1a1a] border border-[#262626] transition-colors"
              title="Reset preview simulation"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="relative w-full h-64 bg-[#0a0a0a] overflow-hidden flex flex-col justify-end">
          {/* Subtle Stage Grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* Embedded live overlay */}
          <AvatarStreamOverlay
            key={previewKey}
            token={token}
            isDemo={true}
            customSettings={currentPreviewSettings}
          />
        </div>

        {/* Test Controls Bar */}
        <div className="p-4 bg-[#0f0f0f] border-t border-[#262626] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
              type="text"
              value={testAuthor}
              onChange={(e) => setTestAuthor(e.target.value)}
              placeholder="Username"
              className="w-28 sm:w-36 bg-[#181818] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
            />
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test speech bubble message..."
              className="flex-1 min-w-0 bg-[#181818] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => handleSendTestComment()}
              disabled={testSending}
              className="text-xs px-3 py-1.5 h-auto bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] text-white flex items-center gap-1.5"
            >
              <MessageSquare size={13} />
              <span>Test Chat</span>
            </Button>

            <Button
              onClick={() => handleSendTestDonation()}
              disabled={testSending}
              className="text-xs px-3 py-1.5 h-auto bg-[#1a1a1a] hover:bg-[#252525] border border-[#262626] text-amber-300 flex items-center gap-1.5"
            >
              <Gift size={13} />
              <span>Test Donation</span>
            </Button>
          </div>
        </div>

        {testFeedback && (
          <div className="px-4 py-1.5 bg-[#141414] text-emerald-400 text-xs border-t border-[#262626] flex items-center gap-1.5">
            <Check size={12} />
            <span>{testFeedback}</span>
          </div>
        )}
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar Roster Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Avatar Roster</h3>
                <p className="text-xs text-neutral-400">
                  Select your default avatar and toggle which characters viewers can appear as in stream chat.
                </p>
              </div>
              <span className="text-xs text-neutral-400">
                {allowedAvatars.length} active in pool
              </span>
            </div>

            {/* Roster Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {AVATAR_ROSTER.map((item) => {
                const isDefault = defaultAvatarId === item.id;
                const isInPool = allowedAvatars.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className={`relative p-3 rounded-lg border transition-all text-left flex flex-col items-center gap-2 group cursor-pointer ${
                      isDefault
                        ? 'bg-[#1c1c1c] border-white'
                        : 'bg-[#121212] border-[#262626] hover:border-neutral-500'
                    }`}
                    onClick={() => setDefaultAvatarId(item.id)}
                  >
                    {/* Status Badges */}
                    <div className="w-full flex items-center justify-between">
                      {item.tag && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {item.tag}
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={isInPool}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleAvatarInPool(item.id);
                        }}
                        title="Include in viewer avatar pool"
                        className="rounded border-[#262626] bg-[#181818] text-white focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* Sprite Image */}
                    <div className="w-16 h-16 flex items-center justify-center p-1">
                      <img
                        src={item.avatarUrl}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain filter drop-shadow"
                      />
                    </div>

                    {/* Name & Selector */}
                    <div className="w-full text-center">
                      <div className="text-xs font-semibold text-white truncate">{item.name}</div>
                      <div className="text-[10px] text-neutral-400 capitalize">{item.category}</div>
                    </div>

                    {isDefault && (
                      <div className="w-full py-0.5 text-center text-[10px] font-bold uppercase bg-white text-black rounded mt-1">
                        Default
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Streamer Avatar Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Custom Streamer Avatar</h3>
              <p className="text-xs text-neutral-400">
                Optionally override the default character with your own custom branded image or animated GIF URL.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Custom Image URL</label>
                <input
                  type="text"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://example.com/my-avatar.gif"
                  className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Custom Character Name</label>
                <input
                  type="text"
                  value={customAvatarName}
                  onChange={(e) => setCustomAvatarName(e.target.value)}
                  placeholder="e.g. MyChannelBot"
                  className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Physics & Appearance Settings */}
        <div className="space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-5">
            <div className="pb-3 border-b border-[#262626]">
              <h3 className="text-sm font-bold text-white tracking-wide">Behavior & Appearance</h3>
              <p className="text-xs text-neutral-400">Configure size, speed, and reaction triggers.</p>
            </div>

            {/* Enable Widget Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-white">Enable Widget</div>
                <div className="text-[11px] text-neutral-400">Show avatars in OBS browser source</div>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-[#262626] bg-[#181818] text-white focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Movement Speed */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white">Movement Speed</label>
              <select
                value={walkSpeed}
                onChange={(e) => setWalkSpeed(e.target.value)}
                className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400 cursor-pointer"
              >
                <option value="stationary">Stationary (Stand still)</option>
                <option value="slow">Slow & Relaxed</option>
                <option value="normal">Normal Walk</option>
                <option value="fast">Fast & Energetic</option>
              </select>
            </div>

            {/* Avatar Scale */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white">Avatar Scale</label>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400 cursor-pointer"
              >
                <option value="small">Small (64 px)</option>
                <option value="medium">Medium (90 px)</option>
                <option value="large">Large (120 px)</option>
                <option value="xlarge">Extra Large (150 px)</option>
              </select>
            </div>

            {/* Bubble Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white">Speech Bubble Duration</span>
                <span className="text-neutral-400">{bubbleDuration} seconds</span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                value={bubbleDuration}
                onChange={(e) => setBubbleDuration(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>

            {/* Max Avatars on Screen */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white">Max Avatars on Screen</span>
                <span className="text-neutral-400">{maxOnScreen} characters</span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                value={maxOnScreen}
                onChange={(e) => setMaxOnScreen(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="pt-3 border-t border-[#262626] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Show Name Tags</div>
                  <div className="text-[11px] text-neutral-400">Display viewer name below avatar</div>
                </div>
                <input
                  type="checkbox"
                  checked={showName}
                  onChange={(e) => setShowName(e.target.checked)}
                  className="w-4 h-4 rounded border-[#262626] bg-[#181818] text-white focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">React to Live Chat</div>
                  <div className="text-[11px] text-neutral-400">Show speech bubble on incoming comments</div>
                </div>
                <input
                  type="checkbox"
                  checked={reactToChat}
                  onChange={(e) => setReactToChat(e.target.checked)}
                  className="w-4 h-4 rounded border-[#262626] bg-[#181818] text-white focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Celebrate Donations</div>
                  <div className="text-[11px] text-neutral-400">Avatars cheer and dance when a tip is sent</div>
                </div>
                <input
                  type="checkbox"
                  checked={reactToDonations}
                  onChange={(e) => setReactToDonations(e.target.checked)}
                  className="w-4 h-4 rounded border-[#262626] bg-[#181818] text-white focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Bottom Save Button */}
            <div className="pt-4 border-t border-[#262626]">
              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full bg-white hover:bg-neutral-200 text-black font-semibold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>Saved Successfully</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
