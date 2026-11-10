'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Sliders,
  Type,
  Image as ImageIcon,
  Mic,
  Volume2,
  Sparkles,
  Play,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Save,
  CheckCircle2,
  RefreshCw,
  Monitor,
  Eye,
  Settings2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  Radio,
  Cpu,
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
  Plus,
  Menu,
  X,
  Lock
} from 'lucide-react';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { AlertBox, AlertConditionTier } from '../../types/alert';
import { useAudio } from '../../hooks/useAudio';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
import { AlertPresetModal } from './AlertPresetModal';
import { MediaPickerModal } from './MediaPickerModal';
import { useAuth } from '../../context/AuthContext';
import { AlertPreset } from '../../data/donationAlertPresets';
import { MediaItem, isAudioAsset } from './MediaLibraryManager';
import { normalizeCurrencyAndSymbols, khmerNumberToWords } from '../../utils/ttsHelper';
import { KHMER_FONTS_2019 } from '../../data/khmerFonts';
import { getRandomTemplateGif } from '../../data/presetsData';
import { NeonAlertCard } from '../overlay/NeonAlertCard';

interface DonationAlertStudioProps {
  box: AlertBox | null; // null when creating a new box
  streamerToken?: string;
  onBack: () => void;
  onSaveSuccess: (savedBox: AlertBox) => void;
  onDeleteSuccess?: (deletedBoxId: string) => void;
  onNavigateToStorage?: () => void;
  inlineMode?: boolean;
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
  { label: 'Electric Emerald', hex: '#00FF66' },
  { label: 'Hyper Yellow', hex: '#FFE600' },
  { label: 'Vivid Violet', hex: '#8A2BE2' },
  { label: 'Crimson Flame', hex: '#FF3366' },
  { label: 'Pure White', hex: '#FFFFFF' }
];

