'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isOverlay = pathname?.startsWith('/overlay');
  const isDashboard = pathname?.startsWith('/dashboard');

  if (isOverlay) {
    return (
      <main className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #__next, main {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
          }
        `}} />
        {children}
      </main>
    );
  }

  // Pure Full-Screen Responsive Application for Dashboard (Navbar hidden)
  if (isDashboard) {
    return (
      <main className="w-full h-screen h-[100dvh] overflow-hidden bg-[#060911] text-slate-100 flex flex-col">
        {children}
      </main>
    );
  }

  // Plain donation page without navbar or footer
  const isDonate =
    pathname?.startsWith('/donate') ||
    (!!pathname &&
      pathname !== '/' &&
      !['/login', '/pricing', '/discord', '/resources', '/dashboard', '/overlay'].some((p) =>
        pathname.startsWith(p)
      ));

  if (isDonate) {
    return (
      <main className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-slate-100">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-800/80 bg-[#06080F] py-8 text-center text-xs text-slate-400 space-y-2 font-mono">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="font-bold text-slate-200">STREAMBOTKH.COM</span>
          <span>•</span>
          <span>ABA PAYWAY & BAKONG KHQR OVERLAY ENGINE</span>
        </div>
        <p className="text-slate-400 text-[11px]">
          Empowering live streamers across Cambodia with zero-latency tip alerts and Telegram notifications.
        </p>
      </footer>
    </div>
  );
};
