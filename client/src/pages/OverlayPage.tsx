import React from 'react';
import { AlertBoxOverlay } from '../components/overlay/AlertBoxOverlay';

interface OverlayPageProps {
  token: string;
}

export const OverlayPage: React.FC<OverlayPageProps> = ({ token }) => {
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent">
      <AlertBoxOverlay overlayToken={token} />
    </div>
  );
};
