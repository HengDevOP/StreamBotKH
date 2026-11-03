'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Youtube,
  Tv,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Sparkles,
  Users,
  Eye,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Crown
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { extractYoutubeId } from '../../utils/youtube';
import { streamerService } from '../../services/streamerService';
import { useSocket } from '../../context/SocketContext';

export interface BroadcastStreamManagerProps {
  user: any;
  onRefreshUser?: () => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export const BroadcastStreamManager: React.FC<BroadcastStreamManagerProps> = ({
  user,
  onRefreshUser,
  onNavigateToTab
}) => {
  const [streamUrl, setStreamUrl] = useState<string>(user?.liveStreamUrl || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedTvLink, setCopiedTvLink] = useState<boolean>(false);

  // Live Chat Listener state
  const [listenerActive, setListenerActive] = useState<boolean>(false);
  const [listenerLoading, setListenerLoading] = useState<boolean>(false);

  // Live chat stream preview feed
  const [recentLiveComments, setRecentLiveComments] = useState<any[]>([]);

  const token = user?.overlayToken || '';
  const username = user?.username || 'streamer';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const tvUrl = `${origin}/tv?=${username}`;

  const { socket, joinOverlayRoom } = useSocket();

  // Keep streamUrl in sync if user changes
  useEffect(() => {
    if (user?.liveStreamUrl !== undefined) {
      setStreamUrl(user.liveStreamUrl || '');
    }
  }, [user?.liveStreamUrl]);

  // Join overlay room to receive live comments from YouTube
  useEffect(() => {
    if (token) {
      joinOverlayRoom(token);
    }
  }, [token, joinOverlayRoom]);

  // Fetch initial chat listener state
  useEffect(() => {
    if (!token) return;
    fetch(`/api/widgets/chat?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.isListening !== undefined) {
          setListenerActive(Boolean(data.isListening));
        }
      })
      .catch(() => {});
  }, [token]);

  // Listen to incoming live comments broadcasted from YouTube
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (msg: any) => {
      if (!msg) return;
      setRecentLiveComments((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [msg, ...prev].slice(0, 8);
      });
    };

    socket.on('chat:message', handleMessage);
    return () => {
      socket.off('chat:message', handleMessage);
    };
  }, [socket]);

  // Detect YouTube Video ID
  const detectedVideoId = useMemo(() => {
    return extractYoutubeId(streamUrl);
  }, [streamUrl]);

  // Copy /tv link
  const handleCopyTvLink = () => {
    navigator.clipboard.writeText(tvUrl);
    setCopiedTvLink(true);
    setTimeout(() => setCopiedTvLink(false), 2000);
  };

  // Save Live Stream URL
  const handleSaveLiveUrl = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const trimmedUrl = streamUrl.trim();
      await streamerService.updateProfile({
        liveStreamUrl: trimmedUrl
      });

      if (onRefreshUser) {
        await onRefreshUser();
      }

      // Also ensure live chat settings are updated with the url
      if (token) {
        await fetch('/api/widgets/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            action: 'save_settings',
            youtubeUrl: trimmedUrl
          })
        }).catch(() => {});
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Auto start listener if valid youtube URL
      if (detectedVideoId && token && !listenerActive) {
        setListenerActive(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update live stream URL');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Live Chat Listener
  const handleToggleListener = async () => {
    if (!streamUrl.trim() && !listenerActive) {
      setErrorMsg('Please enter a YouTube Live Stream URL or Video ID first.');
      return;
    }

    setListenerLoading(true);
    setErrorMsg(null);
    try {
      const nextAction = listenerActive ? 'stop_listener' : 'start_listener';
      const res = await fetch('/api/widgets/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: nextAction,
          youtubeUrl: streamUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setListenerActive(!listenerActive);
      } else {
        setErrorMsg(data.error || 'Failed to toggle live chat listener.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error toggling live chat listener');
    } finally {
      setListenerLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. HEADER DECK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#090D18] border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Radio size={24} className={listenerActive || detectedVideoId ? 'animate-pulse' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-white font-['Chakra_Petch'] tracking-wide">
                Broadcast Stream
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect your YouTube Live Stream URL to power both your <strong className="text-slate-300">/tv</strong> broadcast channel and real-time <strong className="text-cyan-400">Live Chat Overlay</strong> with subscriber badges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyTvLink}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer ${
              copiedTvLink
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
            title="Copy /tv channel link"
          >
            {copiedTvLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedTvLink ? 'Copied' : 'Copy /tv Link'}</span>
          </button>

          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-cyan-500/20"
            title="Watch your channel live on /tv"
          >
            <Tv size={14} />
            <span>Watch on /tv</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* 2. MAIN YOUTUBE URL INPUT & CONTROLS */}
      <Card className="p-6 bg-[#090D18] border border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Youtube size={20} className="text-red-500" />
            <h2 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
              YouTube Live Stream URL
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {detectedVideoId ? `Detected ID: ${detectedVideoId}` : 'Enter your live link'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-red-500/60 overflow-hidden">
              <span className="px-3.5 py-2.5 bg-slate-900/80 text-slate-400 font-mono text-xs border-r border-slate-800 select-none flex items-center gap-1.5 shrink-0">
                <Youtube size={14} className="text-red-400" />
                <span className="hidden xs:inline">Stream Link</span>
              </span>
              <input
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/live/..."
                className="w-full px-3.5 py-2.5 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-600"
              />
              {streamUrl && (
                <button
                  type="button"
                  onClick={() => setStreamUrl('')}
                  className="p-2 text-slate-500 hover:text-white transition-colors cursor-pointer mr-1 shrink-0"
                  title="Clear URL"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveLiveUrl}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap shadow-md shadow-red-500/20 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Save URL</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              <span>Stream URL saved and synchronized to /tv and Live Chat!</span>
            </div>
          )}

          <p className="text-[11px] font-mono text-slate-400">
            Paste your YouTube stream link (e.g. <code className="text-slate-300">youtube.com/watch?v=...</code> or <code className="text-slate-300">youtube.com/live/...</code>). When updated, your stream automatically appears on <strong>/tv?={username}</strong> and viewer comments flow into your live chat overlay.
          </p>
        </div>

        {/* Video Preview Box */}
        {detectedVideoId && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={14} />
                <span>Connected YouTube Feed ({detectedVideoId})</span>
              </span>
              <span className="text-slate-400 text-[11px]">Stream Screen Preview</span>
            </div>

            <div className="relative w-full aspect-video max-w-xl rounded-xl bg-black border border-slate-800 overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${detectedVideoId}?autoplay=0&playsinline=1`}
                title="YouTube Live Stream Preview"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </Card>

      {/* 3. LIVE CHAT & SUBSCRIBER BADGE INTEGRATION CARD */}
      <Card className="p-6 bg-[#090D18] border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MessageSquare size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                <span>Live Chat &amp; Subscriber Integration</span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AUTO-SYNC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pulls viewer messages directly from your live stream chat into your OBS overlay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                listenerActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${listenerActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              {listenerActive ? 'LISTENER ACTIVE' : 'LISTENER IDLE'}
            </span>

            <button
              type="button"
              onClick={handleToggleListener}
              disabled={listenerLoading}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                listenerActive
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              <Radio size={13} className={listenerActive ? 'animate-pulse' : ''} />
              <span>{listenerLoading ? 'Connecting...' : listenerActive ? 'Stop Listener' : 'Start Listener'}</span>
            </button>
          </div>
        </div>

        {/* Informative Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-['Chakra_Petch']">
              <Sparkles size={14} />
              <span>Real-Time Overlay</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              YouTube live comments are injected directly into your Live Chat widget in OBS Studio.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-['Chakra_Petch']">
              <Crown size={14} />
              <span>Subscriber Badges</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              When a viewer chats with their matched YouTube name, their VIP subscriber badge automatically renders!
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold font-['Chakra_Petch']">
              <ShieldCheck size={14} />
              <span>Username Matching</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
              Supports exact names, @handles, and display names with zero configuration required.
            </p>
          </div>
        </div>

        {/* Recent Broadcasted Comments Preview Feed */}
        {recentLiveComments.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Radio size={12} className="text-cyan-400 animate-pulse" />
                <span>Live Incoming Comments (Real-time Broadcast)</span>
              </span>
              <span className="text-slate-500 text-[10px]">{recentLiveComments.length} messages</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-2 max-h-48 overflow-y-auto no-scrollbar font-mono text-xs">
              {recentLiveComments.map((c) => (
                <div key={c.id} className="flex items-baseline gap-2 py-1 border-b border-slate-900 last:border-b-0">
                  <span className="font-bold text-cyan-400 shrink-0">{c.author}</span>
                  {c.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {c.badge}
                    </span>
                  )}
                  <span className="text-slate-300 break-words">{c.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Navigation Button to Live Chat Widget Customizer */}
        {onNavigateToTab && (
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              Want to customize chat animations, fonts, colors, and shadows?
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('chat')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-colors cursor-pointer"
            >
              <Sliders size={13} />
              <span>Customize Live Chat Overlay</span>
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};
export default BroadcastStreamManager;