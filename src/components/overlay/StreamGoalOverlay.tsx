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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasGoal, setHasGoal] = useState<boolean>(false);
  const [title, setTitle] = useState('Livestream Donation Goal');
  const [targetAmount, setTargetAmount] = useState(100.0);
  const [currentAmount, setCurrentAmount] = useState(0.0);
  const [accentColor, setAccentColor] = useState('#10B981');
  const [templateStyle, setTemplateStyle] = useState('cyber-neon');
  const [showBalance, setShowBalance] = useState(true);
  const [showBackground, setShowBackground] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showGradientShader, setShowGradientShader] = useState(true);
  const [goalWidth, setGoalWidth] = useState<number>(500);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // 1. Fetch initial goal data from API - await until verified backend response before rendering
  useEffect(() => {
    let isMounted = true;
    const url = `/api/widgets/goals?token=${token || 'demo-token'}${goalId ? `&goalId=${goalId}` : ''}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.isLocked || !data.success) {
          setIsLocked(true);
          setIsLoading(false);
          return;
        }
        setIsLocked(false);
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
            if (g.showGradientShader !== undefined) setShowGradientShader(g.showGradientShader);
            if (g.goalWidth !== undefined) setGoalWidth(Number(g.goalWidth));
            else if (g.width !== undefined) setGoalWidth(Number(g.width));
            setEndDate(g.endDate || null);
            setHasGoal(true);
          } else {
            setHasGoal(false);
          }
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error('[Goal Overlay] Error fetching goal:', e);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
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

      setHasGoal(true);
      setIsLoading(false);

      if (payload.title !== undefined) setTitle(payload.title);
      if (payload.targetAmount !== undefined) setTargetAmount(Number(payload.targetAmount));
      if (payload.currentAmount !== undefined) setCurrentAmount(Number(payload.currentAmount));
      if (payload.accentColor) setAccentColor(payload.accentColor);
      if (payload.templateStyle) setTemplateStyle(payload.templateStyle);
      if (payload.showBalance !== undefined) setShowBalance(payload.showBalance);
      if (payload.showBackground !== undefined) setShowBackground(payload.showBackground);
      if (payload.showAnimation !== undefined) setShowAnimation(payload.showAnimation);
      if (payload.showGradientShader !== undefined) setShowGradientShader(payload.showGradientShader);
      if (payload.goalWidth !== undefined) setGoalWidth(Number(payload.goalWidth));
      else if (payload.width !== undefined) setGoalWidth(Number(payload.width));
      if (payload.endDate !== undefined) setEndDate(payload.endDate);
    };

    socket.on('goal:update', handleGoalUpdate);

    return () => {
      socket.off('goal:update', handleGoalUpdate);
    };
  }, [socket, goalId]);

  // Stay transparent while awaiting backend response or if locked/no-goal, preventing flash of default template
  if (isLoading || isLocked || !hasGoal) {
    return <div className="w-full h-full bg-transparent" />;
  }

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
        showGradientShader={showGradientShader}
        endDate={endDate}
        width={goalWidth}
      />
    </div>
  );
};
