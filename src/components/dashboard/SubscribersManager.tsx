'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { SubscriberTier, SubscriberItem } from '../../types/subscriber';
import { MediaPickerModal } from './MediaPickerModal';
import { BadgeIconPickerModal } from './BadgeIconPickerModal';
import { BADGE_ICON_LIST, getBadgeIconComponent } from '../../data/badgeIcons';
import { useSocket } from '../../context/SocketContext';

interface SubscribersManagerProps {
  streamerToken?: string;
  streamerUsername?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
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
  onUpgrade
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingComment, setTestingComment] = useState(false);
  const [testSuccessToast, setTestSuccessToast] = useState<string | null>(null);

  // Modals
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SubscriberTier | null>(null);

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

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(tiers) !== JSON.stringify(savedTiers);
  }, [tiers, savedTiers]);

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

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/widgets/subscribers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          enabled: true,
          tiers
        })
      });
      const data = await res.json();
      if (data.success) {
        setSavedTiers(tiers);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving subscriber settings:', err);
    } finally {
      setSaving(false);
    }
  };

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

  const handleSaveTierForm = () => {
    if (!tierName.trim()) return;

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
      enabled: tierEnabled
    };

    if (editingTier) {
      setTiers((prev) => prev.map((t) => (t.id === editingTier.id ? newTier : t)));
    } else {
      setTiers((prev) => [...prev, newTier]);
    }
    setIsTierModalOpen(false);
  };

  const handleToggleTier = (tierId: string) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === tierId ? { ...t, enabled: t.enabled === false ? true : false } : t))
    );
  };

  const handleDeleteTier = (tierId: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
  };

  const handleClearAllTiers = () => {
    if (tiers.length === 0) return;
    if (window.confirm('Are you sure you want to remove all subscriber tiers?')) {
      setTiers([]);
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

  return (
    <div className="space-y-6">
      {/* 1. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Active Subscribers</p>
            <h3 className="text-2xl font-black text-white font-['Chakra_Petch'] mt-0.5">{stats.totalActive}</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{stats.totalHistorical} total joined</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Monthly Revenue (MRR)</p>
            <h3 className="text-2xl font-black text-emerald-400 font-['Chakra_Petch'] mt-0.5">
              ${stats.monthlyRevenueUsd.toFixed(2)}
            </h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Recurring memberships</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#090d16] border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Configured Tiers</p>
            <h3 className="text-2xl font-black text-amber-400 font-['Chakra_Petch'] mt-0.5">{tiers.length}</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">Custom chat badges</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SUBSCRIBER TIERS & BADGE CONFIGURATION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Membership Tiers &amp; Badges</span>
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
              className={`p-5 rounded-2xl bg-[#090d16] border transition-all shadow-xl flex flex-col justify-between space-y-4 relative group ${
                tier.enabled !== false
                  ? 'border-slate-800 hover:border-slate-700'
                  : 'border-slate-800/60 bg-[#090d16]/60 opacity-75'
              }`}
            >
              <div className="space-y-3">
                {/* Header row with Tier Title & Individual Tier Toggle */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Tier #{idx + 1}</span>
                      {tier.enabled === false && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                          Paused
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white font-['Chakra_Petch'] truncate">{tier.name}</h3>
                  </div>

                  {/* Individual Tier ON / OFF Switch */}
                  <div className="flex items-center gap-2 flex-shrink-0">
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
                  onClick={() => handleTestOverlayComment(tier)}
                  disabled={testingComment}
                  className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 text-[11px] font-semibold border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Test comment on live OBS chat overlay"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Test on Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenTierModal(tier)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                  title="Edit Tier"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteTier(tier.id)}
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

      {/* 4. ACTIVE SUBSCRIBERS ROSTER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Active Subscribers Roster</span>
            </h2>
            <p className="text-xs text-slate-400">
              Viewers who subscribed to your channel. Their comments automatically display their badges on OBS.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Filter by Tier */}
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Tiers ({subscribers.length})</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Grant / Manual Add Subscriber */}
            <Button
              onClick={() => setIsManualSubModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Gift / Grant</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search subscriber username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#090d16] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Subscribers Table / List */}
        <div className="rounded-2xl bg-[#090d16] border border-slate-800 overflow-hidden shadow-xl">
          {filteredSubscribers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40 text-cyan-400" />
              <p className="text-xs">No subscribers found.</p>
              <p className="text-[11px] text-slate-600">
                Viewers who subscribe on your donation page will appear here with active badge overlays.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Subscriber</th>
                    <th className="px-4 py-3">Badge Overlay</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubscribers.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(sub.subscriberName)}`}
                            alt=""
                            className="w-6 h-6 rounded-full bg-slate-800"
                          />
                          <span>{sub.subscriberName}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                          style={{ color: sub.badgeColor || '#00F0FF' }}
                        >
                          {sub.badgeGifUrl || sub.badgeImage ? (
                            <img
                              src={sub.badgeGifUrl || sub.badgeImage}
                              alt={sub.badgeText || 'Badge'}
                              className="w-3.5 h-3.5 object-contain inline-block flex-shrink-0"
                            />
                          ) : (
                            renderBadgeIconPreview(sub.badgeIcon, sub.badgeColor, 'w-3.5 h-3.5')
                          )}
                          {sub.badgeText ? <span>{sub.badgeText}</span> : null}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-300 font-medium">{sub.tierName}</td>
                      <td className="px-4 py-3 text-emerald-400 font-mono font-bold">${sub.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                        {new Date(sub.expiresAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            sub.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestOverlayComment(sub)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Simulate Comment in OBS Chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          {sub.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => handleCancelSubscriber(sub.id)}
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                              title="Revoke / Cancel Membership"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 flex-1 sm:flex-initial cursor-pointer"
              >
                {editingTier ? 'Update Tier' : 'Save Tier'}
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
        title="Choose Subscriber Badge GIF / Image"
        subtitle="Pick an animated GIF or image badge from your library or online media"
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

      {/* 7. FLOATING UNSAVED CHANGES TOAST BAR */}
      <div
        className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl transition-all duration-300 ease-in-out ${
          hasUnsavedChanges
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        }`}
      >
        <div className="rounded-2xl px-4 py-3 bg-[#0B101E]/95 backdrop-blur-xl border border-cyan-500/40 shadow-[0_14px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(0,240,255,0.18)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            <span className="text-xs font-mono font-bold text-slate-100 truncate">
              You have unsaved subscriber changes!
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setTiers(savedTiers);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              Reset
            </button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              loading={saving}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs px-4 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 8. TOP RIGHT SUCCESS TOAST */}
      {saveSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="rounded-xl px-4 py-2.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl shadow-emerald-950/50">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Subscriber settings saved successfully!</span>
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
    </div>
  );
};

export default SubscribersManager;