export const DonationAlertStudio: React.FC<DonationAlertStudioProps> = ({
  box,
  streamerToken,
  onBack,
  onSaveSuccess,
  onDeleteSuccess,
  onNavigateToStorage,
  inlineMode = false,
  onRegenerateToken
}) => {
  const isNew = !box || !box._id;
  const { playSound } = useAudio();
  const { socket } = useSocket();
  const { showConfirm } = useModal();
  const { user } = useAuth();

  // Active Category Section (Accordion List Item Expanded: null = collapsed)
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'tts' | 'rules' | null>(null);

  const initialConditions = useMemo<AlertConditionTier[]>(() => {
    if (box?.conditions && Array.isArray(box.conditions) && box.conditions.length > 0) {
      return box.conditions.map((c, idx) => ({
        id: c.id || `cond_${idx}`,
        minAmountCondition: Number(c.minAmountCondition) > 0 ? Number(c.minAmountCondition) : 0.01,
        isEnabled: true,
        templateStyle: c.templateStyle || box.templateStyle || 'neon-box',
        showImage: c.showImage !== false,
        mediaUrl: c.mediaUrl ?? box.mediaUrl ?? getRandomTemplateGif(),
        layoutMode: c.layoutMode || box.layoutMode || 'top',
        soundUrl:
          c.soundUrl && !c.soundUrl.includes('neon-chime')
            ? c.soundUrl
            : box.soundUrl && !box.soundUrl.includes('neon-chime')
            ? box.soundUrl
            : '/sounds/cash-register-kaching.mp3',
        soundVolume: c.soundVolume ?? box.soundVolume ?? 0.85,
        durationSeconds: c.durationSeconds || box.durationSeconds || 8,
        glowColor: c.glowColor || box.glowColor || '#00F0FF',
        fontFamily: c.fontFamily || box.fontFamily || 'Kh Ang Bokor',
        fontSize: c.fontSize || box.fontSize || 28,
        textColor: c.textColor || box.textColor || '#FFFFFF',
        donorColor: c.donorColor || box.donorColor || 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)',
        amountColor: c.amountColor || box.amountColor || 'linear-gradient(135deg, #FFE600 0%, #FF5E00 100%)',
        textTemplate: c.textTemplate || box.textTemplate || '{donator} donated {amount} through superchat!',
        animationStyle: (c.animationStyle === 'bounce' ? 'fade' : (c.animationStyle as any)) || 'fade',
        ttsEnabled: c.ttsEnabled !== false,
        ttsMinAmount: c.ttsMinAmount ?? box.ttsMinAmount ?? 0.01,
        ttsType: c.ttsType || box.ttsType || 'google',
        clonedVoiceName: c.clonedVoiceName ?? box.clonedVoiceName ?? '',
        clonedVoiceSampleUrl: c.clonedVoiceSampleUrl ?? box.clonedVoiceSampleUrl ?? ''
      }));
    }
    return [
      {
        id: 'cond_0',
        minAmountCondition: box?.minAmountCondition ?? 0.01,
        isEnabled: true,
        templateStyle: box?.templateStyle || 'neon-box',
        showImage: box?.showImage !== false,
        mediaUrl: box?.mediaUrl || getRandomTemplateGif(),
        layoutMode: box?.layoutMode || 'top',
        soundUrl:
          box?.soundUrl && !box.soundUrl.includes('neon-chime')
            ? box.soundUrl
            : '/sounds/cash-register-kaching.mp3',
        soundVolume: box?.soundVolume ?? 0.85,
        durationSeconds: box?.durationSeconds || 8,
        glowColor: box?.glowColor || '#00F0FF',
        fontFamily: box?.fontFamily || 'Kh Ang Bokor',
        fontSize: box?.fontSize || 28,
        textColor: box?.textColor || '#FFFFFF',
        donorColor: box?.donorColor || 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)',
        amountColor: box?.amountColor || 'linear-gradient(135deg, #FFE600 0%, #FF5E00 100%)',
        textTemplate: box?.textTemplate || '{donator} donated {amount} through superchat!',
        animationStyle: box?.animationStyle === 'bounce' ? 'fade' : (box?.animationStyle as any) || 'fade',
        ttsEnabled: box?.ttsEnabled !== false,
        ttsMinAmount: box?.ttsMinAmount ?? 0.01,
        ttsType: box?.ttsType || 'google',
        clonedVoiceName: box?.clonedVoiceName || '',
        clonedVoiceSampleUrl: box?.clonedVoiceSampleUrl || ''
      }
    ];
  }, [box?._id]);

  const firstTier = initialConditions[0];
  const [conditions, setConditions] = useState<AlertConditionTier[]>(initialConditions);
  const [activeConditionId, setActiveConditionId] = useState<string>(firstTier.id);

  // Form State (Box-level: name; Tier-level: active condition settings)
  const [name, setName] = useState((box?.name || 'Standard Box').slice(0, 16));
  const [minAmountCondition, setMinAmountCondition] = useState<number>(firstTier.minAmountCondition);
  const [conditionAmountInput, setConditionAmountInput] = useState<string>(
    Number(firstTier.minAmountCondition || 0.01).toFixed(2)
  );
  const [templateStyle, setTemplateStyle] = useState<'neon-box' | 'glass-hologram' | 'cyber-glitch' | 'arcade' | 'minimal'>(
    firstTier.templateStyle || 'neon-box'
  );
  const [showImage, setShowImage] = useState<boolean>(firstTier.showImage !== false);
  const [mediaUrl, setMediaUrl] = useState<string>(
    firstTier.mediaUrl || getRandomTemplateGif()
  );
  const [layoutMode, setLayoutMode] = useState<'top' | 'left' | 'right' | 'banner'>(
    firstTier.layoutMode || 'top'
  );
  const [soundUrl, setSoundUrl] = useState<string>(
    firstTier.soundUrl && !firstTier.soundUrl.includes('neon-chime')
      ? firstTier.soundUrl
      : '/sounds/cash-register-kaching.mp3'
  );
  const [soundVolume, setSoundVolume] = useState<number>(firstTier.soundVolume ?? 0.85);
  const [durationSeconds, setDurationSeconds] = useState<number>(firstTier.durationSeconds || 8);
  const [glowColor, setGlowColor] = useState<string>(firstTier.glowColor || '#00F0FF');
  const [fontFamily, setFontFamily] = useState<string>(firstTier.fontFamily || 'Kh Ang Bokor');
  const [fontSize, setFontSize] = useState<number>(firstTier.fontSize || 28);
  const [textColor, setTextColor] = useState<string>(firstTier.textColor || '#FFFFFF');
  const [donorColor, setDonorColor] = useState<string>(
    firstTier.donorColor || 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)'
  );
  const [amountColor, setAmountColor] = useState<string>(
    firstTier.amountColor || 'linear-gradient(135deg, #FFE600 0%, #FF5E00 100%)'
  );
  const [fontSearch, setFontSearch] = useState<string>('');
  const [fontCategory, setFontCategory] = useState<string>('All');
  const [textTemplate, setTextTemplate] = useState<string>(
    firstTier.textTemplate || '{donator} donated {amount} through superchat!'
  );
  const [animationStyle, setAnimationStyle] = useState<string>(
    firstTier.animationStyle === 'bounce' ? 'fade' : (firstTier.animationStyle as any) || 'fade'
  );

  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(firstTier.ttsEnabled !== false);
  const [ttsMinAmount, setTtsMinAmount] = useState<number>(firstTier.ttsMinAmount ?? 0.01);
  const [ttsMinAmountInput, setTtsMinAmountInput] = useState<string>(
    Number(firstTier.ttsMinAmount ?? 0.01).toFixed(2)
  );
  const [ttsType, setTtsType] = useState<'google' | 'google-male' | 'kiritts-male' | 'kiritts-female' | 'cloned'>(
    firstTier.ttsType || 'google'
  );
  const [clonedVoiceName, setClonedVoiceName] = useState<string>(firstTier.clonedVoiceName || '');
  const [clonedVoiceSampleUrl, setClonedVoiceSampleUrl] = useState<string>(firstTier.clonedVoiceSampleUrl || '');

  // UI / Action State
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  // Cloned Voices List from server & Pro Status
  const [clonedVoices, setClonedVoices] = useState<any[]>([]);
  const [loadingClonedVoices, setLoadingClonedVoices] = useState(false);

  const isPro =
    String(user?.plan || '').toLowerCase() === 'pro' ||
    Boolean(user?.isAdmin || user?.is_admin || user?.role === 'admin');

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
        console.warn('Error loading cloned voices for alert studio:', e);
      } finally {
        if (isMounted) setLoadingClonedVoices(false);
      }
    };
    fetchClonedVoices();
    return () => {
      isMounted = false;
    };
  }, [streamerToken, user?.overlayToken, user?.id]);

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  const handleApplyPreset = (preset: AlertPreset | null) => {
    if (!preset) return;
    setTemplateStyle(preset.templateStyle);
    setAnimationStyle(preset.capcutAnimation || (preset.animationStyle === 'bounce' ? 'fade' : preset.animationStyle));
    setGlowColor(preset.glowColor);
    setMediaUrl(preset.mediaUrl);
    setSoundUrl(preset.soundUrl);
    setFontFamily(preset.fontFamily);
    if (preset.fontSize) setFontSize(preset.fontSize);
    if (preset.textColor) setTextColor(preset.textColor);
    if (preset.donorColor) setDonorColor(preset.donorColor);
    if (preset.amountColor) setAmountColor(preset.amountColor);
    if (preset.textTemplate) setTextTemplate(preset.textTemplate);
    if (preset.layoutMode) setLayoutMode(preset.layoutMode);
  };
  
  // Media Library Storage Picker State (Supports User Uploads + Templates + 500 Stickers + 100 GIFs + Sounds)
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerSection, setMediaPickerSection] = useState<'uploads' | 'template' | 'stickers' | 'gifs' | 'sounds'>('template');

  const filteredFonts = useMemo(() => {
    return ALL_FONT_OPTIONS.filter((f) => {
      const matchCat = fontCategory === 'All' || f.category === fontCategory;
      const matchSearch =
        !fontSearch.trim() ||
        f.name.toLowerCase().includes(fontSearch.toLowerCase()) ||
        f.family.toLowerCase().includes(fontSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [fontCategory, fontSearch]);

  // Overlay Token Resolution
  const [activeOverlayToken, setActiveOverlayToken] = useState(streamerToken || '');

  useEffect(() => {
    if (streamerToken) {
      setActiveOverlayToken(streamerToken);
    } else {
      fetch('/api/auth/me')
        .then((res) => res.json())
        .then((data) => {
          if (data?.overlayToken) {
            setActiveOverlayToken(data.overlayToken);
          }
        })
        .catch(() => {});
    }
  }, [streamerToken]);

  const effectiveToken = activeOverlayToken || streamerToken || 'demo-token';

  // Live Canvas Simulation State (Default: Alert is hidden until tested or triggered)
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const simulationRunIdRef = useRef<number>(0);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Mobile responsive categories drawer / tab toggle
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  // Responsive zoom scale for device screens
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateResponsiveZoom = () => {
        if (window.innerWidth < 640) {
          setZoomScale(0.7);
        } else if (window.innerWidth < 1024) {
          setZoomScale(0.85);
        } else {
          setZoomScale(1);
        }
      };
      updateResponsiveZoom();
      window.addEventListener('resize', updateResponsiveZoom);
      return () => window.removeEventListener('resize', updateResponsiveZoom);
    }
  }, []);

  // Sample Simulation Data
  const [demoDonorName, setDemoDonorName] = useState('Supporter');
  const [demoAmount, setDemoAmount] = useState(minAmountCondition >= 1 ? minAmountCondition : 1.0);
  const [demoMessage, setDemoMessage] = useState('Thank you for the stream!');

  const formatConditionChip = (val: number): string => {
    const num = Number(val) > 0 ? Number(val) : 0.01;
    return `${num.toFixed(2)}$`;
  };

  const snapshotCurrentTier = (targetId: string): AlertConditionTier => ({
    id: targetId,
    minAmountCondition: Number(minAmountCondition) > 0 ? Number(Number(minAmountCondition).toFixed(2)) : 0.01,
    isEnabled: true,
    templateStyle,
    showImage,
    mediaUrl,
    layoutMode,
    soundUrl,
    soundVolume: Number(soundVolume),
    durationSeconds: Number(durationSeconds),
    glowColor,
    fontFamily,
    fontSize: Number(fontSize),
    textColor,
    donorColor,
    amountColor,
    textTemplate,
    animationStyle,
    ttsEnabled,
    ttsMinAmount: Number(ttsMinAmount) > 0 ? Number(Number(ttsMinAmount).toFixed(2)) : 0.01,
    ttsType,
    clonedVoiceName,
    clonedVoiceSampleUrl
  });

  const applyTierToForm = (tier: AlertConditionTier) => {
    const nextAmt = Number((Number(tier.minAmountCondition) > 0 ? Number(tier.minAmountCondition) : 0.01).toFixed(2));
    setMinAmountCondition(nextAmt);
    setConditionAmountInput(nextAmt.toFixed(2));
    setTemplateStyle(tier.templateStyle || 'neon-box');
    setShowImage(tier.showImage !== false);
    setMediaUrl(tier.mediaUrl || getRandomTemplateGif());
    setLayoutMode(tier.layoutMode || 'top');
    setSoundUrl(
      tier.soundUrl && !tier.soundUrl.includes('neon-chime')
        ? tier.soundUrl
        : '/sounds/cash-register-kaching.mp3'
    );
    setSoundVolume(tier.soundVolume ?? 0.85);
    setDurationSeconds(tier.durationSeconds || 8);
    setGlowColor(tier.glowColor || '#00F0FF');
    setFontFamily(tier.fontFamily || 'Kh Ang Bokor');
    setFontSize(tier.fontSize || 28);
    setTextColor(tier.textColor || '#FFFFFF');
    setDonorColor(tier.donorColor || 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)');
    setAmountColor(tier.amountColor || 'linear-gradient(135deg, #FFE600 0%, #FF5E00 100%)');
    setTextTemplate(tier.textTemplate || '{donator} donated {amount} through superchat!');
    setAnimationStyle(tier.animationStyle === 'bounce' ? 'fade' : (tier.animationStyle as any) || 'fade');
    setTtsEnabled(tier.ttsEnabled !== false);
    const nextTtsAmt = Number((Number(tier.ttsMinAmount ?? 0.01) > 0 ? Number(tier.ttsMinAmount ?? 0.01) : 0.01).toFixed(2));
    setTtsMinAmount(nextTtsAmt);
    setTtsMinAmountInput(nextTtsAmt.toFixed(2));
    setTtsType(tier.ttsType || 'google');
    setClonedVoiceName(tier.clonedVoiceName || '');
    setClonedVoiceSampleUrl(tier.clonedVoiceSampleUrl || '');
    setDemoAmount(nextAmt >= 0.01 ? nextAmt : 1.0);
  };

  const handleSelectCondition = (targetId: string) => {
    if (targetId === activeConditionId) return;
    const synced = conditions.map((c) => (c.id === activeConditionId ? snapshotCurrentTier(activeConditionId) : c));
    const targetTier = synced.find((c) => c.id === targetId);
    if (!targetTier) return;
    setConditions(synced);
    setActiveConditionId(targetId);
    applyTierToForm(targetTier);
  };

  const handleAddCondition = () => {
    const synced = conditions.map((c) => (c.id === activeConditionId ? snapshotCurrentTier(activeConditionId) : c));
    const maxExisting = synced.reduce((max, c) => Math.max(max, Number(c.minAmountCondition) || 0), 0);
    let nextAmount = 1.0;
    if (maxExisting < 0.01) {
      nextAmount = 0.01;
    } else if (maxExisting < 1) {
      nextAmount = 1.0;
    } else if (maxExisting < 5) {
      nextAmount = 5.0;
    } else if (maxExisting < 10) {
      nextAmount = 10.0;
    } else {
      nextAmount = Number((maxExisting + 5).toFixed(2));
    }

    const baseTier = snapshotCurrentTier(activeConditionId);
    const newId = `cond_${Date.now()}_${synced.length}`;
    const newTier: AlertConditionTier = {
      ...baseTier,
      id: newId,
      minAmountCondition: nextAmount,
      ttsMinAmount: nextAmount
    };

    const nextConditions = [...synced, newTier];
    setConditions(nextConditions);
    setActiveConditionId(newId);
    applyTierToForm(newTier);
    setActiveTab('rules');
  };

  const handleDeleteActiveCondition = () => {
    if (conditions.length <= 1) return;
    const label = formatConditionChip(minAmountCondition);
    showConfirm({
      title: `Delete ${label} Condition?`,
      message: `Are you sure you want to remove the ${label} condition tier from "${name}"?`,
      type: 'danger',
      confirmText: 'Delete Condition',
      onConfirm: async () => {
        const synced = conditions.map((c) => (c.id === activeConditionId ? snapshotCurrentTier(activeConditionId) : c));
        const remaining = synced.filter((c) => c.id !== activeConditionId);
        if (remaining.length === 0) return;

        const nextActive = remaining[remaining.length - 1];
        setConditions(remaining);
        setActiveConditionId(nextActive.id);
        applyTierToForm(nextActive);

        if (!isNew && box?._id) {
          try {
            const primaryTier = remaining[0];
            const lowestCondition = Math.min(...remaining.map((c) => Number(c.minAmountCondition) || 0.01));
            const authToken = typeof window !== 'undefined'
              ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_token'))
              : null;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (authToken) {
              headers.Authorization = `Bearer ${authToken}`;
            }
            const res = await fetch(`/api/alert-boxes/${box._id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                minAmountCondition: lowestCondition > 0 ? lowestCondition : 0.01,
                templateStyle: primaryTier.templateStyle,
                showImage: primaryTier.showImage,
                mediaUrl: primaryTier.mediaUrl,
                layoutMode: primaryTier.layoutMode,
                soundUrl: primaryTier.soundUrl,
                soundVolume: Number(primaryTier.soundVolume),
                durationSeconds: Number(primaryTier.durationSeconds),
                glowColor: primaryTier.glowColor,
                fontFamily: primaryTier.fontFamily,
                fontSize: Number(primaryTier.fontSize),
                textColor: primaryTier.textColor,
                donorColor: primaryTier.donorColor,
                amountColor: primaryTier.amountColor,
                textTemplate: primaryTier.textTemplate,
                animationStyle: primaryTier.animationStyle,
                ttsEnabled: primaryTier.ttsEnabled,
                ttsMinAmount: Number(primaryTier.ttsMinAmount),
                ttsType: primaryTier.ttsType,
                clonedVoiceName: primaryTier.clonedVoiceName,
                clonedVoiceSampleUrl: primaryTier.clonedVoiceSampleUrl,
                conditions: remaining,
                token: effectiveToken
              })
            });
            const data = await res.json();
            if (res.ok && data.success && data.alertBox) {
              setSavedBaseline((prev) => ({
                ...prev,
                conditions: remaining
              }));
              onSaveSuccess(data.alertBox);
            }
          } catch (err) {
            console.error('Failed to persist condition deletion:', err);
          }
        }
      }
    });
  };

  // Baseline snapshot to detect unsaved edits and guard window reload / navigation
  const [savedBaseline, setSavedBaseline] = useState<{
    name: string;
    conditions: AlertConditionTier[];
  }>(() => ({
    name: (box?.name || 'Standard Box').slice(0, 16),
    conditions: initialConditions
  }));

  const serializeBoxState = (boxName: string, tiers: AlertConditionTier[]) =>
    JSON.stringify({
      name: boxName.trim().slice(0, 16),
      conditions: tiers.map((t) => ({
        id: t.id,
        minAmountCondition: Number(t.minAmountCondition) > 0 ? Number(t.minAmountCondition) : 0.01,
        templateStyle: t.templateStyle || 'neon-box',
        showImage: t.showImage !== false,
        mediaUrl: t.mediaUrl || '',
        layoutMode: t.layoutMode || 'top',
        soundUrl: t.soundUrl || '/sounds/cash-register-kaching.mp3',
        soundVolume: Number(t.soundVolume ?? 0.85),
        durationSeconds: Number(t.durationSeconds || 8),
        glowColor: (t.glowColor || '#00F0FF').toUpperCase(),
        fontFamily: t.fontFamily || 'Kh Ang Bokor',
        fontSize: Number(t.fontSize || 28),
        textColor: (t.textColor || '#FFFFFF').toUpperCase(),
        donorColor: t.donorColor || '',
        amountColor: t.amountColor || '',
        textTemplate: t.textTemplate || '',
        animationStyle: t.animationStyle === 'bounce' ? 'fade' : t.animationStyle || 'fade',
        ttsEnabled: t.ttsEnabled !== false,
        ttsMinAmount: Number(t.ttsMinAmount ?? 0.01),
        ttsType: t.ttsType || 'google',
        clonedVoiceName: t.clonedVoiceName || '',
        clonedVoiceSampleUrl: t.clonedVoiceSampleUrl || ''
      }))
    });

  const liveConditionsSnapshot = conditions.map((c) =>
    c.id === activeConditionId ? snapshotCurrentTier(activeConditionId) : c
  );

  const hasUnsavedChanges =
    isNew ||
    serializeBoxState(name, liveConditionsSnapshot) !==
      serializeBoxState(savedBaseline.name, savedBaseline.conditions);

  const [isEarthquake, setIsEarthquake] = useState(false);
  const earthquakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast unsaved changes status to global dashboard
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('dashboard-unsaved-changes', { detail: { tab: 'donation', hasUnsaved: hasUnsavedChanges } })
    );
    window.dispatchEvent(
      new CustomEvent('dashboard-unsaved-changes', { detail: { tab: 'alerts', hasUnsaved: hasUnsavedChanges } })
    );
    if (!hasUnsavedChanges) {
      setIsEarthquake(false);
    }
  }, [hasUnsavedChanges]);

  // Listen for earthquake trigger when user attempts to navigate away without saving
  useEffect(() => {
    const handleEarthquake = (e: any) => {
      const tab = e.detail?.tab;
      if (tab && tab !== 'donation' && tab !== 'alerts' && tab !== 'donations') return;
      if (!hasUnsavedChanges) return;

      setIsEarthquake(false);
      requestAnimationFrame(() => {
        setIsEarthquake(true);
      });

      if (earthquakeTimerRef.current) clearTimeout(earthquakeTimerRef.current);
      earthquakeTimerRef.current = setTimeout(() => {
        setIsEarthquake(false);
      }, 2800);
    };

    window.addEventListener('dashboard-unsaved-earthquake', handleEarthquake);
    return () => {
      window.removeEventListener('dashboard-unsaved-earthquake', handleEarthquake);
      if (earthquakeTimerRef.current) clearTimeout(earthquakeTimerRef.current);
    };
  }, [hasUnsavedChanges]);

  // Prevent accidental browser reload / tab close when there are unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleResetChanges = () => {
    setIsEarthquake(false);
    setName(savedBaseline.name);
    setConditions(savedBaseline.conditions);
    const target =
      savedBaseline.conditions.find((c) => c.id === activeConditionId) || savedBaseline.conditions[0];
    if (target) {
      setActiveConditionId(target.id);
      applyTierToForm(target);
    }
  };

  const handleSafeBack = () => {
    if (!hasUnsavedChanges) {
      onBack();
      return;
    }
    showConfirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes in this donation box. Discard changes and leave?',
      type: 'warning',
      confirmText: 'Discard & Leave',
      cancelText: 'Stay',
      onConfirm: () => {
        onBack();
      }
    });
  };

  // Listen to real socket donation alerts so they trigger in preview too
  useEffect(() => {
    if (!socket) return;
    const handleLiveAlert = (data: any) => {
      // Ignore test alerts from socket in studio because the studio already runs local preview simulation on test click!
      if (data?.isTest) return;

      if (data) {
        const incomingDonor = data.donorName || demoDonorName;
        const incomingAmount = data.amount !== undefined ? Number(data.amount) : demoAmount;
        const rawIncomingMsg = data.donorMessage ?? data.donor_message ?? data.message;
        const incomingMsg =
          rawIncomingMsg !== undefined
            ? typeof rawIncomingMsg === 'string'
              ? rawIncomingMsg.trim()
              : ''
            : '';

        if (data.donorName) setDemoDonorName(incomingDonor);
        if (data.amount !== undefined) setDemoAmount(incomingAmount);
        setDemoMessage(incomingMsg);

        const runId = ++simulationRunIdRef.current;
        setIsSimulating(true);
        const minDurationPromise = new Promise<void>((resolve) =>
          setTimeout(resolve, (durationSeconds || 8) * 1000)
        );

        (async () => {
          // 1. Play alert audio and await until it finishes completely
          await playSound(soundUrl, soundVolume);
          if (simulationRunIdRef.current !== runId) return;

          // 2. Only after alert audio finishes, start TTS speech
          if (ttsEnabled) {
            await handleTestTtsAudio(incomingDonor, incomingAmount, incomingMsg);
          }

          // 3. Ensure minimum card duration has also elapsed before hiding preview
          await minDurationPromise;
          if (simulationRunIdRef.current === runId) {
            setIsSimulating(false);
          }
        })();
      }
    };
    socket.on('donation:alert', handleLiveAlert);
    return () => {
      socket.off('donation:alert', handleLiveAlert);
    };
  }, [socket, soundUrl, soundVolume, ttsEnabled, durationSeconds]);

  const dedicatedBoxUrl = box?._id
    ? (typeof window !== 'undefined' ? `${window.location.origin}/overlay/alert/${effectiveToken}?boxId=${box._id}` : `https://streambotkh.com/overlay/alert/${effectiveToken}?boxId=${box._id}`)
    : (typeof window !== 'undefined' ? `${window.location.origin}/overlay/alert/${effectiveToken}` : `https://streambotkh.com/overlay/alert/${effectiveToken}`);

  const copyObsUrl = () => {
    navigator.clipboard.writeText(dedicatedBoxUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Trigger live simulation in preview canvas AND broadcast to OBS Studio Browser Source URL
  const handleSimulateAlert = () => {
    const runId = ++simulationRunIdRef.current;
    setIsSimulating(true);
    const minDurationPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, (durationSeconds || 8) * 1000)
    );

    // Build payload with all active studio configurations
    const alertPayload = {
      donationId: 'test-' + Date.now(),
      boxId: box?._id ? String(box._id) : undefined,
      donorName: demoDonorName,
      donorMessage: demoMessage,
      amount: demoAmount,
      currency: 'USD',
      bankingName: 'ABA Bank',
      templateStyle,
      textTemplate,
      textColor,
      donorColor,
      amountColor,
      customGifUrl: mediaUrl,
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
      ttsType,
      clonedVoiceName,
      clonedVoiceSampleUrl,
      overlayToken: effectiveToken,
      isVideoTest: false,
      videoUrl: undefined,
      isTest: true
    };

    // Broadcast to OBS overlay via WebSocket if connected, otherwise via fallback API
    if (socket && socket.connected) {
      socket.emit('trigger:test_alert', alertPayload);
    } else {
      fetch('/api/overlays/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload)
      }).catch((e) => console.error('Error broadcasting test alert to overlay API:', e));
    }

    (async () => {
      // 1. Play alert sound and await until the audio track finishes completely
      await playSound(soundUrl, soundVolume);
      if (simulationRunIdRef.current !== runId) return;

      // 2. Only after alert sound finishes, start TTS if enabled
      if (ttsEnabled) {
        await handleTestTtsAudio();
      }

      // 3. Ensure minimum card display duration has elapsed before hiding preview card
      await minDurationPromise;
      if (simulationRunIdRef.current === runId) {
        setIsSimulating(false);
      }
    })();
  };

  // Test TTS Audio: Reads BOTH headline announcement text and donor message with $ and ៛ normalization
  // Returns a Promise<void> that resolves once TTS playback completes.
  const handleTestTtsAudio = (
    overrideDonor?: string,
    overrideAmount?: number,
    overrideMsg?: string
  ): Promise<void> => {
    const activeDonor = typeof overrideDonor === 'string' ? overrideDonor : demoDonorName;
    const activeAmount = typeof overrideAmount === 'number' ? overrideAmount : demoAmount;
    const activeMsg = typeof overrideMsg === 'string' ? overrideMsg : demoMessage;

    if (ttsAudioRef.current) {
      try {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
      } catch {}
      ttsAudioRef.current = null;
    }

    setIsTtsPlaying(true);
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        setIsTtsPlaying(false);
        resolve();
      };
      const safetyTimer = setTimeout(done, 15000);

      try {
        const template = textTemplate || '{donator} donated {amount} through superchat!';
        const isKhmer =
          /[\u1780-\u17FF]/.test(activeDonor + ' ' + (activeMsg || '') + ' ' + (textTemplate || '')) ||
          ttsType.startsWith('kiritts') ||
          ttsType.includes('piseth') ||
          ttsType.includes('sreymom');

        const hasCurrencyTag = template.toLowerCase().includes('{currency}');
        const numAmount = Number(activeAmount) || 0;
        let formattedAmount = '';
        let currencyWord = '';

        if (Math.abs(numAmount - 0.01) < 0.0001) {
          formattedAmount = isKhmer ? '1 សេន' : '1 cent';
          currencyWord = isKhmer ? 'សេន' : 'cent';
        } else if (numAmount > 0 && numAmount < 1) {
          const cents = Math.round(numAmount * 100);
          formattedAmount = isKhmer
            ? `${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន`
            : `${cents} cents`;
          currencyWord = isKhmer ? 'សេន' : 'cents';
        } else {
          const dollars = Math.floor(numAmount);
          const cents = Math.round((numAmount - dollars) * 100);
          if (cents > 0) {
            formattedAmount = isKhmer
              ? `${khmerNumberToWords(dollars)} ដុល្លារ ${cents === 1 ? '1' : khmerNumberToWords(cents)} សេន`
              : `${dollars === 1 ? '1 dollar' : `${dollars} dollars`} and ${cents === 1 ? '1 cent' : `${cents} cents`}`;
            currencyWord = isKhmer ? 'ដុល្លារ' : 'dollars';
          } else {
            formattedAmount = isKhmer
              ? (hasCurrencyTag ? khmerNumberToWords(dollars) : `${khmerNumberToWords(dollars)} ដុល្លារ`)
              : `${dollars} ${dollars === 1 ? 'dollar' : 'dollars'}`;
            currencyWord = isKhmer ? 'ដុល្លារ' : (dollars === 1 ? 'dollar' : 'dollars');
          }
        }

        let headline = template
          .replace(/\{donator\}/gi, activeDonor)
          .replace(/\{name\}/gi, activeDonor)
          .replace(/\{amount\}/gi, formattedAmount)
          .replace(/\{currency\}/gi, currencyWord)
          .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
          .trim();

        const cleanMsg = (activeMsg || '')
          .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
          .trim();

        headline = normalizeCurrencyAndSymbols(headline, isKhmer);
        const normalizedMsg = cleanMsg ? normalizeCurrencyAndSymbols(cleanMsg, isKhmer) : '';

        // Read BOTH headline announcement text AND donor message!
        const fullSpeech = normalizedMsg ? `${headline}. ${normalizedMsg}` : headline;

        let ttsAudioUrl = '';
        if (ttsType === 'cloned') {
          // High quality Neural AI Voice Clone (or free tier fallback to default voice)
          if (!isPro) {
            ttsAudioUrl = `/api/tts?type=google&text=${encodeURIComponent(fullSpeech.slice(0, 250))}`;
          } else {
            const safeSamplePath =
              clonedVoiceSampleUrl &&
              !clonedVoiceSampleUrl.startsWith('data:') &&
              clonedVoiceSampleUrl.length < 250
                ? clonedVoiceSampleUrl
                : '';

            ttsAudioUrl = `/api/tts?type=cloned&token=${encodeURIComponent(
              streamerToken || user?.overlayToken || user?.id || ''
            )}&clonedVoiceName=${encodeURIComponent(
              clonedVoiceName || ''
            )}&clonedVoiceSampleUrl=${encodeURIComponent(
              safeSamplePath
            )}&text=${encodeURIComponent(fullSpeech.slice(0, 250))}`;
          }
        } else {
          // High quality Neural TTS synthesizing Piseth, Sreymom, Jenny, Christopher voices
          ttsAudioUrl = `/api/tts?type=${encodeURIComponent(ttsType)}&text=${encodeURIComponent(
            fullSpeech.slice(0, 250)
          )}`;
        }

        const audio = new Audio(ttsAudioUrl);
        ttsAudioRef.current = audio;
        audio.volume = Math.min(1, soundVolume + 0.15);
        audio.onended = () => done();
        audio.onerror = () => done();
        audio.play().catch(() => done());
      } catch (e) {
        console.error('Error testing TTS audio:', e);
        done();
      }
    });
  };

  // Save or Create Alert Box
  const handleSave = async () => {
    setSaving(true);
    try {
      const finalConditions = conditions.map((c) =>
        c.id === activeConditionId ? snapshotCurrentTier(activeConditionId) : c
      );
      setConditions(finalConditions);

      const primaryTier = finalConditions[0] || snapshotCurrentTier(activeConditionId);
      const lowestCondition = Math.min(...finalConditions.map((c) => Number(c.minAmountCondition) || 0.01));

      const payload = {
        name,
        minAmountCondition: lowestCondition > 0 ? lowestCondition : 0.01,
        isEnabled: true,
        templateStyle: primaryTier.templateStyle,
        showImage: primaryTier.showImage,
        mediaUrl: primaryTier.mediaUrl,
        layoutMode: primaryTier.layoutMode,
        soundUrl: primaryTier.soundUrl,
        soundVolume: Number(primaryTier.soundVolume),
        durationSeconds: Number(primaryTier.durationSeconds),
        glowColor: primaryTier.glowColor,
        fontFamily: primaryTier.fontFamily,
        fontSize: Number(primaryTier.fontSize),
        textColor: primaryTier.textColor,
        donorColor: primaryTier.donorColor,
        amountColor: primaryTier.amountColor,
        textTemplate: primaryTier.textTemplate,
        animationStyle: primaryTier.animationStyle,
        ttsEnabled: primaryTier.ttsEnabled,
        ttsMinAmount: Number(primaryTier.ttsMinAmount),
        ttsType: primaryTier.ttsType,
        clonedVoiceName: primaryTier.clonedVoiceName,
        clonedVoiceSampleUrl: primaryTier.clonedVoiceSampleUrl,
        conditions: finalConditions
      };

      const authToken = typeof window !== 'undefined'
        ? (localStorage.getItem('streamneon_auth_token') || localStorage.getItem('streamneon_token'))
        : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      if (!isNew && box?._id) {
        const res = await fetch(`/api/alert-boxes/${box._id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ ...payload, token: effectiveToken })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setIsEarthquake(false);
          setSavedBaseline({
            name: name.trim().slice(0, 16),
            conditions: finalConditions
          });
          onSaveSuccess(data.alertBox);
        } else {
          alert(data.error || 'Failed to update alert box');
        }
      } else {
        const res = await fetch('/api/alert-boxes', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...payload, token: effectiveToken })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setIsEarthquake(false);
          setSavedBaseline({
            name: name.trim().slice(0, 16),
            conditions: finalConditions
          });
          onSaveSuccess(data.alertBox);
        } else {
          alert(data.error || 'Failed to create alert box');
        }
      }
    } catch (err: any) {
      console.error('Failed to save alert box:', err);
      alert('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  // Delete Alert Box
  const handleDelete = async () => {
    if (isNew || !box?._id) return;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/alert-boxes/${box._id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDeleteSuccess) onDeleteSuccess(box._id);
        onBack();
      }
    } catch (e) {
      console.error('Failed to delete alert box:', e);
    }
  };

  // Formatted headline for preview
  const renderedHeadline = textTemplate
    .replace(/\{donator\}/gi, demoDonorName)
    .replace(/\{name\}/gi, demoDonorName)
    .replace(/\{amount\}/gi, `$${demoAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .replace(/\{currency\}/gi, 'USD');

  return (
    <div
      className={
        inlineMode
          ? 'flex flex-col w-full rounded-2xl overflow-hidden bg-[#070A12] border border-cyan-500/30 text-slate-100 shadow-2xl animate-fadeIn'
          : 'flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden overscroll-none bg-[#070A12] text-slate-100'
      }
    >
      {/* ============================================================== */}
      {/* TOP HEADER NAVIGATION & ACTION BAR                             */}
      {/* ============================================================== */}
      <header className="flex-shrink-0 h-14 sm:h-16 border-b border-slate-800/80 bg-[#090D18]/95 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 z-40 backdrop-blur-md">
        {/* Left: Back/Collapse Button & Title */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={handleSafeBack}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-slate-200 hover:text-white text-xs font-mono font-bold transition-all shadow-md group flex-shrink-0 cursor-pointer"
          >
            {inlineMode ? (
              <>
                <ChevronUp size={15} className="text-cyan-400 group-hover:-translate-y-0.5 transition-transform" />
                <span className="hidden sm:inline">Collapse Box</span>
              </>
            ) : (
              <>
                <ArrowLeft size={15} className="text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </>
            )}
          </button>

          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider hidden md:inline">Donation Studio /</span>
              <h2 className="text-xs sm:text-base font-bold text-white truncate font-['Chakra_Petch'] max-w-[115px] xs:max-w-[150px] sm:max-w-xs md:max-w-md">
                {name || 'Untitled Donation Alert'}
              </h2>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                ≥ ${minAmountCondition.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Overlay Quick Action Icons (No Raw URL Displayed) + Mobile Sidebar Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800/90">
            <button
              type="button"
              onClick={copyObsUrl}
              title={copiedUrl ? 'Copied OBS Overlay URL!' : 'Copy OBS Overlay URL'}
              aria-label="Copy OBS Overlay URL"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                copiedUrl
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-900'
              }`}
            >
              {copiedUrl ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
            </button>
            <a
              href={dedicatedBoxUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Target Overlay"
              aria-label="Open Target Overlay"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors flex items-center justify-center"
            >
              <ExternalLink size={15} />
            </a>
            {onRegenerateToken && (
              <button
                type="button"
                onClick={onRegenerateToken}
                title="Regenerate Overlay Security Token"
                aria-label="Regenerate Overlay Security Token"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <RefreshCw size={15} className="hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
          </div>

          {/* Device Screen Rightbar Menu Toggle Icon */}
          {!inlineMode && (
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen((prev) => !prev)}
              aria-label={mobileCategoriesOpen ? 'Close donation box sidebar' : 'Open donation box sidebar'}
              title={mobileCategoriesOpen ? 'Close Sidebar' : 'Open Sidebar'}
              className={`lg:hidden p-2 rounded-xl border transition-all duration-200 flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-95 ${
                mobileCategoriesOpen
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                <Menu
                  size={18}
                  className={`absolute transition-all duration-200 ${
                    mobileCategoriesOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                  }`}
                />
                <X
                  size={18}
                  className={`absolute transition-all duration-200 ${
                    mobileCategoriesOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                  }`}
                />
              </div>
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2-COLUMN STUDIO WORKBENCH: EXPANDABLE CATEGORY LIST + PREVIEW  */}
      {/* ============================================================== */}
      <div className={inlineMode ? 'flex flex-col lg:flex-row relative' : 'flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative'}>
        {/* Device Screen Animated Backdrop for Rightbar Drawer */}
        {!inlineMode && (
          <div
            onClick={() => setMobileCategoriesOpen(false)}
            className={`absolute inset-0 z-30 bg-black/65 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
              mobileCategoriesOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />
        )}

        {/* ============================================================ */}
        {/* DONATION BOX SIDEBAR (DESKTOP LEFT / DEVICE ANIMATED RIGHTBAR) */}
        {/* ============================================================ */}
        <aside
          className={
            inlineMode
              ? 'w-full lg:w-[440px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#090D18] z-10'
              : `absolute inset-y-0 right-0 z-40 w-[88vw] max-w-[400px] min-h-0 flex flex-col border-l border-slate-800/90 bg-[#090D18] overflow-hidden transition-transform duration-300 ease-out lg:static lg:inset-auto lg:z-10 lg:w-[440px] lg:max-w-none lg:flex-shrink-0 lg:border-l-0 lg:border-r lg:border-slate-800/80 lg:translate-x-0 lg:pointer-events-auto lg:shadow-none ${
                  mobileCategoriesOpen
                    ? 'translate-x-0 pointer-events-auto shadow-[-16px_0_40px_rgba(0,0,0,0.8)]'
                    : 'translate-x-full pointer-events-none'
                }`
          }
        >
          {/* Condition Tier Selector Bar (within the same Donation Box) */}
          <div className="px-3 py-2.5 bg-[#060912] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
            {conditions.map((cond) => {
              const isSelected = cond.id === activeConditionId;
              const displayAmount = isSelected ? minAmountCondition : cond.minAmountCondition;
              return (
                <button
                  key={cond.id}
                  type="button"
                  onClick={() => handleSelectCondition(cond.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                  title={`Condition ≥ $${(Number(displayAmount) > 0 ? Number(displayAmount) : 0.01).toFixed(2)}`}
                >
                  <span>{formatConditionChip(displayAmount)}</span>
                </button>
              );
            })}

            {/* Add New Condition Tier Button (+ icon) inside the same Donation Box */}
            <button
              type="button"
              onClick={handleAddCondition}
              title="Add new condition in this donation box"
              className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-400/60 text-cyan-400 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Vertical Accordion List of Categories */}
          <div className={`${inlineMode ? 'max-h-[680px]' : 'flex-1 min-h-0'} overflow-y-auto overscroll-contain p-3 space-y-2.5 text-xs`}>
            
            {/* -------------------------------------------------------- */}
            {/* CATEGORY 1: TEXT & STYLING                               */}
            {/* -------------------------------------------------------- */}
            <div
              className={`rounded-2xl border transition-all overflow-hidden ${
                activeTab === 'text'
                  ? 'border-cyan-500/40 bg-[#0B101E] shadow-[0_0_20px_rgba(0,240,255,0.08)]'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'text' ? null : 'text')}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTab === 'text'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Type size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                      <span>1. Text &amp; Styling</span>
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'text' ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {activeTab === 'text' && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">

                  {/* Headline Template */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Headline Message Template
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">Supports tags</span>
                    </div>
                    <input
                      type="text"
                      value={textTemplate}
                      onChange={(e) => setTextTemplate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="{donator} donated {amount} through superchat!"
                    />
                    
                    {/* Tag Inserter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 font-mono">Insert tag:</span>
                      {['{donator}', '{amount}', '{context}', '{currency}', '{message}'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setTextTemplate((prev) => `${prev} ${tag}`)}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/30 text-[10px] font-mono text-cyan-300 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Donor Name Custom Color & Gradient */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Donor Name Color &amp; Gradient
                      </label>
                      <span
                        className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                        style={
                          donorColor.includes('gradient')
                            ? {
                                backgroundImage: donorColor,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'inline-block'
                              }
                            : { color: donorColor }
                        }
                      >
                        {demoDonorName}
                      </span>
                    </div>

                    {/* Gradient presets */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {GRADIENT_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setDonorColor(preset.value)}
                          title={preset.label}
                          className={`h-7 rounded-lg border transition-all ${
                            donorColor === preset.value
                              ? 'border-white scale-105 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                              : 'border-slate-800 hover:scale-105'
                          }`}
                          style={{ background: preset.value }}
                        />
                      ))}
                    </div>

                    {/* Custom Color/Gradient Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="color"
                        value={donorColor.startsWith('#') ? donorColor : '#00F0FF'}
                        onChange={(e) => setDonorColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-slate-900 border border-slate-800 p-0.5 flex-shrink-0"
                        title="Pick solid hex color"
                      />
                      <input
                        type="text"
                        value={donorColor}
                        onChange={(e) => setDonorColor(e.target.value)}
                        placeholder="#HEX or linear-gradient(...)"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-[11px] truncate focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Amount Custom Color & Gradient */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Amount Color &amp; Gradient
                      </label>
                      <span
                        className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                        style={
                          amountColor.includes('gradient')
                            ? {
                                backgroundImage: amountColor,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                display: 'inline-block'
                              }
                            : { color: amountColor }
                        }
                      >
                        ${demoAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Gradient presets */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {GRADIENT_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setAmountColor(preset.value)}
                          title={preset.label}
                          className={`h-7 rounded-lg border transition-all ${
                            amountColor === preset.value
                              ? 'border-white scale-105 shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                              : 'border-slate-800 hover:scale-105'
                          }`}
                          style={{ background: preset.value }}
                        />
                      ))}
                    </div>

                    {/* Custom Color/Gradient Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="color"
                        value={amountColor.startsWith('#') ? amountColor : '#FFE600'}
                        onChange={(e) => setAmountColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-slate-900 border border-slate-800 p-0.5 flex-shrink-0"
                        title="Pick solid hex color"
                      />
                      <input
                        type="text"
                        value={amountColor}
                        onChange={(e) => setAmountColor(e.target.value)}
                        placeholder="#HEX or linear-gradient(...)"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-[11px] truncate focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Headline Context / Base Text Color */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Headline Context / Base Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor.startsWith('#') ? textColor : '#FFFFFF'}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-slate-900 border border-slate-800 p-0.5"
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* Font Family Picker with Khmer 2019 & Stream Fonts */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Font Family (Khmer 2019 &amp; Streamer Fonts)
                      </label>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">
                        {ALL_FONT_OPTIONS.length} Fonts
                      </span>
                    </div>

                    {/* Search & Category Filter */}
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={fontSearch}
                        onChange={(e) => setFontSearch(e.target.value)}
                        placeholder="Search Khmer or English font name..."
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      />

                      {/* Category Pills */}
                      <div className="flex flex-wrap gap-1">
                        {['All', 'Display & Decorative', 'Handwritten & Script', 'Formal & Traditional', 'Modern Clean', 'English & Display'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFontCategory(cat)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all ${
                              fontCategory === cat
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font List Scrollbox */}
                    <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {filteredFonts.map((f) => {
                        const isSelected = fontFamily === f.family;
                        return (
                          <div
                            key={f.family}
                            onClick={() => setFontFamily(f.family)}
                            className={`px-3 py-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-slate-400">{f.name}</span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00F0FF]" />
                                )}
                              </div>
                              <span
                                className="text-sm font-semibold block truncate mt-0.5 text-white"
                                style={{ fontFamily: `"${f.family}", sans-serif` }}
                              >
                                {f.category === 'English & Display'
                                  ? 'Thank you for $10.00 tip!'
                                  : 'សូមអរគុណសម្រាប់ការគាំទ្រ! $10.00'}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 flex-shrink-0 ml-2">
                              {f.category}
                            </span>
                          </div>
                        );
                      })}
                      {filteredFonts.length === 0 && (
                        <div className="p-4 text-center text-xs font-mono text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                          No fonts matching "{fontSearch}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Headline Font Size Slider */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-300">Headline Font Size</span>
                      <span className="font-mono text-cyan-400 font-bold">{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="48"
                      step="2"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Neon Glow Color Palette */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Neon Glow &amp; Border Accent
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GLOW_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setGlowColor(preset.hex)}
                          title={preset.label}
                          className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                            glowColor.toUpperCase() === preset.hex.toUpperCase()
                              ? 'scale-125 border-white shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                              : 'border-slate-800 hover:scale-110'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                        >
                          {glowColor.toUpperCase() === preset.hex.toUpperCase() && (
                            <Check size={14} className="text-slate-950 font-bold" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="color"
                        value={glowColor}
                        onChange={(e) => setGlowColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-slate-900 border border-slate-800 p-0.5"
                      />
                      <input
                        type="text"
                        value={glowColor}
                        onChange={(e) => setGlowColor(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  {/* 100+ Style Presets Instant Gallery Launcher */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-amber-500/10 border border-cyan-400/40 flex items-center justify-between gap-3 shadow-lg shadow-cyan-500/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-cyan-400/20 text-cyan-300 shrink-0">
                        <Sparkles size={18} className="animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white font-['Chakra_Petch']">
                          100+ Unique Style Presets
                        </h4>
                        <p className="text-[10px] text-slate-300 font-mono truncate">
                          Preview live animations &amp; apply to this tier
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPresetModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-extrabold text-xs shrink-0 shadow-md shadow-cyan-400/20 cursor-pointer"
                    >
                      Browse 100+
                    </button>
                  </div>

                  {/* Card Hologram Frame Style */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Card Hologram Frame Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'neon-box', label: 'Neon Cyber Box' },
                        { id: 'glass-hologram', label: 'Glass Hologram' },
                        { id: 'cyber-glitch', label: 'Cyber Glitch' },
                        { id: 'arcade', label: 'Retro 8-Bit Arcade' }
                      ].map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setTemplateStyle(style.id as any)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-semibold transition-all text-left ${
                            templateStyle === style.id
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entrance Animation Style */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300 block">
                        Entrance Animation Style
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsPresetModalOpen(true)}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <Sparkles size={12} />
                        <span>Browse 100 Presets</span>
                      </button>
                    </div>

                    {/* Quick Selection Dropdown */}
                    <div className="relative">
                      <select
                        value={animationStyle}
                        onChange={(e) => setAnimationStyle(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white font-mono text-xs focus:outline-none cursor-pointer appearance-none"
                      >
                        <optgroup label="🎬 CapCut Video Animations">
                          <option value="capcut-zoom-in">🎬 Zoom 1 Rebound (CapCut)</option>
                          <option value="capcut-zoom-out">🎬 Zoom 2 Into Focus (CapCut)</option>
                          <option value="capcut-shake">🎬 Camera Shake Impact (CapCut)</option>
                          <option value="capcut-3d-flip-x">🎬 3D Flip Horizontal (CapCut)</option>
                          <option value="capcut-3d-flip-y">🎬 3D Flip Vertical (CapCut)</option>
                          <option value="capcut-swing-down">🎬 Pendulum Swing Down (CapCut)</option>
                          <option value="capcut-wobble-jello">🎬 Jello Elastic Bounce (CapCut)</option>
                          <option value="capcut-roll-in">🎬 360 Spin Roll In (CapCut)</option>
                          <option value="capcut-glitch-split">🎬 RGB Glitch Split (CapCut)</option>
                          <option value="capcut-slide-up-bounce">🎬 Slide Up Spring Bounce (CapCut)</option>
                          <option value="capcut-slide-down-bounce">🎬 Cascade Drop Bounce (CapCut)</option>
                          <option value="capcut-flash-burst">🎬 White Flash Strobe (CapCut)</option>
                          <option value="capcut-origami-fold">🎬 Origami Paper Unfold (CapCut)</option>
                          <option value="capcut-spiral-zoom">🎬 Spiral In Vortex (CapCut)</option>
                          <option value="capcut-heartbeat-pulse">🎬 Heartbeat Double Pulse (CapCut)</option>
                          <option value="capcut-pop-spring">🎬 Pop Up Spring (CapCut)</option>
                          <option value="capcut-skew-dash">🎬 Skew Speed Dash (CapCut)</option>
                          <option value="capcut-shutter-slice">🎬 Cinema Shutter Slice (CapCut)</option>
                          <option value="capcut-whirlpool">🎬 Whirlpool Vortex (CapCut)</option>
                        </optgroup>
                        <optgroup label="✨ Classic Alert Animations">
                          <option value="fade">✨ Smooth Fade In / Out</option>
                          <option value="pulse">⚡ Cyber Pulse Glow</option>
                          <option value="glitch">👾 Digital Glitch Warp</option>
                          <option value="slide">➡️ Smooth Lateral Slide</option>
                        </optgroup>
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                        ▼
                      </div>
                    </div>

                    {/* Quick Popular Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none no-scrollbar">
                      {[
                        { id: 'capcut-shake', label: 'Shake' },
                        { id: 'capcut-zoom-in', label: 'Zoom Rebound' },
                        { id: 'capcut-3d-flip-x', label: '3D Flip' },
                        { id: 'capcut-glitch-split', label: 'RGB Glitch' },
                        { id: 'capcut-wobble-jello', label: 'Jello Bounce' },
                        { id: 'capcut-swing-down', label: 'Swing' },
                        { id: 'fade', label: 'Fade' }
                      ].map((anim) => (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => setAnimationStyle(anim.id)}
                          className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                            animationStyle === anim.id
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {anim.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display Duration */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-300">Display Duration</span>
                      <span className="font-mono text-cyan-400 font-bold">{durationSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="25"
                      step="1"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-500">
                      How many seconds the alert stays on screen before fading away.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* CATEGORY 2: IMAGE & SOUND                                */}
            {/* -------------------------------------------------------- */}
            <div
              className={`rounded-2xl border transition-all overflow-hidden ${
                activeTab === 'image'
                  ? 'border-cyan-500/40 bg-[#0B101E] shadow-[0_0_20px_rgba(0,240,255,0.08)]'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'image' ? null : 'image')}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTab === 'image'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <ImageIcon size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-['Chakra_Petch']">
                      2. Image &amp; Sound
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'image' ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {activeTab === 'image' && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-5 animate-fadeIn">
                  
                  {/* --- SUB-SECTION 1: REACTION MASCOT & IMAGE --- */}
                  <div className="space-y-4">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <ImageIcon size={13} />
                      <span>Reaction Mascot &amp; GIF</span>
                    </div>

                    {/* Show Image Toggle */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-200">Show Reaction Image</div>
                        <div className="text-[11px] text-slate-400">Display GIF mascot on donation trigger</div>
                      </div>
                      <Switch checked={showImage} onChange={setShowImage} />
                    </div>

                    {showImage && (
                      <>
                        {/* Current Media Preview & Quick Actions */}
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-slate-300">Active Media</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setMediaPickerSection('template');
                                  setIsMediaPickerOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-cyan-400"
                              >
                                <ImageIcon size={13} />
                                <span>Choose</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className="w-16 h-16 rounded-xl border-2 overflow-hidden bg-slate-900 flex-shrink-0 relative flex items-center justify-center p-1"
                              style={{ borderColor: glowColor }}
                            >
                              {mediaUrl ? (
                                <img src={mediaUrl} alt="Mascot preview" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <ImageIcon size={20} className="text-slate-600" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                type="text"
                                value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                                placeholder="https://.../mascot.gif"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-400 truncate"
                              />
                              <p className="text-[10px] text-slate-500 font-mono">
                                Direct GIF, PNG, or WebP URL
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Image Layout Mode */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono font-bold text-slate-300 block">
                            Media Display Layout
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'top', label: 'Top (Centered)' },
                              { id: 'left', label: 'Side-by-Side (Left)' },
                              { id: 'right', label: 'Side-by-Side (Right)' },
                              { id: 'banner', label: 'Hologram Banner' }
                            ].map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setLayoutMode(m.id as any)}
                                className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-semibold transition-all text-left ${
                                  layoutMode === m.id
                                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* --- SUB-SECTION 2: ALERT SOUND & AUDIO TRACK --- */}
                  <div className="space-y-4 pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 pb-1 border-b border-slate-800/60">
                      <Volume2 size={13} />
                      <span>Alert Sound &amp; Audio Track</span>
                    </div>

                    {/* Active Sound & Storage Picker */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-300">Active Sound</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMediaPickerSection('sounds');
                              setIsMediaPickerOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-cyan-400"
                          >
                            <Volume2 size={13} />
                            <span>Choose</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => playSound(soundUrl, soundVolume)}
                          className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 transition-all flex items-center justify-center flex-shrink-0"
                          title="Play Current Audio"
                        >
                          <Play size={14} fill="currentColor" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={soundUrl}
                            onChange={(e) => setSoundUrl(e.target.value)}
                            placeholder="https://.../sound.mp3 or .wav"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-400 truncate"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Supports MP3, WAV, OGG, M4A from your Media Library or direct link.
                      </p>
                    </div>

                    {/* Sound Volume Slider */}
                    <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-300">Sound Volume</span>
                        <span className="font-mono text-cyan-400 font-bold">{Math.round(soundVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={soundVolume}
                        onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => playSound(soundUrl, soundVolume)}
                          className="text-[11px] font-mono flex items-center gap-1"
                        >
                          <Play size={11} fill="currentColor" />
                          <span>Test Alert Audio</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* CATEGORY 3: TTS & AI VOICE CLONE                         */}
            {/* -------------------------------------------------------- */}
            <div
              className={`rounded-2xl border transition-all overflow-hidden ${
                activeTab === 'tts'
                  ? 'border-cyan-500/40 bg-[#0B101E] shadow-[0_0_20px_rgba(0,240,255,0.08)]'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'tts' ? null : 'tts')}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTab === 'tts'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Mic size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-['Chakra_Petch']">
                      3. Text-to-Speech &amp; AI Voice Clone
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'tts' ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {activeTab === 'tts' && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                  {/* TTS Master Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-200">Enable Text-to-Speech (TTS)</div>
                      <div className="text-[11px] text-slate-400">Speak donation messages aloud during stream</div>
                    </div>
                    <Switch checked={ttsEnabled} onChange={setTtsEnabled} />
                  </div>

                  {ttsEnabled && (
                    <>
                      {/* Voice Model Selection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono font-bold text-slate-300 block">
                            TTS Engine / Voice Model
                          </label>
                          {clonedVoices.length > 0 && (
                            <span className="text-[10px] font-mono text-cyan-400">
                              {clonedVoices.length} custom {clonedVoices.length === 1 ? 'voice' : 'voices'} available
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          {/* Standard Built-in Neural Voices */}
                          {[
                            {
                              id: 'google',
                              name: 'Google Cloud Neural Female (Jenny)',
                              desc: 'Crisp English & multilingual neural female voice'
                            },
                            {
                              id: 'google-male',
                              name: 'Google Cloud Neural Male (Christopher)',
                              desc: 'Deep English & multilingual neural male voice'
                            },
                            {
                              id: 'kiritts-male',
                              name: 'KiriTTS Male (Piseth Neural Khmer / EN)',
                              desc: 'Natural Cambodian male voice for ABA tips & alerts'
                            },
                            {
                              id: 'kiritts-female',
                              name: 'KiriTTS Female (Sreymom Neural Khmer / EN)',
                              desc: 'Natural Cambodian female voice for ABA tips & alerts'
                            }
                          ].map((v) => {
                            const isSelected = ttsType === v.id;
                            return (
                              <div
                                key={v.id}
                                onClick={() => setTtsType(v.id as any)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-xs">{v.name}</span>
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-700'
                                    }`}
                                  >
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{v.desc}</p>
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
                                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-mono font-bold text-xs truncate text-white">
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
                                    <div
                                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-700'
                                      }`}
                                    >
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    AI Neural Voice Clone • {cv.soundStyle || 'Custom Neural Style'} • {cv.sampleDurationSeconds ? `${cv.sampleDurationSeconds}s sample` : 'Trained'}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            <div
                              onClick={() => setTtsType('cloned')}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                ttsType === 'cloned'
                                  ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono font-bold text-xs truncate">
                                    Streamer Custom Voice Clone
                                  </span>
                                  {isPro ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-slate-400 border border-slate-800">
                                      Clone TTS
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                                      <Lock size={9} /> PRO PLAN
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    ttsType === 'cloned' ? 'border-cyan-400 bg-cyan-400' : 'border-slate-700'
                                  }`}
                                >
                                  {ttsType === 'cloned' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                No custom voices cloned yet. Train your voice in the &quot;Clone TTS&quot; section.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Free Tier Fallback Warning Notice */}
                        {ttsType === 'cloned' && !isPro && (
                          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 mt-2">
                            <Lock size={15} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="font-semibold text-white block">Pro Plan Voice Feature</span>
                              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                                AI Voice Cloning is an exclusive Pro Plan feature. Live stream alerts will automatically fallback to the default neural voice (Jenny / Piseth) until your account is upgraded to Pro.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Smart Currency Pronunciation Feature Card */}
                      <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 text-xs font-mono font-bold tracking-tight">
                          $៛
                        </div>
                        <div className="space-y-1 text-left min-w-0">
                          <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                            <span>Smart Currency Voice Engine</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase">
                              Active
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            TTS automatically speaks <span className="text-cyan-300 font-mono font-bold">$</span> as <span className="text-white font-medium">&quot;dollars&quot; / &quot;ដុល្លារ&quot;</span> and <span className="text-cyan-300 font-mono font-bold">៛</span> as <span className="text-white font-medium">&quot;riel&quot; / &quot;រៀល&quot;</span> across donation amounts and messages.
                          </p>
                        </div>
                      </div>

                      {/* Test TTS Audio Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestTtsAudio()}
                        disabled={isTtsPlaying}
                        className="w-full border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40 text-xs font-mono font-bold"
                      >
                        <Volume2 size={14} className={isTtsPlaying ? 'animate-pulse text-cyan-400' : ''} />
                        <span>{isTtsPlaying ? 'Speaking Test Audio...' : 'Test TTS Voice Speech'}</span>
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* CATEGORY 4: CONDITION THRESHOLD & RULES                  */}
            {/* -------------------------------------------------------- */}
            <div
              className={`rounded-2xl border transition-all overflow-hidden ${
                activeTab === 'rules'
                  ? 'border-cyan-500/40 bg-[#0B101E] shadow-[0_0_20px_rgba(0,240,255,0.08)]'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'rules' ? null : 'rules')}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTab === 'rules'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Sliders size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-['Chakra_Petch']">
                      4. Condition Threshold &amp; Rules
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'rules' ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {activeTab === 'rules' && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                  {/* Box Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300 block">
                        Donation Box Name
                      </label>
                      <span className="text-[10px] font-mono text-slate-500">{name.length}/16</span>
                    </div>
                    <input
                      type="text"
                      maxLength={16}
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 16))}
                      placeholder="Standard Box"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Condition Amount Threshold */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Condition Amount (≥ Threshold)
                      </label>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        ~{Math.round(minAmountCondition * 4000).toLocaleString()} ៛ KHR
                      </span>
                    </div>

                    <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-cyan-400 transition-colors overflow-hidden">
                      <span className="pl-3 pr-2 py-2 text-cyan-400 font-mono font-bold text-xs select-none border-r border-slate-800/80 bg-slate-900/60">
                        ≥ $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={conditionAmountInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '');
                          if (!/^\d*(?:\.\d{0,2})?$/.test(raw)) return;
                          setConditionAmountInput(raw);
                          const parsed = parseFloat(raw);
                          if (!isNaN(parsed) && parsed > 0) {
                            const rounded = Number(parsed.toFixed(2));
                            setMinAmountCondition(rounded);
                            setDemoAmount(rounded);
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseFloat(conditionAmountInput);
                          const safeVal = !isNaN(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : 0.01;
                          setMinAmountCondition(safeVal);
                          setConditionAmountInput(safeVal.toFixed(2));
                          setDemoAmount(safeVal);
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
                      />
                      <span className="pr-3 pl-2 text-[10px] font-mono text-slate-500 select-none">
                        USD
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* DELETE CONDITION SECTION (BOTTOM OF SIDEBAR)             */}
            {/* -------------------------------------------------------- */}
            <div className={`pt-2 ${hasUnsavedChanges ? 'pb-20' : 'pb-2'}`}>
              <div className="p-3.5 rounded-2xl bg-red-950/15 border border-red-500/25 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-red-300 font-['Chakra_Petch']">
                    Delete Condition ({formatConditionChip(minAmountCondition)})
                  </div>
                </div>
                <button
                  type="button"
                  disabled={conditions.length <= 1}
                  onClick={handleDeleteActiveCondition}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 flex-shrink-0 transition-all ${
                    conditions.length > 1
                      ? 'bg-red-500/15 hover:bg-red-500/25 border-red-500/40 text-red-300 hover:text-red-200 cursor-pointer active:scale-95'
                      : 'bg-slate-900/60 border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* CENTER MAIN WORKBENCH: LIVE PREVIEW OF ALERTS DONATIONS      */}
        {/* ============================================================ */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#070A12] p-2.5 sm:p-4 lg:p-5 gap-2.5 sm:gap-3.5">
          {/* ========================================================== */}
          {/* THE INTERACTIVE OBS STREAM CANVAS SIMULATOR (TRANSPARENT)  */}
          {/* ========================================================== */}
          <div className="flex-1 min-h-0 w-full rounded-2xl sm:rounded-3xl border-2 border-slate-800 relative overflow-hidden transition-all flex items-center justify-center p-3 sm:p-6 lg:p-8 shadow-2xl bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950/70">
            {/* Corner OBS Crosshairs */}
            <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-600 flex items-center gap-1.5 select-none">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>LIVE BROADCAST OVERLAY • 60 FPS</span>
            </div>

            {/* ======================================================== */}
            {/* REAL-TIME DYNAMIC ALERT CARD RENDERING (CLEAN & BORDERLESS) */}
            {/* ======================================================== */}
            {isSimulating ? (
              <div
                className="w-full max-h-full flex items-center justify-center animate-fadeIn"
                style={{
                  transform: `scale(${zoomScale})`
                }}
              >
                <NeonAlertCard
                  alert={{
                    donationId: 'preview-alert',
                    donorName: demoDonorName,
                    donorMessage: demoMessage,
                    amount: demoAmount,
                    currency: 'USD',
                    bankingName: 'ABA Bank',
                    templateStyle,
                    textTemplate,
                    textColor,
                    donorColor,
                    amountColor,
                    customGifUrl: mediaUrl,
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
                    ttsType,
                    isTest: true
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 sm:p-8 text-center space-y-2 select-none animate-fadeIn opacity-40 hover:opacity-75 transition-opacity">
                <div className="w-10 h-10 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-center text-slate-600">
                  <Monitor size={18} className="text-slate-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-mono text-slate-500 font-semibold">OBS Transparent Overlay Canvas</p>
                  <p className="text-[10px] text-slate-600 font-mono">
                    Alert appears here and in OBS browser source when triggered
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* BOTTOM PREVIEW TEST ALERT SIMULATION DOCK                  */}
          {/* ========================================================== */}
          <div className="flex-shrink-0 rounded-2xl bg-[#090D18]/95 border border-slate-800/90 p-2.5 sm:p-3.5 shadow-xl flex flex-col xl:flex-row items-stretch xl:items-center gap-2">
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 flex-1">
              {/* Simulated Donor Name */}
              <div className="col-span-1 sm:col-span-3 relative">
                <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase text-slate-500 select-none">
                  From
                </span>
                <input
                  type="text"
                  value={demoDonorName}
                  onChange={(e) => setDemoDonorName(e.target.value)}
                  placeholder="Supporter"
                  className="w-full pl-11 sm:pl-12 pr-2.5 py-1.5 sm:py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500/60 text-xs font-mono text-white focus:outline-none transition-colors"
                />
              </div>

              {/* Simulated Tip Amount */}
              <div className="col-span-1 sm:col-span-3 relative">
                <span className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-cyan-400 select-none">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={demoAmount}
                  onChange={(e) => setDemoAmount(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                  className="w-full pl-6 sm:pl-7 pr-9 sm:pr-10 py-1.5 sm:py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500/60 text-xs font-mono font-bold text-white focus:outline-none transition-colors"
                />
                <span className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 select-none">
                  USD
                </span>
              </div>

              {/* Simulated Message */}
              <div className="col-span-2 sm:col-span-6 relative">
                <input
                  type="text"
                  value={demoMessage}
                  onChange={(e) => setDemoMessage(e.target.value)}
                  placeholder="Enter test cheer message..."
                  className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500/60 text-xs font-mono text-slate-200 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulateAlert}
              disabled={isSimulating}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all flex-shrink-0 cursor-pointer active:scale-95 ${
                isSimulating
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.35)]'
              }`}
            >
              <Play
                size={14}
                className={isSimulating ? 'text-cyan-300 animate-spin fill-cyan-300' : 'text-slate-950 fill-slate-950'}
              />
              <span>{isSimulating ? 'Playing Alert...' : 'Test Alert'}</span>
            </button>
          </div>
        </main>
      </div>

      {/* ============================================================== */}
      {/* MEDIA PICKER MODAL (GLOBAL STICKERS, GIFS, SOUNDS & UPLOADS)    */}
      {/* ============================================================== */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(selectedUrl) => {
          if (mediaPickerSection === 'sounds' || isAudioAsset({ url: selectedUrl, filename: '', fileType: '' })) {
            setSoundUrl(selectedUrl);
            playSound(selectedUrl, soundVolume);
          } else {
            setMediaUrl(selectedUrl);
          }
          setIsMediaPickerOpen(false);
        }}
        currentUrl={mediaPickerSection === 'sounds' ? soundUrl : mediaUrl}
        initialSection={mediaPickerSection}
        filterMode={mediaPickerSection === 'sounds' ? 'audio' : 'image'}
        title={mediaPickerSection === 'sounds' ? 'Choose Alert Sound' : 'Choose Reaction Media'}
        subtitle={
          mediaPickerSection === 'sounds'
            ? 'Pick a preset sound effect, or select from your uploaded audio files (MP3, WAV, OGG, M4A).'
            : 'Pick from SBKH Templates, 500+ Facebook stickers, 100 alert GIFs, or your uploaded cloud media.'
        }
        currentPlan={user?.plan || 'free'}
        isAdmin={Boolean(user?.isAdmin || (user as any)?.role === 'admin')}
        isTrialActive={Boolean(user?.trialActive)}
      />


      {/* ============================================================== */}
      {/* 100 UNIQUE STYLE PRESETS GALLERY MODAL                         */}
      {/* ============================================================== */}
      <AlertPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onSelectPreset={handleApplyPreset}
      />

      {/* ============================================================== */}
      {/* BOTTOM FLOATING UNSAVED CHANGES TOAST BAR                      */}
      {/* ============================================================== */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl transition-all duration-300 ease-in-out ${
          hasUnsavedChanges
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-24 opacity-0 pointer-events-none'
        } ${isEarthquake ? 'animate-toast-earthquake' : ''}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 backdrop-blur-xl transition-all duration-300 flex items-center justify-between gap-3 ${
            isEarthquake
              ? 'bg-gradient-to-r from-red-950/95 via-rose-950/95 to-red-950/95 border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.7),0_14px_45px_rgba(0,0,0,0.95)] animate-toast-red-pulse'
              : 'bg-[#0B101E]/95 border border-cyan-500/40 shadow-[0_14px_45px_rgba(0,0,0,0.85),0_0_25px_rgba(0,240,255,0.18)]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isEarthquake ? (
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0 shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                <AlertTriangle size={16} className="animate-bounce" />
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
            )}
            <div className="min-w-0">
              <div className={`text-xs font-bold truncate flex items-center gap-1.5 ${isEarthquake ? 'text-red-200' : 'text-slate-100'}`}>
                {isEarthquake ? (
                  <>
                    <span className="font-black text-red-400 uppercase tracking-wider">Unsaved Changes!</span>
                    <span className="hidden sm:inline text-red-200 font-medium">— Navigation blocked</span>
                  </>
                ) : (
                  <span>Careful — you have unsaved changes!</span>
                )}
              </div>
              <p className={`text-[10px] truncate hidden xs:block ${isEarthquake ? 'text-red-300 font-semibold' : 'text-slate-400'}`}>
                {isEarthquake
                  ? 'Please Save or Reset changes before switching to another feature!'
                  : 'Save this donation alert box to sync with live OBS overlay'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isNew && (
              <button
                type="button"
                disabled={saving}
                onClick={handleResetChanges}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  isEarthquake
                    ? 'bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900/60 hover:text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                Reset
              </button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              className={`font-bold font-mono text-xs px-4 transition-all shadow-md active:scale-95 ${
                isEarthquake
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse border-0'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              }`}
            >
              <Save size={13} className={isEarthquake ? 'text-white' : 'text-slate-950'} />
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
