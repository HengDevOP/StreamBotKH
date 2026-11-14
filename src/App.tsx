import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ModalProvider } from './context/ModalContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ImpersonationBanner } from './components/common/ImpersonationBanner';
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
import { StatusPage } from './views/StatusPage';
import { MultiStreamPage } from './views/MultiStreamPage';
import { DocumentationPage } from './views/DocumentationPage';

// Overlay Widgets
import { StreamSoundboardOverlay } from './components/overlay/StreamSoundboardOverlay';
import { StreamGoalOverlay } from './components/overlay/StreamGoalOverlay';
import { StreamLeaderboardOverlay } from './components/overlay/StreamLeaderboardOverlay';
import { StreamTimerOverlay } from './components/overlay/StreamTimerOverlay';
import { PokemonStreamOverlay } from './components/overlay/PokemonStreamOverlay';
import { StreamTipQrOverlay } from './components/overlay/StreamTipQrOverlay';
import { StreamWheelOverlay } from './components/overlay/StreamWheelOverlay';
import { StreamChatOverlay } from './components/overlay/StreamChatOverlay';
import { CustomStreamOverlay } from './components/overlay/CustomStreamOverlay';
import { AvatarStreamOverlay } from './components/overlay/AvatarStreamOverlay';
import { StreamViewCountOverlay } from './components/overlay/StreamViewCountOverlay';

// Wrapper for Dashboard Page reading query parameters (?tab=...&id=...)
function DashboardRouteWrapper() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    document.title = 'StreamWidgets - Creator Panel';
  }, []);

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
  } else if (rawTab === 'users' || rawTab === 'admin-users') {
    tab = 'admin-users';
  } else if (rawTab === 'report-issue' || rawTab === 'support' || rawTab === 'tickets' || rawTab === 'ticket' || rawTab === 'support-tickets') {
    tab = 'support';
  } else if (rawTab === 'mailbox' || rawTab === 'mail' || rawTab === 'inbox') {
    tab = 'mailbox';
  } else if (rawTab === 'session-logs' || rawTab === 'admin-session-logs' || rawTab === 'logs') {
    tab = 'admin-session-logs';
  } else if (rawTab === 'ip-address' || rawTab === 'admin-ip-address' || rawTab === 'ips') {
    tab = 'admin-ip-address';
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
function OverlayRouteWrapper({ mode = 'all' }: { mode?: 'all' | 'video-only' | 'alert-only' | 'subscriber-only' }) {
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
  const { token, rank: routeRank } = useParams<{ token?: string; rank?: string }>();
  const [searchParams] = useSearchParams();
  const rawRank = routeRank || searchParams.get('rank');
  const parsedRank = rawRank && Number(rawRank) >= 1 ? Math.min(10, Math.floor(Number(rawRank))) : null;

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamLeaderboardOverlay token={token || ''} singleRank={parsedRank} />
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
      <StreamTimerOverlay token={token || 'demo-token'} />
    </div>
  );
}

// Wrapper for 2D Pokémon Stream Avatars Overlay
function PokemonOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0 flex flex-col justify-end">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <PokemonStreamOverlay token={token || ''} />
    </div>
  );
}

// Wrapper for Public Tip QR Code OBS Browser Source Overlay
function TipQrOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0 flex items-center justify-center">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamTipQrOverlay token={token || ''} />
    </div>
  );
}

// Wrapper for Spinning Wheel Widget Overlay
function WheelOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0 flex items-center justify-center">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamWheelOverlay token={token || 'demo-token'} />
    </div>
  );
}

// Wrapper for Live Chat OBS Browser Source Overlay
function ChatOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0 flex flex-col justify-end">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamChatOverlay token={token || 'demo-token'} />
    </div>
  );
}

// Wrapper for Custom Stream Overlay (Text Flow Animation & Live Goal)
function CustomOverlayRouteWrapper() {
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
      <CustomStreamOverlay token={token || 'demo-token'} />
    </div>
  );
}

