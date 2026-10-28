import React from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ModalProvider } from './context/ModalContext';
import { Navbar } from './components/common/Navbar';
import { authService } from './services/authService';

// Page Views
import { HomePage } from './views/HomePage';
import { DashboardPage, DashboardTab } from './views/DashboardPage';
import { OverlayPage } from './views/OverlayPage';
import { DonatePage } from './views/DonatePage';
import { LoginPage } from './views/LoginPage';
import { ResourcesPage } from './views/ResourcesPage';
import { ResourceFeaturePage } from './views/ResourceFeaturePage';
import { PricingPage } from './views/PricingPage';
import { DiscordPage } from './views/DiscordPage';

// Overlay Widgets
import { StreamSoundboardOverlay } from './components/overlay/StreamSoundboardOverlay';
import { StreamGoalOverlay } from './components/overlay/StreamGoalOverlay';
import { StreamLeaderboardOverlay } from './components/overlay/StreamLeaderboardOverlay';
import { StreamTimerOverlay } from './components/overlay/StreamTimerOverlay';

// Wrapper for Dashboard Page reading query parameters (?tab=...&id=...)
function DashboardRouteWrapper() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  if (!rawTab && id) {
    rawTab = 'donation';
  }

  let tab: DashboardTab = (rawTab as DashboardTab) || 'overview';
  if (rawTab === 'alerts' || rawTab === 'donations') {
    tab = 'donation';
  }

  const handleNav = (page: string, params?: any) => {
    if (page === 'home') navigate('/');
    else if (page === 'login') authService.initiateGoogleOAuth();
    else if (page === 'donate') navigate(`/@${params?.username || 'neonstreamer'}`);
    else navigate(`/${page}`);
  };

  return (
    <DashboardPage
      onNavigate={handleNav}
      initialTab={tab}
      initialSelectedId={id || undefined}
    />
  );
}

// Wrapper for Donate Page reading route param :username
function DonateRouteWrapper() {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  // Strip leading @ if present in param
  const cleanUsername = (username || 'neonstreamer').replace(/^@/, '');

  return (
    <DonatePage
      username={cleanUsername}
      onNavigate={(page, params) => {
        if (page === 'login') {
          authService.initiateGoogleOAuth();
        } else if (page === 'donate') {
          navigate(`/@${params?.username || cleanUsername}`);
        } else {
          navigate(page === 'home' ? '/' : `/${page}`);
        }
      }}
    />
  );
}

// Wrapper for Overlay Alert Box
function OverlayRouteWrapper({ mode = 'all' }: { mode?: 'all' | 'video-only' | 'alert-only' }) {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <OverlayPage token={token || ''} mode={mode} />
    </div>
  );
}

// Wrapper for Soundboard Widget Overlay
function SoundboardOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamSoundboardOverlay token={token || ''} />
    </div>
  );
}

// Wrapper for Goal Widget Overlay
function GoalOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const goalId = searchParams.get('goalId') || undefined;

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamGoalOverlay token={token || ''} goalId={goalId} />
    </div>
  );
}

// Wrapper for Leaderboard Widget Overlay
function LeaderboardOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamLeaderboardOverlay token={token || ''} />
    </div>
  );
}

// Wrapper for Timer Widget Overlay
function TimerOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamTimerOverlay token={token || ''} />
    </div>
  );
}

// Layout wrapper determining whether to display Navbar and Footer
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const isOverlay = pathname.startsWith('/overlay') || pathname.startsWith('/widget');
  const isDashboard = pathname.startsWith('/dashboard');
  const isDonate = pathname.startsWith('/@') || pathname.startsWith('/donate');

  if (isOverlay) {
    return <main className="w-screen h-screen overflow-hidden bg-transparent m-0 p-0">{children}</main>;
  }

  if (isDashboard) {
    return (
      <main className="w-full h-screen h-[100dvh] overflow-hidden bg-[#060911] text-slate-100 flex flex-col">
        {children}
      </main>
    );
  }

  if (isDonate) {
    return (
      <main className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-slate-100">
      <Navbar
        onNavigate={(page, params) => {
          if (page === 'home') navigate('/');
          else if (page === 'login') authService.initiateGoogleOAuth();
          else if (page === 'donate') navigate(`/@${params?.username || 'neonstreamer'}`);
          else navigate(`/${page}`);
        }}
      />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-800/80 bg-[#06080F] py-8 text-center text-xs text-slate-400 space-y-2 font-mono">
        <div className="flex items-center justify-center gap-2.5">
          <img
            src="/images/logo-64.png"
            alt="streambotkh.com"
            className="w-5 h-5 object-contain"
          />
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

function AppRoutes() {
  const navigate = useNavigate();

  const handleNav = (page: string, params?: any) => {
    if (page === 'home') navigate('/');
    else if (page === 'login') authService.initiateGoogleOAuth();
    else if (page === 'donate') navigate(`/@${params?.username || 'neonstreamer'}`);
    else navigate(`/${page}`);
  };

  return (
    <AppLayout>
      <Routes>
        {/* Core Web Pages */}
        <Route path="/" element={<HomePage onNavigate={handleNav} />} />
        <Route path="/pricing" element={<PricingPage onNavigate={handleNav} />} />
        <Route path="/resources" element={<ResourcesPage onNavigate={handleNav} />} />
        <Route path="/resources/:featureSlug" element={<ResourceFeaturePage onNavigate={handleNav} />} />
        <Route path="/discord" element={<DiscordPage onNavigate={handleNav} />} />
        <Route path="/dashboard" element={<DashboardRouteWrapper />} />
        <Route path="/dashboard/*" element={<DashboardRouteWrapper />} />
        <Route path="/login" element={<LoginPage onSuccess={() => navigate('/dashboard')} />} />

        {/* Donation Pages */}
        <Route path="/donate" element={<DonateRouteWrapper />} />
        <Route path="/donate/:username" element={<DonateRouteWrapper />} />
        <Route path="/:username" element={<DonateRouteWrapper />} />

        {/* OBS Browser Source Overlays */}
        <Route path="/overlay/:token" element={<OverlayRouteWrapper mode="all" />} />
        <Route path="/overlay/video/:token" element={<OverlayRouteWrapper mode="video-only" />} />
        <Route path="/overlay/soundboard/:token" element={<SoundboardOverlayRouteWrapper />} />
        <Route path="/overlay/goal/:token" element={<GoalOverlayRouteWrapper />} />
        <Route path="/overlay/leaderboard/:token" element={<LeaderboardOverlayRouteWrapper />} />
        <Route path="/overlay/timer/:token" element={<TimerOverlayRouteWrapper />} />

        {/* Widget Aliases */}
        <Route path="/widget/soundboard/:token" element={<SoundboardOverlayRouteWrapper />} />
        <Route path="/widget/goal/:token" element={<GoalOverlayRouteWrapper />} />
        <Route path="/widget/leaderboard/:token" element={<LeaderboardOverlayRouteWrapper />} />
        <Route path="/widget/timer/:token" element={<TimerOverlayRouteWrapper />} />
      </Routes>
    </AppLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ModalProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ModalProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
