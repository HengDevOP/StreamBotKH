'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { GoalTemplateRenderer } from './goalTemplates';

interface StreamGoalOverlayProps {
  token: string;
  goalId?: string;
}

export const StreamGoalOverlay: React.FC<StreamGoalOverlayProps> = ({ token, goalId }) => {
  const { socket, joinOverlayRoom } = useSocket();

  const [title, setTitle] = useState('Livestream Donation Goal');
  const [targetAmount, setTargetAmount] = useState(200.0);
  const [currentAmount, setCurrentAmount] = useState(78.5);
  const [accentColor, setAccentColor] = useState('#10B981');
  const [templateStyle, setTemplateStyle] = useState('cyber-neon');
  const [showBalance, setShowBalance] = useState(true);
  const [showBackground, setShowBackground] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [recentDonor, setRecentDonor] = useState<string | null>(null);
  const [addedAmount, setAddedAmount] = useState<number | null>(null);

  // 1. Fetch initial goal data from API
  useEffect(() => {
    const url = `/api/widgets/goals?token=${token || 'demo-token'}${goalId ? `&goalId=${goalId}` : ''}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const g = data.goal || data.activeGoal;
          if (g) {
            setTitle(g.title || 'Livestream Donation Goal');
            setTargetAmount(Number(g.targetAmount) || 100.0);
            setCurrentAmount(Number(g.currentAmount) || 0.0);
            setAccentColor(g.accentColor || '#10B981');
            setTemplateStyle(g.templateStyle || 'cyber-neon');
            if (g.showBalance !== undefined) setShowBalance(g.showBalance);
            if (g.showBackground !== undefined) setShowBackground(g.showBackground);
            if (g.showAnimation !== undefined) setShowAnimation(g.showAnimation);
            setEndDate(g.endDate || null);
          }
        }
      })
      .catch((e) => console.error('[Goal Overlay] Error fetching goal:', e));
  }, [token, goalId]);

  // 2. Join Socket.IO overlay room
  useEffect(() => {
    if (token) {
      joinOverlayRoom(token);
    }
  }, [token, joinOverlayRoom]);

  // 3. Listen for real-time goal updates
  useEffect(() => {
    if (!socket) return;

    const handleGoalUpdate = (payload: any) => {
      if (!payload) return;
      if (goalId && payload.id && payload.id !== goalId) return;

      if (payload.title !== undefined) setTitle(payload.title);
      if (payload.targetAmount !== undefined) setTargetAmount(Number(payload.targetAmount));
      if (payload.currentAmount !== undefined) setCurrentAmount(Number(payload.currentAmount));
      if (payload.accentColor) setAccentColor(payload.accentColor);
      if (payload.templateStyle) setTemplateStyle(payload.templateStyle);
      if (payload.showBalance !== undefined) setShowBalance(payload.showBalance);
      if (payload.showBackground !== undefined) setShowBackground(payload.showBackground);
      if (payload.showAnimation !== undefined) setShowAnimation(payload.showAnimation);
      if (payload.endDate !== undefined) setEndDate(payload.endDate);

      if (payload.donorName && payload.addedAmount) {
        setRecentDonor(payload.donorName);
        setAddedAmount(Number(payload.addedAmount));
        setTimeout(() => {
          setRecentDonor(null);
          setAddedAmount(null);
        }, 5000);
      }
    };

    socket.on('goal:update', handleGoalUpdate);

    return () => {
      socket.off('goal:update', handleGoalUpdate);
    };
  }, [socket, goalId]);

  return (
    <div className="w-full min-h-screen bg-transparent flex items-center justify-center p-6 select-none overflow-hidden">
      <GoalTemplateRenderer
        title={title}
        targetAmount={targetAmount}
        currentAmount={currentAmount}
        accentColor={accentColor}
        templateStyle={templateStyle}
        showBalance={showBalance}
        showBackground={showBackground}
        showAnimation={showAnimation}
        endDate={endDate}
        recentDonor={recentDonor}
        addedAmount={addedAmount}
      />
    </div>
  );
};
