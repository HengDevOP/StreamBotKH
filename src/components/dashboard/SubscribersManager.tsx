'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Crown,
  Star,
  Flame,
  Sparkles,
  ShieldCheck,
  Zap,
  Heart,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  Users,
  DollarSign,
  Calendar,
  Lock,
  Layers,
  Palette,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Eye,
  CheckCircle2,
  RefreshCw,
  Search,
  UserCheck,
  Gift,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  AlertTriangle,
  Save,
  Send,
  Radio,
  Link2,
  Unlink,
  Bell
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { SubscriberTier, SubscriberItem, TelegramOutletGroup } from '../../types/subscriber';
import { MediaPickerModal } from './MediaPickerModal';
import { BadgeIconPickerModal } from './BadgeIconPickerModal';
import { BADGE_ICON_LIST, getBadgeIconComponent } from '../../data/badgeIcons';
import { useSocket } from '../../context/SocketContext';
import { SubscriberAlertStudio } from './SubscriberAlertStudio';

interface SubscribersManagerProps {
  streamerToken?: string;
  streamerUsername?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
  initialSelectedTierId?: string;
  onSelectTierId?: (tierId: string | null) => void;
  onRegenerateToken?: () => void;
}

const PRESET_BADGE_GIFS = [
  {
    id: 'pokemon-pikachu',
    name: 'Pikachu',
    url: '/assets/pokemon/25_idle.gif',
    description: 'Electric mascot idle'
  },
  {
    id: 'pokemon-charmander',
    name: 'Charmander',
    url: '/assets/pokemon/4_idle.gif',
    description: 'Fiery mascot idle'
  },
  {
    id: 'pokemon-gengar',
    name: 'Gengar',
    url: '/assets/pokemon/94_idle.gif',
    description: 'Shadow ghost hype'
  },
  {
    id: 'pokemon-mew',
    name: 'Mew',
    url: '/assets/pokemon/151_idle.gif',
    description: 'Mythical legendary'
  },
  {
    id: 'pokemon-snorlax',
    name: 'Snorlax',
    url: '/assets/pokemon/143_idle.gif',
    description: 'Chilled champion'
  },
  {
    id: 'pokemon-lucario',
    name: 'Lucario',
    url: '/assets/pokemon/448_idle.gif',
    description: 'Aura warrior'
  },
  {
    id: 'pokemon-eevee',
    name: 'Eevee',
    url: '/assets/pokemon/133_idle.gif',
    description: 'Adorable companion'
  },
  {
    id: 'pokemon-squirtle',
    name: 'Squirtle',
    url: '/assets/pokemon/7_idle.gif',
    description: 'Water squad idle'
  }
];

const PRESET_STREAMER_COLORS = [
  { name: 'Neon Cyan', color: '#00F0FF' },
  { name: 'Emerald Lime', color: '#10B981' },
  { name: 'Electric Green', color: '#22C55E' },
  { name: 'Solar Amber', color: '#F59E0B' },
  { name: 'Flame Orange', color: '#F97316' },
  { name: 'Crimson Red', color: '#EF4444' },
  { name: 'Hot Pink', color: '#EC4899' },
  { name: 'Cyber Violet', color: '#8B5CF6' },
  { name: 'Royal Purple', color: '#A855F7' },
  { name: 'Electric Blue', color: '#3B82F6' },
  { name: 'Sky Cyan', color: '#0EA5E9' },
  { name: 'Pure White', color: '#FFFFFF' }
];

