import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Sliders,
  CreditCard,
  Bot,
  Tv,
  Sparkles,
  Send,
  Share2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Receipt,
  HelpCircle,
  TrendingUp,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { streamerService } from '../services/streamerService';
import { StreamerDashboardStats, PaymentSettings } from '../types/streamer';
import { AlertSettings } from '../types/alert';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { OverviewStats } from '../components/dashboard/OverviewStats';
import { RecentDonationsTable } from '../components/dashboard/RecentDonationsTable';
import { AlertBoxStudio } from '../components/dashboard/AlertBoxStudio';
import { PaymentGatewayConfig } from '../components/dashboard/PaymentGatewayConfig';
import { TelegramBotCard } from '../components/dashboard/TelegramBotCard';
import { ObsOverlayModal } from '../components/dashboard/ObsOverlayModal';
import { useAudio } from '../hooks/useAudio';

interface DashboardPageProps {
  onNavigate: (page: string, params?: any) => void;
}

type DashboardTab = 'overview' | 'donations' | 'studio' | 'payments' | 'telegram' | 'overlay' | 'billing';

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, refreshUser, logout } = useAuth();
  const { socket, joinDashboardRoom, connected } = useSocket();
  const { playSynthNeonChime } = useAudio();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'studio'>(() => {
    return (localStorage.getItem('streamer_plan') as any) || 'pro';
  });

  const [stats, setStats] = useState<StreamerDashboardStats | null>(null);
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [isOverlayModalOpen, setIsOverlayModalOpen] = useState(false);
  const [copiedDonateLink, setCopiedDonateLink] = useState(false);
  const [copiedOverlayUrl, setCopiedOverlayUrl] = useState(false);
  const [testFiring, setTestFiring] = useState(false);

  const setPlan = (plan: 'free' | 'pro' | 'studio') => {
    setCurrentPlan(plan);
    localStorage.setItem('streamer_plan', plan);
  };

  // Fetch initial streamer data
  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, alertData, paymentData] = await Promise.all([
        streamerService.getDashboard(),
        streamerService.getAlertSettings(),
        streamerService.getPaymentSettings()
      ]);
      setStats(statsData);
      setAlertSettings(alertData);
      setPaymentSettings(paymentData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Join Socket.io dashboard room & listen for live incoming donations
  useEffect(() => {
    if (!user || !socket) return;

    joinDashboardRoom(user.id);

    const handleNewDonation = (newDonation: any) => {
      console.log('⚡ [Dashboard] Live new donation received:', newDonation);
      loadData();
    };

    socket.on('donation:new', handleNewDonation);

    return () => {
      socket.off('donation:new', handleNewDonation);
    };
  }, [user, socket]);

  const publicDonateUrl = `${window.location.origin}/@${user?.username || 'neonstreamer'}`;
  const overlayUrl = `${window.location.origin}/overlay/${user?.overlayToken || ''}`;

  const handleCopyDonateLink = () => {
    navigator.clipboard.writeText(publicDonateUrl);
    setCopiedDonateLink(true);
    setTimeout(() => setCopiedDonateLink(false), 2000);
  };

  const handleCopyOverlayUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopiedOverlayUrl(true);
    setTimeout(() => setCopiedOverlayUrl(false), 2000);
  };

  const handleSaveAlerts = async (newSettings: Partial<AlertSettings>) => {
    const res = await streamerService.updateAlertSettings(newSettings);
    setAlertSettings(res.settings);
  };

  const handleSavePayments = async (newSettings: Partial<PaymentSettings>) => {
    const res = await streamerService.updatePaymentSettings(newSettings);
    setPaymentSettings(res.settings);
  };

  const handleTriggerTest = async () => {
    if (!user) return;
    setTestFiring(true);
    try {
      playSynthNeonChime(0.85);
      await streamerService.triggerTestAlert();
    } finally {
      setTimeout(() => setTestFiring(false), 1000);
    }
  };

  const handleReplayAlert = async (donation: any) => {
    if (user) {
      playSynthNeonChime(0.85);
      await streamerService.triggerTestAlert({
        donorName: donation.donor_name,
        donorMessage: donation.donor_message,
        amount: donation.amount
      });
    }
  };

  const handleRegenerateToken = async () => {
    await streamerService.regenerateToken();
    await refreshUser();
  };

  if (!user) {
    return (
      <div className="text-center py-28 max-w-md mx-auto space-y-4">
        <p className="text-slate-400">Please sign in to access your streamer dashboard.</p>
        <Button variant="primary" onClick={() => onNavigate('login')}>
          Sign In
        </Button>
      </div>
    );
  }

  // Navigation Items for the Sidebar
  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview & Stats',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'donations',
      label: 'Donation History',
      icon: Receipt,
      badge: stats?.recentDonations?.length ? `${stats.recentDonations.length}` : null
    },
    {
      id: 'studio',
      label: 'Alert Box Studio',
      icon: Sliders,
      badge: null
    },
    {
      id: 'payments',
      label: 'Payment Gateways',
      icon: CreditCard,
      badge: 'ABA/Bakong'
    },
    {
      id: 'telegram',
      label: 'Telegram Alert Bot',
      icon: Bot,
      badge: user.telegramChatId ? 'Linked' : 'Not Linked'
    },
    {
      id: 'overlay',
      label: 'OBS Browser Overlay',
      icon: Tv,
      badge: '60 FPS'
    },
    {
      id: 'billing',
      label: 'Plans & Billing',
      icon: Sparkles,
      badge: currentPlan === 'free' ? '10% Fee' : '0% Fee'
    }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#070A12] text-slate-100">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===================== SIDEBAR ===================== */}
      <aside
        className={`fixed md:sticky top-16 sm:top-18 z-40 md:z-auto inset-y-0 left-0 w-72 bg-[#090D18] border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: 'calc(100vh - 4.5rem)' }}
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Streamer Profile HUD Widget */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.displayName}
                className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 object-cover flex-shrink-0"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">
                  {user.displayName}
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  @{user.username}
                </div>
              </div>
            </div>

            {/* Plan Badge & Fee Display */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono">
              <span className="text-slate-400">Active Tier:</span>
              {currentPlan === 'free' && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                  FREE (10% FEE)
                </span>
              )}
              {currentPlan === 'pro' && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                  PRO ($1.99 - 0% FEE)
                </span>
              )}
              {currentPlan === 'studio' && (
                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold">
                  STUDIO ($4.99 - 0% FEE)
                </span>
              )}
            </div>
          </div>

          {/* Navigation Links Group */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3 pb-1">
              Command Deck
            </div>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as DashboardTab);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Streamer Utilities */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 px-3">
              Quick Actions
            </div>

            {/* Test Alert Button */}
            <button
              onClick={handleTriggerTest}
              disabled={testFiring}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-cyan-400 transition-colors"
            >
              <Send size={14} />
              <span>{testFiring ? 'Firing Alert...' : 'Fire Test Alert'}</span>
            </button>

            {/* Public Tip Link */}
            <a
              href={publicDonateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >
              <span>View Public Tip Page</span>
              <ExternalLink size={12} className="text-slate-400" />
            </a>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-mono text-slate-400">
              {connected ? 'GATEWAY ONLINE' : 'SYNCING'}
            </span>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="flex items-center gap-1.5 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ===================== MAIN CONTENT AREA ===================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <div className="sticky top-16 sm:top-18 z-30 bg-[#070A12]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              aria-label="Toggle Dashboard Sidebar"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Breadcrumb / Title */}
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>Dashboard</span>
                <span>/</span>
                <span className="text-cyan-400 font-semibold uppercase">
                  {navigationItems.find((n) => n.id === activeTab)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Action Shortcuts */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyDonateLink}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-medium transition-colors"
            >
              {copiedDonateLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span>{copiedDonateLink ? 'Copied Tip Link' : 'Share Tip Link'}</span>
            </button>

            <button
              onClick={() => setIsOverlayModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-colors"
            >
              <Tv size={14} />
              <span>OBS Browser Source</span>
            </button>
          </div>
        </div>

        {/* Active Panel View */}
        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8 animate-fadeIn">
          {/* TAB 1: OVERVIEW & STATS */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Summary Stats */}
              <OverviewStats stats={stats?.summary} />

              {/* Plan Fee Alert Banner if on Free Plan */}
              {currentPlan === 'free' && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-amber-300 font-mono">
                      Current Plan: Free Starter (10% Platform Fee Cut)
                    </div>
                    <p className="text-xs text-slate-400">
                      You are currently paying a 10% fee on all tips received. Upgrade to Pro for only $1.99/month to keep 100% of your earnings with 0% fee cut!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs whitespace-nowrap transition-colors"
                  >
                    Upgrade to 0% Fee ($1.99/mo)
                  </button>
                </div>
              )}

              {/* Recent Donations Table Preview */}
              <RecentDonationsTable
                donations={stats?.recentDonations}
                onReplayAlert={handleReplayAlert}
              />
            </div>
          )}

          {/* TAB 2: DONATION HISTORY */}
          {activeTab === 'donations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                    Donation Transactions Ledger
                  </h2>
                  <p className="text-xs text-slate-400">
                    Live log of all contributions sent through ABA Mobile, Bakong KHQR, and credit cards.
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              <RecentDonationsTable
                donations={stats?.recentDonations}
                onReplayAlert={handleReplayAlert}
              />
            </div>
          )}

          {/* TAB 3: ALERT BOX STUDIO */}
          {activeTab === 'studio' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  Alert Box Studio
                </h2>
                <p className="text-xs text-slate-400">
                  Customize the appearance, sounds, duration, and Text-to-Speech (TTS) voices of your livestream alerts.
                </p>
              </div>

              <AlertBoxStudio
                initialSettings={alertSettings || undefined}
                onSave={handleSaveAlerts}
                onTriggerTest={handleTriggerTest}
              />
            </div>
          )}

          {/* TAB 4: PAYMENT GATEWAYS */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  ABA Bank PayWay & Bakong KHQR Gateway Settings
                </h2>
                <p className="text-xs text-slate-400">
                  Connect your merchant credentials and pushback webhook to receive instant tip payouts.
                </p>
              </div>

              <PaymentGatewayConfig
                initialSettings={paymentSettings || undefined}
                onSave={handleSavePayments}
              />
            </div>
          )}

          {/* TAB 5: TELEGRAM ALERT BOT */}
          {activeTab === 'telegram' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  Telegram Instant Notification Bot
                </h2>
                <p className="text-xs text-slate-400">
                  Pair your mobile phone to receive rich HTML donation receipts and query balances remotely.
                </p>
              </div>

              <TelegramBotCard
                pairingCode={user.telegramPairingCode || 'NEON-8899'}
                isLinked={Boolean(user.telegramChatId)}
              />
            </div>
          )}

          {/* TAB 6: OBS BROWSER OVERLAY */}
          {activeTab === 'overlay' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  OBS Studio Browser Source Setup
                </h2>
                <p className="text-xs text-slate-400">
                  Connect this transparent browser URL into OBS Studio, Streamlabs, or vMix for 60FPS alert rendering.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0B0F19] border border-slate-800 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-cyan-400 uppercase">
                    Your Private Overlay URL (Keep this private)
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      readOnly
                      value={overlayUrl}
                      className="bg-transparent text-xs font-mono text-slate-200 flex-1 outline-none"
                    />
                    <button
                      onClick={handleCopyOverlayUrl}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      {copiedOverlayUrl ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedOverlayUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">OBS WIDTH</span>
                    <b className="text-white">800 px</b>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">OBS HEIGHT</span>
                    <b className="text-white">600 px</b>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">FRAME RATE</span>
                    <b className="text-cyan-400">60 FPS</b>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">SHUTDOWN WHEN HIDDEN</span>
                    <b className="text-emerald-400">Checked</b>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleTriggerTest}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-400 flex items-center gap-2 transition-colors"
                  >
                    <Send size={14} />
                    <span>Fire Test Alert on OBS</span>
                  </button>

                  <button
                    onClick={handleRegenerateToken}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Regenerate Security Token
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PLANS & BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  Plans & Commission Fees
                </h2>
                <p className="text-xs text-slate-400">
                  Switch your plan anytime. Pro and Studio tiers eliminate all platform commission cuts with 0% fee.
                </p>
              </div>

              {/* 3 Tier Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Free Starter */}
                <div
                  className={`rounded-2xl border p-6 flex flex-col justify-between transition-colors ${
                    currentPlan === 'free'
                      ? 'border-amber-400 bg-[#0E131F]'
                      : 'border-slate-800 bg-[#0B0F19]'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-slate-400">FREE STARTER</span>
                      {currentPlan === 'free' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">
                          CURRENT PLAN
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white font-mono">$0</div>
                      <div className="text-xs text-amber-400 font-mono font-bold pt-1">10% Platform Fee Cut</div>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400" />
                        <span>Dynamic Bakong KHQR QR codes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400" />
                        <span>OBS 60FPS browser source overlay</span>
                      </li>
                      <li className="flex items-center gap-2 text-amber-300 font-medium">
                        <span className="font-mono font-bold">10%</span>
                        <span>Fee cut deducted from tips</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => setPlan('free')}
                      disabled={currentPlan === 'free'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        currentPlan === 'free'
                          ? 'bg-slate-800 text-slate-500 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {currentPlan === 'free' ? 'Active Plan' : 'Select Free (10% Fee)'}
                    </button>
                  </div>
                </div>

                {/* 2. Pro Streamer ($1.99 - 0% fee) */}
                <div
                  className={`rounded-2xl border-2 p-6 flex flex-col justify-between transition-colors relative ${
                    currentPlan === 'pro'
                      ? 'border-cyan-400 bg-[#0E1726]'
                      : 'border-slate-800 bg-[#0B0F19]'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[9px] font-bold uppercase tracking-widest">
                    POPULAR
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-cyan-400">PRO STREAMER</span>
                      {currentPlan === 'pro' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40">
                          CURRENT PLAN
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white font-mono">
                        $1.99 <span className="text-xs font-normal text-slate-400 font-sans">/ month</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                        0% Platform Fee (No cut)
                      </div>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-200">
                      <li className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check size={14} />
                        <span>0% platform fee (Keep 100%)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400" />
                        <span>ABA PayWay instant pushback webhook</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400" />
                        <span>Telegram Bot push notifications</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400" />
                        <span>Text-to-Speech (TTS) voice donor reader</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400" />
                        <span>Alert Box Studio: Custom GIF & sounds</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => setPlan('pro')}
                      disabled={currentPlan === 'pro'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        currentPlan === 'pro'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-default'
                          : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                      }`}
                    >
                      {currentPlan === 'pro' ? 'Active Plan (0% Fee)' : 'Switch to Pro ($1.99/mo)'}
                    </button>
                  </div>
                </div>

                {/* 3. Studio ($4.99 - 0% fee) */}
                <div
                  className={`rounded-2xl border p-6 flex flex-col justify-between transition-colors ${
                    currentPlan === 'studio'
                      ? 'border-purple-400 bg-[#120E22]'
                      : 'border-slate-800 bg-[#0B0F19]'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-purple-400">STUDIO & ESPORTS</span>
                      {currentPlan === 'studio' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold border border-purple-500/40">
                          CURRENT PLAN
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white font-mono">
                        $4.99 <span className="text-xs font-normal text-slate-400 font-sans">/ month</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                        0% Platform Fee (No cut)
                      </div>
                    </div>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      <li className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check size={14} />
                        <span>0% platform fee (Keep 100%)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-purple-400" />
                        <span>All Pro features included</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-purple-400" />
                        <span>Multiple caster overlay tokens</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-purple-400" />
                        <span>Custom domain & webhook forwarder</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-purple-400" />
                        <span>24/7 priority Telegram direct SLA</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => setPlan('studio')}
                      disabled={currentPlan === 'studio'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        currentPlan === 'studio'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {currentPlan === 'studio' ? 'Active Plan (0% Fee)' : 'Switch to Studio ($4.99/mo)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* OBS Overlay Modal */}
      <ObsOverlayModal
        isOpen={isOverlayModalOpen}
        onClose={() => setIsOverlayModalOpen(false)}
        overlayToken={user.overlayToken}
        onRegenerateToken={handleRegenerateToken}
      />
    </div>
  );
};
