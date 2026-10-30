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

/**
 * Tip QR overlay (OBS browser source).
 * Generates a plain QR code that encodes the streamer's tip page URL,
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

  return (
    <div className="flex flex-col items-center justify-center p-3 select-none bg-transparent">
      {/* Generated QR (encodes the tip page URL) */}
      <div className="p-3 rounded-xl bg-white">
        <QRCodeSVG value={donateUrl} size={qrSize} level="H" includeMargin={false} />
      </div>

      <div className="mt-3 text-center">
        <span className="text-xl font-black font-['Chakra_Petch'] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] uppercase tracking-widest">
          Scan Me
        </span>
      </div>
    </div>
  );
};
