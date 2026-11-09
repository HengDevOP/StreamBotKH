'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SubscribersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?tab=subscribers');
  }, [router]);

  return (
    <div className="w-full h-screen bg-[#070A12] flex flex-col items-center justify-center text-cyan-400 gap-3">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono tracking-wider text-slate-400">LOADING MEMBERSHIP DASHBOARD...</span>
    </div>
  );
}
