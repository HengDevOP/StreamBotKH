'use client';

import { useParams } from 'next/navigation';
import { StreamLeaderboardOverlay } from '@/components/overlay/StreamLeaderboardOverlay';

export default function LeaderboardWidgetPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        html, body, #__next, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `
        }}
      />
      <StreamLeaderboardOverlay token={token} />
    </>
  );
}
