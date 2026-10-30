'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { BadgeCheck, Sparkles, Heart, QrCode } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

interface StreamTipQrOverlayProps {
  token: string;
}

interface StreamerData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isVerified: boolean;
  glowColor: string;
  templateStyle?: string;
  overlayToken: string;
  donateUrl: string;
}

export const StreamTipQrOverlay: React.FC<StreamTipQrOverlayProps> = ({ token }) => {
  const [searchParams] = useSearchParams();
  const theme = searchParams.get('theme') || 'cyber-neon';
  const customTitle = searchParams.get('title');
  const customColor = searchParams.get('color');
  const scanlineParam = searchParams.get('scanline');
  const showScanline = scanlineParam !== '0' && scanlineParam !== 'false';
  const qrSizeParam = Number(searchParams.get('size'));
  const qrSize = !isNaN(qrSizeParam) && qrSizeParam > 80 ? qrSizeParam : 160;

  const { socket, joinOverlayRoom } = useSocket();

  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAlert, setActiveAlert] = useState<{
    donorName: string;
    amount: number;
    currency: string;
  } | null>(null);

  // 1. Fetch streamer details for the QR code
  useEffect(() => {
    let isMounted = true;
    const effectiveToken = token || 'demo-token';

    fetch(`/api/widgets/tip-qr?token=${encodeURIComponent(effectiveToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.streamer) {
          setStreamer(data.streamer);
        }
      })
      .catch((err) => {
        console.error('[Tip QR Overlay] Error fetching streamer info:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // 2. Connect to live WebSocket room to react when a tip arrives
  useEffect(() => {
    if (!socket) return;
    const effectiveToken = token || streamer?.overlayToken || 'demo-token';
    joinOverlayRoom(effectiveToken);

    const handleTipAlert = (payload: any) => {
      if (!payload) return;
      const donorName = payload.donorName || payload.donor_name || 'Supporter';
      const amount = Number(payload.amount) || 0;
      const currency = (payload.currency || 'USD').toUpperCase();

      setActiveAlert({ donorName, amount, currency });

      const timer = setTimeout(() => {
        setActiveAlert(null);
      }, 6500);

      return () => clearTimeout(timer);
    };

    socket.on('donation:alert', handleTipAlert);
    socket.on('donation:paid', handleTipAlert);

    return () => {
      socket.off('donation:alert', handleTipAlert);
      socket.off('donation:paid', handleTipAlert);
    };
  }, [socket, token, streamer?.overlayToken, joinOverlayRoom]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const donateUrl = useMemo(() => {
    if (streamer?.donateUrl) return streamer.donateUrl;
    if (streamer?.username) return `${origin}/@${streamer.username}`;
    return `${origin}/donate`;
  }, [streamer, origin]);

  const effectiveAccentColor = customColor || streamer?.glowColor || '#00F0FF';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 text-slate-400 font-mono text-xs">
        <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mr-2" />
        <span>Loading Tip QR Code...</span>
      </div>
    );
  }

  const displayName = streamer?.displayName || streamer?.username || 'Streamer';
  const username = streamer?.username || 'streamer';
  const avatarUrl =
    streamer?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  // =========================================================================
  // THEME 1: TRANSPARENT / FLOATING (No background container)
  // =========================================================================
  if (theme === 'transparent') {
    return (
      <div className="flex flex-col items-center justify-center p-3 select-none">
        <div className="p-3.5 rounded-2xl bg-white shadow-2xl relative">
          <QRCodeSVG value={donateUrl} size={qrSize} level="H" includeMargin={false} />
          {/* Center Avatar Badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-white p-0.5 shadow-md overflow-hidden border border-slate-200">
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs font-black font-['Chakra_Petch'] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase tracking-wider block">
            Scan to Tip @{username}
          </span>
          <span className="text-[10px] font-mono text-cyan-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            ABA PAY • Bakong KHQR
          </span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // THEME 2: COMPACT (Minimal footprint)
  // =========================================================================
  if (theme === 'compact') {
    return (
      <div
        className="relative p-3.5 rounded-2xl bg-[#080C16]/95 border border-slate-800 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center text-center select-none"
        style={{
          boxShadow: `0 0 25px ${effectiveAccentColor}25, 0 10px 30px rgba(0,0,0,0.8)`
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-cyan-400" />
          <span className="text-xs font-bold text-white font-mono truncate max-w-[140px]">
            @{username}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white shadow-inner relative">
          <QRCodeSVG value={donateUrl} size={Math.min(qrSize, 140)} level="H" includeMargin={false} />
        </div>

        <span className="text-[10px] font-mono font-bold text-cyan-400 mt-2 uppercase tracking-wider">
          {customTitle || 'Scan to Tip'}
        </span>
      </div>
    );
  }

  // =========================================================================
  // THEME 3: CYBER NEON (DEFAULT - Full Streamer Studio Aesthetic)
  // =========================================================================
  return (
    <div
      className="relative p-5 rounded-3xl bg-[#090E1A]/90 border border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-between text-center select-none max-w-[300px] transition-all duration-300"
      style={{
        borderColor: `${effectiveAccentColor}40`,
        boxShadow: `0 0 35px ${effectiveAccentColor}20, 0 15px 40px rgba(0,0,0,0.85)`
      }}
    >
      {/* Corner Cyberpunk Accent Brackets */}
      <div
        className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 rounded-tl pointer-events-none"
        style={{ borderColor: effectiveAccentColor }}
      />
      <div
        className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 rounded-tr pointer-events-none"
        style={{ borderColor: effectiveAccentColor }}
      />
      <div
        className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 rounded-bl pointer-events-none"
        style={{ borderColor: effectiveAccentColor }}
      />
      <div
        className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 rounded-br pointer-events-none"
        style={{ borderColor: effectiveAccentColor }}
      />

      {/* Top Header: Creator Profile */}
      <div className="flex flex-col items-center gap-1.5 mb-3.5 w-full">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-2xl p-0.5 overflow-hidden shadow-lg transition-transform"
            style={{
              background: `linear-gradient(135deg, ${effectiveAccentColor}, #EC4899)`
            }}
          >
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover rounded-[14px] bg-slate-900"
            />
          </div>
          {streamer?.isVerified && (
            <span
              className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950 text-cyan-400 shadow-sm"
              title="Verified Streamer"
            >
              <BadgeCheck size={14} className="fill-cyan-400/20" />
            </span>
          )}
        </div>

        <div className="min-w-0 px-2">
          <h4 className="text-sm font-extrabold text-white font-['Chakra_Petch'] truncate flex items-center justify-center gap-1">
            <span>{displayName}</span>
          </h4>
          <span className="text-[11px] font-mono text-cyan-400 font-semibold block">
            @{username}
          </span>
        </div>
      </div>

      {/* QR Code Container with High Scan Contrast & Scanning Laser Effect */}
      <div className="relative p-3.5 rounded-2xl bg-white shadow-[0_4px_25px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden">
        <QRCodeSVG
          value={donateUrl}
          size={qrSize}
          level="H"
          includeMargin={false}
          className="rounded-lg"
        />

        {/* Center Creator Logo Icon Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-lg overflow-hidden border border-slate-200/90 flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        </div>

        {/* Subtle Animated Futuristic Laser Scanline */}
        {showScanline && !activeAlert && (
          <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent shadow-[0_0_8px_#00F0FF] animate-bounce pointer-events-none" />
        )}

        {/* Realtime Live Tip Reaction Popover */}
        {activeAlert && (
          <div className="absolute inset-0 bg-[#090E1A]/95 rounded-2xl flex flex-col items-center justify-center p-3 animate-fadeIn text-center border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <Heart size={26} className="text-pink-400 fill-pink-400 animate-pulse mb-1" />
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
              New Tip Received!
            </span>
            <span className="text-xs font-extrabold text-white font-['Chakra_Petch'] truncate max-w-full">
              {activeAlert.donorName}
            </span>
            <span className="text-sm font-black font-mono text-cyan-300 mt-0.5">
              {activeAlert.currency === 'KHR'
                ? `${activeAlert.amount.toLocaleString()} ៛`
                : `$${Number(activeAlert.amount).toFixed(2)}`}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Footer: Call to Action & Payment Trust Badges */}
      <div className="mt-3.5 w-full space-y-1.5">
        <div className="flex items-center justify-center gap-1.5 text-xs font-black font-['Chakra_Petch'] uppercase tracking-wider text-white">
          <Sparkles size={13} className="text-pink-400" />
          <span>{customTitle || 'Scan to Send Tip'}</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shadow-sm">
            ABA PAY
          </span>
          <span className="text-slate-600 font-bold">•</span>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-red-950/80 text-red-300 border border-red-800/60 shadow-sm">
            BAKONG KHQR
          </span>
        </div>

        <p className="text-[9px] font-mono text-slate-500 pt-0.5">
          Zero-delay on-screen alert &amp; Khmer TTS
        </p>
      </div>
    </div>
  );
};
