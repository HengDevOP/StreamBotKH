import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/common/Navbar';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { OverlayPage } from './pages/OverlayPage';
import { DonatePage } from './pages/DonatePage';
import { LoginPage } from './pages/LoginPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { PricingPage } from './pages/PricingPage';
import { DiscordPage } from './pages/DiscordPage';

type PageRoute = 'home' | 'resources' | 'pricing' | 'discord' | 'dashboard' | 'donate' | 'login';

function MainRouter() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageRoute>('home');
  const [overlayToken, setOverlayToken] = useState<string | null>(null);
  const [donateUsername, setDonateUsername] = useState<string>('neonstreamer');

  // Parse path on initial load & popstate
  useEffect(() => {
    const handlePath = () => {
      const path = window.location.pathname;

      // 1. Overlay Route: /overlay/:token
      if (path.startsWith('/overlay/')) {
        const token = path.replace('/overlay/', '').trim();
        if (token) {
          setOverlayToken(token);
          return;
        }
      }

      // 2. Donate Route: /donate/:username or /@username
      if (path.startsWith('/donate/')) {
        const username = path.replace('/donate/', '').trim();
        if (username) {
          setDonateUsername(username);
          setCurrentPage('donate');
          return;
        }
      } else if (path.startsWith('/@')) {
        const username = path.replace('/@', '').trim();
        if (username) {
          setDonateUsername(username);
          setCurrentPage('donate');
          return;
        }
      }

      // 3. Dedicated Route Pages
      if (path === '/resources') {
        setCurrentPage('resources');
        return;
      }

      if (path === '/pricing') {
        setCurrentPage('pricing');
        return;
      }

      if (path === '/discord') {
        setCurrentPage('discord');
        return;
      }

      // 4. Dashboard
      if (path === '/dashboard') {
        setCurrentPage('dashboard');
        return;
      }

      // 5. Login
      if (path === '/login') {
        setCurrentPage('login');
        return;
      }

      // Default home
      setCurrentPage('home');
    };

    handlePath();
    window.addEventListener('popstate', handlePath);
    return () => window.removeEventListener('popstate', handlePath);
  }, []);

  const navigate = (page: string, params?: any) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home') {
      window.history.pushState({}, '', '/');
      setCurrentPage('home');
    } else if (page === 'resources') {
      window.history.pushState({}, '', '/resources');
      setCurrentPage('resources');
    } else if (page === 'pricing') {
      window.history.pushState({}, '', '/pricing');
      setCurrentPage('pricing');
    } else if (page === 'discord') {
      window.history.pushState({}, '', '/discord');
      setCurrentPage('discord');
    } else if (page === 'dashboard') {
      window.history.pushState({}, '', '/dashboard');
      setCurrentPage('dashboard');
    } else if (page === 'donate') {
      const u = params?.username || user?.username || 'neonstreamer';
      window.history.pushState({}, '', `/@${u}`);
      setDonateUsername(u);
      setCurrentPage('donate');
    } else if (page === 'login') {
      window.history.pushState({}, '', '/login');
      setCurrentPage('login');
    }
  };

  // If in OBS Overlay route, render ONLY the transparent overlay without surrounding UI!
  if (overlayToken) {
    return <OverlayPage token={overlayToken} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-slate-100">
      <Navbar onNavigate={navigate} currentPage={currentPage} />

      <main className="flex-1">
        {currentPage === 'home' && <HomePage onNavigate={navigate} />}
        {currentPage === 'resources' && <ResourcesPage onNavigate={navigate} />}
        {currentPage === 'pricing' && <PricingPage onNavigate={navigate} />}
        {currentPage === 'discord' && <DiscordPage onNavigate={navigate} />}
        {currentPage === 'dashboard' && <DashboardPage onNavigate={navigate} />}
        {currentPage === 'donate' && <DonatePage username={donateUsername} onNavigate={navigate} />}
        {currentPage === 'login' && <LoginPage onSuccess={() => navigate('dashboard')} />}
      </main>

      {/* Clean Minimalist Footer without heavy fuzzy shadows */}
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
}

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainRouter />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
