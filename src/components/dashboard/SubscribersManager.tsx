'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Plus,
  Trash2,
  Edit2,
  Check,
  Eye,
  Bell,
  RefreshCw,
  Send,
  Link2,
  Unlink,
  Gift,
  ShieldCheck,
  Search,
  Copy,
  ExternalLink,
  X,
  Radio,
  Sliders,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { SubscriberTier, SubscriberAlertSettings, SubscriberMember } from '../../types/subscriber';
import { SubscriberAlertStudio } from './SubscriberAlertStudio';
import { MediaPickerModal } from './MediaPickerModal';
import {
  BADGE_ICON_LIST,
  getBadgeIconComponent
} from '../../data/badgeIcons';
import { useSocket } from '../../context/SocketContext';

interface SubscribersManagerProps {
  streamerToken?: string;
  streamerUsername?: string;
  isLocked?: boolean;
  onUpgrade?: () => void;
  initialSelectedTierId?: string;
  onSelectTierId?: (tierId: string | null) => void;
  onRegenerateToken?: () => void;
}

export const SubscribersManager: React.FC<SubscribersManagerProps> = ({
  streamerToken,
  streamerUsername,
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

  const authFetch = (url: string, init: RequestInit = {}) => {
    const authToken = typeof window !== 'undefined'
      ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('streamneon_token'))
      : null;
    const headers = new Headers(init.headers || {});
    if (authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }
    return fetch(url, { credentials: 'include', ...init, headers });
  };

  const safeJson = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: false, error: `Unexpected response (${res.status})` };
    }
    return res.json();
  };

  // State
  const [tiers, setTiers] = useState<SubscriberTier[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedObs, setCopiedObs] = useState(false);

  // Selected Tier for Alert Studio
  const [selectedTierForAlert, setSelectedTierForAlert] = useState<SubscriberTier | null>(null);

  // Modal State
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SubscriberTier | null>(null);
  const [isManualSubModalOpen, setIsManualSubModalOpen] = useState(false);
  const [isOutletModalOpen, setIsOutletModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  // Form State for Tier Modal
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState(4.99);
  const [tierDescription, setTierDescription] = useState('');
  const [tierBadgeIcon, setTierBadgeIcon] = useState('Crown');
  const [tierBadgeText, setTierBadgeText] = useState('VIP');
  const [tierBadgeColor, setTierBadgeColor] = useState('#FFFFFF');
  const [tierBadgeImage, setTierBadgeImage] = useState('');
  const [tierBadgeGif, setTierBadgeGif] = useState('');
  const [badgeMode, setBadgeMode] = useState<'icon' | 'gif'>('icon');
  const [tierPerks, setTierPerks] = useState<string[]>(['Exclusive Chat Badge', 'Ad-Free Stream', 'Supporter Discord Role']);
  const [newPerkInput, setNewPerkInput] = useState('');
  const [tierEnabled, setTierEnabled] = useState(true);

  // Manual Grant State
  const [manualSubName, setManualSubName] = useState('');
  const [manualTierId, setManualTierId] = useState('');

  // Telegram Outlet Group State
  const [telegramOutletGroup, setTelegramOutletGroup] = useState<{ chatId: string; title: string; username?: string } | null>(null);
  const [outletDialogs, setOutletDialogs] = useState<Array<{ id: string; title: string; username?: string }>>([]);
  const [fetchingDialogs, setFetchingDialogs] = useState(false);
  const [outletSearchQuery, setOutletSearchQuery] = useState('');
  const [customOutletChatId, setCustomOutletChatId] = useState('');
  const [customOutletTitle, setCustomOutletTitle] = useState('');
  const [loadingOutlet, setLoadingOutlet] = useState(false);

  // Search & Filter for Members
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberTierFilter, setMemberTierFilter] = useState('all');

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const obsUrl = `${origin}/overlay/subscribers/${token}`;

  const handleCopyObs = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedObs(true);
    setTimeout(() => setCopiedObs(false), 2000);
  };

  const persistTiers = async (nextTiers: SubscriberTier[], nextOutletGroup = telegramOutletGroup) => {
    const res = await authFetch('/api/widgets/subscribers/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        username,
        enabled: true,
        tiers: nextTiers,
        telegramOutletGroup: nextOutletGroup
      })
    });
    return safeJson(res);
  };

  // 1. Fetch Tiers, Settings & Subscribers
  const fetchTiers = async () => {
    try {
      setLoading(true);
      const query = `token=${encodeURIComponent(token)}&username=${encodeURIComponent(username)}`;
      const [settingsRes, subsRes] = await Promise.all([
        authFetch(`/api/widgets/subscribers/settings?${query}`),
        authFetch(`/api/widgets/subscribers?${query}`)
      ]);

      const settingsData = await safeJson(settingsRes);
      if (settingsData?.success && settingsData.settings) {
        setTiers(Array.isArray(settingsData.settings.tiers) ? settingsData.settings.tiers : []);
        setTelegramOutletGroup(settingsData.settings.telegramOutletGroup || null);
      }

      const subsData = await safeJson(subsRes);
      if (subsData?.success) {
        setSubscribers(Array.isArray(subsData.subscribers) ? subsData.subscribers : []);
      }
    } catch (err) {
      console.error('[SubscribersManager] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, [token, username]);

  // Check initial tier selection from props
  useEffect(() => {
    if (initialSelectedTierId && tiers.length > 0) {
      const match = tiers.find((t) => t.id === initialSelectedTierId);
      if (match) setSelectedTierForAlert(match);
    }
  }, [initialSelectedTierId, tiers]);

  // Open Create / Edit Tier Modal
  const handleOpenTierModal = (tierToEdit?: SubscriberTier) => {
    if (tierToEdit) {
      setEditingTier(tierToEdit);
      setTierName(tierToEdit.name);
      setTierPrice(tierToEdit.price);
      setTierDescription(tierToEdit.description || '');
      setTierBadgeIcon(tierToEdit.badgeIcon || 'Crown');
      setTierBadgeText(tierToEdit.badgeText || 'VIP');
      setTierBadgeColor(tierToEdit.badgeColor || '#FFFFFF');
      setTierBadgeImage(tierToEdit.badgeImage || '');
      setTierBadgeGif(tierToEdit.badgeGifUrl || '');
      setBadgeMode(tierToEdit.badgeGifUrl ? 'gif' : 'icon');
      setTierPerks(tierToEdit.perks || []);
      setTierEnabled(tierToEdit.enabled !== false);
    } else {
      setEditingTier(null);
      setTierName(`Tier ${tiers.length + 1}`);
      setTierPrice(4.99 * (tiers.length + 1));
      setTierDescription('Exclusive monthly VIP supporter badge with premium stream perks');
      setTierBadgeIcon('Crown');
      setTierBadgeText(`T${tiers.length + 1}`);
      setTierBadgeColor('#FFFFFF');
      setTierBadgeImage('');
      setTierBadgeGif('');
      setBadgeMode('icon');
      setTierPerks(['Exclusive Chat Badge', 'Ad-Free Stream', 'Supporter Role']);
      setTierEnabled(true);
    }
    setIsTierModalOpen(true);
  };

  // Save Tier
  const handleSaveTier = async () => {
    if (!tierName.trim()) {
      alert('Please enter a tier name.');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<SubscriberTier> = {
        name: tierName.trim(),
        price: Number(tierPrice) || 4.99,
        currency: 'USD',
        description: tierDescription.trim(),
        badgeIcon: tierBadgeIcon,
        badgeText: tierBadgeText.trim(),
        badgeColor: tierBadgeColor,
        badgeImage: badgeMode === 'gif' ? tierBadgeImage : '',
        badgeGifUrl: badgeMode === 'gif' ? tierBadgeGif : '',
        perks: tierPerks,
        enabled: tierEnabled
      };

      let nextTiers = [...tiers];
      if (editingTier) {
        nextTiers = nextTiers.map((t) => (t.id === editingTier.id ? { ...t, ...payload } : t));
      } else {
        const newTier: SubscriberTier = {
          id: `tier_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: payload.name!,
          price: payload.price!,
          currency: 'USD',
          description: payload.description,
          badgeIcon: payload.badgeIcon!,
          badgeText: payload.badgeText!,
          badgeColor: payload.badgeColor!,
          badgeImage: payload.badgeImage,
          badgeGifUrl: payload.badgeGifUrl,
          perks: payload.perks!,
          enabled: payload.enabled !== false,
          order: tiers.length,
          alertSettings: {
            templateStyle: 'minimal',
            glowColor: '#FFFFFF',
            showImage: true,
            durationSeconds: 6,
            textColor: '#FFFFFF',
            subscriberColor: '#FFFFFF',
            tierColor: '#A3A3A3',
            layoutMode: 'top',
            animationStyle: 'fade',
            ttsEnabled: true,
            ttsType: 'kiritts-female'
          }
        };
        nextTiers.push(newTier);
      }

      const data = await persistTiers(nextTiers);
      if (data.success) {
        setTiers(nextTiers);
        setIsTierModalOpen(false);
        showToast(editingTier ? 'Tier updated successfully' : 'New tier created successfully');
      } else {
        alert(data.error || 'Failed to save tier');
      }
    } catch (err) {
      console.error('[SubscribersManager] Save tier error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete Tier
  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to remove this membership tier?')) return;
    const nextTiers = tiers.filter((t) => t.id !== tierId);
    setTiers(nextTiers);
    try {
      await persistTiers(nextTiers);
      showToast('Tier removed');
    } catch (err) {
      console.error('Failed to delete tier:', err);
    }
  };

  // Toggle Tier Active/Inactive
  const handleToggleTier = async (tierId: string) => {
    const nextTiers = tiers.map((t) => (t.id === tierId ? { ...t, enabled: t.enabled === false } : t));
    setTiers(nextTiers);
    try {
      await persistTiers(nextTiers);
    } catch (err) {
      console.error('Failed to toggle tier:', err);
    }
  };

  // Test Badge Comment on Live Chat
  const handleTestBadgeComment = async (tier: SubscriberTier) => {
    const author = `Member_${tier.badgeText || 'VIP'}`;
    const testPayload = {
      token,
      streamerToken: token,
      action: 'test_message',
      author,
      message: `Hyped to be a proud ${tier.name} subscriber! Let’s go! 🔥✨`,
      badge: tier.badgeText || 'VIP',
      badgeColor: tier.badgeColor || '#FFFFFF',
      badgeBg: tier.badgeBg,
      badgeBorder: tier.badgeBorder,
      badgeIcon: tier.badgeIcon || 'Crown',
      badgeGifUrl: tier.badgeGifUrl || tier.badgeImage || '',
      badgeImage: tier.badgeImage || tier.badgeGifUrl || '',
      isTest: true
    };

    if (socket && socket.connected) {
      socket.emit('chat:test_message', testPayload);
      showToast('Tested badge comment on OBS chat overlay!');
      return;
    }

    try {
      const res = await authFetch('/api/widgets/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });
      const data = await safeJson(res);
      if (data.success) {
        showToast('Tested badge comment on OBS chat overlay!');
      }
    } catch (err) {
      console.error('Failed to broadcast test comment:', err);
    }
  };

  // Manual Grant Member
  const handleManualAddSubscriber = async () => {
    if (!manualSubName.trim()) {
      alert('Please enter a viewer name.');
      return;
    }
    const targetTierId = manualTierId || (tiers[0] ? tiers[0].id : '');
    const targetTier = tiers.find((t) => t.id === targetTierId);
    const cleanSubName = manualSubName.trim();

    try {
      const res = await authFetch('/api/widgets/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_add',
          streamerToken: token,
          streamerUsername: username,
          subscriberName: cleanSubName,
          tierId: targetTierId,
          paymentMethod: 'manual_gift'
        })
      });
      const data = await safeJson(res);
      if (data.success && data.subscriber) {
        setSubscribers((prev) => [data.subscriber, ...prev.filter((s) => s.id !== data.subscriber.id)]);
      } else {
        const nowIso = new Date().toISOString();
        const expIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const fallbackSub: SubscriberMember = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          streamerToken: token,
          subscriberName: cleanSubName,
          tierId: targetTierId,
          tierName: targetTier?.name || 'VIP Member',
          badgeText: targetTier?.badgeText || 'VIP',
          badgeColor: targetTier?.badgeColor || '#FFFFFF',
          badgeIcon: targetTier?.badgeIcon || 'Crown',
          status: 'active',
          subscribedAt: nowIso,
          expiresAt: expIso,
          startDate: nowIso,
          expiryDate: expIso,
          totalMonths: 1,
          totalAmountPaid: targetTier?.price || 4.99
        };
        setSubscribers((prev) => [fallbackSub, ...prev]);
      }
      setIsManualSubModalOpen(false);
      setManualSubName('');
      showToast(`Granted 30-day membership badge to ${cleanSubName}!`);
    } catch (err) {
      console.error('Failed to save manual subscriber:', err);
    }
  };

  // Remove Subscriber
  const handleRemoveSubscriber = async (subId: string) => {
    if (!confirm('Remove this subscriber member?')) return;
    const nextSubs = subscribers.filter((s) => s.id !== subId);
    setSubscribers(nextSubs);
    try {
      await authFetch('/api/widgets/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_subscription', id: subId, streamerToken: token })
      });
      showToast('Member removed');
    } catch (err) {
      console.error('Failed to remove subscriber:', err);
    }
  };

  // Open Telegram Outlet Dialogs
  const handleOpenOutletModal = async () => {
    setIsOutletModalOpen(true);
    try {
      setFetchingDialogs(true);
      const res = await authFetch('/api/telegram/groups');
      const data = await safeJson(res);
      if (data.success) {
        const dialogs = Array.isArray(data.availableDialogs) ? data.availableDialogs : [];
        const groups = Array.isArray(data.groups) ? data.groups : [];
        const combinedMap = new Map<string, { id: string; title: string; username?: string }>();
        dialogs.forEach((d: any) => {
          if (d?.id) {
            combinedMap.set(String(d.id), {
              id: String(d.id),
              title: d.title || 'Untitled Group',
              username: d.username
            });
          }
        });
        groups.forEach((g: any) => {
          const cid = String(g?.chat_id || g?.chatId || g?.id || '');
          if (cid && !combinedMap.has(cid)) {
            combinedMap.set(cid, {
              id: cid,
              title: g.title || 'Telegram Group',
              username: g.username
            });
          }
        });
        setOutletDialogs(Array.from(combinedMap.values()));
      }
    } catch (err) {
      console.error('Failed to fetch Telegram dialogs:', err);
    } finally {
      setFetchingDialogs(false);
    }
  };

  const handleConnectOutletGroup = async (group: { chatId: string; title: string; username?: string }) => {
    try {
      setLoadingOutlet(true);
      const data = await persistTiers(tiers, group);
      if (data.success) {
        setTelegramOutletGroup(group);
        setIsOutletModalOpen(false);
        showToast(`Connected Telegram group "${group.title}"!`);
      } else {
        alert(data.error || 'Failed to connect Telegram group');
      }
    } catch (err) {
      console.error('Failed to connect outlet group:', err);
    } finally {
      setLoadingOutlet(false);
    }
  };

  const handleDisconnectOutletGroup = async () => {
    if (!confirm('Disconnect this Telegram outlet group?')) return;
    try {
      setLoadingOutlet(true);
      await persistTiers(tiers, null);
      setTelegramOutletGroup(null);
      showToast('Telegram outlet group disconnected');
    } catch (err) {
      console.error('Failed to disconnect outlet group:', err);
    } finally {
      setLoadingOutlet(false);
    }
  };

  // If a tier is selected for Alert Studio, render SubscriberAlertStudio
  if (selectedTierForAlert) {
    return (
      <SubscriberAlertStudio
        tier={selectedTierForAlert}
        streamerToken={token}
        streamerUsername={username}
        allTiers={tiers}
        onBack={() => {
          setSelectedTierForAlert(null);
          if (onSelectTierId) onSelectTierId(null);
        }}
        onSaveSuccess={(updatedTier) => {
          setTiers((prev) => prev.map((t) => (t.id === updatedTier.id ? updatedTier : t)));
          setSelectedTierForAlert(null);
          if (onSelectTierId) onSelectTierId(null);
          showToast(`Alert settings updated for "${updatedTier.name}"`);
        }}
        onRegenerateToken={onRegenerateToken}
      />
    );
  }

  // Filter subscribers
  const filteredSubscribers = subscribers.filter((s) => {
    const matchesSearch = s.subscriberName.toLowerCase().includes(memberSearchQuery.toLowerCase());
    const matchesTier = memberTierFilter === 'all' || s.tierId === memberTierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Channel Memberships</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-[#262626]">
                Overlay Widget
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Set up monthly supporter tiers, vector chat badges, and on-stream alerts for your community.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsManualSubModalOpen(true)}
              variant="outline"
              className="text-xs px-3.5 py-2 h-auto border-[#262626] bg-[#1a1a1a] hover:bg-[#222] text-white flex items-center gap-1.5"
            >
              <Gift size={13} />
              <span>Grant Member</span>
            </Button>
            <Button
              onClick={() => handleOpenTierModal()}
              className="bg-white hover:bg-neutral-200 text-black font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create Tier</span>
            </Button>
          </div>
        </div>

        {/* OBS Browser Source URL Box */}
        <div className="pt-3 border-t border-[#262626] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#0f0f0f] border border-[#262626] rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 truncate">
            <span className="text-neutral-500 select-none">OBS URL:</span>
            <span className="truncate">{obsUrl}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyObs}
              className="text-xs px-3 py-2 border border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedObs ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedObs ? 'Copied' : 'Copy Link'}</span>
            </button>
            <a
              href={obsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2 border border-[#262626] bg-[#1a1a1a] hover:bg-[#222222] text-neutral-300 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink size={14} />
              <span>Open</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. Membership Tiers Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Active Tiers ({tiers.length})
          </h3>
          {tiers.length > 0 && (
            <button
              onClick={async () => {
                if (confirm('Delete all membership tiers?')) {
                  setTiers([]);
                  await persistTiers([]);
                  showToast('All tiers cleared');
                }
              }}
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {tiers.length === 0 ? (
          <div className="p-12 rounded-xl bg-[#141414] border border-[#262626] text-center space-y-3">
            <Crown size={32} className="mx-auto text-neutral-600" />
            <div className="text-sm font-semibold text-white">No membership tiers yet</div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Create your first monthly tier with custom badge styling and perks for your stream supporters.
            </p>
            <Button
              onClick={() => handleOpenTierModal()}
              className="bg-white hover:bg-neutral-200 text-black font-semibold text-xs px-4 py-2 rounded-lg"
            >
              <Plus size={14} className="mr-1" />
              <span>Create First Tier</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiers.map((tier, idx) => {
              const IconComp = getBadgeIconComponent(tier.badgeIcon || 'Crown');
              return (
                <div
                  key={tier.id}
                  className={`rounded-xl p-5 border flex flex-col justify-between space-y-4 transition-colors ${
                    tier.enabled !== false
                      ? 'bg-[#141414] border-[#262626] hover:border-neutral-500'
                      : 'bg-[#121212] border-[#222] opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Tier Name & ON/OFF Toggle */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-neutral-500 font-mono uppercase">Tier #{idx + 1}</span>
                        <h4 className="text-sm font-bold text-white truncate">{tier.name}</h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleTier(tier.id)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            tier.enabled !== false
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-neutral-800 text-neutral-500 border border-[#262626]'
                          }`}
                        >
                          {tier.enabled !== false ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </div>
                    </div>

                    {/* Price & Badge Display */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-white">${tier.price.toFixed(2)}</span>
                        <span className="text-xs text-neutral-400">/ mo</span>
                      </div>

                      {/* Vector Badge */}
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded bg-[#1c1c1c] border border-[#2c2c2c]"
                        style={{ color: tier.badgeColor || '#FFFFFF' }}
                      >
                        {tier.badgeGifUrl ? (
                          <img src={tier.badgeGifUrl} alt="Badge" className="w-4 h-4 object-contain inline-block" />
                        ) : (
                          <IconComp className="w-3.5 h-3.5" />
                        )}
                        <span>{tier.badgeText || 'VIP'}</span>
                      </span>
                    </div>

                    {tier.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2">{tier.description}</p>
                    )}

                    {/* Perks List */}
                    <div className="space-y-1 pt-2 border-t border-[#262626]">
                      <span className="text-[10px] text-neutral-500 uppercase font-medium">Included Perks:</span>
                      <ul className="space-y-0.5">
                        {(tier.perks || []).slice(0, 3).map((perk, pIdx) => (
                          <li key={pIdx} className="text-xs text-neutral-300 flex items-center gap-1.5 truncate">
                            <Check size={12} className="text-neutral-500 shrink-0" />
                            <span className="truncate">{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-[#262626] flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTierForAlert(tier);
                        if (onSelectTierId) onSelectTierId(tier.id);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Bell size={13} />
                      <span>Alert Studio</span>
                    </button>

                    <button
                      onClick={() => handleTestBadgeComment(tier)}
                      title="Test badge comment in chat"
                      className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                    </button>

                    <button
                      onClick={() => handleOpenTierModal(tier)}
                      title="Edit tier"
                      className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      onClick={() => handleDeleteTier(tier.id)}
                      title="Delete tier"
                      className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Telegram Auto-Verification Outlet */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Send size={15} className="text-neutral-400 transform -rotate-45" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Telegram Receipt Verification Outlet
              </h4>
              {telegramOutletGroup ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  CONNECTED
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                  OPTIONAL
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              Automatically verifies incoming bank &amp; Bakong KHQR membership receipts and grants VIP badges.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {telegramOutletGroup ? (
              <>
                <button
                  onClick={handleOpenOutletModal}
                  disabled={loadingOutlet}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:bg-[#222] text-xs text-neutral-300 transition-colors cursor-pointer"
                >
                  Change Group
                </button>
                <button
                  onClick={handleDisconnectOutletGroup}
                  disabled={loadingOutlet}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:bg-[#222] text-xs text-red-400 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenOutletModal}
                disabled={loadingOutlet}
                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send size={13} className="transform -rotate-45" />
                <span>Connect Outlet</span>
              </button>
            )}
          </div>
        </div>

        {telegramOutletGroup && (
          <div className="pt-3 border-t border-[#262626] text-xs flex items-center gap-2 text-neutral-400 font-mono">
            <span className="text-white font-medium">{telegramOutletGroup.title}</span>
            <span>({telegramOutletGroup.chatId})</span>
          </div>
        )}
      </div>

      {/* 4. Active Community Members List */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-neutral-400" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
              Community Members ({filteredSubscribers.length})
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {/* Tier Filter */}
            <select
              value={memberTierFilter}
              onChange={(e) => setMemberTierFilter(e.target.value)}
              className="bg-[#181818] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-neutral-400 cursor-pointer"
            >
              <option value="all">All Tiers</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Search */}
            <div className="relative w-44">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search member..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-[#181818] border border-[#262626] focus:border-neutral-400 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>
          </div>
        </div>

        {filteredSubscribers.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            {memberSearchQuery ? 'No members match your search.' : 'No active members yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#262626] text-neutral-400 uppercase text-[10px]">
                  <th className="pb-2.5 font-medium">Member</th>
                  <th className="pb-2.5 font-medium">Tier Badge</th>
                  <th className="pb-2.5 font-medium">Joined</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#181818] transition-colors">
                    <td className="py-2.5 font-medium text-white">{sub.subscriberName}</td>
                    <td className="py-2.5">
                      <span
                        className="inline-flex items-center gap-1 font-semibold text-[11px] px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2c2c2c]"
                        style={{ color: sub.badgeColor || '#FFFFFF' }}
                      >
                        {sub.badgeText || 'VIP'}
                      </span>
                    </td>
                    <td className="py-2.5 text-neutral-400">
                      {(sub.subscribedAt || sub.startDate)
                        ? new Date(sub.subscribedAt || sub.startDate!).toLocaleDateString()
                        : 'Recent'}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleRemoveSubscriber(sub.id)}
                        className="text-neutral-500 hover:text-red-400 p-1 rounded transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Create / Edit Tier Modal */}
      {isTierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4 text-white max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingTier ? 'Edit Membership Tier' : 'Create Membership Tier'}
                </h3>
              </div>
              <button
                onClick={() => setIsTierModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Tier Name</label>
                  <input
                    type="text"
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    placeholder="e.g. Gold VIP"
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Monthly Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.50"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400"
                  />
                </div>
              </div>

              {/* Badge Text & Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Badge Text Tag</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={tierBadgeText}
                    onChange={(e) => setTierBadgeText(e.target.value.toUpperCase())}
                    placeholder="e.g. VIP, PRO, GOLD"
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-neutral-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-neutral-300">Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={tierBadgeColor}
                      onChange={(e) => setTierBadgeColor(e.target.value)}
                      className="w-8 h-8 rounded border border-[#262626] bg-[#181818] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={tierBadgeColor}
                      onChange={(e) => setTierBadgeColor(e.target.value)}
                      className="flex-1 bg-[#181818] border border-[#262626] rounded-lg px-2.5 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Badge Icon Picker */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Badge Icon</label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 bg-[#181818] border border-[#262626] rounded-lg p-2.5">
                  {BADGE_ICON_LIST.slice(0, 16).map((iconObj) => {
                    const Icon = iconObj.icon || getBadgeIconComponent(iconObj.id);
                    const isSelected = tierBadgeIcon === iconObj.id;
                    return (
                      <button
                        key={iconObj.id}
                        type="button"
                        onClick={() => setTierBadgeIcon(iconObj.id)}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black'
                            : 'hover:bg-[#252525] text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Tier Description</label>
                <textarea
                  rows={2}
                  value={tierDescription}
                  onChange={(e) => setTierDescription(e.target.value)}
                  placeholder="Tell viewers what makes this tier special..."
                  className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400 resize-none"
                />
              </div>

              {/* Perks Management */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Perks</label>
                <div className="space-y-1.5">
                  {tierPerks.map((perk, pIdx) => (
                    <div key={pIdx} className="flex items-center justify-between p-2 rounded-lg bg-[#181818] border border-[#262626]">
                      <span className="text-neutral-300">{perk}</span>
                      <button
                        type="button"
                        onClick={() => setTierPerks(tierPerks.filter((_, i) => i !== pIdx))}
                        className="text-neutral-500 hover:text-red-400 p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add a perk (e.g. Special Emote, Discord Role)..."
                      value={newPerkInput}
                      onChange={(e) => setNewPerkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newPerkInput.trim()) {
                          e.preventDefault();
                          setTierPerks([...tierPerks, newPerkInput.trim()]);
                          setNewPerkInput('');
                        }
                      }}
                      className="flex-1 bg-[#181818] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newPerkInput.trim()) {
                          setTierPerks([...tierPerks, newPerkInput.trim()]);
                          setNewPerkInput('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-white text-xs font-medium cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsTierModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] text-neutral-300 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveTier}
                className="px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingTier ? 'Save Changes' : 'Create Tier'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Manual Grant Subscriber Modal */}
      {isManualSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold text-white">Grant Member Badge</h3>
              </div>
              <button
                onClick={() => setIsManualSubModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Viewer Username</label>
                <input
                  type="text"
                  value={manualSubName}
                  onChange={(e) => setManualSubName(e.target.value)}
                  placeholder="e.g. SuperFan99"
                  className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Select Tier</label>
                <select
                  value={manualTierId || (tiers[0] ? tiers[0].id : '')}
                  onChange={(e) => setManualTierId(e.target.value)}
                  className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400 cursor-pointer"
                >
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (${t.price.toFixed(2)}/mo) — [{t.badgeText}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
              <button
                onClick={() => setIsManualSubModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] text-neutral-300 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleManualAddSubscriber}
                disabled={!manualSubName.trim() || tiers.length === 0}
                className="px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold cursor-pointer"
              >
                Grant Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Telegram Outlet Modal */}
      {isOutletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4 text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-neutral-400 transform -rotate-45" />
                <h3 className="text-sm font-bold text-white">Select Telegram Outlet Group</h3>
              </div>
              <button
                onClick={() => setIsOutletModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              {fetchingDialogs ? (
                <div className="py-8 text-center text-neutral-400">Loading Telegram groups...</div>
              ) : outletDialogs.length > 0 ? (
                <div className="space-y-1.5">
                  {outletDialogs.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleConnectOutletGroup({ chatId: d.id, title: d.title, username: d.username })}
                      className="p-2.5 rounded-lg bg-[#181818] border border-[#262626] hover:border-neutral-500 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{d.title}</div>
                        <div className="text-[10px] text-neutral-500 font-mono">{d.id}</div>
                      </div>
                      <span className="text-[10px] font-semibold text-white px-2 py-1 rounded bg-[#252525]">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-neutral-400">Enter Telegram Chat ID manually:</p>
                  <input
                    type="text"
                    value={customOutletChatId}
                    onChange={(e) => setCustomOutletChatId(e.target.value)}
                    placeholder="-1001234567890 or @groupname"
                    className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <button
                    onClick={() =>
                      handleConnectOutletGroup({
                        chatId: customOutletChatId.trim(),
                        title: customOutletTitle.trim() || customOutletChatId.trim()
                      })
                    }
                    disabled={!customOutletChatId.trim()}
                    className="w-full py-2 bg-white text-black font-semibold rounded-lg text-xs"
                  >
                    Connect Chat ID
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#262626] flex justify-end shrink-0">
              <button
                onClick={() => setIsOutletModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-xs text-neutral-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="rounded-lg px-3.5 py-2 bg-white text-black text-xs font-medium shadow-2xl flex items-center gap-1.5">
            <Check size={14} className="text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscribersManager;