// Wrapper for Stream Avatars Overlay
function AvatarOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0 flex flex-col justify-end">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <AvatarStreamOverlay token={token || 'demo-token'} />
    </div>
  );
}

// Wrapper for Concurrent View Count OBS Browser Source Overlay
function ViewCountOverlayRouteWrapper() {
  const { token } = useParams<{ token?: string }>();
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent obs-overlay m-0 p-0 flex items-center justify-start p-4">
      <style>{`
        html, body, #root, main {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
        }
      `}</style>
      <StreamViewCountOverlay token={token || 'demo-token'} />
    </div>
  );
}

// Layout wrapper determining whether to display Navbar and Footer
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [blockedIpInfo, setBlockedIpInfo] = React.useState<{ ip: string; reason: string } | null>(null);

  React.useEffect(() => {
    const handleIpBlocked = (e: Event) => {
      const custom = e as CustomEvent<{ ip: string; reason: string }>;
      if (custom.detail) {
        setBlockedIpInfo(custom.detail);
      }
    };
    window.addEventListener('streamneon:ip-blocked', handleIpBlocked);

    // Intercept ALL fetch() calls globally so any 403 { blocked: true } response immediately locks the UI
    const win = window as any;
    if (!win.__streamneonFetchPatched) {
      const nativeFetch = window.fetch.bind(window);
      win.__streamneonFetchPatched = true;
      window.fetch = async (...args: Parameters<typeof fetch>) => {
        const res = await nativeFetch(...args);
        if (res.status === 403) {
          try {
            const cloned = res.clone();
            const data = await cloned.json();
            if (data && data.blocked) {
              window.dispatchEvent(
                new CustomEvent('streamneon:ip-blocked', {
                  detail: {
                    ip: data.ip || 'Current IP',
                    reason: data.reason || data.error || 'Blocked by Administrator'
                  }
                })
              );
            }
          } catch {
            // Non-JSON 403 response
          }
        }
        return res;
      };
    }

    return () => window.removeEventListener('streamneon:ip-blocked', handleIpBlocked);
  }, []);

  // Verify IP access status on mount, route navigation, and periodic heartbeat across all pages
  React.useEffect(() => {
    let cancelled = false;
    const checkIpStatus = async () => {
      try {
        const res = await fetch('/api/security/ip-status', { credentials: 'include' });
        if (!cancelled && res.status === 403) {
          const data = await res.json().catch(() => ({}));
          if (data?.blocked) {
            setBlockedIpInfo({
              ip: data.ip || 'Current IP',
              reason: data.reason || 'Blocked by Administrator'
            });
          }
        }
      } catch {
        // Ignore transient network errors
      }
    };

    checkIpStatus();
    const timer = window.setInterval(checkIpStatus, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  React.useEffect(() => {
    if (pathname.startsWith('/creator') || pathname.startsWith('/dashboard')) {
      document.title = 'StreamWidgets - Creator Panel';
    } else if (pathname === '/pricing') {
      document.title = 'StreamWidgets - Pricing';
    } else if (pathname === '/') {
      document.title = 'StreamWidgets - Home';
    }

    if (pathname === '/') {
      // Landing page is strictly dark & radiant mode (no day/night mode)
      document.documentElement.classList.remove('light-mode');
    } else {
      try {
        const savedTheme = localStorage.getItem('streambot_theme_mode');
        if (savedTheme === 'light' && (pathname.startsWith('/creator') || pathname.startsWith('/dashboard') || pathname.startsWith('/documentation') || pathname.startsWith('/docs'))) {
          document.documentElement.classList.add('light-mode');
        } else {
          document.documentElement.classList.remove('light-mode');
        }
      } catch (e) {}
    }
  }, [pathname]);

  if (blockedIpInfo) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#090D16] text-slate-100 flex items-center justify-center p-6 select-none">
        <div className="max-w-md w-full bg-[#0B0F19] border border-rose-500/40 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold uppercase">
            403 • Access Restricted
          </div>
          <h1 className="text-xl font-bold text-white">Your IP Address Has Been Blocked</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your connection to this website and all services has been suspended by the platform security administrator. You cannot perform any actions while this block is active.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left font-mono text-xs space-y-1.5">
            <div className="text-slate-400">
              Client IP: <span className="text-white font-bold">{blockedIpInfo.ip}</span>
            </div>
            <div className="text-slate-400">
              Reason: <span className="text-rose-300 font-semibold">{blockedIpInfo.reason}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isOverlay = pathname.startsWith('/overlay') || pathname.startsWith('/widget');
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/creator');
  const isDonate = pathname.startsWith('/@') || pathname.startsWith('/donate');
  const isMultiStream = pathname === '/tv' || pathname.startsWith('/tv/') || pathname.startsWith('/tv?') || pathname === '/muti-stream' || pathname === '/multi-stream';
  const isDocumentation = pathname.startsWith('/documentation') || pathname.startsWith('/docs') || pathname.startsWith('/documents');

  if (isOverlay) {
    return <main className="w-screen h-screen overflow-hidden bg-transparent m-0 p-0">{children}</main>;
  }

  if (isMultiStream) {
    return (
      <main className="app-viewport-lock fixed inset-0 w-full h-[100dvh] overflow-hidden overscroll-none bg-[#060911] text-slate-100 m-0 p-0">
        {children}
      </main>
    );
  }

  if (isDashboard) {
    return (
      <main className="app-viewport-lock fixed inset-0 w-full h-[100dvh] overflow-hidden overscroll-none bg-[#060911] text-slate-100 flex flex-col">
        <ImpersonationBanner />
        {children}
      </main>
    );
  }

  if (isDonate) {
    return (
      <main className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col">
        <ImpersonationBanner />
        {children}
      </main>
    );
  }

  if (isDocumentation) {
    return (
      <main className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col m-0 p-0">
        <ImpersonationBanner />
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080D1A] text-slate-100">
      <ImpersonationBanner />
      <Navbar
        onNavigate={(page, params) => {
          if (page === 'home') navigate('/');
          else if (page === 'login') authService.initiateGoogleOAuth();
          else if (page === 'donate') navigate(`/@${params?.username || 'neonstreamer'}`);
          else if (page === 'dashboard' || page === 'creator') navigate('/creator');
          else navigate(`/${page}`);
        }}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  const handleNav = (page: string, params?: any) => {
    if (page === 'home') navigate('/');
    else if (page === 'login') authService.initiateGoogleOAuth();
    else if (page === 'donate') navigate(`/@${params?.username || 'neonstreamer'}`);
    else if (page === 'dashboard' || page === 'creator') navigate('/creator');
    else if (page === 'documentation' || page === 'documents' || page === 'docs') navigate('/documentation');
    else navigate(`/${page}`);
  };

  return (
    <AppLayout>
      <Routes>
        {/* Core Web Pages */}
        <Route path="/" element={<HomePage onNavigate={handleNav} />} />
        <Route path="/pricing" element={<PricingPage onNavigate={handleNav} />} />
        <Route path="/documentation" element={<DocumentationPage onNavigate={handleNav} />} />
        <Route path="/documentation/:docId" element={<DocumentationPage onNavigate={handleNav} />} />
        <Route path="/docs" element={<Navigate to="/documentation" replace />} />
        <Route path="/docs/*" element={<Navigate to="/documentation" replace />} />
        <Route path="/documents" element={<Navigate to="/documentation" replace />} />
        <Route path="/documents/*" element={<Navigate to="/documentation" replace />} />
        <Route path="/resources" element={<ResourcesPage onNavigate={handleNav} />} />
        <Route path="/resources/:featureSlug" element={<ResourceFeaturePage onNavigate={handleNav} />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/discord" element={<DiscordPage onNavigate={handleNav} />} />
        <Route path="/tv" element={<MultiStreamPage />} />
        <Route path="/tv/:username" element={<MultiStreamPage />} />
        <Route path="/muti-stream" element={<Navigate to="/tv" replace />} />
        <Route path="/multi-stream" element={<Navigate to="/tv" replace />} />
        <Route path="/creator" element={<DashboardRouteWrapper />} />
        <Route path="/creator/*" element={<DashboardRouteWrapper />} />
        <Route path="/dashboard" element={<Navigate to="/creator" replace />} />
        <Route path="/dashboard/*" element={<Navigate to="/creator" replace />} />
        <Route path="/login" element={<LoginPage onSuccess={() => navigate('/creator')} />} />

        {/* Donation Pages */}
        <Route path="/donate" element={<DonateRouteWrapper />} />
        <Route path="/donate/:username" element={<DonateRouteWrapper />} />
        <Route path="/:username" element={<DonateRouteWrapper />} />

        {/* OBS Browser Source Overlays */}
        {/* 1. Dedicated Donation Alerts Source (alert-only: no video playback) */}
        <Route path="/overlay/:token" element={<OverlayRouteWrapper mode="alert-only" />} />
        <Route path="/overlay/alert/:token" element={<OverlayRouteWrapper mode="alert-only" />} />
        <Route path="/overlay/alerts/:token" element={<OverlayRouteWrapper mode="alert-only" />} />

        {/* 2. Dedicated Video Alerts Source (video-only: only media share clips) */}
        <Route path="/overlay/video/:token" element={<OverlayRouteWrapper mode="video-only" />} />

        {/* 3. Dedicated Subscriber Alerts Source (subscriber-only: channel memberships & tier alerts) */}
        <Route path="/overlay/subscriber/:token" element={<OverlayRouteWrapper mode="subscriber-only" />} />
        <Route path="/overlay/subscribers/:token" element={<OverlayRouteWrapper mode="subscriber-only" />} />

        {/* 4. Combined / Legacy Combo Source (explicit mode) */}
        <Route path="/overlay/combo/:token" element={<OverlayRouteWrapper mode="all" />} />
        <Route path="/overlay/all/:token" element={<OverlayRouteWrapper mode="all" />} />

        <Route path="/overlay/soundboard/:token" element={<SoundboardOverlayRouteWrapper />} />
        <Route path="/overlay/goal/:token" element={<GoalOverlayRouteWrapper />} />
        <Route path="/overlay/leaderboard/:token" element={<LeaderboardOverlayRouteWrapper />} />
        <Route path="/overlay/leaderboard/:token/rank/:rank" element={<LeaderboardOverlayRouteWrapper />} />
        <Route path="/overlay/leaderboard/:token/:rank" element={<LeaderboardOverlayRouteWrapper />} />
        <Route path="/overlay/timer" element={<TimerOverlayRouteWrapper />} />
        <Route path="/overlay/timer/:token" element={<TimerOverlayRouteWrapper />} />
        <Route path="/overlay/pokemon/:token" element={<PokemonOverlayRouteWrapper />} />
        <Route path="/overlay/avatars" element={<AvatarOverlayRouteWrapper />} />
        <Route path="/overlay/avatars/:token" element={<AvatarOverlayRouteWrapper />} />
        <Route path="/overlay/avatar/:token" element={<AvatarOverlayRouteWrapper />} />
        <Route path="/overlay/wheel" element={<WheelOverlayRouteWrapper />} />
        <Route path="/overlay/wheel/:token" element={<WheelOverlayRouteWrapper />} />
        <Route path="/overlay/chat" element={<ChatOverlayRouteWrapper />} />
        <Route path="/overlay/chat/:token" element={<ChatOverlayRouteWrapper />} />
        <Route path="/overlay/custom" element={<CustomOverlayRouteWrapper />} />
        <Route path="/overlay/custom/:token" element={<CustomOverlayRouteWrapper />} />
        <Route path="/overlay/qr" element={<TipQrOverlayRouteWrapper />} />
        <Route path="/overlay/qr/:token" element={<TipQrOverlayRouteWrapper />} />
        <Route path="/overlay/tip-qr/:token" element={<TipQrOverlayRouteWrapper />} />
        <Route path="/overlay/view-count" element={<ViewCountOverlayRouteWrapper />} />
        <Route path="/overlay/view-count/:token" element={<ViewCountOverlayRouteWrapper />} />
        <Route path="/overlay/views" element={<ViewCountOverlayRouteWrapper />} />
        <Route path="/overlay/views/:token" element={<ViewCountOverlayRouteWrapper />} />

        {/* Widget Aliases */}
        <Route path="/widget/view-count" element={<ViewCountOverlayRouteWrapper />} />
        <Route path="/widget/view-count/:token" element={<ViewCountOverlayRouteWrapper />} />
        <Route path="/widget/views" element={<ViewCountOverlayRouteWrapper />} />
        <Route path="/widget/views/:token" element={<ViewCountOverlayRouteWrapper />} />
        <Route path="/widget/avatars/:token" element={<AvatarOverlayRouteWrapper />} />
        <Route path="/widget/avatar/:token" element={<AvatarOverlayRouteWrapper />} />
        <Route path="/widget/custom" element={<CustomOverlayRouteWrapper />} />
        <Route path="/widget/custom/:token" element={<CustomOverlayRouteWrapper />} />
        <Route path="/widget/alert/:token" element={<OverlayRouteWrapper mode="alert-only" />} />
        <Route path="/widget/alerts/:token" element={<OverlayRouteWrapper mode="alert-only" />} />
        <Route path="/widget/video/:token" element={<OverlayRouteWrapper mode="video-only" />} />
        <Route path="/widget/subscriber/:token" element={<OverlayRouteWrapper mode="subscriber-only" />} />
        <Route path="/widget/subscribers/:token" element={<OverlayRouteWrapper mode="subscriber-only" />} />
        <Route path="/widget/combo/:token" element={<OverlayRouteWrapper mode="all" />} />
        <Route path="/widget/soundboard/:token" element={<SoundboardOverlayRouteWrapper />} />
        <Route path="/widget/goal/:token" element={<GoalOverlayRouteWrapper />} />
        <Route path="/widget/leaderboard/:token" element={<LeaderboardOverlayRouteWrapper />} />
        <Route path="/widget/timer" element={<TimerOverlayRouteWrapper />} />
        <Route path="/widget/timer/:token" element={<TimerOverlayRouteWrapper />} />
        <Route path="/widget/pokemon/:token" element={<PokemonOverlayRouteWrapper />} />
        <Route path="/widget/wheel" element={<WheelOverlayRouteWrapper />} />
        <Route path="/widget/wheel/:token" element={<WheelOverlayRouteWrapper />} />
        <Route path="/widget/chat" element={<ChatOverlayRouteWrapper />} />
        <Route path="/widget/chat/:token" element={<ChatOverlayRouteWrapper />} />
        <Route path="/widget/qr" element={<TipQrOverlayRouteWrapper />} />
        <Route path="/widget/qr/:token" element={<TipQrOverlayRouteWrapper />} />
        <Route path="/widget/tip-qr/:token" element={<TipQrOverlayRouteWrapper />} />
      </Routes>
    </AppLayout>
  );
}

export function App() {
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('streambot_theme_mode');
      if (savedTheme === 'light' && window.location.pathname !== '/') {
        document.documentElement.classList.add('light-mode');
      } else {
        document.documentElement.classList.remove('light-mode');
      }
    } catch (e) {}
  }, []);

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
