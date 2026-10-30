'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OverlayPage } from '@/views/OverlayPage';

export default function DedicatedBoxOverlayPage() {
  const params = useParams();
  const boxId = (params?.boxId as string) || '';
  const [overlayToken, setOverlayToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boxId) return;
    fetch(`/api/alert-boxes/${boxId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.overlayToken) {
          setOverlayToken(data.overlayToken);
        } else if (data.success && data.alertBox?.userId) {
          setOverlayToken(data.overlayToken || data.alertBox?.overlayToken || 'demo-token');
        } else {
          setError(data.error || 'Alert box not found');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [boxId]);

  if (loading) return null;
  if (error || !overlayToken) {
    return (
      <div className="w-full h-full min-h-screen flex items-center justify-center text-xs font-mono text-red-400 bg-transparent">
        {error || 'Invalid Alert Box'}
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #__next, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}} />
      <OverlayPage token={overlayToken} mode="alert-only" boxId={boxId} />
    </>
  );
}
