'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { mediaService } from '../services/mediaService';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinOverlayRoom: (overlayToken: string) => void;
  joinDashboardRoom: (streamerId: string) => void;
  triggerTestAlert: (overlayToken: string, payload: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Maintain a global singleton socket instance across React re-renders & React 18 StrictMode mount/unmount cycles
let globalSocket: Socket | null = null;
let lastJoinedOverlayToken: string | null = null;
let lastJoinedStreamerId: string | null = null;

function getGlobalSocket(): Socket {
  if (!globalSocket && typeof window !== 'undefined') {
    globalSocket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Start with HTTP polling handshake -> smooth WebSocket upgrade (prevents connection abortion during React StrictMode)
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });
  }
  return globalSocket!;
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(() => (typeof window !== 'undefined' ? getGlobalSocket() : null));
  const [connected, setConnected] = useState<boolean>(() => Boolean(globalSocket?.connected));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const s = getGlobalSocket();
    setSocket(s);
    setConnected(s.connected);
    mediaService.attachSocket(s);

    const onConnect = () => {
      console.log('⚡ [Socket] Connected to streambotkh gateway:', s.id);
      setConnected(true);

      // Auto-rejoin rooms on reconnect or server restart so overlay never goes silent
      if (lastJoinedOverlayToken) {
        console.log('🔄 [Socket] Auto-rejoining overlay room on connect:', lastJoinedOverlayToken);
        s.emit('join:overlay', { overlayToken: lastJoinedOverlayToken });
      }
      if (lastJoinedStreamerId) {
        console.log('🔄 [Socket] Auto-rejoining dashboard room on connect:', lastJoinedStreamerId);
        s.emit('join:dashboard', { streamerId: lastJoinedStreamerId });
      }
    };

    const onDisconnect = () => {
      console.log('⚡ [Socket] Disconnected from gateway');
      setConnected(false);
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // If socket is already connected when this component mounts, ensure rooms are joined!
    if (s.connected) {
      if (lastJoinedOverlayToken) {
        s.emit('join:overlay', { overlayToken: lastJoinedOverlayToken });
      }
      if (lastJoinedStreamerId) {
        s.emit('join:dashboard', { streamerId: lastJoinedStreamerId });
      }
    }

    // Unbind listeners on unmount without destroying the active socket connection
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const joinOverlayRoom = (overlayToken: string) => {
    if (!overlayToken) return;
    lastJoinedOverlayToken = overlayToken;
    const s = socket || getGlobalSocket();
    if (s) {
      console.log('⚡ [SocketContext] joinOverlayRoom called for:', overlayToken);
      s.emit('join:overlay', { overlayToken });
    }
  };

  const joinDashboardRoom = (streamerId: string) => {
    if (!streamerId) return;
    lastJoinedStreamerId = streamerId;
    const s = socket || getGlobalSocket();
    if (s) {
      s.emit('join:dashboard', { streamerId });
    }
  };

  const triggerTestAlert = (overlayToken: string, payload: any) => {
    if (socket) {
      socket.emit('trigger:test_alert', { overlayToken, ...payload });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinOverlayRoom, joinDashboardRoom, triggerTestAlert }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
