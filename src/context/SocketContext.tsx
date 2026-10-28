'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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

    const onConnect = () => {
      console.log('⚡ [Socket] Connected to streambotkh gateway:', s.id);
      setConnected(true);
    };

    const onDisconnect = () => {
      console.log('⚡ [Socket] Disconnected from gateway');
      setConnected(false);
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // Unbind listeners on unmount without destroying the active socket connection
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, []);

  const joinOverlayRoom = (overlayToken: string) => {
    if (socket && overlayToken) {
      socket.emit('join:overlay', { overlayToken });
    }
  };

  const joinDashboardRoom = (streamerId: string) => {
    if (socket && streamerId) {
      socket.emit('join:dashboard', { streamerId });
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
