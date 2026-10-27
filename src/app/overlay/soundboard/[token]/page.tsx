'use client';

import { useParams } from 'next/navigation';
import { StreamSoundboardOverlay } from '@/components/overlay/StreamSoundboardOverlay';

export default function SoundboardOverlayPage() {
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
      <StreamSoundboardOverlay token={token} />
    </>
  );
}
