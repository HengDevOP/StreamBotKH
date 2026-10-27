import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAlertQueue } from '../../hooks/useAlertQueue';
import { NeonAlertCard } from './NeonAlertCard';

interface AlertBoxOverlayProps {
  overlayToken: string;
}

export const AlertBoxOverlay: React.FC<AlertBoxOverlayProps> = ({ overlayToken }) => {
  const { socket, connected, joinOverlayRoom } = useSocket();
  const { currentAlert, pushAlert, queueLength } = useAlertQueue();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (overlayToken) {
      joinOverlayRoom(overlayToken);
      setReady(true);
    }
  }, [overlayToken, connected]);

  useEffect(() => {
    if (!socket) return;

    const handleAlert = (payload: any) => {
      console.log('⚡ [Overlay] Live donation alert received:', payload);
      pushAlert(payload);
    };

    socket.on('donation:alert', handleAlert);

    return () => {
      socket.off('donation:alert', handleAlert);
    };
  }, [socket, pushAlert]);

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative select-none">
      {/* Active Alert Rendering */}
      {currentAlert ? (
        <NeonAlertCard alert={currentAlert} />
      ) : (
        /* Hidden or subtle watermark only when not active */
        <div className="opacity-0 hover:opacity-40 transition-opacity text-[10px] font-mono text-slate-600 bg-black/40 px-2 py-1 rounded">
          StreamNeon.vip Overlay Active • Token: {overlayToken.slice(0, 8)}... {connected ? '🟢' : '🔴'}
        </div>
      )}

      {/* Queue Indicator for streamer testing */}
      {queueLength > 0 && (
        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300">
          Queued alerts: {queueLength}
        </div>
      )}
    </div>
  );
};
