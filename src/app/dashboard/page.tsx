'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardPage, DashboardTab } from '@/views/DashboardPage';
import { authService } from '@/services/authService';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract tab and id gracefully, handling both ?tab=donation&id={id} and ?tab=donation?id={id}
  let rawTab = searchParams.get('tab') || '';
  let id = searchParams.get('id') || '';

  if (rawTab.includes('?id=')) {
    const parts = rawTab.split('?id=');
    rawTab = parts[0];
    id = parts[1];
  } else if (rawTab.includes('&id=')) {
    const parts = rawTab.split('&id=');
    rawTab = parts[0];
    id = parts[1];
  }

  // If id is provided without tab or with default, activate donation tab
  if (!rawTab && id) {
    rawTab = 'donation';
  }

  // Normalize tab
  let tab: DashboardTab = (rawTab as DashboardTab) || 'overview';
  if (rawTab === 'alerts' || rawTab === 'donations') {
    tab = 'donation';
  }

  const handleNavigate = (page: string) => {
    if (page === 'home') router.push('/');
    else if (page === 'login') authService.initiateGoogleOAuth();
    else if (page === 'pricing') router.push('/pricing');
    else router.push(`/${page}`);
  };

  return (
    <DashboardPage
      onNavigate={handleNavigate}
      initialTab={tab}
      initialSelectedId={id || undefined}
    />
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-[#070A12] flex flex-col items-center justify-center text-cyan-400 gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider text-slate-400">LOADING DASHBOARD...</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
