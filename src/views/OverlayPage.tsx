'use client';

import React from 'react';
import { AlertBoxOverlay } from '../components/overlay/AlertBoxOverlay';

interface OverlayPageProps {
  token: string;
  mode?: 'all' | 'video-only' | 'alert-only';
  boxId?: string;
}

export const OverlayPage: React.FC<OverlayPageProps> = ({ token, mode = 'all', boxId }) => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay">
      <AlertBoxOverlay overlayToken={token} mode={mode} boxId={boxId} />
    </div>
  );
};
