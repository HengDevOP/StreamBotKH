'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { LeaderboardTemplateRenderer, LeaderboardDonor } from './leaderboardTemplates';

interface StreamLeaderboardOverlayProps {
  token: string;
}

export const StreamLeaderboardOverlay: React.FC<StreamLeaderboardOverlayProps> = ({ token }) => {
  const { socket, joinOverlayRoom } = useSocket();

  const [title, setTitle] = useState('TOP SUPPORTERS');
  const [period, setPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [maxRows, setMaxRows] = useState(3); // Default 3
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [templateStyle, setTemplateStyle] = useState('cyber-neon');
  const [showBackground, setShowBackground] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);
  const [showRankBadges, setShowRankBadges] = useState(true);
  const [fontFamily, setFontFamily] = useState('Chakra Petch');
  const [topDonors, setTopDonors] = useState<LeaderboardDonor[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [overtakingDonorName, setOvertakingDonorName] = useState<string | null>(null);

  const prevDonorsRef = useRef<LeaderboardDonor[]>([]);
  const overtakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerOvertakeAnimation = (name: string) => {
    if (overtakeTimerRef.current) {
      clearTimeout(overtakeTimerRef.current);
    }
    setOvertakingDonorName(name);
    overtakeTimerRef.current = setTimeout(() => {
      setOvertakingDonorName(null);
    }, 4500);
  };

  // 1. Fetch initial leaderboard settings & top donors
  const fetchLeaderboardData = () => {
    const url = `/api/widgets/leaderboard?token=${token || 'demo-token'}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setIsLocked(false);
        if (data.success && data.leaderboard) {
          const lb = data.leaderboard;
          setTitle(lb.title || 'TOP SUPPORTERS');
          setPeriod(lb.period || 'all');
          setMaxRows(lb.maxRows || 3);
          setAccentColor(lb.accentColor || '#F59E0B');
          setTemplateStyle(lb.templateStyle || 'cyber-neon');
          setShowBackground(lb.showBackground !== false);
          setShowAnimation(lb.showAnimation !== false);
          setShowRankBadges(lb.showRankBadges !== false);
          setFontFamily(lb.fontFamily || 'Chakra Petch');
        }
        if (data.success && data.topDonors) {
          const nextDonors: LeaderboardDonor[] = data.topDonors;
          const prev = prevDonorsRef.current;
          if (prev.length > 0 && nextDonors.length > 0) {
            // Check if any donor overtook another in rank
            for (const curr of nextDonors) {
              const old = prev.find((p) => p.name.toLowerCase() === curr.name.toLowerCase());
              if (old && curr.rank < old.rank) {
                triggerOvertakeAnimation(curr.name);
                break;
              } else if (!old && curr.rank <= 3 && prev.length >= 2) {
                triggerOvertakeAnimation(curr.name);
                break;
              }
            }
          }
          prevDonorsRef.current = nextDonors;
          setTopDonors(nextDonors);
        }
      })
      .catch((e) => console.error('[Leaderboard Overlay] Fetch error:', e));
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [token]);

  // 2. Join Socket.IO overlay room
  useEffect(() => {
    if (token) {
      joinOverlayRoom(token);
    }
  }, [token, joinOverlayRoom]);

  // 3. Listen for real-time leaderboard setting updates & new donations
  useEffect(() => {
    if (!socket) return;

    const handleLeaderboardUpdate = (payload: any) => {
      if (!payload) return;
      if (payload.title !== undefined) setTitle(payload.title);
      if (payload.period !== undefined) setPeriod(payload.period);
      if (payload.maxRows !== undefined) setMaxRows(payload.maxRows);
      if (payload.accentColor) setAccentColor(payload.accentColor);
      if (payload.templateStyle) setTemplateStyle(payload.templateStyle);
      if (payload.showBackground !== undefined) setShowBackground(payload.showBackground);
      if (payload.showAnimation !== undefined) setShowAnimation(payload.showAnimation);
      if (payload.showRankBadges !== undefined) setShowRankBadges(payload.showRankBadges);
      if (payload.fontFamily) setFontFamily(payload.fontFamily);

      // Re-fetch donors in case period or maxRows changed
      fetchLeaderboardData();
    };

    const handleNewDonation = () => {
      // Refresh rankings on new tip
      setTimeout(() => {
        fetchLeaderboardData();
      }, 500);
    };

    const handleOvertake = (payload: any) => {
      if (payload?.donorName) {
        triggerOvertakeAnimation(payload.donorName);
      }
    };

    socket.on('leaderboard:update', handleLeaderboardUpdate);
    socket.on('donation:paid', handleNewDonation);
    socket.on('donation:alert', handleNewDonation);
    socket.on('leaderboard:overtake', handleOvertake);

    return () => {
      socket.off('leaderboard:update', handleLeaderboardUpdate);
      socket.off('donation:paid', handleNewDonation);
      socket.off('donation:alert', handleNewDonation);
      socket.off('leaderboard:overtake', handleOvertake);
    };
  }, [socket, token]);

  if (isLocked) {
    return <div className="w-full h-full bg-transparent" />;
  }

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col items-center justify-center p-4 select-none">
      <LeaderboardTemplateRenderer
        templateStyle={templateStyle}
        title={title}
        period={period}
        topDonors={topDonors}
        accentColor={accentColor}
        showBackground={showBackground}
        showAnimation={showAnimation}
        showRankBadges={showRankBadges}
        maxRows={maxRows}
        fontFamily={fontFamily}
        overtakingDonorName={overtakingDonorName}
      />
    </div>
  );
};
