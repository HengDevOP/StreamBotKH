'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Sliders,
  Image as ImageIcon,
  Volume2,
  Play,
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle2,
  RefreshCw,
  Monitor,
  Eye,
  Settings2,
  Maximize2,
  AlertCircle,
  Radio,
  Layers,
  Palette,
  AlertTriangle,
  Bell,
  VolumeX,
  Flame,
  Zap,
  Crown,
  Upload,
  Music,
  Pause,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
  Sparkles
} from 'lucide-react';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { SubscriberTier, SubscriberAlertSettings } from '../../types/subscriber';
import { LiveAlertPayload } from '../../types/alert';
import { useAudio } from '../../hooks/useAudio';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { MediaPickerModal } from './MediaPickerModal';
import { MediaItem, isAudioAsset } from './MediaLibraryManager';
import { normalizeCurrencyAndSymbols, khmerNumberToWords } from '../../utils/ttsHelper';
import { KHMER_FONTS_2019 } from '../../data/khmerFonts';
import { NeonAlertCard } from '../overlay/NeonAlertCard';

interface SubscriberAlertStudioProps {
  tier: SubscriberTier;
  streamerToken?: string;
  streamerUsername?: string;
  onBack: () => void;
  onSaveSuccess: (updatedTier: SubscriberTier) => void;
  allTiers?: SubscriberTier[];
  onRegenerateToken?: () => void;
}

const SYSTEM_STREAM_FONTS = [
  { name: 'Chakra Petch (Cyberpunk Tech)', family: 'Chakra Petch', category: 'English & Display' as const },
  { name: 'Orbitron (Futuristic Sci-Fi)', family: 'Orbitron', category: 'English & Display' as const },
  { name: 'Press Start 2P (Retro 8-Bit)', family: 'Press Start 2P', category: 'English & Display' as const },
  { name: 'Inter (Clean Modern)', family: 'Inter', category: 'English & Display' as const },
  { name: 'Bebas Neue (Bold Impact)', family: 'Bebas Neue', category: 'English & Display' as const },
  { name: 'Kanit (Modern Rounded)', family: 'Kanit', category: 'English & Display' as const },
  { name: 'Permanent Marker (Graffiti)', family: 'Permanent Marker', category: 'English & Display' as const },
  { name: 'Montserrat (Streamer Pro)', family: 'Montserrat', category: 'English & Display' as const }
];

const ALL_FONT_OPTIONS = [
  ...KHMER_FONTS_2019,
  ...SYSTEM_STREAM_FONTS
];

const GRADIENT_COLOR_PRESETS = [
  { label: 'Cyan Cyber Glow', value: 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)' },
  { label: 'Neon Hot Pink', value: 'linear-gradient(135deg, #FF007A 0%, #7000FF 100%)' },
  { label: 'Golden Royalty', value: 'linear-gradient(135deg, #FFE600 0%, #FF5E00 100%)' },
  { label: 'Emerald Cash', value: 'linear-gradient(135deg, #00FF87 0%, #60EFFF 100%)' },
  { label: 'Sunset Blaze', value: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)' },
  { label: 'Violet Electric', value: 'linear-gradient(135deg, #B537F2 0%, #3023AE 100%)' },
  { label: 'Ice Frost Diamond', value: 'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)' },
  { label: 'Pure White', value: '#FFFFFF' },
  { label: 'Hyper Yellow', value: '#FFE600' },
  { label: 'Cyber Cyan Solid', value: '#00F0FF' }
];

const GLOW_COLOR_PRESETS = [
  { label: 'Cyber Cyan', hex: '#00F0FF' },
  { label: 'Neon Pink', hex: '#FF007A' },
  { label: 'Solar Amber', hex: '#F59E0B' },
  { label: 'Electric Emerald', hex: '#00FF66' },
  { label: 'Hyper Yellow', hex: '#FFE600' },
  { label: 'Vivid Violet', hex: '#8A2BE2' },
  { label: 'Crimson Flame', hex: '#FF3366' },
  { label: 'Pure White', hex: '#FFFFFF' }
];

const TEMPLATE_STYLES: Array<{ id: 'neon-box' | 'glass-hologram' | 'cyber-glitch' | 'arcade' | 'minimal'; name: string; desc: string }> = [
  { id: 'neon-box', name: 'Neon Cyber Box', desc: 'Futuristic glowing border with high-contrast cyber accents' },
  { id: 'glass-hologram', name: 'Glass Hologram', desc: 'Frosted translucent backdrop with ethereal shimmer' },
  { id: 'cyber-glitch', name: 'Cyber Glitch', desc: 'Dynamic digital distortion with tech edge' },
  { id: 'arcade', name: 'Retro Arcade', desc: 'Pixel-art inspired borders with vibrant arcade glow' },
  { id: 'minimal', name: 'Clean Minimal', desc: 'Sleek, modern typography without border clutter' }
];

const SOUND_PRESETS = [
  { label: 'Cash Register (Ka-ching)', url: '/sounds/cash-register-kaching.mp3' },
  { label: 'Mario Coin Chime', url: '/sounds/mario-coin.mp3' },
  { label: 'Neon Cyber Chime', url: '/sounds/neon-chime.mp3' },
  { label: 'Victory Trumpet', url: '/sounds/memes/victory.mp3' },
  { label: 'Level Up Hype', url: '/sounds/memes/level-up.mp3' },
  { label: 'Notification Ding', url: '/sounds/memes/discord-notification.mp3' }
];

