'use client';

import React from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const pathname = location.pathname;
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
      !['/login', '/pricing', '/documents', '/docs', '/discord', '/resources', '/dashboard', '/overlay'].some((p) =>
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
      <Footer />
    </div>
  );
};
