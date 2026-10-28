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
  BadgeCheck,
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
  Timer,
  Trash2,
  Users,
  GitPullRequest,
  MessageSquare,
  Tag
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
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
import { AdminUsersManager } from '../components/dashboard/AdminUsersManager';
import { AdminPullRequestsManager } from '../components/dashboard/AdminPullRequestsManager';
import { AdminPromotionManager, PromotionConfig } from '../components/dashboard/AdminPromotionManager';
import { MediaPickerModal } from '../components/dashboard/MediaPickerModal';
import { request } from '../services/api';
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
  | 'security'
  | 'report-issue'
  | 'admin-users'
  | 'admin-requests'
  | 'admin-promotion';

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, initialTab, initialSelectedId }) => {
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const { socket, joinDashboardRoom, connected } = useSocket();
  const { playSynthNeonChime } = useAudio();
  const { showConfirm, showAlert } = useModal();

  // Desktop App Layout State
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab || 'overview');
  const [selectedDonationId, setSelectedDonationId] = useState<string | null>(initialSelectedId || null);
  const [activePromo, setActivePromo] = useState<PromotionConfig | null>(null);

  useEffect(() => {
    request<PromotionConfig>('/promotions')
      .then((data) => setActivePromo(data))
      .catch(() => {});
  }, [activeTab]);

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
  const [upgradeFeatureName, setUpgradeFeatureName] = useState<string | undefined>(undefined);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [copiedDonateLink, setCopiedDonateLink] = useState(false);
  const [copiedOverlayUrl, setCopiedOverlayUrl] = useState(false);
  const [showOverlayToken, setShowOverlayToken] = useState(false);
  const [testFiring, setTestFiring] = useState(false);
  const [selectedMediaForOverlay, setSelectedMediaForOverlay] = useState<MediaItem | null>(null);

  // Account Profile Form State
  const [profileUsername, setProfileUsername] = useState(user?.username || '');
  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileThanksMessage, setProfileThanksMessage] = useState(user?.customThanksMessage || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingUsername, setChangingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameStatusMsg, setUsernameStatusMsg] = useState<string | null>(null);
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
      setProfileThanksMessage(user.customThanksMessage || '');
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
  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
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
          const mediaRes = await streamerService.getMediaStorageInfo?.() || await fetch('/api/media', {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json()).catch(() => null);
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
    if (user) {
      loadData();
    }
    // Fail-safe: ensure loading skeleton never blocks screen indefinitely
    const failSafe = setTimeout(() => {
      setLoading(false);
    }, 7000);
    return () => clearTimeout(failSafe);
  }, [user]);

  // Automatically redirect unauthenticated visitors on /dashboard directly to Google Sign-In URL
  useEffect(() => {
    if (authLoading || user) return;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('token') || localStorage.getItem('streamneon_auth_token')) {
        return;
      }
      authService.initiateGoogleOAuth();
    }
  }, [authLoading, user]);

  // Join Socket.io dashboard room & listen for live incoming donations
  useEffect(() => {
    if (!user || !socket) return;

    joinDashboardRoom(user.id);

    const handleNewDonation = (newDonation: any) => {
      console.log('⚡ [Dashboard] Live new donation received:', newDonation);
      loadData(true);
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

  const [deletingDonationId, setDeletingDonationId] = useState<string | null>(null);

  const handleDeleteDonation = (donationId: string) => {
    const targetDonation = stats?.recentDonations?.find((d: any) => d.id === donationId);
    const donorName = targetDonation?.donor_name || 'Anonymous';
    const amountStr = targetDonation
      ? targetDonation.currency === 'KHR'
        ? `${targetDonation.amount.toLocaleString()} ៛`
        : `$${Number(targetDonation.amount).toFixed(2)}`
      : '';

    showConfirm({
      title: 'Delete Donation Record?',
      message: `Are you sure you want to permanently delete this donation record from "${donorName}" (${amountStr})? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete Record',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          setDeletingDonationId(donationId);
          await streamerService.deleteDonation(donationId);
          await loadData(true);
        } catch (err: any) {
          console.error('Failed to delete donation:', err);
          showAlert({
            title: 'Delete Failed',
            message: err.message || 'Could not delete donation record.',
            type: 'danger'
          });
        } finally {
          setDeletingDonationId(null);
        }
      }
    });
  };

  const handleClearAllDonations = () => {
    if (!stats?.recentDonations || stats.recentDonations.length === 0) return;
    showConfirm({
      title: 'Clear All Donation Records?',
      message: 'Are you sure you want to permanently delete ALL donation transaction records for your streamer account? This will clear your donation audit history.',
      type: 'danger',
      confirmText: 'Clear All Records',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const res = await streamerService.deleteAllDonations();
          await loadData(true);
          showAlert({
            title: 'Ledger Cleared',
            message: res.message || 'All donation records have been cleared.',
            type: 'info'
          });
        } catch (err: any) {
          showAlert({
            title: 'Failed',
            message: err.message || 'Could not clear donation records.',
            type: 'danger'
          });
        }
      }
    });
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

  const handleChangeUsername = async () => {
    setProfileErrorMsg(null);
    setProfileSavedMsg(false);
    const cleanUsername = profileUsername.trim().replace(/^@/, '').toLowerCase();

    if (!cleanUsername) {
      setUsernameStatus('taken');
      setUsernameStatusMsg('Username cannot be empty.');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
      setUsernameStatus('taken');
      setUsernameStatusMsg('Username must be 3–24 characters (letters, numbers, underscores only).');
      return;
    }
    if (user && cleanUsername === user.username.toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameStatusMsg('This is already your active username.');
      return;
    }

    setChangingUsername(true);
    try {
      const check = await streamerService.checkUsername(cleanUsername);
      if (!check.available) {
        setUsernameStatus('taken');
        setUsernameStatusMsg(check.error || `The username "@${cleanUsername}" is already taken.`);
        setProfileErrorMsg(check.error || `The username "@${cleanUsername}" is already taken.`);
        return;
      }

      await streamerService.updateProfile({ username: cleanUsername });
      await refreshUser();
      setUsernameStatus('available');
      setUsernameStatusMsg(`Username updated to @${cleanUsername}!`);
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 3000);
      loadData();
    } catch (err: any) {
      setUsernameStatus('taken');
      setUsernameStatusMsg(err.message || 'Username is already taken.');
      setProfileErrorMsg(err.message || 'Failed to change username');
    } finally {
      setChangingUsername(false);
    }
  };

  // Real-time debounced username availability check while typing
  useEffect(() => {
    if (!user) return;
    const clean = profileUsername.trim().replace(/^@/, '').toLowerCase();
    if (!clean || clean === user.username.toLowerCase()) {
      setUsernameStatus('idle');
      setUsernameStatusMsg(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(clean)) {
      setUsernameStatus('taken');
      setUsernameStatusMsg('Must be 3–24 characters (a-z, 0-9, _).');
      return;
    }

    setUsernameStatus('checking');
    setUsernameStatusMsg('Checking availability...');
    const timer = setTimeout(async () => {
      try {
        const res = await streamerService.checkUsername(clean);
        if (res.available) {
          setUsernameStatus('available');
          setUsernameStatusMsg(`@${clean} is available!`);
        } else {
          setUsernameStatus('taken');
          setUsernameStatusMsg(res.error || `@${clean} is already taken.`);
        }
      } catch {
        setUsernameStatus('idle');
        setUsernameStatusMsg(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [profileUsername, user?.username]);

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
        customThanksMessage: profileThanksMessage.trim(),
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

  if (authLoading || !user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-slate-400 text-xs font-mono">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <span>{authLoading ? 'Signing in to your dashboard...' : 'Redirecting to Google Sign-In...'}</span>
        </div>
      </div>
    );
  }

  const isAdmin = Boolean(
    user.isAdmin || (user.email && user.email.trim().toLowerCase() === 'hchenheng@gmail.com')
  );

  // Sidebar Category Navigation Definition (Clean, Organized)
  const sidebarSections = [
    ...(isAdmin
      ? [
          {
            category: 'Admin Panel',
            items: [
              {
                id: 'admin-users' as DashboardTab,
                label: 'Users Management',
                icon: Users,
                badge: null
              },
              {
                id: 'admin-requests' as DashboardTab,
                label: 'Pull Requests',
                icon: GitPullRequest,
                badge: null
              },
              {
                id: 'admin-promotion' as DashboardTab,
                label: 'Promotion Pricing',
                icon: Tag,
                badge: activePromo?.isActive ? 'LIVE' : null
              }
            ]
          }
        ]
      : []),
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
          badge: null
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
          badge: null
        },
        {
          id: 'leaderboard' as DashboardTab,
          label: 'Leaderboard',
          icon: Trophy,
          badge: null,
          isLocked: currentPlan === 'free' && !isAdmin
        },
        {
          id: 'goal' as DashboardTab,
          label: 'Goals',
          icon: Target,
          badge: null,
          isLocked: currentPlan === 'free' && !isAdmin
        },
        {
          id: 'timer' as DashboardTab,
          label: 'Timer',
          icon: Timer,
          badge: null,
          isLocked: currentPlan === 'free' && !isAdmin
        },
        {
          id: 'soundboard' as DashboardTab,
          label: 'Soundboard',
          icon: Volume2,
          badge: null,
          isLocked: currentPlan === 'free' && !isAdmin
        },
        {
          id: 'video-alerts' as DashboardTab,
          label: 'Video Alerts',
          icon: Video,
          badge: null,
          isLocked: currentPlan === 'free' && !isAdmin
        },
        {
          id: 'wheel' as DashboardTab,
          label: 'Wheels',
          icon: Disc,
          badge: null,
          isLocked: currentPlan === 'free' && !isAdmin
        }
      ]
    },
    {
      category: 'GATEWAY',
      items: [
        {
          id: 'payments' as DashboardTab,
          label: 'Payment Gateway',
          icon: CreditCard,
          badge: null,
          isLocked: false
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
          id: 'report-issue' as DashboardTab,
          label: 'Report Issue',
          icon: MessageSquare,
          badge: null
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
                      setUpgradeFeatureName(item.label);
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
              onNavigate('home');
            }}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}

      {isCollapsed && (
        <div className="flex items-center justify-center flex-col gap-2 text-[10px] font-mono text-slate-500">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-1.5 rounded bg-slate-900 text-slate-400 hover:text-white transition-colors"
            title="Expand"
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => {
              logout();
              onNavigate('home');
            }}
            title="Sign Out"
            className="p-1.5 rounded text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
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

          {/* Quick Action Command Deck: Upgrade / Pro Status */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {currentPlan === 'free' ? (
              <button
                onClick={() => {
                  setUpgradeFeatureName(undefined);
                  setIsVideoUpgradeModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-black text-xs sm:text-sm font-['Chakra_Petch'] transition-all shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_28px_rgba(0,240,255,0.6)] cursor-pointer"
                title="Upgrade to Pro Plan"
              >
                <Sparkles size={16} className="text-slate-950" />
                <span>Upgrade</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold text-xs sm:text-sm font-['Chakra_Petch'] shadow-[0_0_15px_rgba(16,185,129,0.15)] select-none"
                title="Pro Streamer Plan Active"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>You are on Pro Plan</span>
              </div>
            )}
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
                      Upgrade to Pro Plan ($4.99/mo) to unlock Leaderboard, Goals, Timer, Soundboard, Video Alerts &amp; Spinning Wheels, 500MB storage, removed watermark, and 0% fee!
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
                    if (currentPlan === 'free' && !isAdmin) {
                      setUpgradeFeatureName('Soundboard');
                      setIsVideoUpgradeModalOpen(true);
                      return;
                    }
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
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Stream Soundboard</span>
                    {currentPlan === 'free' && !isAdmin && <Lock size={13} className="text-amber-400" />}
                  </div>
                  <p className="text-xs text-slate-400">Listen to PC keyboard hotkeys &amp; trigger stream SFX with OBS broadcast.</p>
                </div>

                <div
                  onClick={() => {
                    if (currentPlan === 'free' && !isAdmin) {
                      setUpgradeFeatureName('Leaderboard');
                      setIsVideoUpgradeModalOpen(true);
                      return;
                    }
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
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Donor Leaderboard</span>
                    {currentPlan === 'free' && !isAdmin && <Lock size={13} className="text-amber-400" />}
                  </div>
                  <p className="text-xs text-slate-400">Top supporters ranking widget with medals and crowns for stream.</p>
                </div>

                <div
                  onClick={() => {
                    if (currentPlan === 'free' && !isAdmin) {
                      setUpgradeFeatureName('Wheels');
                      setIsVideoUpgradeModalOpen(true);
                      return;
                    }
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
                    {currentPlan === 'free' && !isAdmin ? (
                      <Lock size={13} className="text-amber-400" />
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold">
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Interactive stream wheel simulator and giveaway rewards for donors.</p>
                </div>
              </div>

              {/* Recent Donations Table Preview */}
              <RecentDonationsTable
                donations={stats?.recentDonations}
                onReplayAlert={handleReplayAlert}
                onDeleteDonation={handleDeleteDonation}
                deletingId={deletingDonationId}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadData(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    <span>Refresh Records</span>
                  </button>
                  {stats?.recentDonations && stats.recentDonations.length > 0 && (
                    <button
                      onClick={handleClearAllDonations}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-xs text-red-400 hover:text-red-300 transition-colors"
                      title="Clear all donation records"
                    >
                      <Trash2 size={13} />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
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
                onDeleteDonation={handleDeleteDonation}
                deletingId={deletingDonationId}
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
          {/* PRO PLAN STREAM ASSETS (LEADERBOARD, GOALS, TIMER, SOUNDBOARD, VIDEO ALERTS, WHEELS) */}
          {/* ============================================================== */}
          {(['leaderboard', 'goal', 'timer', 'soundboard', 'video-alerts', 'wheel'] as DashboardTab[]).includes(activeTab) &&
            currentPlan === 'free' &&
            !isAdmin && (
              <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#0e1424] to-[#090D18] border border-amber-500/30 text-center max-w-2xl mx-auto space-y-6 my-8 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20 mx-auto">
                  <Lock size={32} />
                </div>
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    Pro Plan Feature
                  </span>
                  <h3 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                    {currentTabTitle} is Available on Pro Plan
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                    Leaderboard, Goals, Subathon Timer, Soundboard, Video Alerts, and Spinning Wheels are included in the{' '}
                    <strong className="text-white">Pro Plan ($4.99/mo)</strong> along with 0% platform fee, 500MB storage, and removed donation page watermark.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setUpgradeFeatureName(currentTabTitle);
                      setIsVideoUpgradeModalOpen(true);
                    }}
                    className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Upgrade to Pro Plan</span>
                  </button>
                </div>
              </div>
            )}

          {activeTab === 'leaderboard' && (currentPlan !== 'free' || isAdmin) && (
            <LeaderboardWidgetManager
              streamerToken={user?.overlayToken}
              recentDonations={stats?.recentDonations}
            />
          )}

          {activeTab === 'goal' && (currentPlan !== 'free' || isAdmin) && (
            <GoalWidgetManager
              streamerToken={user?.overlayToken}
              totalRaised={stats?.summary?.totalRevenueUsd || 0}
            />
          )}

          {activeTab === 'timer' && (currentPlan !== 'free' || isAdmin) && (
            <TimerWidgetManager
              streamerToken={user?.overlayToken}
            />
          )}

          {activeTab === 'soundboard' && (currentPlan !== 'free' || isAdmin) && (
            <SoundboardManager
              streamerToken={user?.overlayToken}
            />
          )}

          {activeTab === 'video-alerts' && (currentPlan !== 'free' || isAdmin) && (
            <VideoAlertsManager
              streamerToken={user?.overlayToken}
              isLocked={false}
              currentPlan={currentPlan}
              onUpgrade={() => setIsVideoUpgradeModalOpen(true)}
            />
          )}

          {activeTab === 'wheel' && (currentPlan !== 'free' || isAdmin) && (
            <SpinningWheelManager
              streamerToken={user?.overlayToken}
              isLocked={false}
              onUpgrade={() => setIsVideoUpgradeModalOpen(true)}
            />
          )}

          {/* ============================================================== */}
          {/* TAB 6: PAYMENT GATEWAY (AVAILABLE FOR ALL PLANS)               */}
          {/* ============================================================== */}
          {(activeTab === 'payments' || activeTab === 'telegram') && (
            <PaymentGatewayAdmin />
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
                  Click your profile logo to choose a new one from your Media Library, update your unique @username, and customize your public donation page.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 cols: Profile Logo, Unique Username, & Channel Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Feedback Banners */}
                  {profileSavedMsg && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      <span>Account updated successfully!</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  {/* 1. Profile Logo Hero Card (Click Logo to Choose New One) */}
                  <div className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 flex flex-col sm:flex-row items-center gap-6">
                    <div
                      onClick={() => setIsMediaPickerOpen(true)}
                      className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-900 border-2 border-cyan-500/50 hover:border-cyan-400 overflow-hidden cursor-pointer group flex-shrink-0 transition-all shadow-[0_0_25px_rgba(0,240,255,0.15)]"
                      title="Click to choose a new Profile Logo from Media Library"
                    >
                      <img
                        src={
                          profileAvatar ||
                          user.avatarUrl ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                        }
                        alt="Profile Logo"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-center p-2">
                        <ImageIcon size={20} className="text-cyan-400" />
                        <span className="text-[10px] font-mono font-bold text-white uppercase leading-tight">
                          Change Logo
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h3 className="text-lg font-extrabold text-white font-['Chakra_Petch'] flex items-center gap-1.5">
                          <span>{user.displayName || user.username}</span>
                          {user.isVerified && (
                            <span title="Verified Creator Badge" className="inline-flex items-center text-cyan-400">
                              <BadgeCheck size={18} className="text-cyan-400 fill-cyan-400/20" />
                            </span>
                          )}
                        </h3>
                        {user.isVerified ? (
                          <span className="text-[10px] font-mono text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 font-bold flex items-center gap-1">
                            <BadgeCheck size={11} className="text-cyan-400" />
                            <span>Verified Creator</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                            Unverified
                          </span>
                        )}
                        <span className="text-xs font-mono text-cyan-400 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 font-semibold">
                          @{user.username}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400">{user.email}</p>
                      <p className="text-xs text-slate-400">
                        Click on your profile logo to select an image/GIF from your Media Library or upload a new one.
                      </p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setIsMediaPickerOpen(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <ImageIcon size={14} />
                          <span>Click to Choose New Logo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Unique Username Changer Card */}
                  <div className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                          Unique Streamer Username
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Your public donation URL: <span className="font-mono text-cyan-400">{origin}/@{profileUsername || user.username}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div
                        className={`flex-1 flex items-center rounded-xl bg-slate-950 border transition-colors overflow-hidden ${
                          usernameStatus === 'taken'
                            ? 'border-red-500/60 focus-within:border-red-400'
                            : usernameStatus === 'available'
                            ? 'border-emerald-500/60 focus-within:border-emerald-400'
                            : 'border-slate-800 focus-within:border-cyan-400'
                        }`}
                      >
                        <span className="px-3.5 py-2.5 bg-slate-900/80 text-slate-400 font-mono text-xs border-r border-slate-800 select-none font-bold">
                          @
                        </span>
                        <input
                          type="text"
                          value={profileUsername}
                          onChange={(e) =>
                            setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                          }
                          placeholder="your_username"
                          className="w-full px-3.5 py-2.5 bg-transparent text-cyan-400 font-bold text-xs font-mono focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleChangeUsername}
                        disabled={
                          changingUsername ||
                          usernameStatus === 'taken' ||
                          usernameStatus === 'checking' ||
                          profileUsername.trim().toLowerCase() === user.username.toLowerCase()
                        }
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-extrabold text-xs font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-md shadow-cyan-500/10"
                      >
                        {changingUsername ? 'Checking & Saving...' : 'Change Username'}
                      </button>
                    </div>

                    {/* Live Uniqueness Status Feedback */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      {usernameStatusMsg ? (
                        <span
                          className={`flex items-center gap-1.5 font-semibold ${
                            usernameStatus === 'taken'
                              ? 'text-red-400'
                              : usernameStatus === 'available'
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {usernameStatus === 'taken' && <AlertCircle size={13} />}
                          {usernameStatus === 'available' && <CheckCircle2 size={13} />}
                          <span>{usernameStatusMsg}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          3–24 characters (letters, numbers, underscores). Must be unique.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. Channel Display Name & Bio Form */}
                  <form
                    onSubmit={handleSaveProfile}
                    className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4"
                  >
                    <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider border-b border-slate-800/80 pb-3">
                      Channel Profile Details
                    </h3>

                    <div className="space-y-4 text-xs">
                      {/* Streamer Display Name */}
                      <div>
                        <label className="block text-slate-300 mb-1.5 font-semibold font-mono">
                          Display Name
                        </label>
                        <input
                          type="text"
                          required
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          placeholder="e.g. Sokha Streamer"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                          Friendly creator name displayed on alerts, receipts, and headers.
                        </span>
                      </div>

                      {/* Description / Channel Bio */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 font-mono">
                          <label className="text-slate-300 font-semibold">Description / Bio</label>
                          <span className="text-[10px] text-slate-500">Public Donation Page Bio</span>
                        </div>
                        <textarea
                          rows={4}
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          placeholder="Tell your viewers what you stream, when you go live, and how tips support your channel..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400 transition-colors leading-relaxed"
                        />
                      </div>

                      {/* Custom Thank You Message for Donors */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 font-mono">
                          <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                            <Sparkles size={13} className="text-pink-400" />
                            <span>Custom Thank You Message</span>
                          </label>
                          <span className="text-[10px] text-slate-500">Post-Payment Modal Message</span>
                        </div>
                        <textarea
                          rows={3}
                          value={profileThanksMessage}
                          onChange={(e) => setProfileThanksMessage(e.target.value)}
                          placeholder="e.g. Thank you, {donor}! Your tip of {amount} has been broadcast live on stream. Your support means the world to me! 💖"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400 transition-colors leading-relaxed"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                          Displayed to viewers immediately after their donation is completed. Placeholders: <code className="text-cyan-400 font-bold">&#123;donor&#125;</code>, <code className="text-cyan-400 font-bold">&#123;amount&#125;</code>, <code className="text-cyan-400 font-bold">&#123;streamer&#125;</code>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">
                        All changes sync to MongoDB &amp; SQLite
                      </span>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={savingProfile}
                        className="font-bold"
                      >
                        Save Profile Details
                      </Button>
                    </div>
                  </form>
                </div>

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
                        {currentPlan === 'pro' ? 'Pro (500MB)' : 'Free (20MB)'}
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
                                currentPlan === 'pro' ? '500MB' : '20MB'
                              }`
                            : currentPlan === 'pro'
                            ? '0 MB / 500MB'
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
                      Ideal for new streamers starting out. Includes Donations Alerts, Payment Gateway, and 20MB storage.
                    </p>
                    <ul className="space-y-2.5 text-xs text-slate-300 flex-1">
                      <li className="flex items-center gap-2 text-cyan-300 font-semibold">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>20MB Media Storage Quota</span>
                      </li>
                      <li className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <Check size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>Payment Gateway Included (ABA PayWay &amp; Bakong KHQR)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Donations Alerts &amp; OBS 60FPS Browser Overlay</span>
                      </li>
                      <li className="flex items-center gap-2 text-amber-300 font-medium">
                        <span className="font-mono font-bold text-amber-400">10%</span>
                        <span>Fee cut deducted from incoming tips</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-500">
                        <span className="w-3.5 text-center font-mono">-</span>
                        <span>Leaderboard, Goals, Timer, Soundboard, Video Alerts &amp; Wheels</span>
                      </li>
                      <li className="flex items-center gap-2 text-slate-500">
                        <span className="w-3.5 text-center font-mono">-</span>
                        <span>Shows streambotkh.com watermark on donation page</span>
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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-slate-950 font-mono text-[9px] font-bold uppercase tracking-widest shadow-md shadow-purple-500/20 whitespace-nowrap">
                    {activePromo?.isActive
                      ? `${activePromo.promoTitle} • ${activePromo.discountPercent}% OFF`
                      : 'RECOMMENDED • 0% FEE'}
                  </div>

                  <div className="flex-1 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-purple-400">PRO PLAN (31 DAYS)</span>
                      {currentPlan === 'pro' && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold border border-purple-500/40">
                          ACTIVE • 31D CYCLE
                        </span>
                      )}
                    </div>
                    <div>
                      {activePromo?.isActive ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-extrabold text-white font-mono">
                            ${activePromo.promoPriceUsd.toFixed(2)}
                          </span>
                          <span className="text-sm font-mono text-slate-500 line-through">
                            ${activePromo.originalPriceUsd.toFixed(2)}
                          </span>
                          <span className="text-xs font-normal text-slate-400 font-sans">/ 31 days (1 month)</span>
                        </div>
                      ) : (
                        <div className="text-3xl font-extrabold text-white font-mono">
                          $4.99 <span className="text-xs font-normal text-slate-400 font-sans">/ 31 days (1 month)</span>
                        </div>
                      )}
                      <div className="text-xs text-emerald-400 font-mono font-bold pt-1">
                        0% Platform Fee (Keep 100% of your earnings)
                      </div>
                      {activePromo?.isActive && activePromo.endDate && (
                        <div className="text-[11px] text-cyan-300 font-mono mt-1">
                          Promo valid until {new Date(activePromo.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      {currentPlan === 'pro' && user.planExpiresAt && (
                        <div className="text-[11px] text-purple-300 font-mono mt-1">
                          Expires: {new Date(user.planExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      Unlocks all interactive stream widgets (Leaderboard, Goals, Timer, Soundboard, Video Alerts, Wheels), 0% fee, and 500MB storage.
                    </p>
                    <ul className="space-y-2.5 text-xs text-slate-200 flex-1">
                      <li className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <Check size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>Unlock Leaderboard, Goals, Timer &amp; Soundboard</span>
                      </li>
                      <li className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <Check size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>Unlock Video Alerts (Media Share) &amp; Spinning Wheels</span>
                      </li>
                      <li className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <Check size={14} className="flex-shrink-0" />
                        <span>0% platform fee (Keep 100%)</span>
                      </li>
                      <li className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <Check size={14} className="text-emerald-400 flex-shrink-0" />
                        <span>Removed Watermark (Clean Donation Page)</span>
                      </li>
                      <li className="flex items-center gap-2 text-purple-300 font-semibold">
                        <Check size={14} className="text-purple-400 flex-shrink-0" />
                        <span>500MB Media Cloud Storage (MP4, GIF, MP3, WAV, All Formats)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Payment Gateway &amp; Telegram Auto-Listener</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Text-to-Speech (TTS) Voice Announcer</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={14} className="text-cyan-400 flex-shrink-0" />
                        <span>Priority 24/7 direct Telegram SLA</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-5 border-t border-purple-500/30 w-full">
                    <button
                      onClick={() => {
                        if (isAdmin) {
                          setPlan('pro');
                        } else {
                          setIsVideoUpgradeModalOpen(true);
                        }
                      }}
                      disabled={currentPlan === 'pro'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                        currentPlan === 'pro'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-default'
                          : 'bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 shadow-lg shadow-purple-500/20 font-extrabold cursor-pointer'
                      }`}
                    >
                      {currentPlan === 'pro'
                        ? 'Active Plan (31d • 0% Fee)'
                        : `Upgrade to Pro ($${activePromo?.isActive ? activePromo.promoPriceUsd.toFixed(2) : '4.99'} / 31d)`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* ADMIN PANEL: PROMOTION PRICING                                 */}
          {/* ============================================================== */}
          {activeTab === 'admin-promotion' && isAdmin && (
            <AdminPromotionManager />
          )}

          {/* ============================================================== */}
          {/* ADMIN PANEL: USERS MANAGEMENT                                  */}
          {/* ============================================================== */}
          {activeTab === 'admin-users' && isAdmin && (
            <AdminUsersManager
              onCurrentUserPlanUpdated={() => {
                refreshUser();
                loadData();
              }}
            />
          )}

          {/* ============================================================== */}
          {/* ADMIN PANEL: PULL REQUESTS / CLIENT ISSUE REPORTS              */}
          {/* ============================================================== */}
          {(activeTab === 'admin-requests' || activeTab === 'report-issue') && (
            <AdminPullRequestsManager
              isAdmin={isAdmin && activeTab === 'admin-requests'}
              onUserPlanUpdated={() => {
                refreshUser();
                loadData();
              }}
            />
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
                    onClick={() => {
                      logout();
                      onNavigate('home');
                    }}
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
        onClose={() => {
          setIsVideoUpgradeModalOpen(false);
          setUpgradeFeatureName(undefined);
        }}
        featureName={upgradeFeatureName}
        telegramContactUrl="https://t.me/hchenheng"
      />

      {/* Reusable Media Library Picker Modal (with direct upload) */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        currentUrl={profileAvatar}
        title="Choose Profile Logo from Media Library"
        subtitle="Select an image or GIF from your library, or upload a new file directly."
        onSelect={async (selectedUrl) => {
          setProfileAvatar(selectedUrl);
          try {
            setSavingProfile(true);
            await streamerService.updateProfile({
              username: profileUsername.trim().replace(/^@/, '').toLowerCase() || user.username,
              displayName: profileName.trim() || user.displayName,
              bio: profileBio.trim(),
              description: profileBio.trim(),
              avatarUrl: selectedUrl
            });
            await refreshUser();
            setProfileSavedMsg(true);
            setTimeout(() => setProfileSavedMsg(false), 3000);
            loadData();
          } catch (err: any) {
            setProfileErrorMsg(err.message || 'Failed to update profile logo');
          } finally {
            setSavingProfile(false);
          }
        }}
      />
    </div>
  );
};