const ANIMATION_PRESETS = [
  { id: 'pop', name: 'Pop In (Spring)', desc: 'Smooth energetic scale up' },
  { id: 'bounce', name: 'Bounce (Playful)', desc: 'Bouncy energetic entrance' },
  { id: 'neon-flash', name: 'Neon Flash (Cyber)', desc: 'High-voltage strobe and glow pulse' },
  { id: 'glow-pulse', name: 'Glow Pulse', desc: 'Breathing ambient neon aura' },
  { id: 'slide', name: 'Slide In Down', desc: 'Sleek entrance from top' },
  { id: 'fade', name: 'Fade In', desc: 'Clean subtle opacity fade' }
];

export const SubscriberAlertStudio: React.FC<SubscriberAlertStudioProps> = ({
  tier,
  streamerToken,
  streamerUsername,
  onBack,
  onSaveSuccess,
  allTiers = [],
  onRegenerateToken
}) => {
  const token = streamerToken || 'demo-token';
  const username = streamerUsername || 'streamer';
  const { playSound } = useAudio();
  const { socket } = useSocket();

  // Accordion active tab
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'tts' | 'copy' | null>('text');

  // Initial values from tier.alertSettings or sensible subscriber defaults
  const initialAlert: SubscriberAlertSettings = useMemo(() => {
    const s = tier.alertSettings || {};
    return {
      isEnabled: s.isEnabled !== false,
      templateStyle: s.templateStyle || 'neon-box',
      showImage: s.showImage !== false,
      mediaUrl: s.mediaUrl || tier.badgeGifUrl || tier.badgeImage || '/assets/pokemon/25_idle.gif',
      soundUrl: s.soundUrl || '/sounds/cash-register-kaching.mp3',
      soundVolume: s.soundVolume ?? 0.85,
      durationSeconds: s.durationSeconds || 8,
      glowColor: s.glowColor || tier.badgeColor || '#00F0FF',
      fontFamily: s.fontFamily || 'Chakra Petch',
      fontSize: s.fontSize || 28,
      textTemplate: s.textTemplate || '{name} just subscribed to {tier}!',
      textColor: s.textColor || '#FFFFFF',
      subscriberColor: s.subscriberColor || tier.badgeColor || '#00F0FF',
      tierColor: s.tierColor || '#F59E0B',
      layoutMode: s.layoutMode || 'top',
      animationStyle: s.animationStyle || 'pop',
      ttsEnabled: s.ttsEnabled !== false,
      ttsType: s.ttsType || 'kiritts-female',
      clonedVoiceName: s.clonedVoiceName || '',
      clonedVoiceSampleUrl: s.clonedVoiceSampleUrl || ''
    };
  }, [tier]);

  // Form State
  const [templateStyle, setTemplateStyle] = useState<'neon-box' | 'glass-hologram' | 'cyber-glitch' | 'arcade' | 'minimal'>(
    initialAlert.templateStyle || 'neon-box'
  );
  const [glowColor, setGlowColor] = useState<string>(initialAlert.glowColor || '#00F0FF');
  const [mediaUrl, setMediaUrl] = useState<string>(initialAlert.mediaUrl || '');
  const [showImage, setShowImage] = useState<boolean>(initialAlert.showImage !== false);
  const [soundUrl, setSoundUrl] = useState<string>(initialAlert.soundUrl || '/sounds/cash-register-kaching.mp3');
  const [soundVolume, setSoundVolume] = useState<number>(initialAlert.soundVolume ?? 0.85);
  const [durationSeconds, setDurationSeconds] = useState<number>(initialAlert.durationSeconds || 8);
  const [fontFamily, setFontFamily] = useState<string>(initialAlert.fontFamily || 'Chakra Petch');
  const [fontSize, setFontSize] = useState<number>(initialAlert.fontSize || 28);
  const [textTemplate, setTextTemplate] = useState<string>(initialAlert.textTemplate || '{name} just subscribed to {tier}!');
  const [textColor, setTextColor] = useState<string>(initialAlert.textColor || '#FFFFFF');
  const [subscriberColor, setSubscriberColor] = useState<string>(initialAlert.subscriberColor || '#00F0FF');
  const [tierColor, setTierColor] = useState<string>(initialAlert.tierColor || '#F59E0B');
  const [layoutMode, setLayoutMode] = useState<'top' | 'left' | 'right' | 'banner'>(initialAlert.layoutMode || 'top');
  const [animationStyle, setAnimationStyle] = useState<string>(initialAlert.animationStyle || 'pop');
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(initialAlert.ttsEnabled !== false);
  const [ttsType, setTtsType] = useState<'google' | 'google-male' | 'kiritts-male' | 'kiritts-female' | 'cloned'>(
    initialAlert.ttsType || 'kiritts-female'
  );
  const [clonedVoiceName, setClonedVoiceName] = useState<string>(initialAlert.clonedVoiceName || '');
  const [clonedVoiceSampleUrl, setClonedVoiceSampleUrl] = useState<string>(initialAlert.clonedVoiceSampleUrl || '');

  // User Auth & Pro Plan Status
  const { user } = useAuth();
  const isPro =
    String(user?.plan || '').toLowerCase() === 'pro' ||
    Boolean(user?.isAdmin || user?.is_admin || user?.role === 'admin');

  // Cloned Voices List from server
  const [clonedVoices, setClonedVoices] = useState<any[]>([]);
  const [loadingClonedVoices, setLoadingClonedVoices] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchClonedVoices = async () => {
      try {
        setLoadingClonedVoices(true);
        const token = streamerToken || user?.overlayToken || user?.id || '';
        const query = token ? `?token=${encodeURIComponent(token)}` : '';
        const res = await fetch(`/api/voice-clone${query}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.voices)) {
          setClonedVoices(data.voices);
        }
      } catch (e) {
        console.warn('Error loading cloned voices for subscriber alert studio:', e);
      } finally {
        if (isMounted) setLoadingClonedVoices(false);
      }
    };
    fetchClonedVoices();
    return () => {
      isMounted = false;
    };
  }, [streamerToken, user?.overlayToken, user?.id]);

  // UI Modals & Helpers
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<'image' | 'audio'>('image');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [testToast, setTestToast] = useState<string | null>(null);

  // Preview simulation controls
  const [previewAlertKey, setPreviewAlertKey] = useState<number>(1);
  const [previewSampleName, setPreviewSampleName] = useState<string>('SokhaGamer');
  const [previewSampleMsg, setPreviewSampleMsg] = useState<string>('Excited to support your stream!');

  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const templateInputRef = useRef<HTMLInputElement | null>(null);

  // Check unsaved changes
  const hasChanges = useMemo(() => {
    return (
      templateStyle !== initialAlert.templateStyle ||
      glowColor !== initialAlert.glowColor ||
      mediaUrl !== initialAlert.mediaUrl ||
      showImage !== initialAlert.showImage ||
      soundUrl !== initialAlert.soundUrl ||
      soundVolume !== initialAlert.soundVolume ||
      durationSeconds !== initialAlert.durationSeconds ||
      fontFamily !== initialAlert.fontFamily ||
      fontSize !== initialAlert.fontSize ||
      textTemplate !== initialAlert.textTemplate ||
      textColor !== initialAlert.textColor ||
      subscriberColor !== initialAlert.subscriberColor ||
      tierColor !== initialAlert.tierColor ||
      layoutMode !== initialAlert.layoutMode ||
      animationStyle !== initialAlert.animationStyle ||
      ttsEnabled !== initialAlert.ttsEnabled ||
      ttsType !== initialAlert.ttsType ||
      clonedVoiceName !== initialAlert.clonedVoiceName ||
      clonedVoiceSampleUrl !== initialAlert.clonedVoiceSampleUrl
    );
  }, [
    templateStyle,
    glowColor,
    mediaUrl,
    showImage,
    soundUrl,
    soundVolume,
    durationSeconds,
    fontFamily,
    fontSize,
    textTemplate,
    textColor,
    subscriberColor,
    tierColor,
    layoutMode,
    animationStyle,
    ttsEnabled,
    ttsType,
    clonedVoiceName,
    clonedVoiceSampleUrl,
    initialAlert
  ]);

  // Construct current simulated LiveAlertPayload for live NeonAlertCard preview
  const previewPayload: LiveAlertPayload = useMemo(() => {
    return {
      donationId: 'preview-sub-' + Date.now(),
      donorName: previewSampleName,
      donorMessage: previewSampleMsg,
      amount: tier.price,
      currency: tier.currency || 'USD',
      bankingName: 'Bakong KHQR',
      templateStyle,
      textTemplate,
      textColor,
      donorColor: subscriberColor,
      amountColor: tierColor,
      mediaUrl: mediaUrl || tier.badgeGifUrl || tier.badgeImage,
      customGifUrl: mediaUrl || tier.badgeGifUrl || tier.badgeImage,
      showImage,
      fontFamily,
      fontSize,
      layoutMode,
      animationStyle,
      glowColor,
      soundUrl,
      soundVolume,
      durationSeconds,
      ttsEnabled,
      ttsType,
      isSubscription: true,
      tierName: tier.name,
      badgeText: tier.badgeText,
      badgeColor: tier.badgeColor
    } as any;
  }, [
    previewSampleName,
    previewSampleMsg,
    tier,
    templateStyle,
    textTemplate,
    textColor,
    subscriberColor,
    tierColor,
    mediaUrl,
    showImage,
    fontFamily,
    fontSize,
    layoutMode,
    animationStyle,
    glowColor,
    soundUrl,
    soundVolume,
    durationSeconds,
    ttsEnabled,
    ttsType
  ]);

  // Play Sound Preview
  const handlePlaySoundPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
      setIsPlayingAudio(false);
      return;
    }
    const audio = new Audio(soundUrl);
    audio.volume = soundVolume;
    audioPreviewRef.current = audio;
    setIsPlayingAudio(true);
    audio.onended = () => {
      setIsPlayingAudio(false);
      audioPreviewRef.current = null;
    };
    audio.onerror = () => {
      setIsPlayingAudio(false);
      audioPreviewRef.current = null;
    };
    audio.play().catch(() => setIsPlayingAudio(false));
  };

  // Play Full Simulated Alert Preview (Audio + Card Animation + TTS)
  const handleTriggerSimulatedAlert = async (broadcastToObs = false) => {
    setTestingAlert(true);
    setPreviewAlertKey((k) => k + 1);

    // 1. Play sound
    playSound(soundUrl, soundVolume);

    // 2. Play TTS if enabled
    if (ttsEnabled) {
      try {
        const headline = textTemplate
          .replace(/\{donator\}/gi, previewSampleName)
          .replace(/\{name\}/gi, previewSampleName)
          .replace(/\{tier\}/gi, tier.name)
          .replace(/\{amount\}/gi, `$${tier.price.toFixed(2)}`);

        const isKhmer =
          /[\u1780-\u17FF]/.test(previewSampleName + ' ' + previewSampleMsg + ' ' + textTemplate) ||
          ttsType.startsWith('kiritts');

        const cleanHeadline = normalizeCurrencyAndSymbols(headline, isKhmer);
        const cleanMsg = previewSampleMsg ? normalizeCurrencyAndSymbols(previewSampleMsg, isKhmer) : '';
        const fullSpeech = cleanMsg ? `${cleanHeadline}. ${cleanMsg}` : cleanHeadline;

        let ttsUrl = '';
        // If user is not Pro but cloned is selected, fallback to standard neural voice
        const effectiveTtsType = !isPro && ttsType === 'cloned' ? 'google' : ttsType;
        if (effectiveTtsType === 'cloned') {
          ttsUrl = `/api/tts?type=cloned&token=${encodeURIComponent(
            streamerToken || user?.overlayToken || ''
          )}&clonedVoiceName=${encodeURIComponent(
            clonedVoiceName || ''
          )}&clonedVoiceSampleUrl=${encodeURIComponent(
            clonedVoiceSampleUrl || ''
          )}&text=${encodeURIComponent(fullSpeech.slice(0, 250))}`;
        } else {
          ttsUrl = `/api/tts?type=${encodeURIComponent(effectiveTtsType)}&text=${encodeURIComponent(
            fullSpeech.slice(0, 250)
          )}`;
        }

        const ttsAudio = new Audio(ttsUrl);
        ttsAudioRef.current = ttsAudio;
        ttsAudio.volume = Math.min(1, soundVolume + 0.1);
        ttsAudio.play().catch(() => {});
      } catch (err) {
        console.warn('TTS playback error:', err);
      }
    }

    // 3. Broadcast to real OBS overlay via socket or fallback API if requested (never both)
    if (broadcastToObs && token) {
      const testDonationId = 'test-sub-' + Date.now();
      const alertPayload = {
        donationId: testDonationId,
        overlayToken: token,
        donorName: previewSampleName,
        donorMessage: previewSampleMsg,
        amount: tier.price,
        currency: tier.currency || 'USD',
        templateStyle,
        textTemplate,
        textColor,
        donorColor: subscriberColor,
        amountColor: tierColor,
        mediaUrl: mediaUrl || tier.badgeGifUrl || tier.badgeImage,
        customGifUrl: mediaUrl || tier.badgeGifUrl || tier.badgeImage,
        showImage,
        fontFamily,
        fontSize,
        layoutMode,
        animationStyle,
        glowColor,
        soundUrl,
        soundVolume,
        durationSeconds,
        ttsEnabled,
        ttsType,
        clonedVoiceSampleUrl,
        isSubscription: true,
        tierId: tier.id,
        tierName: tier.name,
        badgeText: tier.badgeText,
        badgeColor: tier.badgeColor,
        badgeBg: tier.badgeBg,
        badgeBorder: tier.badgeBorder,
        badgeIcon: tier.badgeIcon,
        subscriberColor,
        tierColor,
        isTest: true
      };

      // Broadcast to real OBS overlay via WebSocket if connected, otherwise via fallback API
      if (socket && socket.connected) {
        socket.emit('trigger:test_alert', alertPayload);
        setTestToast(`Broadcasted ${tier.name} alert to live OBS Membership overlay!`);
        setTimeout(() => setTestToast(null), 3500);
      } else {
        const authToken = typeof window !== 'undefined'
          ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('streamneon_token'))
          : null;

        fetch('/api/overlays/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          },
          credentials: 'include',
          body: JSON.stringify(alertPayload)
        })
          .then((res) => {
            if (res.ok) {
              setTestToast(`Broadcasted ${tier.name} alert to live OBS Membership overlay!`);
              setTimeout(() => setTestToast(null), 3500);
            }
          })
          .catch((e) => {
            console.warn('Fallback test alert API error:', e);
          });
      }
    }

    setTimeout(() => {
      setTestingAlert(false);
    }, (durationSeconds || 8) * 1000);
  };

  // Save Alert Settings
  const handleSaveAlertSettings = async () => {
    setSaving(true);
    setSaveSuccessToast(false);

    const updatedAlertSettings: SubscriberAlertSettings = {
      isEnabled: true,
      templateStyle,
      glowColor,
      mediaUrl: mediaUrl.trim() || undefined,
      showImage,
      soundUrl,
      soundVolume,
      durationSeconds,
      fontFamily,
      fontSize,
      textTemplate: textTemplate.trim(),
      textColor,
      subscriberColor,
      tierColor,
      layoutMode,
      animationStyle,
      ttsEnabled,
      ttsType,
      clonedVoiceName: clonedVoiceName.trim() || undefined,
      clonedVoiceSampleUrl: clonedVoiceSampleUrl.trim() || undefined
    };

    const updatedTier: SubscriberTier = {
      ...tier,
      alertSettings: updatedAlertSettings
    };

    try {
      // Re-fetch existing tiers and replace this tier
      const settingsRes = await fetch(`/api/widgets/subscribers/settings?token=${token}&username=${username}`);
      const settingsData = await settingsRes.json();
      let currentTiers: SubscriberTier[] = Array.isArray(settingsData?.settings?.tiers) ? settingsData.settings.tiers : allTiers;

      const newTiersList = currentTiers.map((t) => (t.id === tier.id ? updatedTier : t));

      const saveRes = await fetch('/api/widgets/subscribers/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          username,
          enabled: true,
          tiers: newTiersList,
          telegramOutletGroup: settingsData?.settings?.telegramOutletGroup
        })
      });

      const resData = await saveRes.json();
      if (resData.success) {
        onSaveSuccess(updatedTier);
        setSaveSuccessToast(true);
        setTimeout(() => setSaveSuccessToast(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save subscriber tier alert settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Upload Custom Alert GIF / Image
  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success && data.media?.url) {
        setMediaUrl(data.media.url);
        setShowImage(true);
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Insert token tag into text template at cursor
  const handleInsertToken = (tokenTag: string) => {
    setTextTemplate((prev) => {
      return prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + tokenTag;
    });
    templateInputRef.current?.focus();
  };

  // Copy Alert Settings from another tier
  const handleCopyFromTier = (sourceTier: SubscriberTier) => {
    if (!sourceTier.alertSettings) return;
    const s = sourceTier.alertSettings;
    if (s.templateStyle) setTemplateStyle(s.templateStyle);
    if (s.glowColor) setGlowColor(s.glowColor);
    if (s.mediaUrl) setMediaUrl(s.mediaUrl);
    if (s.showImage !== undefined) setShowImage(s.showImage);
    if (s.soundUrl) setSoundUrl(s.soundUrl);
    if (s.soundVolume !== undefined) setSoundVolume(s.soundVolume);
    if (s.durationSeconds) setDurationSeconds(s.durationSeconds);
    if (s.fontFamily) setFontFamily(s.fontFamily);
    if (s.fontSize) setFontSize(s.fontSize);
    if (s.textTemplate) setTextTemplate(s.textTemplate);
    if (s.textColor) setTextColor(s.textColor);
    if (s.subscriberColor) setSubscriberColor(s.subscriberColor);
    if (s.tierColor) setTierColor(s.tierColor);
    if (s.layoutMode) setLayoutMode(s.layoutMode);
    if (s.animationStyle) setAnimationStyle(s.animationStyle);
    if (s.ttsEnabled !== undefined) setTtsEnabled(s.ttsEnabled);
    if (s.ttsType) setTtsType(s.ttsType);
    if (s.clonedVoiceName) setClonedVoiceName(s.clonedVoiceName);
    if (s.clonedVoiceSampleUrl) setClonedVoiceSampleUrl(s.clonedVoiceSampleUrl);

    setTestToast(`Copied alert styles from "${sourceTier.name}"!`);
    setTimeout(() => setTestToast(null), 3000);
  };

  // Browser Source Overlay URL
  const overlayUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/overlay/subscribers/${token}`
    : `/overlay/subscribers/${token}`;

  const otherTiers = allTiers.filter((t) => t.id !== tier.id);

  return (
    <div className="flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col bg-[#0f0f0f] text-neutral-100 antialiased animate-in fade-in duration-150">
      {/* 1. TOP DEDICATED STUDIO HEADER */}
      <header className="flex-shrink-0 h-14 sm:h-16 border-b border-[#262626] bg-[#141414] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-20">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:bg-[#222] text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back to Memberships</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#181818] border border-[#262626]">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(overlayUrl);
                setCopiedUrl(true);
                setTimeout(() => setCopiedUrl(false), 2000);
              }}
              title={copiedUrl ? 'Copied OBS Overlay URL!' : 'Copy OBS Overlay URL'}
              aria-label="Copy OBS Overlay URL"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                copiedUrl
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <a
              href={overlayUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Target Overlay in New Tab"
              aria-label="Open Target Overlay"
              className="p-1.5 rounded-md text-neutral-400 hover:text-white transition-colors flex items-center justify-center"
            >
              <ExternalLink size={14} />
            </a>
            {onRegenerateToken && (
              <button
                type="button"
                onClick={onRegenerateToken}
                className="p-1.5 rounded-md text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Regenerate Security Token"
                aria-label="Regenerate Security Token"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={testingAlert}
            onClick={() => handleTriggerSimulatedAlert(true)}
            className="text-xs px-3 py-1.5 rounded-lg border-[#262626] text-neutral-300 hover:text-white bg-[#1a1a1a] hover:bg-[#222] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Test on OBS</span>
            <span className="sm:hidden">Test</span>
          </Button>

          <Button
            type="button"
            loading={saving}
            onClick={handleSaveAlertSettings}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer bg-white hover:bg-neutral-200 text-black"
          >
            <Save size={13} />
            <span>Save Changes</span>
          </Button>
        </div>
      </header>

      {/* 2. MAIN 2-COLUMN STUDIO WORKBENCH */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: CUSTOMIZATION ACCORDIONS (SCROLLABLE) */}
        <div className="w-full lg:w-[320px] xl:w-[340px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#090D18] overflow-y-auto p-3 sm:p-3.5 space-y-2.5">
          {/* SECTION 1: TEXT & TYPOGRAPHY */}
          <div className="rounded-xl bg-[#090D18] border border-slate-800 overflow-hidden shadow-lg transition-all">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'text' ? null : 'text')}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
            >
              <h3 className="text-xs sm:text-sm font-bold font-['Chakra_Petch'] text-white">
                Text &amp; Typography
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  activeTab === 'text' ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {activeTab === 'text' && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 space-y-4 bg-slate-950/40">
                {/* Headline Text Template */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                      Alert Headline Template *
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Dynamic replacement</span>
                  </div>
                  <input
                    ref={templateInputRef}
                    type="text"
                    value={textTemplate}
                    onChange={(e) => setTextTemplate(e.target.value)}
                    placeholder="{name} just subscribed to {tier}!"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                  />

                  {/* Dynamic Token Helper Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">Insert tags:</span>
                    {[
                      { tag: '{name}', desc: 'Member Name' },
                      { tag: '{tier}', desc: 'Tier Name' },
                      { tag: '{amount}', desc: 'Price ($4.99)' },
                      { tag: '{message}', desc: 'Member Message' }
                    ].map((tok) => (
                      <button
                        key={tok.tag}
                        type="button"
                        onClick={() => handleInsertToken(tok.tag)}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-cyan-950 border border-slate-700/80 hover:border-cyan-500 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer"
                        title={tok.desc}
                      >
                        + {tok.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Pickers: Text, Subscriber Name, Tier Name */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <label className="text-[10px] font-mono uppercase text-slate-400 block">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor.startsWith('#') ? textColor : '#FFFFFF'}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1 px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] font-mono text-white rounded"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <label className="text-[10px] font-mono uppercase text-cyan-400 block">Member Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={subscriberColor.startsWith('#') ? subscriberColor : '#00F0FF'}
                        onChange={(e) => setSubscriberColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={subscriberColor}
                        onChange={(e) => setSubscriberColor(e.target.value)}
                        className="flex-1 px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] font-mono text-white rounded"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <label className="text-[10px] font-mono uppercase text-amber-400 block">Tier Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tierColor.startsWith('#') ? tierColor : '#F59E0B'}
                        onChange={(e) => setTierColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={tierColor}
                        onChange={(e) => setTierColor(e.target.value)}
                        className="flex-1 px-2 py-1 bg-slate-950 border border-slate-800 text-[11px] font-mono text-white rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Font Family & Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block">
                      Stream Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white outline-none"
                    >
                      <optgroup label="Khmer Streamer Fonts">
                        {KHMER_FONTS_2019.map((f) => (
                          <option key={f.family} value={f.family}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="English & Display Fonts">
                        {SYSTEM_STREAM_FONTS.map((f) => (
                          <option key={f.family} value={f.family}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                        Font Size: {fontSize}px
                      </label>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={46}
                      step={1}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer mt-2"
                    />
                  </div>
                </div>

                {/* Layout Mode */}
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block">
                    Alert Layout Mode
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'top', label: 'Top Media' },
                      { id: 'left', label: 'Left Media' },
                      { id: 'right', label: 'Right Media' },
                      { id: 'banner', label: 'Banner Overlay' }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setLayoutMode(mode.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                          layoutMode === mode.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: MEDIA, SOUND & VISUAL STYLE */}
          <div className="rounded-xl bg-[#090D18] border border-slate-800 overflow-hidden shadow-lg transition-all">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'image' ? null : 'image')}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
            >
              <h3 className="text-xs sm:text-sm font-bold font-['Chakra_Petch'] text-white">
                Media, Sound &amp; Visual Style
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  activeTab === 'image' ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {activeTab === 'image' && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 space-y-4 bg-slate-950/40">
                {/* Template Style Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block">
                    Alert Template Style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {TEMPLATE_STYLES.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => setTemplateStyle(st.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          templateStyle === st.id
                            ? 'bg-cyan-950/30 border-cyan-500 shadow-sm shadow-cyan-500/20'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-['Chakra_Petch']">{st.name}</span>
                          {templateStyle === st.id && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 leading-snug mt-1">{st.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Glow Color Presets & Hex Picker */}
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block">
                    Primary Neon Aura &amp; Glow Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {GLOW_COLOR_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setGlowColor(p.hex)}
                        className={`w-7 h-7 rounded-lg border transition-transform cursor-pointer flex items-center justify-center ${
                          glowColor.toLowerCase() === p.hex.toLowerCase()
                            ? 'scale-110 border-white ring-2 ring-white/40'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: p.hex }}
                        title={p.label}
                      />
                    ))}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="color"
                        value={glowColor.startsWith('#') ? glowColor : '#00F0FF'}
                        onChange={(e) => setGlowColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={glowColor}
                        onChange={(e) => setGlowColor(e.target.value)}
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-800 text-[11px] font-mono text-white rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Media Image / GIF Asset */}
                <div className="space-y-3 pt-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase block">
                        Alert Image / GIF Animation
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Display badge mascot, custom GIF, or animated sticker on alert
                      </span>
                    </div>
                    <Switch checked={showImage} onChange={setShowImage} />
                  </div>

                  {showImage && (
                    <div className="flex items-center gap-3 pt-2">
                      <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 flex-shrink-0 relative overflow-hidden">
                        {mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt="Alert Media"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder="Image or GIF URL..."
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 font-mono outline-none"
                        />

                        <div className="flex items-center gap-2 flex-wrap">
                          {tier.badgeGifUrl && (
                            <button
                              type="button"
                              onClick={() => setMediaUrl(tier.badgeGifUrl || '')}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-cyan-300 transition-colors"
                            >
                              Use Tier Badge GIF
                            </button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMediaPickerMode('image');
                              setIsMediaPickerOpen(true);
                            }}
                            className="text-[10px] font-mono py-1 px-2.5 h-auto border-slate-700"
                          >
                            Media Library
                          </Button>
                          <label className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 cursor-pointer transition-colors inline-flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>{uploadingMedia ? 'Uploading...' : 'Upload File'}</span>
                            <input
                              type="file"
                              accept="image/*,.gif,.webp"
                              className="hidden"
                              onChange={handleUploadImageFile}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sound & Audio Effect */}
                <div className="space-y-3 pt-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-slate-200 uppercase block">
                        Alert Audio Chime
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Plays immediately when viewer joins membership
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePlaySoundPreview}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 hover:bg-cyan-900/60 transition-colors cursor-pointer"
                      >
                        {isPlayingAudio ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Test Sound</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={soundUrl}
                      onChange={(e) => setSoundUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none font-mono"
                    >
                      <optgroup label="Preset Alert Chimes">
                        {SOUND_PRESETS.map((snd) => (
                          <option key={snd.url} value={snd.url}>
                            {snd.label}
                          </option>
                        ))}
                      </optgroup>
                      {!SOUND_PRESETS.some((s) => s.url === soundUrl) && soundUrl && (
                        <optgroup label="Custom Sound">
                          <option value={soundUrl}>Custom: {soundUrl.split('/').pop()}</option>
                        </optgroup>
                      )}
                    </select>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMediaPickerMode('audio');
                          setIsMediaPickerOpen(true);
                        }}
                        className="text-[10px] font-mono py-1 px-2.5 h-auto border-slate-700"
                      >
                        Choose Audio Asset
                      </Button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Sound Volume</span>
                      <span className="text-white font-bold">{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Duration & Animation Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-bold text-slate-300 uppercase">
                        Alert Duration: {durationSeconds}s
                      </label>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={25}
                      step={1}
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer mt-2"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block">
                      Entrance Animation
                    </label>
                    <select
                      value={animationStyle}
                      onChange={(e) => setAnimationStyle(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none font-mono"
                    >
                      {ANIMATION_PRESETS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: TEXT-TO-SPEECH (TTS) */}
          <div className="rounded-xl bg-[#090D18] border border-slate-800 overflow-hidden shadow-lg transition-all">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'tts' ? null : 'tts')}
              className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
            >
              <h3 className="text-xs sm:text-sm font-bold font-['Chakra_Petch'] text-white">
                Text-To-Speech (TTS)
              </h3>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  activeTab === 'tts' ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {activeTab === 'tts' && (
              <div className="p-4 sm:p-5 border-t border-slate-800/80 space-y-4 bg-slate-950/40">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-xs font-mono font-bold text-white uppercase block">
                      Enable TTS on Membership Alerts
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Speaks member name, tier announcement, and viewer message
                    </span>
                  </div>
                  <Switch checked={ttsEnabled} onChange={setTtsEnabled} />
                </div>

                {ttsEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block">
                        Select Neural Voice Model
                      </label>
                      {clonedVoices.length > 0 && (
                        <span className="text-[10px] font-mono text-cyan-400">
                          {clonedVoices.length} custom {clonedVoices.length === 1 ? 'voice' : 'voices'} available
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          id: 'kiritts-female',
                          name: 'KiriTTS Khmer Female (Sreymom)',
                          badge: 'NEURAL KH',
                          desc: 'Ultra natural Khmer voice model for stream alerts'
                        },
                        {
                          id: 'kiritts-male',
                          name: 'KiriTTS Khmer Male (Piseth)',
                          badge: 'NEURAL KH',
                          desc: 'Energetic Khmer male streamer announcer'
                        },
                        {
                          id: 'google',
                          name: 'Google Cloud Female (Jenny)',
                          badge: 'ENGLISH',
                          desc: 'Standard English & international voice'
                        },
                        {
                          id: 'google-male',
                          name: 'Google Cloud Male (Christopher)',
                          badge: 'ENGLISH',
                          desc: 'Deep English & multilingual neural voice'
                        }
                      ].map((v) => {
                        const isSelected = ttsType === v.id;
                        return (
                          <div
                            key={v.id}
                            onClick={() => setTtsType(v.id as any)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-950/30 border-emerald-500 shadow-sm shadow-emerald-500/20'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">{v.name}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-slate-400 border border-slate-800 shrink-0">
                                  {v.badge}
                                </span>
                              </div>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 leading-snug mt-1">{v.desc}</span>
                          </div>
                        );
                      })}

                      {/* Cloned Voices Section */}
                      {clonedVoices.length > 0 ? (
                        clonedVoices.map((cv, idx) => {
                          const isSelected =
                            ttsType === 'cloned' &&
                            (clonedVoiceName === cv.voiceName || (!clonedVoiceName && idx === 0));

                          return (
                            <div
                              key={cv._id || `cloned-${idx}`}
                              onClick={() => {
                                setTtsType('cloned');
                                setClonedVoiceName(cv.voiceName);
                                setClonedVoiceSampleUrl(cv.sampleUrl || '');
                              }}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-emerald-950/30 border-emerald-500 shadow-sm shadow-emerald-500/20'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                                    {cv.voiceName}
                                  </span>
                                  {isPro ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                      <Sparkles size={9} /> CLONED
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                      <Lock size={9} /> PRO PLAN
                                    </span>
                                  )}
                                </div>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 leading-snug mt-1">
                                AI Neural Voice Clone • {cv.soundStyle || 'Custom Neural Style'} • {cv.sampleDurationSeconds ? `${cv.sampleDurationSeconds}s sample` : 'Trained'}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div
                          onClick={() => setTtsType('cloned')}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            ttsType === 'cloned'
                              ? 'bg-emerald-950/30 border-emerald-500 shadow-sm shadow-emerald-500/20'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                                Streamer Custom Voice Clone
                              </span>
                              {isPro ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-slate-400 border border-slate-800 shrink-0">
                                  Clone TTS
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                  <Lock size={9} /> PRO PLAN
                                </span>
                              )}
                            </div>
                            {ttsType === 'cloned' && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 leading-snug mt-1">
                            Custom voice clone configured in Clone TTS dashboard
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Non-pro warning when cloned is selected */}
                    {ttsType === 'cloned' && !isPro && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-bold text-amber-300 block">Pro Plan Feature</span>
                          <span className="text-slate-300">
                            AI Voice Clone is a Pro Plan feature. While on the Free tier, subscriber alerts will automatically fall back to the default neural voice (Jenny / Piseth).
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: COPY FROM ANOTHER TIER */}
          {otherTiers.length > 0 && (
            <div className="rounded-xl bg-[#090D18] border border-slate-800 overflow-hidden shadow-lg transition-all">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'copy' ? null : 'copy')}
                className="w-full px-3.5 py-3 flex items-center justify-between text-left hover:bg-slate-900/50 transition-colors cursor-pointer"
              >
                <h3 className="text-xs sm:text-sm font-bold font-['Chakra_Petch'] text-white">
                  Copy from Another Tier
                </h3>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    activeTab === 'copy' ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {activeTab === 'copy' && (
                <div className="p-4 border-t border-slate-800/80 space-y-2 bg-slate-950/40">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Click any tier below to copy its alert layout, colors, and audio settings to this tier:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {otherTiers.map((ot) => (
                      <div
                        key={ot.id}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate block">
                            {ot.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ${ot.price.toFixed(2)}/mo — [{ot.badgeText}]
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyFromTier(ot)}
                          className="text-[10px] font-mono py-1 px-2.5 h-auto text-cyan-300 border-slate-700"
                        >
                          Copy Styles
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INTERACTIVE LIVE PREVIEW CANVAS & SIMULATOR DOCK */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-[#05070E] p-4 sm:p-6 space-y-4">
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
            {/* Simulated 16:9 OBS Canvas Stage */}
            <div className="relative aspect-video w-full rounded-xl bg-[#05070D] border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner group">
              {/* Subtle Grid Lines */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                  backgroundSize: '32px 32px'
                }}
              />

              {/* The Live NeonAlertCard */}
              <div
                key={previewAlertKey}
                style={{
                  transform: 'scale(0.72)',
                  transformOrigin: 'center center'
                }}
                className="transition-transform duration-150 flex items-center justify-center pointer-events-none"
              >
                <NeonAlertCard alert={previewPayload} />
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={previewSampleName}
                  onChange={(e) => setPreviewSampleName(e.target.value)}
                  placeholder="Sample Name"
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono outline-none"
                />
                <input
                  type="text"
                  value={previewSampleMsg}
                  onChange={(e) => setPreviewSampleMsg(e.target.value)}
                  placeholder="Sample message..."
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  disabled={testingAlert}
                  onClick={() => handleTriggerSimulatedAlert(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingAlert ? 'animate-spin' : ''}`} />
                  <span>Replay Preview</span>
                </Button>

                <Button
                  type="button"
                  disabled={testingAlert}
                  onClick={() => handleTriggerSimulatedAlert(true)}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Send to OBS</span>
                </Button>
              </div>
            </div>

            {/* Dedicated OBS Browser Source Helper */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                OBS Browser Source URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={overlayUrl}
                  className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 select-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(overlayUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-white rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Add this URL as an OBS Browser Source (1920x1080). When viewers subscribe to this tier, the alert will trigger with this custom design automatically.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODALS */}
      {/* Media Picker Modal */}
      {isMediaPickerOpen && (
        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          filterMode={mediaPickerMode === 'audio' ? 'audio' : 'image'}
          initialSection={mediaPickerMode === 'audio' ? 'sounds' : 'gifs'}
          currentUrl={mediaPickerMode === 'audio' ? soundUrl : mediaUrl}
          onSelect={(url: string, item?: MediaItem) => {
            if (mediaPickerMode === 'audio' || (item && isAudioAsset(item))) {
              setSoundUrl(url);
            } else {
              setMediaUrl(url);
              setShowImage(true);
            }
            setIsMediaPickerOpen(false);
          }}
        />
      )}

      {/* 4. TOAST NOTIFICATIONS */}
      {saveSuccessToast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="rounded-xl px-4 py-2.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl shadow-emerald-950/50">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Alert settings for &quot;{tier.name}&quot; saved successfully!</span>
          </div>
        </div>
      )}

      {testToast && (
        <div className="fixed top-18 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="rounded-xl px-4 py-2.5 bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 shadow-2xl shadow-cyan-950/50">
            <Bell className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{testToast}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriberAlertStudio;
