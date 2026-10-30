'use client';

import { useParams } from 'next/navigation';
import { OverlayPage } from '@/views/OverlayPage';

export default function AlertOverlayPage() {
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
      <OverlayPage token={token} mode="alert-only" />
    </>
  );
}