export const SubscribersManager: React.FC<SubscribersManagerProps> = ({
  streamerToken,
  streamerUsername,
  isLocked = false,
  onUpgrade,
  initialSelectedTierId,
  onSelectTierId,
  onRegenerateToken
}) => {
  const token = streamerToken || 'demo-token';
  const username = streamerUsername || 'streamer';

  const { socket, joinOverlayRoom } = useSocket();

  useEffect(() => {
    if (token) {
      joinOverlayRoom(token);
    }
  }, [token, joinOverlayRoom]);

  // Feature Settings
  const [tiers, setTiers] = useState<SubscriberTier[]>([]);
  const [savedTiers, setSavedTiers] = useState<SubscriberTier[]>([]);

  // Subscribers Roster
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [stats, setStats] = useState({ totalActive: 0, totalHistorical: 0, monthlyRevenueUsd: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState('all');

  // Loading / saving states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTier, setSavingTier] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingComment, setTestingComment] = useState(false);
  const [testSuccessToast, setTestSuccessToast] = useState<string | null>(null);

  // Telegram Outlet Group (for subscriber payment verification)
  const [telegramOutletGroup, setTelegramOutletGroup] = useState<TelegramOutletGroup | null>(null);
  const [loadingOutlet, setLoadingOutlet] = useState(false);
  const [fetchingDialogs, setFetchingDialogs] = useState(false);
  const [availableDialogs, setAvailableDialogs] = useState<Array<{ id: string; title: string; username?: string }>>([]);
  const [isOutletModalOpen, setIsOutletModalOpen] = useState(false);
  const [outletSearchQuery, setOutletSearchQuery] = useState('');
  const [customOutletChatId, setCustomOutletChatId] = useState('');
  const [customOutletTitle, setCustomOutletTitle] = useState('');
  const [outletToast, setOutletToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SubscriberTier | null>(null);

  // Active Tier selected for Alert Studio (null = list view)
  const [selectedTierForAlert, setSelectedTierForAlert] = useState<SubscriberTier | null>(null);

  // Manual Add Subscriber Modal
  const [isManualSubModalOpen, setIsManualSubModalOpen] = useState(false);
  const [manualSubName, setManualSubName] = useState('');
  const [manualTierId, setManualTierId] = useState('');

  // Tier form state
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('4.99');
  const [tierCurrency, setTierCurrency] = useState<'USD' | 'KHR'>('USD');
  const [tierBadgeText, setTierBadgeText] = useState('SUB');
  const [tierBadgeIcon, setTierBadgeIcon] = useState('Crown');
  const [tierBadgeColor, setTierBadgeColor] = useState('#00F0FF');
  const [tierBadgeBg, setTierBadgeBg] = useState('rgba(0, 240, 255, 0.2)');
  const [tierBadgeBorder, setTierBadgeBorder] = useState('rgba(0, 240, 255, 0.4)');
  const [tierBadgeGif, setTierBadgeGif] = useState('/assets/pokemon/25_idle.gif');
  const [badgeMode, setBadgeMode] = useState<'gif' | 'icon'>('gif');
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [uploadingGif, setUploadingGif] = useState(false);
  const [gifUploadError, setGifUploadError] = useState<string | null>(null);
  const [tierPerksInput, setTierPerksInput] = useState('Exclusive Chat Badge, Priority Alerts');
  const [tierDescription, setTierDescription] = useState('');
  const [tierEnabled, setTierEnabled] = useState<boolean>(true);

  // Subscribers auto-persists to MongoDB so navigation is never blocked
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('dashboard-unsaved-changes', { detail: { tab: 'subscribers', hasUnsaved: false } })
    );
  }, []);

  // Sync with initialSelectedTierId or URL search params (?id= or ?tierId=)
  useEffect(() => {
    if (tiers.length === 0) return;

    let targetTierId = initialSelectedTierId;
    if (!targetTierId && typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('tab=subscribers') || !search.includes('tab=')) {
        if (search.includes('?id=')) {
          targetTierId = search.split('?id=')[1]?.split('&')[0];
        } else if (search.includes('&id=')) {
          targetTierId = search.split('&id=')[1]?.split('&')[0];
        } else if (search.includes('?tierId=')) {
          targetTierId = search.split('?tierId=')[1]?.split('&')[0];
        } else if (search.includes('&tierId=')) {
          targetTierId = search.split('&tierId=')[1]?.split('&')[0];
        }
      }
    }

    if (targetTierId) {
      const match = tiers.find((t) => t.id === targetTierId);
      if (match) {
        setSelectedTierForAlert(match);
      }
    } else if (!initialSelectedTierId) {
      setSelectedTierForAlert(null);
    }
  }, [initialSelectedTierId, tiers]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const search = window.location.search;
        let targetTierId: string | null = null;
        if (search.includes('tab=subscribers') || !search.includes('tab=')) {
          if (search.includes('?id=')) {
            targetTierId = search.split('?id=')[1]?.split('&')[0] || null;
          } else if (search.includes('&id=')) {
            targetTierId = search.split('&id=')[1]?.split('&')[0] || null;
          } else if (search.includes('?tierId=')) {
            targetTierId = search.split('?tierId=')[1]?.split('&')[0] || null;
          } else if (search.includes('&tierId=')) {
            targetTierId = search.split('&tierId=')[1]?.split('&')[0] || null;
          }
        }
        if (targetTierId) {
          const match = tiers.find((t) => t.id === targetTierId);
          setSelectedTierForAlert(match || null);
          onSelectTierId?.(match ? match.id : null);
        } else {
          setSelectedTierForAlert(null);
          onSelectTierId?.(null);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tiers, onSelectTierId]);

  const handleOpenTierAlert = (tierToOpen: SubscriberTier) => {
    setSelectedTierForAlert(tierToOpen);
    onSelectTierId?.(tierToOpen.id);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/dashboard?tab=subscribers&id=${tierToOpen.id}`);
    }
  };

  const handleBackFromAlertStudio = () => {
    setSelectedTierForAlert(null);
    onSelectTierId?.(null);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/dashboard?tab=subscribers');
    }
  };

  const handleTierAlertSaved = (updatedTier: SubscriberTier) => {
    setTiers((prev) => prev.map((t) => (t.id === updatedTier.id ? updatedTier : t)));
    setSavedTiers((prev) => prev.map((t) => (t.id === updatedTier.id ? updatedTier : t)));
    setSelectedTierForAlert(updatedTier);
  };

  // Load Settings & Subscribers
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Settings
      const settingsRes = await fetch(`/api/widgets/subscribers/settings?token=${token}&username=${username}`);
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.settings) {
        if (Array.isArray(settingsData.settings.tiers)) {
          setTiers(settingsData.settings.tiers);
          setSavedTiers(settingsData.settings.tiers);
        } else {
          setTiers([]);
          setSavedTiers([]);
        }
        setTelegramOutletGroup(settingsData.settings.telegramOutletGroup || null);
      }

      // 2. Subscribers Roster
      const subsRes = await fetch(`/api/widgets/subscribers?token=${token}&username=${username}`);
      const subsData = await subsRes.json();
      if (subsData.success) {
        setSubscribers(subsData.subscribers || []);
        if (subsData.stats) setStats(subsData.stats);
      }
    } catch (err) {
      console.error('Failed to load subscriber data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, username]);

  const authFetch = (url: string, init: RequestInit = {}) => {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('streamneon_auth_token') : null;
    const headers = new Headers(init.headers || {});
    if (authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }
    return fetch(url, { ...init, headers });
  };

  const persistTiers = async (updatedTiers: SubscriberTier[]) => {
    setSaving(true);
    try {
      const authToken = typeof window !== 'undefined'
        ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('auth_token'))
        : null;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/widgets/subscribers/settings', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          token,
          username,
          enabled: true,
          tiers: updatedTiers,
          telegramOutletGroup
        })
      });
      const data = await res.json();
      if (data.success) {
        setSavedTiers(updatedTiers);
      } else {
        console.error('Failed to save subscriber tiers to database:', data.error);
      }
    } catch (err) {
      console.error('Error saving subscriber tiers:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenOutletModal = async () => {
    setIsOutletModalOpen(true);
    setOutletSearchQuery('');
    setCustomOutletChatId('');
    setCustomOutletTitle('');
    setFetchingDialogs(true);
    try {
      const res = await authFetch('/api/telegram/groups');
      if (res.ok) {
        const data = await res.json();
        const dialogs = data.availableDialogs || [];
        const groups = data.groups || [];
        const combinedMap = new Map<string, { id: string; title: string; username?: string }>();
        dialogs.forEach((d: any) => {
          if (d.id) combinedMap.set(String(d.id), { id: String(d.id), title: d.title || 'Untitled Group', username: d.username });
        });
        groups.forEach((g: any) => {
          const cid = String(g.chat_id || g.chatId || g.id);
          if (cid && !combinedMap.has(cid)) {
            combinedMap.set(cid, { id: cid, title: g.title || 'Telegram Group', username: g.username });
          }
        });
        setAvailableDialogs(Array.from(combinedMap.values()));
      }
    } catch (err) {
      console.error('Failed to load available telegram dialogs:', err);
    } finally {
      setFetchingDialogs(false);
    }
  };

  const handleConnectOutletGroup = async (group: TelegramOutletGroup) => {
    setLoadingOutlet(true);
    try {
      const res = await authFetch('/api/widgets/subscribers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          telegramOutletGroup: group,
          tiers
        })
      });
      const data = await res.json();
      if (data.success) {
        setTelegramOutletGroup(group);
        setIsOutletModalOpen(false);
        setOutletToast({ type: 'success', message: `Connected "${group.title}" as Subscriber Telegram Outlet!` });
        setTimeout(() => setOutletToast(null), 3500);
      } else {
        setOutletToast({ type: 'error', message: data.error || 'Failed to connect Telegram outlet group.' });
        setTimeout(() => setOutletToast(null), 3500);
      }
    } catch (err: any) {
      setOutletToast({ type: 'error', message: err.message || 'Network error connecting outlet group.' });
      setTimeout(() => setOutletToast(null), 3500);
    } finally {
      setLoadingOutlet(false);
    }
  };

  const handleDisconnectOutletGroup = async () => {
    if (!window.confirm('Disconnect this Telegram outlet group? GramJS will stop listening for subscriber transactions from this group.')) {
      return;
    }
    setLoadingOutlet(true);
    try {
      const res = await authFetch('/api/widgets/subscribers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          telegramOutletGroup: null,
          tiers
        })
      });
      const data = await res.json();
      if (data.success) {
        setTelegramOutletGroup(null);
        setOutletToast({ type: 'success', message: 'Subscriber Telegram Outlet Group disconnected.' });
        setTimeout(() => setOutletToast(null), 3500);
      } else {
        setOutletToast({ type: 'error', message: data.error || 'Failed to disconnect outlet group.' });
        setTimeout(() => setOutletToast(null), 3500);
      }
    } catch (err: any) {
      setOutletToast({ type: 'error', message: err.message || 'Network error disconnecting outlet group.' });
      setTimeout(() => setOutletToast(null), 3500);
    } finally {
      setLoadingOutlet(false);
    }
  };

  const filteredDialogs = useMemo(() => {
    if (!outletSearchQuery.trim()) return availableDialogs;
    const q = outletSearchQuery.toLowerCase();
    return availableDialogs.filter(
      (d) =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.id && d.id.toLowerCase().includes(q)) ||
        (d.username && d.username.toLowerCase().includes(q))
    );
  }, [availableDialogs, outletSearchQuery]);

  const handleUploadGifFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image') && !file.name.toLowerCase().endsWith('.gif')) {
      setGifUploadError('Please select a valid image or GIF file (.gif, .png, .webp)');
      return;
    }

    setUploadingGif(true);
    setGifUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.media?.url) {
        setTierBadgeGif(data.media.url);
        setBadgeMode('gif');
      } else {
        setGifUploadError(data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Failed to upload badge GIF:', err);
      setGifUploadError(err.message || 'Network error during upload');
    } finally {
      setUploadingGif(false);
    }
  };

  // Open modal to add or edit tier
  const handleOpenTierModal = (tierToEdit?: SubscriberTier) => {
    if (tierToEdit) {
      setEditingTier(tierToEdit);
      setTierName(tierToEdit.name);
      setTierPrice(String(tierToEdit.price));
      setTierCurrency(tierToEdit.currency || 'USD');
      setTierBadgeText(tierToEdit.badgeText);
      setTierBadgeIcon(tierToEdit.badgeIcon || 'Crown');
      setTierBadgeColor(tierToEdit.badgeColor || '#00F0FF');
      setTierBadgeBg(tierToEdit.badgeBg || 'rgba(0, 240, 255, 0.2)');
      setTierBadgeBorder(tierToEdit.badgeBorder || 'rgba(0, 240, 255, 0.4)');
      setTierPerksInput(tierToEdit.perks ? tierToEdit.perks.join(', ') : '');
      setTierDescription(tierToEdit.description || '');
      setTierEnabled(tierToEdit.enabled !== false);
      const existingGif = tierToEdit.badgeGifUrl || tierToEdit.badgeImage || '';
      setTierBadgeGif(existingGif);
      setBadgeMode(existingGif ? 'gif' : 'icon');
    } else {
      setEditingTier(null);
      setTierName('');
      setTierPrice('4.99');
      setTierCurrency('USD');
      setTierBadgeText('SUB');
      setTierBadgeIcon('Crown');
      setTierBadgeColor('#00F0FF');
      setTierBadgeBg('rgba(0, 240, 255, 0.2)');
      setTierBadgeBorder('rgba(0, 240, 255, 0.4)');
      setTierPerksInput('Exclusive Channel Badge, Highlighted Comments');
      setTierDescription('');
      setTierEnabled(true);
      setTierBadgeGif('/assets/pokemon/25_idle.gif');
      setBadgeMode('gif');
    }
    setGifUploadError(null);
    setIsTierModalOpen(true);
  };

  const handleSaveTierForm = async () => {
    if (!tierName.trim()) return;

    setSavingTier(true);
    try {
      const parsedPerks = tierPerksInput
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const finalGifUrl = badgeMode === 'gif' && tierBadgeGif.trim() ? tierBadgeGif.trim() : undefined;

      const newTier: SubscriberTier = {
        id: editingTier ? editingTier.id : 'tier_' + Date.now(),
        name: tierName.trim(),
        price: Math.max(0.5, parseFloat(tierPrice) || 1.99),
        currency: tierCurrency,
        badgeText: tierBadgeText.trim().toUpperCase().slice(0, 8),
        badgeIcon: tierBadgeIcon,
        badgeColor: tierBadgeColor,
        badgeBg: tierBadgeBg,
        badgeBorder: tierBadgeBorder,
        badgeGifUrl: finalGifUrl,
        badgeImage: finalGifUrl,
        perks: parsedPerks.length > 0 ? parsedPerks : ['Exclusive Channel Badge'],
        description: tierDescription.trim(),
        enabled: tierEnabled,
        alertSettings: editingTier?.alertSettings
      };

      const updatedTiers = editingTier
        ? tiers.map((t) => (t.id === editingTier.id ? newTier : t))
        : [...tiers, newTier];

      setTiers(updatedTiers);
      setSavedTiers(updatedTiers);
      setIsTierModalOpen(false);

      await persistTiers(updatedTiers);
    } catch (err) {
      console.error('Failed to save subscriber tier:', err);
    } finally {
      setSavingTier(false);
    }
  };

  const handleToggleTier = async (tierId: string) => {
    const updatedTiers = tiers.map((t) =>
      t.id === tierId ? { ...t, enabled: t.enabled === false ? true : false } : t
    );
    setTiers(updatedTiers);
    setSavedTiers(updatedTiers);
    await persistTiers(updatedTiers);
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!window.confirm('Delete this subscriber tier?')) return;
    const updatedTiers = tiers.filter((t) => t.id !== tierId);
    setTiers(updatedTiers);
    setSavedTiers(updatedTiers);
    await persistTiers(updatedTiers);
  };

  const handleClearAllTiers = async () => {
    if (tiers.length === 0) return;
    if (window.confirm('Are you sure you want to remove all subscriber tiers?')) {
      setTiers([]);
      setSavedTiers([]);
      await persistTiers([]);
    }
  };

  // Manual Add Subscriber
  const handleManualAddSubscriber = async () => {
    if (!manualSubName.trim()) return;
    const selectedTier = tiers.find((t) => t.id === manualTierId) || tiers[0];

    try {
      const res = await fetch('/api/widgets/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_add',
          streamerToken: token,
          streamerUsername: username,
          subscriberName: manualSubName.trim(),
          tierId: selectedTier.id,
          paymentMethod: 'manual_gift'
        })
      });
      const data = await res.json();
      if (data.success && data.subscriber) {
        setSubscribers((prev) => [data.subscriber, ...prev]);
        setStats((prev) => ({
          ...prev,
          totalActive: prev.totalActive + 1,
          totalHistorical: prev.totalHistorical + 1
        }));
        setIsManualSubModalOpen(false);
        setManualSubName('');
      }
    } catch (err) {
      console.error('Failed to manually add subscriber:', err);
    }
  };

  // Revoke / Cancel Subscriber
  const handleCancelSubscriber = async (subId: string) => {
    try {
      await fetch('/api/widgets/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_subscription',
          id: subId
        })
      });
      setSubscribers((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, status: 'cancelled' } : s))
      );
      setStats((prev) => ({ ...prev, totalActive: Math.max(0, prev.totalActive - 1) }));
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    }
  };

  // Test send comment to Live Chat Overlay with subscriber badge
  const handleTestOverlayComment = async (sub?: SubscriberItem | SubscriberTier) => {
    setTestingComment(true);
    const tierName = (sub as any)?.name || (sub as any)?.tierName || tiers[0]?.name || 'Subscriber';
    const author = (sub as SubscriberItem)?.subscriberName || `SuperFan_${tierName.replace(/\s+/g, '')}`;
    const badgeText = sub?.badgeText !== undefined ? sub.badgeText : (tiers[0]?.badgeText ?? '');
    const badgeColor = sub?.badgeColor || tiers[0]?.badgeColor || '#00F0FF';
    const badgeBg = sub?.badgeBg || tiers[0]?.badgeBg;
    const badgeBorder = sub?.badgeBorder || tiers[0]?.badgeBorder;
    const badgeIcon = sub?.badgeIcon || tiers[0]?.badgeIcon || 'Crown';
    const badgeGifUrl = (sub as any)?.badgeGifUrl || (sub as any)?.badgeImage || '';
    const badgeImage = badgeGifUrl;

    const testPayload = {
      token,
      streamerToken: token,
      action: 'test_message',
      author,
      message: `Hyped to be a proud ${tierName} subscriber! Let’s go! 🔥✨`,
      badge: badgeText,
      badgeColor,
      badgeBg,
      badgeBorder,
      badgeIcon,
      badgeGifUrl,
      badgeImage,
      isTest: true
    };

    // Instant Socket broadcast if connected
    if (socket && socket.connected) {
      socket.emit('chat:test_message', testPayload);
      setTestSuccessToast(`Broadcasted ${author}'s badge comment to Live Chat overlay!`);
      setTimeout(() => setTestSuccessToast(null), 3000);
      setTimeout(() => setTestingComment(false), 500);
      return;
    }

    try {
      const res = await fetch('/api/widgets/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setTestSuccessToast(`Broadcasted ${author}'s badge comment to Live Chat overlay!`);
        setTimeout(() => setTestSuccessToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to send test subscriber comment:', err);
    } finally {
      setTimeout(() => setTestingComment(false), 800);
    }
  };

  const renderBadgeIconPreview = (iconName?: string, color?: string, sizeClass = 'w-4 h-4') => {
    const IconComp = getBadgeIconComponent(iconName || 'Crown');
    return <IconComp className={`${sizeClass} flex-shrink-0`} style={{ color: color || '#00F0FF' }} />;
  };

  const filteredSubscribers = subscribers.filter((s) => {
    const matchesSearch = s.subscriberName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTierFilter === 'all' || s.tierId === selectedTierFilter;
    return matchesSearch && matchesTier;
  });

  if (isLocked) {
    return (
      <Card className="p-8 text-center bg-slate-900/60 border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2 font-['Chakra_Petch']">Subscribers Feature is Pro Only</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-6 text-sm">
          Upgrade to unlock Channel Memberships &amp; Subscriber Badges. Allow viewers to pay monthly support and display exclusive badges in your OBS chat overlay.
        </p>
        {onUpgrade && (
          <Button onClick={onUpgrade} className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold">
            Upgrade to Pro
          </Button>
        )}
      </Card>
    );
  }

  // VIEW: TARGET SUBSCRIBER TIER ALERT STUDIO (WHEN A TIER IS SELECTED)
  if (selectedTierForAlert) {
    return (
      <SubscriberAlertStudio
        tier={selectedTierForAlert}
        streamerToken={token}
        streamerUsername={username}
        allTiers={tiers}
        onBack={handleBackFromAlertStudio}
        onSaveSuccess={handleTierAlertSaved}
        onRegenerateToken={onRegenerateToken}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. SUBSCRIBER TIERS & BADGE CONFIGURATION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Membership Tiers &amp; Badges</span>
              {saving && (
                <span className="text-[11px] font-mono font-normal text-cyan-400 flex items-center gap-1 ml-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Customize tier pricing, badge icons, badge text, and colors displayed in OBS stream chat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tiers.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllTiers}
                className="text-xs text-slate-500 hover:text-red-400 px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-red-500/30 transition-colors flex items-center gap-1 cursor-pointer font-mono"
                title="Remove all subscriber tiers"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remove All</span>
              </button>
            )}
            <Button
              onClick={() => handleOpenTierModal()}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Tier</span>
            </Button>
          </div>
        </div>

        {/* Tiers Grid or Empty State */}
        {tiers.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-2xl bg-[#090d16] border border-dashed border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Crown className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
                No Subscription Tiers Created Yet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All pre-set tiers have been removed. You can now create your own custom tiers from scratch with your preferred pricing, badge icon, badge text, colors, and perks!
              </p>
            </div>
            <Button
              onClick={() => handleOpenTierModal()}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Tier</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier, idx) => (
            <div
              key={tier.id}
              onClick={() => handleOpenTierAlert(tier)}
              className={`p-5 rounded-2xl bg-[#090d16] border transition-all shadow-xl flex flex-col justify-between space-y-4 relative group cursor-pointer ${
                tier.enabled !== false
                  ? 'border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-500/10'
                  : 'border-slate-800/60 bg-[#090d16]/60 opacity-75'
              }`}
            >
              <div className="space-y-3">
                {/* Header row with Tier Title & Individual Tier Toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Tier #{idx + 1}</span>
                      {tier.enabled === false ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                          Paused
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                          <Bell className="w-2.5 h-2.5" />
                          <span>Alert Setup</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white font-['Chakra_Petch'] truncate mt-0.5">{tier.name}</h3>
                  </div>

                  {/* Individual Tier ON / OFF Switch */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggleTier(tier.id)}
                      title={tier.enabled !== false ? 'Tier Active (Visible on Donation Page)' : 'Tier Paused (Hidden on Donation Page)'}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        tier.enabled !== false ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                          tier.enabled !== false ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-[10px] font-mono font-bold ${tier.enabled !== false ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {tier.enabled !== false ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* Price Display & Live Badge Preview Pill */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white font-['Chakra_Petch']">
                      ${tier.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/ month</span>
                  </div>

                  {/* Live Vector Badge */}
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    style={{ color: tier.badgeColor || '#00F0FF' }}
                  >
                    {tier.badgeGifUrl || tier.badgeImage ? (
                      <img
                        src={tier.badgeGifUrl || tier.badgeImage}
                        alt={tier.badgeText || 'Badge'}
                        className="w-4 h-4 object-contain inline-block flex-shrink-0"
                      />
                    ) : (
                      renderBadgeIconPreview(tier.badgeIcon, tier.badgeColor, 'w-4 h-4')
                    )}
                    {tier.badgeText ? <span>{tier.badgeText}</span> : null}
                  </span>
                </div>

                {tier.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{tier.description}</p>
                )}

                {/* Perks list */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Perks Included:</span>
                  <ul className="space-y-1">
                    {(tier.perks || []).slice(0, 3).map((perk, pIdx) => (
                      <li key={pIdx} className="text-xs text-slate-300 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTierAlert(tier);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95"
                  title="Open Alert Dashboard for this Tier"
                >
                  <Bell className="w-3.5 h-3.5 text-slate-950" />
                  <span>Alert Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestOverlayComment(tier);
                  }}
                  disabled={testingComment}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-800 hover:border-cyan-500/40 transition-colors cursor-pointer"
                  title="Test comment on live OBS chat overlay"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTierModal(tier);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Edit Tier"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTier(tier.id);
                  }}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors cursor-pointer"
                  title="Delete Tier"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* 2. DEDICATED TELEGRAM OUTLET GROUP FOR SUBSCRIBERS */}
      <div className="p-5 rounded-2xl bg-[#090d16] border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                <Send className="w-4 h-4 transform -rotate-45" />
              </div>
              <h2 className="text-base font-bold text-white font-['Chakra_Petch'] tracking-wide">
                Subscriber Telegram Outlet Group
              </h2>

              {telegramOutletGroup ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ACTIVE LISTENER
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  NOT CONNECTED
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Connect a dedicated Telegram group to listen for incoming bank &amp; Bakong KHQR transaction receipts for subscriber memberships. Verified receipts automatically activate the viewer&apos;s 30-day VIP badge and broadcast overlay alerts.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {telegramOutletGroup ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenOutletModal}
                  disabled={loadingOutlet}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOutlet ? 'animate-spin' : ''}`} />
                  <span>Change Group</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectOutletGroup}
                  disabled={loadingOutlet}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-400 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <Button
                type="button"
                onClick={handleOpenOutletModal}
                disabled={loadingOutlet}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5 transform -rotate-45" />
                <span>Connect Outlet Group</span>
              </Button>
            )}
          </div>
        </div>

        {/* If connected: Show live info banner */}
        {telegramOutletGroup && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                <Radio className="w-4 h-4 text-slate-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Target Telegram Group</span>
                <span className="text-xs font-semibold text-white truncate block">
                  {telegramOutletGroup.title}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                <Link2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Chat ID / Handle</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-medium text-slate-200 truncate">
                    {telegramOutletGroup.chatId}
                  </span>
                  {telegramOutletGroup.username && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      (@{telegramOutletGroup.username})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-slate-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold block">Status</span>
                <span className="text-xs text-slate-300 block truncate">
                  Auto-verifying subscriber transactions
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. RESPONSIVE WEB APPLICATION TIER MODAL */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-4xl lg:max-w-5xl flex flex-col rounded-none sm:rounded-2xl bg-[#080C16] border-0 sm:border sm:border-cyan-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Sticky Web Application Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-[#0A0F1D]/95 backdrop-blur-md flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-inner">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-['Chakra_Petch'] leading-tight">
                    {editingTier ? 'Edit Subscriber Tier' : 'Configure New Subscriber Tier'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
                    Set up tier pricing, choose your channel vector badge, and customize live overlay styles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTierModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body: Responsive 2-Column Web Application */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                
                {/* LEFT COLUMN: TIER CONFIGURATION (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Tier Name & Monthly Price */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Tier Name <span className="text-cyan-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={tierName}
                          onChange={(e) => setTierName(e.target.value)}
                          placeholder="e.g. VIP Club, Diamond Tier"
                          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Monthly Price (USD) <span className="text-cyan-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={tierPrice}
                            onChange={(e) => setTierPrice(e.target.value)}
                            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vector Badge Selection */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-white uppercase tracking-wider font-['Chakra_Petch'] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Subscriber Vector Badge</span>
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Select the vector icon displayed next to usernames on stream
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsIconPickerOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 hover:border-cyan-400 text-xs font-bold text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Browse 48 Icons</span>
                      </button>
                    </div>

                    {/* Active Vector Icon Display */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0 shadow-inner">
                          {renderBadgeIconPreview(tierBadgeIcon, tierBadgeColor, 'w-6 h-6')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-['Chakra_Petch']">
                              {tierBadgeIcon}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-cyan-400 border border-slate-700">
                              Selected
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Clean vector icon displayed on stream chat with custom color
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsIconPickerOpen(true)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer font-medium"
                      >
                        Change Icon →
                      </button>
                    </div>

                    {/* Quick Popular Icons */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">Quick Popular Stream Icons:</span>
                        <button
                          type="button"
                          onClick={() => setIsIconPickerOpen(true)}
                          className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          View all 48 →
                        </button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                        {BADGE_ICON_LIST.slice(0, 8).map((item) => {
                          const IconComp = item.icon;
                          const isSelected = tierBadgeIcon.toLowerCase() === item.id.toLowerCase();
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setTierBadgeIcon(item.id)}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all group cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/40 text-cyan-300'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                              }`}
                              title={item.label}
                            >
                              <IconComp
                                className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform"
                                style={{ color: isSelected ? tierBadgeColor : undefined }}
                              />
                              <span className="text-[9px] font-medium truncate max-w-full">
                                {item.id}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Color Customizer */}
                    <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Customize Vector Color</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Color Wheel or HEX
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex-1">
                          <div className="relative flex items-center">
                            <input
                              type="color"
                              value={tierBadgeColor.startsWith('#') && tierBadgeColor.length === 7 ? tierBadgeColor : '#00F0FF'}
                              onChange={(e) => setTierBadgeColor(e.target.value)}
                              className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                              title="Open color wheel"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={tierBadgeColor}
                              onChange={(e) => setTierBadgeColor(e.target.value)}
                              placeholder="#00F0FF"
                              className="w-full bg-transparent text-xs text-white font-mono font-bold uppercase focus:outline-none"
                              maxLength={7}
                            />
                          </div>
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20 shadow-sm"
                            style={{ backgroundColor: tierBadgeColor }}
                          />
                        </div>

                        {/* Presets */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {PRESET_STREAMER_COLORS.map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => setTierBadgeColor(c.color)}
                              className={`w-7 h-7 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                                tierBadgeColor.toLowerCase() === c.color.toLowerCase()
                                  ? 'ring-2 ring-white scale-110 border-white'
                                  : 'border-slate-800 hover:scale-105'
                              }`}
                              style={{ backgroundColor: c.color }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Badge Optional Label Text */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">
                          Badge Label Text
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Optional (Max 8)
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={8}
                        value={tierBadgeText}
                        onChange={(e) => setTierBadgeText(e.target.value.toUpperCase())}
                        placeholder="Leave empty for icon-only (or enter e.g. VIP)"
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono font-bold tracking-wider focus:outline-none focus:border-cyan-400"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Leave empty if you only want the vector icon displayed on stream.
                      </p>
                    </div>
                  </div>

                  {/* Perks & Description */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Perks Included (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={tierPerksInput}
                        onChange={(e) => setTierPerksInput(e.target.value)}
                        placeholder="Exclusive Chat Badge, Priority Alerts, Highlighted Name"
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Tier Description (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={tierDescription}
                        onChange={(e) => setTierDescription(e.target.value)}
                        placeholder="Tell viewers what makes this membership tier special..."
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                      />
                    </div>
                  </div>

                  {/* Tier Active Status Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-white block">Tier Active Status</span>
                      <span className="text-[11px] text-slate-400 block">Enable this tier on your donation & membership page</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTierEnabled(!tierEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          tierEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                            tierEnabled ? 'translate-x-4' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-[10px] font-mono font-bold ${tierEnabled ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {tierEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: REAL-TIME WEB APPLICATION PREVIEWS (5 cols) */}
                <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
                  {/* Preview 1: Live OBS Stream Chat Overlay Simulation */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0B101E] to-[#070A14] border border-cyan-500/25 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-['Chakra_Petch'] flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live OBS Chat Overlay</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">1080p Stream</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/95 border border-slate-800 space-y-2.5 shadow-inner">
                      {/* Normal viewer line */}
                      <div className="flex items-baseline gap-1.5 text-xs text-slate-400 font-sans">
                        <span className="font-bold text-slate-400 font-['Chakra_Petch'] text-xs">GamerKhmer:</span>
                        <span>GG what an epic clutch move! 🎮</span>
                      </div>

                      {/* Subscriber line with custom vector badge */}
                      <div className="flex items-baseline gap-1.5 text-xs text-white font-sans bg-cyan-950/20 p-2 rounded-lg border border-cyan-500/15">
                        <div className="flex items-center gap-1 flex-shrink-0 self-center">
                          <span
                            className="inline-flex items-center self-center flex-shrink-0 leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                            style={{ color: tierBadgeColor }}
                          >
                            {renderBadgeIconPreview(tierBadgeIcon, tierBadgeColor, 'w-4 h-4')}
                            {tierBadgeText ? (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider ml-1 leading-none" style={{ color: tierBadgeColor }}>
                                {tierBadgeText}
                              </span>
                            ) : null}
                          </span>
                          <span className="font-bold text-cyan-300 font-['Chakra_Petch'] text-xs">
                            SuperFan99:
                          </span>
                        </div>
                        <span className="text-slate-100 flex-1">
                          Proud {tierName || 'subscriber'}! Let’s go! 🔥✨
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preview 2: Donation Page Membership Card Preview */}
                  <div className="p-4 rounded-2xl bg-[#090D18] border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-['Chakra_Petch'] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Donation Page Member Card</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Public View</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white font-['Chakra_Petch'] block truncate max-w-[140px]">
                            {tierName || 'Tier Name'}
                          </span>
                          <span className="text-lg font-black text-white font-mono">
                            ${parseFloat(tierPrice || '4.99').toFixed(2)}
                            <span className="text-slate-500 text-[10px] font-normal"> /mo</span>
                          </span>
                        </div>

                        {/* Clean Vector Badge on Card */}
                        <div
                          className="inline-flex items-center gap-1.5 text-xs font-bold font-mono tracking-wider"
                          style={{ color: tierBadgeColor }}
                        >
                          {renderBadgeIconPreview(tierBadgeIcon, tierBadgeColor, 'w-4 h-4')}
                          {tierBadgeText ? <span>{tierBadgeText}</span> : null}
                        </div>
                      </div>

                      {/* Perks */}
                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Includes:</span>
                        {(tierPerksInput ? tierPerksInput.split(',') : ['Exclusive Chat Badge', 'Priority Alerts'])
                          .map((p) => p.trim())
                          .filter(Boolean)
                          .slice(0, 3)
                          .map((perk, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                              <Check className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                              <span className="truncate">{perk}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Instant Test Button */}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testingComment}
                    onClick={() => handleTestOverlayComment({
                      id: 'preview',
                      name: tierName || 'Subscriber',
                      price: parseFloat(tierPrice) || 4.99,
                      currency: tierCurrency || 'USD',
                      badgeText: tierBadgeText,
                      badgeIcon: tierBadgeIcon,
                      badgeColor: tierBadgeColor,
                      perks: []
                    })}
                    className="w-full border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white bg-cyan-950/20 hover:bg-cyan-950/40 py-2.5 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{testingComment ? 'Broadcasting...' : 'Test on Live OBS Chat'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex items-center justify-between sm:justify-end gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800 bg-[#0A0F1D]/95 backdrop-blur-md flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsTierModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white border-slate-800 px-4 py-2 flex-1 sm:flex-initial cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTierForm}
                disabled={savingTier}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 flex-1 sm:flex-initial cursor-pointer"
              >
                {savingTier ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  editingTier ? 'Update Tier' : 'Save Tier'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal for GIF badges */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url) => {
          setTierBadgeGif(url);
          setBadgeMode('gif');
          setIsMediaPickerOpen(false);
        }}
        currentUrl={tierBadgeGif}
        currentPlan={isLocked ? 'free' : 'pro'}
        onUpgrade={onUpgrade}
        title="Choose Subscriber Badge GIF / Image"
        subtitle="Pick an animated GIF, sticker, or image from your library"
      />

      {/* Vector Icon Picker Modal */}
      <BadgeIconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(iconId) => {
          setTierBadgeIcon(iconId);
          setBadgeMode('icon');
        }}
        selectedIconId={tierBadgeIcon}
        accentColor={tierBadgeColor}
      />

      {/* 6. MANUAL GRANT SUBSCRIBER MODAL */}
      {isManualSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0B101E] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-['Chakra_Petch']">Gift / Grant Membership</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualSubModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Viewer YouTube Account Name / Handle *
                </label>
                <input
                  type="text"
                  value={manualSubName}
                  onChange={(e) => setManualSubName(e.target.value)}
                  placeholder="e.g. SokhaGamer or @sokhagamer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-amber-300/80 font-mono mt-1">
                  ⚡ Must match the viewer's exact YouTube live chat name so their badge displays on stream.
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Select Tier</label>
                {tiers.length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl font-mono">
                    Please create at least one subscription tier first.
                  </p>
                ) : (
                  <select
                    value={manualTierId || (tiers[0] ? tiers[0].id : '')}
                    onChange={(e) => setManualTierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (${t.price.toFixed(2)}/mo) — [{t.badgeText}]
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setIsManualSubModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualAddSubscriber}
                disabled={!manualSubName.trim() || tiers.length === 0}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl"
              >
                Grant Badge
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. TELEGRAM OUTLET GROUP SELECTION MODAL */}
      {isOutletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A0F1D] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#070B14]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                  <Send className="w-4 h-4 transform -rotate-45" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
                    Subscriber Telegram Outlet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select a group to monitor for incoming subscriber bank receipts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOutletModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search groups from your Telegram session..."
                  value={outletSearchQuery}
                  onChange={(e) => setOutletSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                />
              </div>

              {/* Telegram Groups List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Available Telegram Groups
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenOutletModal}
                    disabled={fetchingDialogs}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingDialogs ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {fetchingDialogs ? (
                  <div className="py-8 text-center space-y-2">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                    <p className="text-xs text-slate-400 font-mono">Fetching Telegram dialogs via GramJS...</p>
                  </div>
                ) : filteredDialogs.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {filteredDialogs.map((dialog) => {
                      const isCurrent = telegramOutletGroup?.chatId === dialog.id;
                      return (
                        <div
                          key={dialog.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            isCurrent
                              ? 'bg-cyan-950/30 border-cyan-500/50'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate font-['Chakra_Petch']">
                              {dialog.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono">ID: {dialog.id}</span>
                              {dialog.username && (
                                <span className="text-[10px] text-cyan-400 font-mono">@{dialog.username}</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={loadingOutlet || isCurrent}
                            onClick={() =>
                              handleConnectOutletGroup({
                                chatId: dialog.id,
                                title: dialog.title,
                                username: dialog.username
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
                              isCurrent
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md'
                            }`}
                          >
                            {isCurrent ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Connected</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Connect</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-1.5">
                    <AlertCircle className="w-5 h-5 text-amber-400 mx-auto" />
                    <p className="text-xs text-slate-300 font-medium">No Telegram groups found via session</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Ensure your Telegram User Client is signed in under Payment Gateway, or enter your group details manually below.
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Connection Section */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Or Connect Manually
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-400">
                      Telegram Chat ID *
                    </label>
                    <input
                      type="text"
                      placeholder="-1001234567890 or @groupname"
                      value={customOutletChatId}
                      onChange={(e) => setCustomOutletChatId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-xs text-white placeholder-slate-600 outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-slate-400">
                      Group Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VIP Subscriber Alerts"
                      value={customOutletTitle}
                      onChange={(e) => setCustomOutletTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg text-xs text-white placeholder-slate-600 outline-none"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  disabled={loadingOutlet || !customOutletChatId.trim()}
                  onClick={() =>
                    handleConnectOutletGroup({
                      chatId: customOutletChatId.trim(),
                      title: customOutletTitle.trim() || `Telegram Group (${customOutletChatId.trim()})`,
                      username: customOutletChatId.trim().startsWith('@')
                        ? customOutletChatId.trim().replace('@', '')
                        : undefined
                    })
                  }
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Custom Chat ID</span>
                </Button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#070B14] flex justify-end">
              <button
                type="button"
                onClick={() => setIsOutletModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 9. TEST MESSAGE BROADCAST TOAST */}
      {testSuccessToast && (
        <div className="fixed top-18 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="rounded-xl px-4 py-2.5 bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl shadow-cyan-950/50">
            <MessageSquare className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{testSuccessToast}</span>
          </div>
        </div>
      )}

      {/* 10. TELEGRAM OUTLET TOAST */}
      {outletToast && (
        <div className="fixed top-28 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div
            className={`rounded-xl px-4 py-2.5 border text-xs font-mono font-bold flex items-center gap-2 shadow-2xl ${
              outletToast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50'
                : 'bg-red-950/90 border-red-500/40 text-red-300 shadow-red-950/50'
            }`}
          >
            {outletToast.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{outletToast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscribersManager;
