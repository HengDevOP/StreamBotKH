'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
const joinedOverlayTokens = new Set<string>();
const joinedDashboardIds = new Set<string>();

function getGlobalSocket(): Socket {
  if (!globalSocket && typeof window !== 'undefined') {
    globalSocket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['polling', 'websocket'], // Start with HTTP polling handshake -> smooth WebSocket upgrade
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
      setConnected(true);
      joinedOverlayTokens.clear();
      joinedDashboardIds.clear();

      // Auto-rejoin rooms on reconnect or server restart so overlay never goes silent
      if (lastJoinedOverlayToken) {
        joinedOverlayTokens.add(lastJoinedOverlayToken);
        s.emit('join:overlay', { overlayToken: lastJoinedOverlayToken });
      }
      if (lastJoinedStreamerId) {
        joinedDashboardIds.add(lastJoinedStreamerId);
        s.emit('join:dashboard', { streamerId: lastJoinedStreamerId });
      }
    };

    const onDisconnect = () => {
      setConnected(false);
      joinedOverlayTokens.clear();
      joinedDashboardIds.clear();
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // If socket is already connected when this component mounts, ensure rooms are joined once!
    if (s.connected) {
      if (lastJoinedOverlayToken && !joinedOverlayTokens.has(lastJoinedOverlayToken)) {
        joinedOverlayTokens.add(lastJoinedOverlayToken);
        s.emit('join:overlay', { overlayToken: lastJoinedOverlayToken });
      }
      if (lastJoinedStreamerId && !joinedDashboardIds.has(lastJoinedStreamerId)) {
        joinedDashboardIds.add(lastJoinedStreamerId);
        s.emit('join:dashboard', { streamerId: lastJoinedStreamerId });
      }
    }

    // Unbind listeners on unmount without destroying the active socket connection
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const joinOverlayRoom = useCallback((overlayToken: string) => {
    if (!overlayToken) return;
    lastJoinedOverlayToken = overlayToken;
    const s = getGlobalSocket();

    // Deduplicate: If socket is connected and already joined this token, do not emit again
    if (s && s.connected) {
      if (joinedOverlayTokens.has(overlayToken)) {
        return;
      }
      joinedOverlayTokens.add(overlayToken);
      s.emit('join:overlay', { overlayToken });
    }
  }, []);

  const joinDashboardRoom = useCallback((streamerId: string) => {
    if (!streamerId) return;
    lastJoinedStreamerId = streamerId;
    const s = getGlobalSocket();

    // Deduplicate: If socket is connected and already joined this streamerId, do not emit again
    if (s && s.connected) {
      if (joinedDashboardIds.has(streamerId)) {
        return;
      }
      joinedDashboardIds.add(streamerId);
      s.emit('join:dashboard', { streamerId });
    }
  }, []);

  const triggerTestAlert = useCallback((overlayToken: string, payload: any) => {
    const s = getGlobalSocket();
    if (s && s.connected) {
      s.emit('trigger:test_alert', { overlayToken, ...payload });
    }
  }, []);

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
