'use client';

import React from 'react';
import { AlertBoxOverlay } from '../components/overlay/AlertBoxOverlay';

interface OverlayPageProps {
  token: string;
  mode?: 'all' | 'video-only' | 'alert-only';
}

export const OverlayPage: React.FC<OverlayPageProps> = ({ token, mode = 'all' }) => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay">
      <AlertBoxOverlay overlayToken={token} mode={mode} />
    </div>
  );
};
