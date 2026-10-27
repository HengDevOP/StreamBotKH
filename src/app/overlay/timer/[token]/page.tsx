'use client';

import { useParams } from 'next/navigation';
import { StreamTimerOverlay } from '@/components/overlay/StreamTimerOverlay';

export default function TimerOverlayPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #__next, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}} />
      <StreamTimerOverlay token={token} />
    </>
  );
}
