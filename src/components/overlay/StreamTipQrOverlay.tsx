'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

interface StreamTipQrOverlayProps {
  token: string;
}

interface StreamerData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  overlayToken: string;
  donateUrl: string;
}

const KHQR_RED = '#E1232E';

/**
 * Tip QR overlay (OBS browser source).
 * Generates a KHQR-styled card whose QR code encodes the streamer's tip page URL,
 * rendered on a fully transparent background with a "Scan Me" caption underneath.
 */
export const StreamTipQrOverlay: React.FC<StreamTipQrOverlayProps> = ({ token }) => {
  const [searchParams] = useSearchParams();
  const sizeParam = Number(searchParams.get('size'));
  const qrSize = !isNaN(sizeParam) && sizeParam > 80 ? sizeParam : 220;

  const [streamer, setStreamer] = useState<StreamerData | null>(null);
  const [loading, setLoading] = useState(true);

  // Force transparent page background for the browser source window
  useEffect(() => {
    const prevHtml = document.documentElement.style.background;
    const prevBody = document.body.style.background;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    return () => {
      document.documentElement.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, []);

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

  // Always use the public frontend origin so the scanned link opens the tip page
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const donateUrl = useMemo(() => {
    if (streamer?.username) return `${origin}/@${streamer.username}`;
    if (streamer?.donateUrl) return streamer.donateUrl;
    return `${origin}/donate`;
  }, [streamer, origin]);

  if (loading) return null;

  const displayName = streamer?.displayName || streamer?.username || 'Streamer';
  const cardWidth = qrSize + 48;
  const badgeSize = Math.round(qrSize * 0.2);

  return (
    <div className="flex flex-col items-center justify-center p-3 select-none bg-transparent">
      {/* Generated KHQR card */}
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
        style={{ width: cardWidth }}
      >
        {/* Red KHQR header with folded corner */}
        <div
          className="relative flex items-center justify-center"
          style={{ background: KHQR_RED, height: Math.round(cardWidth * 0.18) }}
        >
          <span
            className="text-white font-black tracking-wider"
            style={{ fontSize: Math.round(cardWidth * 0.095), fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            KHQR
          </span>
          <div
            className="absolute bottom-0 right-0 bg-white"
            style={{
              width: Math.round(cardWidth * 0.1),
              height: Math.round(cardWidth * 0.1),
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)'
            }}
          />
        </div>

        {/* Name */}
        <div className="px-6 pt-4 pb-3">
          <div
            className="text-slate-900 font-bold truncate"
            style={{ fontSize: Math.max(13, Math.round(cardWidth * 0.06)), fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {displayName}
          </div>
        </div>

        {/* Dashed separator */}
        <div className="border-t-2 border-dashed border-slate-300 mx-0" />

        {/* QR code (encodes the tip page URL) */}
        <div className="relative flex items-center justify-center px-6 py-5">
          <QRCodeSVG value={donateUrl} size={qrSize} level="H" includeMargin={false} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full flex items-center justify-center border-[3px] border-white"
              style={{ width: badgeSize, height: badgeSize, background: KHQR_RED }}
            >
              <span
                className="text-white font-black"
                style={{ fontSize: Math.round(badgeSize * 0.55), fontFamily: 'Arial, Helvetica, sans-serif' }}
              >
                ៛
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-center">
        <span className="text-xl font-black font-['Chakra_Petch'] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] uppercase tracking-widest">
          Scan Me
        </span>
      </div>
    </div>
  );
};
