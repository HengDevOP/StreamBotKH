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
  ChevronUp
} from 'lucide-react';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { AlertBox } from '../../types/alert';
import { useAudio } from '../../hooks/useAudio';
import { useSocket } from '../../context/SocketContext';
import { VoiceClonerModal } from './VoiceClonerModal';
import { MediaItem } from './MediaLibraryManager';
import { mediaService } from '../../services/mediaService';
import { normalizeCurrencyAndSymbols, khmerNumberToWords } from '../../utils/ttsHelper';
import { KHMER_FONTS_2019 } from '../../data/khmerFonts';
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

const SOUND_PRESETS = [
  { label: 'Cash Register Ka-Ching', url: '/sounds/cash-register-kaching.mp3' },
  { label: 'Mario Coin Bell', url: '/sounds/mario-coin.mp3' },
  { label: 'Cyber Pulse Alert', url: '/sounds/cyber-alert.mp3' },
  { label: 'Victory Synth Fanfare', url: '/sounds/victory-chime.mp3' }
];

const GIF_PRESETS = [
  { label: 'Neon Cyber Cat', url: 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif' },
  { label: 'Dancing Hype Alien', url: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif' },
  { label: 'Rain of Gold Coins', url: 'https://media.giphy.com/media/l0Ex6kAKAoFRsFhIE/giphy.gif' },
  { label: 'Pixel Hearts', url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif' },
  { label: 'Victory Anime Hype', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' }
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

  // Active Category Section (Accordion List Item Expanded: null = collapsed)
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'tts' | 'rules' | null>('text');

  // Form State
  const [name, setName] = useState(box?.name || 'New Donation Alert Box');
  const [minAmountCondition, setMinAmountCondition] = useState<number>(box?.minAmountCondition ?? 1.0);
  const [isEnabled, setIsEnabled] = useState<boolean>(box?.isEnabled ?? true);
  const [templateStyle, setTemplateStyle] = useState<'neon-box' | 'glass-hologram' | 'cyber-glitch' | 'arcade' | 'minimal'>(
    box?.templateStyle || 'neon-box'
  );
  const [showImage, setShowImage] = useState<boolean>(box?.showImage !== false);
  const [mediaUrl, setMediaUrl] = useState<string>(
    box?.mediaUrl || 'https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif'
  );
  const [layoutMode, setLayoutMode] = useState<'top' | 'left' | 'right' | 'banner'>(
    box?.layoutMode || 'top'
  );
  const [soundUrl, setSoundUrl] = useState<string>(
    box?.soundUrl && !box.soundUrl.includes('neon-chime')
      ? box.soundUrl
      : '/sounds/cash-register-kaching.mp3'
  );
  const [soundVolume, setSoundVolume] = useState<number>(box?.soundVolume ?? 0.85);
  const [durationSeconds, setDurationSeconds] = useState<number>(box?.durationSeconds || 8);
  const [glowColor, setGlowColor] = useState<string>(box?.glowColor || '#00F0FF');
  const [fontFamily, setFontFamily] = useState<string>(box?.fontFamily || 'Kh Ang Bokor');
  const [fontSize, setFontSize] = useState<number>(box?.fontSize || 28);
  const [textColor, setTextColor] = useState<string>(box?.textColor || '#FFFFFF');
  const [donorColor, setDonorColor] = useState<string>(
    box?.donorColor || 'linear-gradient(135deg, #00F0FF 0%, #7000FF 100%)'
  );
  const [amountColor, setAmountColor] = useState<string>(
    box?.amountColor || 'linear-gradient(135deg, #FFE600 0%, #FF5E00 100%)'
  );
  const [fontSearch, setFontSearch] = useState<string>('');
  const [fontCategory, setFontCategory] = useState<string>('All');
  const [textTemplate, setTextTemplate] = useState<string>(
    box?.textTemplate || '{donator} donated {amount} through superchat!'
  );
  const [animationStyle, setAnimationStyle] = useState<'fade' | 'pulse' | 'glitch' | 'slide' | 'zoom'>(
    box?.animationStyle === 'bounce' ? 'fade' : (box?.animationStyle as any) || 'fade'
  );

  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(box?.ttsEnabled !== false);
  const [ttsMinAmount, setTtsMinAmount] = useState<number>(box?.ttsMinAmount ?? 1.0);
  const [ttsType, setTtsType] = useState<'google' | 'google-male' | 'kiritts-male' | 'kiritts-female' | 'cloned'>(
    box?.ttsType || 'google'
  );
  const [clonedVoiceName, setClonedVoiceName] = useState<string>(box?.clonedVoiceName || '');
  const [clonedVoiceSampleUrl, setClonedVoiceSampleUrl] = useState<string>(box?.clonedVoiceSampleUrl || '');

  // UI / Action State
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isVoiceClonerOpen, setIsVoiceClonerOpen] = useState(false);
  
  // Storage Media Picker & In-Modal Upload State
  const [storagePickerMode, setStoragePickerMode] = useState<'image' | 'sound' | null>(null);
  const [storageActiveTab, setStorageActiveTab] = useState<'image' | 'sound' | 'all'>('image');
  const [storageMedia, setStorageMedia] = useState<MediaItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeAudioPreview, setActiveAudioPreview] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);

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
  const [demoDonorName, setDemoDonorName] = useState('CyberValkyrie');
  const [demoAmount, setDemoAmount] = useState(minAmountCondition >= 10 ? minAmountCondition : 5.0);
  const [demoMessage, setDemoMessage] = useState('Awesome stream! Keep up the insane gameplay 🔥');

  // Listen to real socket donation alerts so they trigger in preview too
  useEffect(() => {
    if (!socket) return;
    const handleLiveAlert = (data: any) => {
      // Ignore test alerts from socket in studio because the studio already runs local preview simulation on test click!
      if (data?.isTest) return;

      if (data) {
        if (data.donorName) setDemoDonorName(data.donorName);
        if (data.amount) setDemoAmount(Number(data.amount));
        const incomingMsg = data.donorMessage ?? data.donor_message ?? data.message;
        if (incomingMsg !== undefined) {
          setDemoMessage(typeof incomingMsg === 'string' ? incomingMsg.trim() : '');
        } else {
          setDemoMessage('');
        }
        setIsSimulating(true);
        playSound(soundUrl, soundVolume);
        if (ttsEnabled) {
          setTimeout(() => {
            handleTestTtsAudio();
          }, 700);
        }
        setTimeout(() => {
          setIsSimulating(false);
        }, (durationSeconds || 8) * 1000);
      }
    };
    socket.on('donation:alert', handleLiveAlert);
    return () => {
      socket.off('donation:alert', handleLiveAlert);
    };
  }, [socket, soundUrl, soundVolume, ttsEnabled, durationSeconds]);

  useEffect(() => {
    // 1. Initialize from cache immediately
    const cached = mediaService.getCachedMedia();
    if (cached.length > 0) {
      setStorageMedia(cached);
    }

    // 2. Subscribe to real-time updates via WebSocket
    const unsubscribe = mediaService.subscribe((data) => {
      if (data?.media) {
        setStorageMedia(data.media);
      }
    });

    // 3. Fetch/revalidate in background
    fetchStorageMedia();

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchStorageMedia = async () => {
    try {
      const data = await mediaService.fetchMedia();
      if (data?.media) {
        setStorageMedia(data.media);
      }
    } catch (e) {
      console.error('Failed to fetch storage media:', e);
    }
  };

  const openStoragePicker = (mode: 'image' | 'sound') => {
    setStoragePickerMode(mode);
    setStorageActiveTab(mode);
    setUploadError(null);
    fetchStorageMedia();
  };

  const closeStoragePicker = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setActiveAudioPreview(null);
    setUploadError(null);
    setStoragePickerMode(null);
  };

  const handleToggleSoundPreview = (url: string) => {
    if (activeAudioPreview === url) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      setActiveAudioPreview(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(url);
      audio.volume = soundVolume;
      audio.onended = () => setActiveAudioPreview(null);
      audio.onerror = () => setActiveAudioPreview(null);
      audio.play().catch(() => setActiveAudioPreview(null));
      audioPreviewRef.current = audio;
      setActiveAudioPreview(url);
    }
  };

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await mediaService.uploadMedia(file);
      if (result.media) {
        setStorageMedia((prev) => [result.media, ...prev.filter((m) => m._id !== result.media._id)]);

        // Automatically assign and apply newly uploaded file
        const isAudio =
          result.media.fileType?.startsWith('audio') ||
          /\.(mp3|wav|ogg|webm|m4a)$/i.test(result.media.url || result.media.filename);

        if (isAudio || storagePickerMode === 'sound') {
          setSoundUrl(result.media.url);
          playSound(result.media.url, soundVolume);
        } else {
          setMediaUrl(result.media.url);
        }

        // Close picker after a brief moment
        setTimeout(() => {
          closeStoragePicker();
        }, 400);
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setUploadError(err.message || 'Network error during upload');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

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
    setIsSimulating(true);
    playSound(soundUrl, soundVolume);

    // If TTS is enabled and meets min amount, speak both headline announcement text and donor message
    if (ttsEnabled && demoAmount >= ttsMinAmount) {
      setTimeout(() => {
        handleTestTtsAudio();
      }, 700);
    }

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
      clonedVoiceSampleUrl,
      overlayToken: effectiveToken,
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

    setTimeout(() => {
      setIsSimulating(false);
    }, (durationSeconds || 8) * 1000);
  };

  // Test TTS Audio: Reads BOTH headline announcement text and donor message with $ and ៛ normalization
  const handleTestTtsAudio = () => {
    setIsTtsPlaying(true);
    try {
      const template = textTemplate || '{donator} donated {amount} through superchat!';
      const isKhmer =
        /[\u1780-\u17FF]/.test(demoDonorName + ' ' + (demoMessage || '') + ' ' + (textTemplate || '')) ||
        ttsType.startsWith('kiritts') ||
        ttsType.includes('piseth') ||
        ttsType.includes('sreymom');

      const hasCurrencyTag = template.toLowerCase().includes('{currency}');
      const formattedAmount = isKhmer
        ? (hasCurrencyTag ? khmerNumberToWords(demoAmount) : `${khmerNumberToWords(demoAmount)} ដុល្លារ`)
        : (hasCurrencyTag ? Number(demoAmount).toLocaleString('en-US') : `${Number(demoAmount).toLocaleString('en-US')} ${Number(demoAmount) === 1 ? 'dollar' : 'dollars'}`);

      let headline = template
        .replace(/\{donator\}/gi, demoDonorName)
        .replace(/\{name\}/gi, demoDonorName)
        .replace(/\{amount\}/gi, formattedAmount)
        .replace(/\{currency\}/gi, isKhmer ? 'ដុល្លារ' : (Number(demoAmount) === 1 ? 'dollar' : 'dollars'))
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

      const cleanMsg = (demoMessage || '')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

      headline = normalizeCurrencyAndSymbols(headline, isKhmer);
      const normalizedMsg = cleanMsg ? normalizeCurrencyAndSymbols(cleanMsg, isKhmer) : '';

      // Read BOTH headline announcement text AND donor message!
      const fullSpeech = normalizedMsg ? `${headline}. ${normalizedMsg}` : headline;

      let ttsAudioUrl = '';
      if (ttsType === 'cloned' && clonedVoiceSampleUrl) {
        ttsAudioUrl = clonedVoiceSampleUrl;
      } else {
        // High quality Neural TTS synthesizing Piseth, Sreymom, Jenny, Christopher voices
        ttsAudioUrl = `/api/tts?type=${encodeURIComponent(ttsType)}&text=${encodeURIComponent(
          fullSpeech.slice(0, 250)
        )}`;
      }

      const audio = new Audio(ttsAudioUrl);
      audio.volume = Math.min(1, soundVolume + 0.15);
      audio.onended = () => setIsTtsPlaying(false);
      audio.onerror = () => setIsTtsPlaying(false);
      audio.play().catch(() => setIsTtsPlaying(false));
    } catch (e) {
      console.error('Error testing TTS audio:', e);
      setIsTtsPlaying(false);
    }
  };

  // Save or Create Alert Box
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        minAmountCondition: Number(minAmountCondition) >= 0 ? Number(minAmountCondition) : 0.01,
        isEnabled,
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
        ttsMinAmount: Number(ttsMinAmount),
        ttsType,
        clonedVoiceName,
        clonedVoiceSampleUrl
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
          onSaveSuccess(data.alertBox);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
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
          onSaveSuccess(data.alertBox);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
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
          : 'flex flex-col h-screen w-screen overflow-hidden bg-[#070A12] text-slate-100'
      }
    >
      {/* ============================================================== */}
      {/* TOP HEADER NAVIGATION & ACTION BAR                             */}
      {/* ============================================================== */}
      <header className="flex-shrink-0 min-h-16 border-b border-slate-800/80 bg-[#090D18]/95 px-3 sm:px-6 py-2 sm:py-0 flex items-center justify-between gap-2 sm:gap-4 z-20 backdrop-blur-md">
        
        {/* Left: Back/Collapse Button & Title */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          {mobileCategoriesOpen ? (
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen(false)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-mono font-bold transition-all shadow-md group flex-shrink-0"
              title="Return to Live Canvas Preview"
            >
              <ArrowLeft size={15} className="text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Preview</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-slate-200 hover:text-white text-xs font-mono font-bold transition-all shadow-md group flex-shrink-0"
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
          )}

          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider hidden md:inline">Donation Studio /</span>
              <h2 className="text-xs sm:text-base font-bold text-white truncate font-['Chakra_Petch'] max-w-[110px] sm:max-w-xs md:max-w-md">
                {name || 'Untitled Donation Alert'}
              </h2>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                ≥ ${minAmountCondition.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden md:block">
              Click any category on the left list to expand &amp; configure • Live Real-Time Preview
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Mobile Categories Toggle Icon Button (only visible on device screen < lg when categories drawer is closed) */}
          {!mobileCategoriesOpen && (
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all shadow-sm active:scale-95 flex-shrink-0"
              title="Open customization categories"
            >
              <Sliders size={14} className="text-cyan-400" />
              <span>Categories</span>
            </button>
          )}

          {/* Dedicated OBS Studio Browser Source URL with Copy & Regenerate Icons (desktop only) */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono max-w-[360px]">
            <Monitor size={14} className="text-cyan-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-400 truncate select-all flex-1" title={dedicatedBoxUrl}>
              {dedicatedBoxUrl}
            </span>
            <button
              type="button"
              onClick={copyObsUrl}
              title={copiedUrl ? 'Copied OBS URL!' : 'Copy Dedicated OBS Browser Source URL'}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors flex-shrink-0"
            >
              {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            {onRegenerateToken && (
              <button
                type="button"
                onClick={onRegenerateToken}
                title="Regenerate Overlay Security Token"
                className="p-1 rounded-lg hover:bg-red-950/40 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <RefreshCw size={14} className="hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
          </div>

          {/* Test Alert Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSimulateAlert}
            disabled={isSimulating}
            className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 font-mono text-xs font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)] flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3"
          >
            <Play size={13} className={isSimulating ? 'text-cyan-400 animate-spin fill-cyan-400' : 'text-cyan-400 fill-cyan-400'} />
            <span className="hidden sm:inline">{isSimulating ? 'Playing Alert...' : 'Test Alert'}</span>
          </Button>

          {/* Save Button */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs px-2.5 sm:px-4 shadow-[0_0_15px_rgba(0,240,255,0.3)] flex-shrink-0"
          >
            {savedSuccess ? (
              <>
                <Check size={14} className="text-slate-950" />
                <span className="hidden sm:inline">Saved!</span>
              </>
            ) : (
              <>
                <Save size={14} className="text-slate-950" />
                <span>Save</span>
              </>
            )}
          </Button>

          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              title="Delete this donation box"
              className="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2-COLUMN STUDIO WORKBENCH: EXPANDABLE CATEGORY LIST + PREVIEW  */}
      {/* ============================================================== */}
      <div className={inlineMode ? 'flex flex-col lg:flex-row' : 'flex-1 flex flex-col lg:flex-row overflow-hidden'}>
        
        {/* ============================================================ */}
        {/* LEFT PANE: EXPANDABLE CATEGORY ACCORDION LIST                */}
        {/* ============================================================ */}
        <aside
          className={`w-full lg:w-[440px] flex-shrink-0 flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#090D18] z-10 ${
            inlineMode ? '' : 'overflow-hidden'
          } ${mobileCategoriesOpen ? 'flex flex-1' : 'hidden lg:flex'}`}
        >
          <div className="px-4 py-3 bg-[#060912] border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Layers size={13} />
              <span>Donation Alert Categories</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Click category to expand</span>
          </div>

          {/* Vertical Accordion List of Categories */}
          <div className={`${inlineMode ? 'max-h-[680px]' : 'flex-1'} overflow-y-auto p-3 space-y-2.5 text-xs`}>
            
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
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {fontFamily} ({fontSize}px) • {animationStyle.toUpperCase()}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'text' ? 'rotate-180 text-cyan-400' : ''
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Entrance Animation Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'fade', label: 'Smooth Fade In / Out' },
                        { id: 'pulse', label: 'Cyber Pulse' },
                        { id: 'glitch', label: 'Glitch Pop' },
                        { id: 'slide', label: 'Smooth Slide' }
                      ].map((anim) => (
                        <button
                          key={anim.id}
                          type="button"
                          onClick={() => setAnimationStyle(anim.id as any)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-semibold transition-all text-left ${
                            animationStyle === anim.id
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
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
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {showImage ? 'Image Active' : 'Image Hidden'} • {soundUrl.split('/').pop()} ({Math.round(soundVolume * 100)}%)
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'image' ? 'rotate-180 text-cyan-400' : ''
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
                                onClick={() => openStoragePicker('image')}
                                className="text-[11px] font-mono font-bold text-cyan-400 hover:underline flex items-center gap-1"
                              >
                                <ImageIcon size={12} />
                                <span>Pick from Storage</span>
                              </button>
                              <span className="text-slate-700">•</span>
                              <label className="text-[11px] font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer">
                                <Upload size={12} />
                                <span>Upload Image</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/gif,image/webp"
                                  onChange={handleDirectUpload}
                                  className="hidden"
                                />
                              </label>
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

                        {/* Quick GIF Presets */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono font-bold text-slate-300 block">
                            Popular Animated GIF Presets
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {GIF_PRESETS.map((preset) => (
                              <button
                                key={preset.url}
                                type="button"
                                onClick={() => setMediaUrl(preset.url)}
                                className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                                  mediaUrl === preset.url
                                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <img src={preset.url} alt={preset.label} className="w-6 h-6 rounded object-cover flex-shrink-0" />
                                <span className="text-[11px] font-mono truncate">{preset.label}</span>
                              </button>
                            ))}
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
                            onClick={() => openStoragePicker('sound')}
                            className="text-[11px] font-mono font-bold text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <Volume2 size={12} />
                            <span>Pick from Storage</span>
                          </button>
                          <span className="text-slate-700">•</span>
                          <label className="text-[11px] font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer">
                            <Upload size={12} />
                            <span>Upload Audio</span>
                            <input
                              type="file"
                              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/x-m4a"
                              onChange={handleDirectUpload}
                              className="hidden"
                            />
                          </label>
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

                    {/* Sound Preset Picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-300 block">
                        Sound Presets
                      </label>
                      <div className="space-y-1.5">
                        {SOUND_PRESETS.map((snd) => {
                          const isSelected = soundUrl === snd.url;
                          return (
                            <div
                              key={snd.url}
                              onClick={() => {
                                setSoundUrl(snd.url);
                                playSound(snd.url, soundVolume);
                              }}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                isSelected
                                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className="font-mono text-xs font-bold">{snd.label}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playSound(snd.url, soundVolume);
                                }}
                                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400"
                              >
                                <Play size={12} fill="currentColor" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
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
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {ttsEnabled ? `Active (${ttsType}) • Min $${ttsMinAmount.toFixed(2)}` : 'TTS Disabled'}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'tts' ? 'rotate-180 text-cyan-400' : ''
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
                      {/* Minimum Donation for TTS */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono font-bold text-slate-300">
                            Minimum Tip for TTS ($ USD)
                          </label>
                          <span className="text-[10px] text-cyan-400 font-mono">
                            ~{((ttsMinAmount || 1) * 4100).toLocaleString()} ៛ KHR
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={ttsMinAmount}
                          onChange={(e) => setTtsMinAmount(parseFloat(e.target.value) || 1.0)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* Voice Model Selection */}
                      <div className="space-y-2">
                        <label className="text-xs font-mono font-bold text-slate-300 block">
                          TTS Engine / Voice Model
                        </label>
                        <div className="space-y-2">
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
                            },
                            {
                              id: 'cloned',
                              name: 'Streamer Custom Voice Clone',
                              desc: 'AI neural cloned voice from your own audio speech'
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
                        </div>
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
                            TTS automatically speaks <span className="text-cyan-300 font-mono font-bold">$</span> as <span className="text-white font-medium">"dollars" / "ដុល្លារ"</span> and <span className="text-cyan-300 font-mono font-bold">៛</span> as <span className="text-white font-medium">"riel" / "រៀល"</span> across donation amounts and messages.
                          </p>
                        </div>
                      </div>

                      {/* If Custom Voice Clone is Selected: Show Cloner Button */}
                      {ttsType === 'cloned' && (
                        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                              <Mic size={14} className="text-cyan-400" />
                              AI Cloned Voice Profile
                            </span>
                            {clonedVoiceName && (
                              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                                Ready
                              </span>
                            )}
                          </div>

                          {clonedVoiceName ? (
                            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                              <div>
                                <div className="font-mono font-bold text-xs text-white">{clonedVoiceName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Trained Streamer Voice Sample</div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsVoiceClonerOpen(true)}
                                className="text-[10px] font-mono"
                              >
                                Re-record (≥10s)
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-400">
                                Record at least 10 seconds of clear speech to let our AI clone your voice for stream donation announcements!
                              </p>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => setIsVoiceClonerOpen(true)}
                                className="w-full bg-cyan-400 text-slate-950 font-bold font-mono text-xs"
                              >
                                <Mic size={13} />
                                <span>Record Speech & Clone Voice (≥10s)</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Test TTS Audio Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestTtsAudio}
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
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      Trigger ≥ ${minAmountCondition.toFixed(2)} USD • {isEnabled ? 'Active' : 'Muted'}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'rules' ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {activeTab === 'rules' && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                  {/* Box Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Donation Box Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Standard Tip Alert"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Condition Amount Threshold */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-bold text-slate-300">
                        Condition Amount (≥ Threshold)
                      </label>
                      <span className="text-[10px] text-cyan-400 font-mono">
                        ~{(minAmountCondition * 4100).toLocaleString()} ៛ KHR
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        value={minAmountCondition}
                        onChange={(e) => setMinAmountCondition(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Tips equal to or greater than this amount (≥ ${minAmountCondition.toFixed(2)}) will trigger this alert box.
                    </p>
                  </div>

                  {/* Dedicated OBS Browser Source URL Box */}
                  <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
                        <Monitor size={14} className="text-cyan-400" />
                        Dedicated OBS Source URL
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        ≥ ${minAmountCondition.toFixed(2)} Only
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-mono text-slate-300 truncate select-all flex-1" title={dedicatedBoxUrl}>
                        {dedicatedBoxUrl}
                      </span>
                      <button
                        type="button"
                        onClick={copyObsUrl}
                        className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1 transition-colors"
                      >
                        {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                      Add this dedicated URL as a Browser Source in OBS Studio (1920x1080) to exclusively capture alerts matching this threshold tier.
                    </p>
                  </div>

                  {/* Active Box Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-200">Box Active Status</div>
                      <div className="text-[11px] text-slate-400">Enable or disable this alert box</div>
                    </div>
                    <Switch checked={isEnabled} onChange={setIsEnabled} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer: Save Box Shortcut */}
          <div className="p-3 bg-[#060912] border-t border-slate-800/80 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={mobileCategoriesOpen ? () => setMobileCategoriesOpen(false) : onBack}
              className="text-xs font-mono"
            >
              {mobileCategoriesOpen ? 'Done & Preview' : inlineMode ? 'Collapse' : 'Cancel'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs px-5 shadow-[0_0_12px_rgba(0,240,255,0.25)]"
            >
              {savedSuccess ? 'Saved!' : 'Save Box'}
            </Button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* CENTER MAIN WORKBENCH: LIVE PREVIEW OF ALERTS DONATIONS      */}
        {/* ============================================================ */}
        <main
          className={`flex-1 flex-col overflow-y-auto bg-[#070A12] p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 ${
            mobileCategoriesOpen ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Mobile Categories Floating Banner on device screens */}
          <div className="lg:hidden flex items-center justify-between p-3 rounded-2xl bg-[#090D18] border border-cyan-500/30 shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Sliders size={15} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate font-['Chakra_Petch']">
                  Alert Configuration
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Text, Audio, GIF, Font &amp; TTS
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileCategoriesOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-1 shadow-sm shadow-cyan-400/20 flex-shrink-0 cursor-pointer"
            >
              <span>Edit Settings</span>
            </button>
          </div>
          
          {/* Top Preview Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <Monitor size={15} className="text-cyan-400" />
                Live Alert Canvas Preview
              </span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                1920 × 1080 FHD
              </span>
              <span className="text-slate-500 text-[11px]">Real-time Reactive</span>
            </div>

            {/* Transparent Canvas Indicator & Scale Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>100% Transparent Canvas</span>
              </div>

              {/* Zoom Scale Buttons */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.6, z - 0.1))}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] text-slate-300 px-1 font-bold">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(1.2, z + 0.1))}
                  className="p-1 rounded text-slate-400 hover:text-white"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* THE INTERACTIVE OBS STREAM CANVAS SIMULATOR (TRANSPARENT)  */}
          {/* ========================================================== */}
          <div
            className="w-full rounded-3xl border-2 border-slate-800 relative overflow-hidden transition-all flex items-center justify-center p-6 sm:p-12 min-h-[440px] shadow-2xl bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950/70"
          >
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
                className="w-full flex items-center justify-center animate-fadeIn"
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
              /* Idle Stream Overlay View: Waiting for alert trigger (No test button here; Test button is only on the top bar) */
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 select-none animate-fadeIn opacity-40 hover:opacity-75 transition-opacity">
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
        </main>
      </div>

      {/* ============================================================== */}
      {/* UNIVERSAL STORAGE MEDIA MODAL (IMAGES & SOUNDS + DIRECT UPLOAD) */}
      {/* ============================================================== */}
      {storagePickerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-[#090D18] border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  {storagePickerMode === 'sound' ? <Volume2 size={16} /> : <ImageIcon size={16} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-['Chakra_Petch']">
                    {storagePickerMode === 'sound' ? 'Select Alert Sound from Storage' : 'Select Reaction Media from Storage'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Pick existing assets or manually upload new files directly
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeStoragePicker}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Toolbar: Category Filter Tabs + Direct Manual Upload Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 self-start">
                <button
                  type="button"
                  onClick={() => setStorageActiveTab('image')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    storageActiveTab === 'image'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon size={12} />
                  <span>Images & GIFs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStorageActiveTab('sound')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    storageActiveTab === 'sound'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,240,255,0.15)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Music size={12} />
                  <span>Sounds & Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStorageActiveTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    storageActiveTab === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>All Media</span>
                </button>
              </div>

              {/* Manual Upload Button Inside Modal */}
              <div>
                <input
                  type="file"
                  ref={mediaFileInputRef}
                  onChange={handleDirectUpload}
                  accept={
                    storageActiveTab === 'sound'
                      ? 'audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/x-m4a'
                      : storageActiveTab === 'image'
                      ? 'image/png,image/jpeg,image/gif,image/webp'
                      : 'image/png,image/jpeg,image/gif,image/webp,audio/mpeg,audio/mp3,audio/wav,audio/ogg'
                  }
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => mediaFileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                  className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs shadow-[0_0_12px_rgba(0,240,255,0.25)] flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  {isUploadingMedia ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Uploading Into Cloud...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={13} />
                      <span>Upload to Storage</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center justify-between flex-shrink-0">
                <span className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  <span>{uploadError}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-red-400 hover:text-white text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Media Items Grid / List Container (Scrollable) */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
              {(() => {
                // Filter media by active tab
                const filteredMedia = storageMedia.filter((m) => {
                  const isAudio =
                    m.fileType?.startsWith('audio') ||
                    /\.(mp3|wav|ogg|webm|m4a)$/i.test(m.url || m.filename);
                  if (storageActiveTab === 'image') return !isAudio;
                  if (storageActiveTab === 'sound') return isAudio;
                  return true;
                });

                if (filteredMedia.length === 0) {
                  return (
                    <div className="p-8 text-center space-y-3 rounded-2xl bg-slate-950 border border-slate-800/80 my-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                        {storageActiveTab === 'sound' ? <Volume2 size={24} /> : <ImageIcon size={24} />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-slate-300 font-bold">
                          {storageActiveTab === 'sound'
                            ? 'No sound files found in Storage yet'
                            : storageActiveTab === 'image'
                            ? 'No images or GIFs found in Storage yet'
                            : 'Storage library is empty'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Use the "Upload to Storage" button above to upload files directly without leaving this studio.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => mediaFileInputRef.current?.click()}
                        className="text-xs font-mono text-cyan-400 border-cyan-500/30 hover:bg-cyan-950/40"
                      >
                        <Upload size={12} />
                        <span>Choose File from Computer</span>
                      </Button>
                    </div>
                  );
                }

                // Render Audio List view if looking at sounds
                if (storageActiveTab === 'sound') {
                  return (
                    <div className="space-y-2">
                      {filteredMedia.map((m) => {
                        const isSelected = soundUrl === m.url;
                        const isPlaying = activeAudioPreview === m.url;
                        return (
                          <div
                            key={m._id || m.url}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleSoundPreview(m.url)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                                  isPlaying
                                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                                    : 'bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-slate-800'
                                }`}
                                title={isPlaying ? 'Pause preview' : 'Play preview'}
                              >
                                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                              </button>
                              <div className="min-w-0">
                                <div className="text-xs font-mono font-bold text-white truncate">{m.filename}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {m.fileSize ? `${(m.fileSize / 1024).toFixed(1)} KB` : 'Audio'} • {m.fileType || 'audio/mpeg'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSoundUrl(m.url);
                                playSound(m.url, soundVolume);
                                closeStoragePicker();
                              }}
                              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex-shrink-0 ${
                                isSelected
                                  ? 'bg-cyan-400 text-slate-950'
                                  : 'bg-slate-900 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40'
                              }`}
                            >
                              {isSelected ? 'Active Chime' : 'Select Sound'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Render Image/Mixed Grid view
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredMedia.map((m) => {
                      const isAudio =
                        m.fileType?.startsWith('audio') ||
                        /\.(mp3|wav|ogg|webm|m4a)$/i.test(m.url || m.filename);
                      const isSelected = isAudio ? soundUrl === m.url : mediaUrl === m.url;

                      return (
                        <div
                          key={m._id || m.url}
                          onClick={() => {
                            if (isAudio) {
                              setSoundUrl(m.url);
                              playSound(m.url, soundVolume);
                            } else {
                              setMediaUrl(m.url);
                            }
                            closeStoragePicker();
                          }}
                          className={`p-2.5 rounded-2xl border cursor-pointer transition-all group space-y-2 flex flex-col justify-between ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                              : 'bg-slate-950 border-slate-800 hover:border-cyan-400/60'
                          }`}
                        >
                          <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center relative">
                            {isAudio ? (
                              <div className="flex flex-col items-center justify-center gap-1 text-cyan-400">
                                <Volume2 size={32} />
                                <span className="text-[10px] font-mono text-slate-400">Audio Track</span>
                              </div>
                            ) : (
                              <img
                                src={m.url}
                                alt={m.filename}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}

                            {isSelected && (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-cyan-400 text-slate-950 font-mono text-[9px] font-bold">
                                ACTIVE
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-slate-200 truncate font-semibold">
                              {m.filename}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {m.fileSize ? `${(m.fileSize / 1024).toFixed(0)} KB` : 'Media'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VOICE CLONER MODAL (SPEECH RECORDING >= 10 SECONDS)             */}
      {/* ============================================================== */}
      <VoiceClonerModal
        isOpen={isVoiceClonerOpen}
        onClose={() => setIsVoiceClonerOpen(false)}
        onCloned={(clonedVoice) => {
          setClonedVoiceName(clonedVoice.name);
          setClonedVoiceSampleUrl(clonedVoice.sampleUrl);
          setTtsType('cloned');
          setIsVoiceClonerOpen(false);
        }}
      />
    </div>
  );
};
