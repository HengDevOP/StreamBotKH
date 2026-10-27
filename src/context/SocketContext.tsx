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

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Connect to current host
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      console.log('⚡ [Socket] Connected to streambotkh gateway:', s.id);
      setConnected(true);
    });

    s.on('disconnect', () => {
      console.log('⚡ [Socket] Disconnected from gateway');
      setConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
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
