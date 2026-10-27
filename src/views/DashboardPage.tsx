'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Layers,
  User,
  Settings,
  Key,
  QrCode,
  Monitor,
  Volume2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  Play,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Bell,
  Trophy,
  Target,
  Disc,
  Video,
  Lock,
  Timer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

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
import { MediaLibraryManager, MediaItem } from '../components/dashboard/MediaLibraryManager';
import { PaymentGatewayAdmin } from '../components/dashboard/PaymentGatewayAdmin';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton';
import { DonationAlertsManager } from '../components/dashboard/DonationAlertsManager';
import { LeaderboardWidgetManager } from '../components/dashboard/LeaderboardWidgetManager';
import { GoalWidgetManager } from '../components/dashboard/GoalWidgetManager';
import { SpinningWheelManager } from '../components/dashboard/SpinningWheelManager';
import { VideoAlertsManager } from '../components/dashboard/VideoAlertsManager';
import { ProUpgradeModal } from '../components/dashboard/ProUpgradeModal';
import { TimerWidgetManager } from '../components/dashboard/TimerWidgetManager';
import { SoundboardManager } from '../components/dashboard/SoundboardManager';
import { useModal } from '../context/ModalContext';
import { useAudio } from '../hooks/useAudio';

interface DashboardPageProps {
  onNavigate: (page: string, params?: any) => void;
  initialTab?: DashboardTab;
  initialSelectedId?: string;
}

