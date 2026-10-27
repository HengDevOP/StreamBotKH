'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { StreamGoalOverlay } from '@/components/overlay/StreamGoalOverlay';

export default function WidgetGoalOverlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = (params?.token as string) || '';
  const goalId = searchParams.get('goalId') || undefined;

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
      <StreamGoalOverlay token={token} goalId={goalId} />
    </>
  );
}