export type DashboardTab =
  | 'overview'
  | 'donation'
  | 'video-alerts'
  | 'timer'
  | 'soundboard'
  | 'alerts'
  | 'donations'
  | 'media'
  | 'leaderboard'
  | 'goal'
  | 'wheel'
  | 'payments'
  | 'telegram'
  | 'account'
  | 'billing'
  | 'security';

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, initialTab, initialSelectedId }) => {
  const { user, refreshUser, logout } = useAuth();
  const { socket, joinDashboardRoom, connected } = useSocket();
  const { playSynthNeonChime } = useAudio();
  const { showConfirm, showAlert } = useModal();

  // Desktop App Layout State
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab || 'overview');
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(initialSelectedId || null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedDonationId(initialSelectedId);
      return;
    }
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      let id: string | null = null;
      if (search.includes('?id=')) {
        id = search.split('?id=')[1]?.split('&')[0];
      } else if (search.includes('&id=')) {
        id = search.split('&id=')[1]?.split('&')[0];
      }
      if (id) {
        setSelectedDonationId(id);
      }
    }
  }, [initialSelectedId]);

  useEffect(() => {
    const handlePopState = () => {
      const search = window.location.search;
      let id: string | null = null;
      if (search.includes('?id=')) {
        id = search.split('?id=')[1]?.split('&')[0];
      } else if (search.includes('&id=')) {
        id = search.split('&id=')[1]?.split('&')[0];
      }
      setSelectedDonationId(id || null);

      if (search.includes('tab=')) {
        let rawTab = search.split('tab=')[1]?.split('&')[0]?.split('?')[0];
        if (rawTab === 'alerts' || rawTab === 'donations') rawTab = 'donation';
        if (rawTab) setActiveTab(rawTab as DashboardTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free');

  // Streamer Data State
  const [stats, setStats] = useState<StreamerDashboardStats | null>(null);
  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    plan: string;
    planLabel: string;
    usedBytes: number;
    limitBytes: number;
    remainingBytes: number;
    percentUsed: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // UI / Action Modals
  const [isOverlayModalOpen, setIsOverlayModalOpen] = useState(false);
  const [isVideoUpgradeModalOpen, setIsVideoUpgradeModalOpen] = useState(false);
  const [copiedDonateLink, setCopiedDonateLink] = useState(false);
  const [copiedOverlayUrl, setCopiedOverlayUrl] = useState(false);
  const [showOverlayToken, setShowOverlayToken] = useState(false);
  const [testFiring, setTestFiring] = useState(false);
  const [selectedMediaForOverlay, setSelectedMediaForOverlay] = useState<MediaItem | null>(null);

  // Account Profile Form State
  const [profileUsername, setProfileUsername] = useState(user?.username || '');
  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Donation Ledger Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'USD' | 'KHR'>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');

  // Simulator Screen State
  const [simActiveAlert, setSimActiveAlert] = useState<{
    donor: string;
    amount: number;
    currency: 'USD' | 'KHR';
    bank: string;
    message: string;
  } | null>({
    donor: 'CyberSamurai',
    amount: 10,
    currency: 'USD',
    bank: 'ABA Bank',
    message: 'Awesome clutch round! Ace that stream bro! 🔥'
  });
  const [simIsAnimating, setSimIsAnimating] = useState(false);

  // Sync plan from local storage or user plan
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('streamer_plan') as any;
      if (saved === 'free' || saved === 'pro') {
        setCurrentPlan(saved);
      } else if (saved === 'starter') {
        setCurrentPlan('pro');
      }
    }
  }, []);

  // Sync profile inputs when user loads
  useEffect(() => {
    if (user) {
      setProfileUsername(user.username || '');
      setProfileName(user.displayName || '');
      setProfileBio(user.bio || '');
      setProfileAvatar(user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`);
      if (user.plan) {
        const p = user.plan.toLowerCase();
        const resolved = (p === 'pro' || p === 'studio' || p === 'starter') ? 'pro' : 'free';
        setCurrentPlan(resolved);
      }
    }
  }, [user]);

  const setPlan = async (plan: 'free' | 'pro') => {
    setCurrentPlan(plan);
    if (typeof window !== 'undefined') {
      localStorage.setItem('streamer_plan', plan);
    }
    try {
      await streamerService.updateProfile({ plan });
      await refreshUser();
      loadData();
    } catch (e) {
      console.error('Failed to update plan:', e);
    }
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

      // Fetch storage quota info
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('streamneon_auth_token') : null;
        if (token) {
          const mediaRes = await fetch('/api/media', {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json());
          if (mediaRes?.storage) {
            setStorageInfo(mediaRes.storage);
          }
        }
      } catch (storageErr) {
        console.warn('Could not fetch storage quota:', storageErr);
      }
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

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicDonateUrl = `${origin}/@${user?.username || 'neonstreamer'}`;
  const overlayUrl = `${origin}/overlay/${user?.overlayToken || ''}`;

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

  const handleTriggerTest = async (custom?: { donorName?: string; donorMessage?: string; amount?: number }) => {
    if (!user) return;
    setTestFiring(true);
    try {
      playSynthNeonChime(0.85);
      await streamerService.triggerTestAlert(custom);
    } finally {
      setTimeout(() => setTestFiring(false), 800);
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

  const handleRegenerateToken = () => {
    showConfirm({
      title: 'Regenerate Security Token?',
      message: 'Regenerating your security token will invalidate your existing OBS browser source URL. You will need to update the URL in OBS Studio. Are you sure you want to proceed?',
      type: 'danger',
      confirmText: 'Regenerate Token',
      onConfirm: async () => {
        await streamerService.regenerateToken();
        await refreshUser();
        showAlert({
          title: 'Token Regenerated',
          message: 'Your Overlay Security Token has been regenerated. Please copy the new URL into your OBS browser source.',
          type: 'success'
        });
      }
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErrorMsg(null);
    try {
      const cleanUsername = profileUsername.trim().replace(/^@/, '').toLowerCase();
      if (!cleanUsername) {
        setProfileErrorMsg('Username cannot be empty.');
        setSavingProfile(false);
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
        setProfileErrorMsg('Username must be 3-24 characters (letters, numbers, underscores only).');
        setSavingProfile(false);
        return;
      }

      await streamerService.updateProfile({
        username: cleanUsername,
        displayName: profileName.trim(),
        bio: profileBio.trim(),
        description: profileBio.trim(),
        avatarUrl: profileAvatar.trim()
      });
      await refreshUser();
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 3000);
      loadData();
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const fireSimulatorAlert = (donor: string, amount: number, currency: 'USD' | 'KHR', bank: string, message: string) => {
    setSimActiveAlert({ donor, amount, currency, bank, message });
    setSimIsAnimating(true);
    playSynthNeonChime(0.85);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // safe fallback
    }

    setTimeout(() => {
      setSimIsAnimating(false);
    }, 5000);
  };

  // Filtered donations list for the ledger tab
  const filteredDonations = useMemo(() => {
    if (!stats?.recentDonations) return [];
    return stats.recentDonations.filter((d) => {
      const matchesSearch =
        searchQuery === '' ||
        d.donor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.donor_message && d.donor_message.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCurrency = currencyFilter === 'ALL' || d.currency === currencyFilter;

      const bank = (d as any).banking_name || (d.payment_method === 'ABA_PAYWAY' ? 'ABA Bank' : 'Bakong KHQR');
      const matchesBank = bankFilter === 'ALL' || bank.toLowerCase().includes(bankFilter.toLowerCase());

      return matchesSearch && matchesCurrency && matchesBank;
    });
  }, [stats?.recentDonations, searchQuery, currencyFilter, bankFilter]);

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md p-8 text-center space-y-5 rounded-2xl border border-slate-800 bg-[#0B0F19]">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center">
            <Bot size={24} className="text-cyan-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">Authentication Required</h2>
            <p className="text-xs text-slate-400">Please sign in to access your streamer dashboard.</p>
          </div>
          <Button variant="primary" size="md" className="w-full font-bold" onClick={() => onNavigate('login')}>
            Sign In to StreamBotKH
          </Button>
        </div>
      </div>
    );
  }

  // Sidebar Category Navigation Definition (Clean, Organized)
  const sidebarSections = [
    {
      category: 'PORTAL',
      items: [
        {
          id: 'overview' as DashboardTab,
          label: 'Overview',
          icon: LayoutDashboard,
          badge: null
        }
      ]
    },
    {
      category: 'STORAGE',
      items: [
        {
          id: 'media' as DashboardTab,
          label: 'Media Library',
          icon: ImageIcon,
          badge: 'PNG/GIF'
        }
      ]
    },
    {
      category: 'ASSETS',
      items: [
        {
          id: 'donation' as DashboardTab,
          label: 'Donations Alerts',
          icon: Bell,
          badge: 'OBS'
        },
        {
          id: 'leaderboard' as DashboardTab,
          label: 'Leaderboard',
          icon: Trophy,
          badge: null
        },
        {
          id: 'goal' as DashboardTab,
          label: 'Goals',
          icon: Target,
          badge: null
        },
        {
          id: 'timer' as DashboardTab,
          label: 'Timer',
          icon: Timer,
          badge: 'Countdown'
        },
        {
          id: 'soundboard' as DashboardTab,
          label: 'Soundboard',
          icon: Volume2,
          badge: 'HOTKEY'
        },
        {
          id: 'video-alerts' as DashboardTab,
          label: 'Video Alerts',
          icon: Video,
          badge: null
        },
        {
          id: 'wheel' as DashboardTab,
          label: 'Wheels',
          icon: Disc,
          badge: null
        }
      ]
    },
    {
      category: 'ADMIN GATEWAY',
      items: [
        {
          id: 'payments' as DashboardTab,
          label: 'Payment Gateway',
          icon: CreditCard,
          badge: currentPlan === 'free' ? 'PRO' : 'Active',
          isLocked: currentPlan === 'free'
        },
        {
          id: 'telegram' as DashboardTab,
          label: 'Telegram Bot',
          icon: Bot,
          badge: currentPlan === 'free' ? 'PRO' : 'Active',
          isLocked: currentPlan === 'free'
        }
      ]
    },
    {
      category: 'ACCOUNT & SETTINGS',
      items: [
        {
          id: 'billing' as DashboardTab,
          label: 'Plans & Commission',
          icon: Sparkles,
          badge: currentPlan === 'free' ? '10% Fee' : '0% Fee'
        },
        {
          id: 'security' as DashboardTab,
          label: 'Security & Tokens',
          icon: Key,
          badge: null
        },
        {
          id: 'account' as DashboardTab,
          label: 'My Account',
          icon: User,
          badge: null
        }
      ]
    }
  ];

  const currentSection = sidebarSections.find((s) => s.items.some((item) => item.id === activeTab));
  const currentCategory = currentSection?.category || 'STREAM SOURCES';
  const currentTabItem = currentSection?.items.find((item) => item.id === activeTab);
  const CurrentTabIcon = currentTabItem?.icon || Tv;
  const currentTabTitle = currentTabItem?.label || 'Dashboard';

  // Shared Scrollable Nav Categories (Clean, Minimal, No Border)
  const renderSidebarNav = (isCollapsed: boolean) => (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none">
      {sidebarSections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-1">
          {!isCollapsed && (
            <div className="px-3 pb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                {section.category}
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  title={isCollapsed ? `${item.label}${(item as any).isLocked ? ' (Locked - Pro Plan)' : ''}` : undefined}
                  onClick={() => {
                    if ((item as any).isLocked) {
                      setIsVideoUpgradeModalOpen(true);
                      return;
                    }
                    setActiveTab(item.id);
                    setMobileDrawerOpen(false);
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', `/dashboard?tab=${item.id}`);
                    }
                  }}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-0 py-2.5 relative' : 'justify-between px-3 py-2'
                  } rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    {!isCollapsed && (
                      <span className="whitespace-nowrap truncate">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {(item as any).isLocked ? (
                        <span className="p-0.5 text-amber-400 flex items-center justify-center ml-2" title="Pro Plan Feature">
                          <Lock size={14} className="text-amber-400" />
                        </span>
                      ) : item.badge ? (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ml-2 flex-shrink-0 ${
                            isActive
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {isCollapsed && (item as any).isLocked && (
                    <span className="absolute top-1.5 right-1.5 text-amber-400 flex items-center justify-center">
                      <Lock size={10} className="text-amber-400" />
                    </span>
                  )}
                  {isCollapsed && !(item as any).isLocked && item.badge && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // Shared Sidebar Footer (Clean, No Border)
  const renderSidebarFooter = (isCollapsed: boolean) => (
    <div className="p-3 bg-[#0B0F19] space-y-3 flex-shrink-0">
      {!isCollapsed && (
        <div
          onClick={() => {
            setActiveTab('account');
            setMobileDrawerOpen(false);
          }}
          className="p-2 rounded-xl bg-slate-900 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
          title="Open My Account"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <img
                src={user.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=neon'}
                alt="avatar"
                className="w-8 h-8 rounded-lg bg-slate-950 object-cover"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-xs font-semibold text-white truncate leading-tight">
                {user.displayName || user.username}
              </span>
              <span className="text-[10px] font-mono text-slate-400 truncate leading-none mt-0.5">
                @{user.username}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}

      {/* Engine Status Line & Quick Collapse */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between px-1'} text-[10px] font-mono text-slate-500`}>
        {!isCollapsed ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="font-medium text-slate-400">{connected ? 'OBS ENGINE ACTIVE' : 'SYNCING'}</span>
            </span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
              title="Collapse"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="p-1.5 rounded bg-slate-900 text-slate-400 hover:text-white transition-colors"
              title="Expand"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  // When a target donation box is selected, render the dedicated Target Donation Studio as a new dashboard
  // (The main sidebar is completely hidden and replaced by our new sidebar, with the top back button)
  if (selectedDonationId && (activeTab === 'donation' || activeTab === 'alerts' || activeTab === 'donations')) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#070A12] text-slate-100 flex flex-col antialiased">
        <DonationAlertsManager
          streamerToken={user?.overlayToken}
          initialSelectedBoxId={selectedDonationId}
          onSelectBoxId={(id) => setSelectedDonationId(id)}
          onNavigateToMedia={() => {
            setSelectedDonationId(null);
            setActiveTab('media');
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/dashboard?tab=media');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-row overflow-hidden bg-[#060911] text-slate-100 antialiased relative">
      {/* ============================================================== */}
      {/* MOBILE DRAWER MODAL (ONLY VISIBLE ON MOBILE WHEN OPENED)       */}
      {/* ============================================================== */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          {/* Slide-out Drawer (No Border) */}
          <aside className="relative w-80 max-w-[85vw] h-full bg-[#0B0F19] z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 select-text border-0">
            {/* Mobile Header Bar */}
            <div className="h-20 px-5 flex items-center justify-between bg-[#0B0F19] flex-shrink-0">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onNavigate('home');
                }}
                className="flex items-center gap-3.5 group cursor-pointer text-left focus:outline-none min-w-0"
                title="Return to streambotkh.com"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                  <Bot className="text-cyan-400 w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center leading-tight">
                    <span className="text-base font-bold tracking-tight text-white font-['Chakra_Petch']">
                      streambot<span className="text-cyan-400">kh</span>
                    </span>
                    <span className="text-xs font-mono text-slate-500 ml-0.5">.com</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase mt-0.5 font-medium">
                    Streamer Workstation
                  </span>
                </div>
              </button>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                aria-label="Close Navigation"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Nav Items */}
            {renderSidebarNav(false)}

            {/* Mobile Footer */}
            {renderSidebarFooter(false)}
          </aside>
        </div>
      )}

      {/* ============================================================== */}
      {/* DESKTOP PERMANENT SIDEBAR (NO BORDER, SIMPLE & CLEAN)           */}
      {/* ============================================================== */}
      <aside
        className={`hidden md:flex flex-col h-full bg-[#0B0F19] border-0 flex-shrink-0 z-20 transition-all duration-200 select-text ${
          sidebarCollapsed ? 'w-20' : 'w-[260px]'
        }`}
      >
        {/* Desktop Sidebar Brand Header */}
        <div
          className={`h-20 bg-[#0B0F19] flex items-center flex-shrink-0 transition-all ${
            sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-5'
          }`}
        >
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center ${
              sidebarCollapsed ? 'justify-center w-full' : 'gap-3 min-w-0'
            } group cursor-pointer text-left focus:outline-none transition-opacity hover:opacity-90`}
            title="Return to streambotkh.com"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
              <Bot className="text-cyan-400 w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center leading-tight">
                  <span className="text-base font-bold tracking-tight text-white font-['Chakra_Petch']">
                    streambot<span className="text-cyan-400">kh</span>
                  </span>
                  <span className="text-xs font-mono text-slate-500 ml-0.5">.com</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase mt-0.5 font-medium">
                  Streamer Workstation
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Scrollable Nav Items */}
        {renderSidebarNav(sidebarCollapsed)}

        {/* Desktop Footer */}
        {renderSidebarFooter(sidebarCollapsed)}
      </aside>

      {/* ============================================================== */}
      {/* WORKBENCH & MAIN CONTENT AREA                                  */}
      {/* ============================================================== */}
      <main className="flex-1 h-full overflow-y-auto min-w-0 flex flex-col bg-[#060911]">
        {/* Top Desktop Application Header Bar (Spacious Executive Header) */}
        <header className="sticky top-0 z-20 h-20 bg-[#060911]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="md:hidden p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white focus:outline-none flex-shrink-0"
              aria-label="Toggle Navigation Drawer"
            >
              {mobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Active Section Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:flex w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 items-center justify-center text-cyan-400 flex-shrink-0 shadow-inner">
                <CurrentTabIcon size={20} />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="text-base sm:text-lg font-black text-white font-['Chakra_Petch'] tracking-tight truncate">
                  {currentTabTitle}
                </h1>
              </div>
            </div>
          </div>

          {/* Quick Action Command Deck */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Plan & Commission HUD Pill */}
            <button
              onClick={() => setActiveTab('billing')}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all group ${
                currentPlan === 'free'
                  ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
              }`}
              title="Manage Plan & Platform Commission"
            >
              <Sparkles size={14} className={currentPlan === 'free' ? 'text-amber-400' : 'text-emerald-400'} />
              <div className="flex flex-col text-left leading-none">
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">
                  {currentPlan === 'free' ? '10% Commission Fee' : '0% Commission Fee'}
                </span>
                <span className="text-xs font-black text-white font-['Chakra_Petch'] mt-0.5">
                  {currentPlan === 'free' ? 'Starter (Upgrade)' : 'Pro Streamer Tier'}
                </span>
              </div>
            </button>

            {/* Quick Tip Link Copier */}
            <button
              onClick={handleCopyDonateLink}
              className="hidden md:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 font-semibold transition-all group"
              title="Copy your public tip page URL"
            >
              {copiedDonateLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} className="text-cyan-400" />}
              <span className="font-mono text-xs">{copiedDonateLink ? 'Copied Tip URL!' : `@${user.username}`}</span>
            </button>

            {/* Quick Test Alert Action */}
            <button
              onClick={() => handleTriggerTest()}
              disabled={testFiring}
              className="hidden lg:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-cyan-400 transition-all"
              title="Fire an instant sample alert to your overlay"
            >
              <Send size={14} className={testFiring ? 'animate-bounce' : ''} />
              <span>{testFiring ? 'Firing Alert...' : 'Test Alert'}</span>
            </button>

            {/* HERO BUTTON: OBS BROWSER SOURCE */}
            <button
              onClick={() => setIsOverlayModalOpen(true)}
              className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_28px_rgba(0,240,255,0.6)] transform hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0 cursor-pointer"
            >
              <Tv size={16} className="text-slate-950" />
              <div className="flex flex-col text-left leading-none">
                <span className="tracking-tight uppercase font-['Chakra_Petch']">OBS Source</span>
                <span className="text-[9px] font-mono opacity-85 mt-0.5">1080p • 60 FPS</span>
              </div>
            </button>
          </div>
        </header>

        {/* Dynamic Workbench Views */}
        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8 animate-fadeIn pb-16">
          {loading ? (
            <DashboardSkeleton />
          ) : (
            <>
          {/* ============================================================== */}
          {/* TAB 1: OVERVIEW & HUD                                          */}
          {/* ============================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Summary Stats Grid */}
              <OverviewStats stats={stats?.summary} />

              {/* Free Plan Upgrade Prompt */}
              {currentPlan === 'free' && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-300 font-mono flex items-center gap-2">
                      <Sparkles size={14} />
                      Current Plan: Free Plan (10% Platform Fee Cut Active)
                    </div>
                    <p className="text-xs text-slate-400">
                      Upgrade to Pro Plan ($4.99/mo) to unlock the Payment Gateway (Custom ABA Merchant & Bakong direct settlement), GramJS Telegram auto-listener, 10GB storage, and keep 100% of your earnings with 0% fee!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs whitespace-nowrap transition-colors"
                  >
                    Upgrade to Pro ($4.99/mo)
                  </button>
                </div>
              )}

              {/* Streamer Quick Access Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => {
                    setActiveTab('donation');
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', '/dashboard?tab=donation');
                    }
                  }}
                  className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 font-mono">OBS ALERTS</span>
                    <Bell size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-sm font-bold text-white">Donations Alerts</div>
                  <p className="text-xs text-slate-400">Copy OBS URL, configure neon styling, audio chimes, and TTS.</p>
                </div>

                <div
                  onClick={() => {
                    setActiveTab('soundboard');
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', '/dashboard?tab=soundboard');
                    }
                  }}
                  className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 hover:border-cyan-400/50 cursor-pointer transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 font-mono">PC HOTKEYS</span>
                    <Volume2 size={16} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-sm font-bold text-white">Stream Soundboard</div>
                  <p className="text-xs text-slate-400">Listen to PC keyboard hotkeys & trigger stream SFX with OBS broadcast.</p>
                </div>

                <div
                  onClick={() => {
                    setActiveTab('leaderboard');
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', '/dashboard?tab=leaderboard');
                    }
                  }}
                  className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 font-mono">LIVE RANKING</span>
                    <Trophy size={16} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-sm font-bold text-white">Donor Leaderboard</div>
                  <p className="text-xs text-slate-400">Top supporters ranking widget with medals and crowns for stream.</p>
                </div>

                <div
                  onClick={() => {
                    setActiveTab('wheel');
                    if (typeof window !== 'undefined') {
                      window.history.pushState(null, '', '/dashboard?tab=wheel');
                    }
                  }}
                  className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 font-mono">INTERACTIVE</span>
                    <Disc size={16} className="text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Spinning Wheels</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      FREE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Interactive stream wheel simulator and giveaway rewards for donors.</p>
                </div>
              </div>

              {/* Recent Donations Table Preview */}
              <RecentDonationsTable
                donations={stats?.recentDonations}
                onReplayAlert={handleReplayAlert}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: DONATION LEDGER                                         */}
          {/* ============================================================== */}
          {activeTab === 'donations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                    Donation Transactions Ledger
                  </h2>
                  <p className="text-xs text-slate-400">
                    Audit log of all tips received via ABA PayWay, Bakong KHQR, and credit cards.
                  </p>
                </div>
                <button
                  onClick={loadData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh Records</span>
                </button>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="p-4 rounded-2xl bg-[#090D18] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by donor name or message..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Currency Filter */}
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
                    {(['ALL', 'USD', 'KHR'] as const).map((curr) => (
                      <button
                        key={curr}
                        onClick={() => setCurrencyFilter(curr)}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          currencyFilter === curr
                            ? 'bg-cyan-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>

                  {/* Bank Filter */}
                  <select
                    value={bankFilter}
                    onChange={(e) => setBankFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ALL">All Cambodian Banks</option>
                    <option value="ABA">ABA Bank</option>
                    <option value="Bakong">Bakong KHQR</option>
                    <option value="Acleda">ACLEDA Bank</option>
                    <option value="Wing">Wing Bank</option>
                    <option value="Canadia">Canadia Bank</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <RecentDonationsTable
                donations={filteredDonations}
                onReplayAlert={handleReplayAlert}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: MEDIA LIBRARY (PORTAL)                                    */}
          {/* ============================================================== */}
          {activeTab === 'media' && (
            <MediaLibraryManager
              onSelectForOverlay={(media) => {
                setActiveTab('donation');
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/dashboard?tab=donation');
                }
              }}
            />
          )}

          {/* ============================================================== */}
          {/* TAB: DONATIONS ALERTS (ASSET)                                  */}
          {/* ============================================================== */}
          {(activeTab === 'donation' || activeTab === 'alerts' || activeTab === 'donations') && (
            <DonationAlertsManager
              streamerToken={user?.overlayToken}
              initialSelectedBoxId={selectedDonationId || undefined}
              onSelectBoxId={(id) => setSelectedDonationId(id)}
              onNavigateToMedia={() => {
                setSelectedDonationId(null);
                setActiveTab('media');
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/dashboard?tab=media');
                }
              }}
            />
          )}

          {/* ============================================================== */}
          {/* TAB: LEADERBOARD WIDGET (ASSET)                                */}
          {/* ============================================================== */}
          {activeTab === 'leaderboard' && (
            <LeaderboardWidgetManager
              streamerToken={user?.overlayToken}
              recentDonations={stats?.recentDonations}
            />
          )}

          {/* ============================================================== */}
          {/* TAB: GOAL BAR WIDGET (ASSET)                                   */}
          {/* ============================================================== */}
          {activeTab === 'goal' && (
            <GoalWidgetManager
              streamerToken={user?.overlayToken}
              totalRaised={stats?.summary?.totalRevenueUsd || 0}
            />
          )}

          {/* ============================================================== */}
          {/* TAB: SUBATHON TIMER WIDGET (ASSET)                             */}
          {/* ============================================================== */}
          {activeTab === 'timer' && (
            <TimerWidgetManager
              streamerToken={user?.overlayToken}
            />
          )}

          {/* ============================================================== */}
          {/* TAB: SOUNDBOARD & PC KEYBIND ENGINE (ASSET)                    */}
          {/* ============================================================== */}
          {activeTab === 'soundboard' && (
            <SoundboardManager
              streamerToken={user?.overlayToken}
            />
          )}

          {/* ============================================================== */}
          {/* TAB: VIDEO ALERTS (MEDIA SHARE ASSET - FREE & PRO)             */}
          {/* ============================================================== */}
          {activeTab === 'video-alerts' && (
            <VideoAlertsManager
              streamerToken={user?.overlayToken}
              isLocked={false}
              currentPlan={currentPlan}
              onUpgrade={() => setIsVideoUpgradeModalOpen(true)}
            />
          )}

          {/* ============================================================== */}
          {/* TAB: WHEELS WIDGET (ASSET - FREE & PRO)                        */}
          {/* ============================================================== */}
          {activeTab === 'wheel' && (
            <SpinningWheelManager
              streamerToken={user?.overlayToken}
              isLocked={false}
              onUpgrade={() => setIsVideoUpgradeModalOpen(true)}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 6: PAYMENT GATEWAY (PRO PLAN ONLY)                         */}
          {/* ============================================================== */}
          {(activeTab === 'payments' || activeTab === 'telegram') && (
            currentPlan === 'free' ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#0e1424] to-[#090D18] border border-amber-500/30 text-center max-w-2xl mx-auto space-y-6 my-8 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 mx-auto">
                  <Lock size={32} />
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    Pro Plan Feature
                  </span>
                  <h3 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                    Payment Gateway & Telegram Auto-Listener
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                    Custom ABA PayWay direct merchant settlement, Bakong KHQR account linking, and GramJS Telegram group listener are exclusive to the <strong className="text-white">Pro Plan ($4.99/mo)</strong>. Free plan users receive donations through standard checkout with a 10% platform fee.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>0% Platform Commission (Keep 100% of tips)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>Direct ABA Merchant ID & API Key Settlement</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>GramJS Telegram Group & Bot Auto-Push</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Check size={14} className="text-emerald-400 flex-shrink-0" />
                    <span>10GB Media Library Cloud Storage</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Upgrade to Pro ($4.99/mo)</span>
                  </button>
                </div>
              </div>
            ) : (
              <PaymentGatewayAdmin />
            )
          )}

          {/* ============================================================== */}
          {/* TAB 8: MY ACCOUNT & PROFILE SETTINGS                           */}
          {/* ============================================================== */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  My Account
                </h2>
                <p className="text-xs text-slate-400">
                  Update your streamer username, channel description, display name, and manage your public donation portal.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 cols: Profile & Account Settings Form */}
                <form onSubmit={handleSaveProfile} className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                    <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
                      <User size={16} className="text-cyan-400" />
                      Account & Channel Profile
                    </h3>
                    <span className="text-[11px] font-mono text-cyan-400 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 font-semibold">
                      @{user.username}
                    </span>
                  </div>

                  {profileSavedMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      <span>Account information updated successfully! Public tip link updated.</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  <div className="space-y-4 text-xs font-mono">
                    {/* Username Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span>Username</span>
                          <span className="text-cyan-400">*</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          streambotkh.com/@{profileUsername || user.username}
                        </span>
                      </div>
                      <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors overflow-hidden">
                        <span className="px-3.5 py-2.5 bg-slate-900/80 text-slate-400 font-mono text-xs border-r border-slate-800 select-none font-bold">
                          @
                        </span>
                        <input
                          type="text"
                          required
                          value={profileUsername}
                          onChange={(e) => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="your_username"
                          className="w-full px-3.5 py-2.5 bg-transparent text-cyan-400 font-bold font-mono focus:outline-none"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        3 to 24 characters (letters, numbers, underscores). Changing this updates your donation link immediately.
                      </span>
                    </div>

                    {/* Description / Channel Bio */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-slate-300 font-semibold">Description</label>
                        <span className="text-[10px] text-slate-500">Public Streamer Bio</span>
                      </div>
                      <textarea
                        rows={4}
                        value={profileBio}
                        onChange={(e) => setProfileBio(e.target.value)}
                        placeholder="Tell your viewers what you stream, when you go live, and how tips support your channel..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400 transition-colors font-sans leading-relaxed"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        This description will be visible to all donors on your public tip portal.
                      </span>
                    </div>

                    {/* Streamer Display Name */}
                    <div>
                      <label className="block text-slate-300 mb-1.5 font-semibold">Display Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="e.g. Sokha Streamer"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400 transition-colors font-sans"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Friendly creator name displayed on alerts, receipts, and headers.
                      </span>
                    </div>

                    {/* Avatar URL with Generator */}
                    <div>
                      <label className="block text-slate-300 mb-1.5 font-semibold">Avatar Image URL</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={profileAvatar}
                          onChange={(e) => setProfileAvatar(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProfileAvatar(
                              `https://api.dicebear.com/7.x/bottts/svg?seed=streamer_${Math.floor(
                                1000 + Math.random() * 9000
                              )}`
                            )
                          }
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs whitespace-nowrap transition-colors border border-slate-700"
                        >
                          Random Seed
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">All changes sync to MongoDB & SQLite</span>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={savingProfile}
                      className="font-bold"
                    >
                      Save Account Changes
                    </Button>
                  </div>
                </form>

                {/* Right col: Plan Status, Media Storage Quota, and Tip QR Code */}
                <div className="space-y-6">
                  {/* Plan & Media Storage Quota Card */}
                  <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                        CURRENT PLAN
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          currentPlan === 'pro'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {currentPlan === 'pro' ? 'Pro (10GB)' : 'Free (20MB)'}
                      </span>
                    </div>

                    {/* Storage Limit & Usage Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                          <ImageIcon size={14} className="text-cyan-400" />
                          Media Storage
                        </span>
                        <span className="font-mono text-white font-bold">
                          {storageInfo
                            ? `${(storageInfo.usedBytes / (1024 * 1024)).toFixed(1)} MB / ${
                                currentPlan === 'pro' ? '10GB' : '20MB'
                              }`
                            : currentPlan === 'pro'
                            ? '0 MB / 10GB'
                            : '0 MB / 20MB'}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            (storageInfo?.percentUsed || 0) > 85
                              ? 'bg-red-500'
                              : (storageInfo?.percentUsed || 0) > 60
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{
                            width: `${Math.min(100, storageInfo?.percentUsed || 0)}%`
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Max 2MB per file</span>
                        <span>{storageInfo ? `${storageInfo.percentUsed}% used` : '0% used'}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('billing')}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-cyan-400 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={13} />
                      <span>Manage / Upgrade Plan</span>
                    </button>
                  </div>

                  {/* Public Tip QR Code Card */}
                  <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 flex flex-col items-center justify-between text-center space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center justify-center gap-2">
                        <QrCode size={16} className="text-pink-400" />
                        Public Tip QR Code
                      </h3>
                      <p className="text-[11px] text-slate-400">Put this QR code on your live stream or banner</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white shadow-xl flex items-center justify-center">
                      <QRCodeSVG
                        value={publicDonateUrl}
                        size={150}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <div className="w-full space-y-2">
                      <a
                        href={publicDonateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-cyan-400 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>Open Tip Page</span>
                        <ExternalLink size={12} />
                      </a>

                      <button
                        onClick={handleCopyDonateLink}
                        className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                      >
                        {copiedDonateLink ? 'Copied Tip URL' : 'Copy Tip URL'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 9: PLANS & COMMISSION BILLING                              */}
          {/* ============================================================== */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  Plans & Platform Commission
                </h2>
                <p className="text-xs text-slate-400">
                  Switch your plan anytime. Pro ($4.99/mo) eliminates all commission cuts with 0% platform fee and unlocks the Payment Gateway.
                </p>
              </div>

              {/* 2 Tier Pricing Cards Grid with Aligned Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl items-stretch">
                {/* 1. Free Plan */}
                <div
                  className={`rounded-2xl border p-6 flex flex-col h-full justify-between transition-colors ${
                    currentPlan === 'free'
                      ? 'border-amber-400 bg-[#0E131F]'
                      : 'border-slate-800 bg-[#0B0F19]'
                  }`}
                >
                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-slate-400">FREE PLAN</span>
                      {currentPlan === 'free' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">
                          ACTIVE PLAN
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white font-mono">$0</div>
                      <div className="text-xs text-amber-400 font-mono font-bold pt-1">10% Platform Fee Cut</div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Ideal for new streamers starting out. Includes all interactive stream assets.
                    </p>
                    <ul className="space-y-2.5 text-xs text-slate-300 flex-1">
                      <li className="flex items-center gap-2 text-cyan-300 font-semibold">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>20MB Media Storage Quota</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>All Stream Assets: Video Alerts & Wheels included</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Soundboard, Leaderboard, Goals & Subathon Timer</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Dynamic Bakong KHQR checkout</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>OBS 60FPS browser source overlay</span>
                      </li>
                      <li className="flex items-center gap-2 text-amber-300 font-medium">
                        <span className="font-mono font-bold text-amber-400">10%</span>
                        <span>Fee cut deducted from incoming tips</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-800/80 w-full">
                    <button
                      onClick={() => setPlan('free')}
                      disabled={currentPlan === 'free'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        currentPlan === 'free'
                          ? 'bg-slate-800 text-slate-500 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                      }`}
                    >
                      {currentPlan === 'free' ? 'Active Plan' : 'Switch to Free ($0/mo)'}
                    </button>
                  </div>
                </div>

                {/* 2. Pro Plan ($4.99/mo) */}
                <div
                  className={`rounded-2xl border-2 p-6 flex flex-col h-full justify-between transition-colors relative ${
                    currentPlan === 'pro'
                      ? 'border-purple-400 bg-[#120E22]'
                      : 'border-slate-800 bg-[#0B0F19]'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-slate-950 font-mono text-[9px] font-bold uppercase tracking-widest shadow-md shadow-purple-500/20">
                    RECOMMENDED &bull; 0% FEE
                  </div>

                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-purple-400">PRO PLAN</span>
                      {currentPlan === 'pro' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold border border-purple-500/40">
                          ACTIVE PLAN
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white font-mono">
                        $4.99 <span className="text-xs font-normal text-slate-400 font-sans">/ month</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                        0% Platform Fee (Keep 100% of your earnings)
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Full access to Payment Gateway, Telegram Auto-Listener, and high-capacity storage.
                    </p>
                    <ul className="space-y-2.5 text-xs text-slate-200 flex-1">
                      <li className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <Check size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>Exclusive Payment Gateway (Custom ABA Merchant & Bakong)</span>
                      </li>
                      <li className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <Check size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>Telegram Bot & GramJS Group Auto-Listener</span>
                      </li>
                      <li className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check size={14} className="flex-shrink-0" />
                        <span>0% platform fee (Keep 100%)</span>
                      </li>
                      <li className="flex items-center gap-2 text-purple-300 font-semibold">
                        <Check size={14} className="text-purple-400 flex-shrink-0" />
                        <span>10GB Media Cloud Storage</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Text-to-Speech (TTS) Voice Announcer</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>All Free features & assets included</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Priority 24/7 direct Telegram SLA</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-5 border-t border-purple-500/30 w-full">
                    <button
                      onClick={() => setPlan('pro')}
                      disabled={currentPlan === 'pro'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        currentPlan === 'pro'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default'
                          : 'bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 shadow-lg shadow-purple-500/20 font-extrabold cursor-pointer'
                      }`}
                    >
                      {currentPlan === 'pro' ? 'Active Plan (0% Fee)' : 'Switch to Pro ($4.99/mo)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 10: SECURITY & API TOKENS                                  */}
          {/* ============================================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
                  Security, Sessions & API Keys
                </h2>
                <p className="text-xs text-slate-400">
                  Manage your OBS browser security tokens, active credentials, and webhook endpoints.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-6">
                <div className="space-y-3 pb-6 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">OBS Overlay Security Token</h4>
                      <p className="text-xs text-slate-400">Controls authentication for your live browser source alert feed.</p>
                    </div>
                    <button
                      onClick={handleRegenerateToken}
                      className="px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-bold text-red-400 transition-colors"
                    >
                      Regenerate Token
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                    {user.overlayToken}
                  </div>
                </div>

                <div className="space-y-3 pb-6 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-white">Merchant Pushback Webhook</h4>
                    <p className="text-xs text-slate-400">ABA PayWay pushback URL for instant transaction verification.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-400">
                    {origin}/api/payway/webhook
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">Active Session</h4>
                    <p className="text-xs text-slate-400">Signed in as {user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-red-400 transition-colors"
                  >
                    Log Out of All Devices
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
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

      {/* Pro Plan Upgrade Modal */}
      <ProUpgradeModal
        isOpen={isVideoUpgradeModalOpen}
        onClose={() => setIsVideoUpgradeModalOpen(false)}
        telegramContactUrl="https://t.me/@hchenheng"
      />
    </div>
  );
};
