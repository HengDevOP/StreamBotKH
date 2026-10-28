'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { NeonAlertCard } from '../overlay/NeonAlertCard';

interface DonationAlertStudioProps {
  box: AlertBox | null; // null when creating a new box
  streamerToken?: string;
  onBack: () => void;
  onSaveSuccess: (savedBox: AlertBox) => void;
  onDeleteSuccess?: (deletedBoxId: string) => void;
  onNavigateToStorage?: () => void;
  inlineMode?: boolean;
}

const FONT_OPTIONS = [
  { id: 'Chakra Petch', label: 'Chakra Petch (Cyberpunk Tech)', category: 'Tech' },
  { id: 'Orbitron', label: 'Orbitron (Futuristic Sci-Fi)', category: 'Sci-Fi' },
  { id: 'Press Start 2P', label: 'Press Start 2P (Retro 8-Bit)', category: 'Retro' },
  { id: 'Inter', label: 'Inter (Clean Modern)', category: 'Clean' },
  { id: 'Bebas Neue', label: 'Bebas Neue (Bold Impact)', category: 'Impact' },
  { id: 'Kanit', label: 'Kanit (Modern Rounded)', category: 'Rounded' },
  { id: 'Montserrat', label: 'Montserrat (Streamer Pro)', category: 'Pro' },
  { id: 'Permanent Marker', label: 'Permanent Marker (Graffiti)', category: 'Street' },
  { id: 'VT323', label: 'VT323 (Terminal Green)', category: 'Terminal' }
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
  { label: 'Neon Chime (Default)', url: '/sounds/neon-chime.mp3' },
  { label: 'Cyber Pulse Alert', url: '/sounds/cyber-alert.mp3' },
  { label: 'Retro 8-Bit Coins', url: '/sounds/coin-drop.mp3' },
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
  inlineMode = false
}) => {
  const isNew = !box || !box._id;
  const { playSound } = useAudio();
  const { socket } = useSocket();

  // Active Category Section (Accordion List Item Expanded: null = collapsed)
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'tts' | 'font' | 'sound' | 'rules' | null>('text');

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
  const [soundUrl, setSoundUrl] = useState<string>(box?.soundUrl || '/sounds/neon-chime.mp3');
  const [soundVolume, setSoundVolume] = useState<number>(box?.soundVolume ?? 0.85);
  const [durationSeconds, setDurationSeconds] = useState<number>(box?.durationSeconds || 8);
  const [glowColor, setGlowColor] = useState<string>(box?.glowColor || '#00F0FF');
  const [fontFamily, setFontFamily] = useState<string>(box?.fontFamily || 'Chakra Petch');
  const [fontSize, setFontSize] = useState<number>(box?.fontSize || 28);
  const [textColor, setTextColor] = useState<string>(box?.textColor || '#FFFFFF');
  const [textTemplate, setTextTemplate] = useState<string>(
    box?.textTemplate || '{donator} donated {amount} through superchat!'
  );
  const [animationStyle, setAnimationStyle] = useState<'fade' | 'pulse' | 'glitch' | 'slide' | 'zoom'>(
    box?.animationStyle === 'bounce' ? 'fade' : (box?.animationStyle as any) || 'fade'
  );

  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(box?.ttsEnabled !== false);
  const [ttsMinAmount, setTtsMinAmount] = useState<number>(box?.ttsMinAmount ?? 1.0);
  const [ttsType, setTtsType] = useState<'google' | 'kiritts-male' | 'kiritts-female' | 'cloned'>(
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
  const [canvasBg, setCanvasBg] = useState<'dark' | 'game' | 'transparent'>('transparent');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

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
        if (data.donorMessage !== undefined) {
          setDemoMessage(data.donorMessage ? data.donorMessage.trim() : '');
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
    fetchStorageMedia();
  }, []);

  const fetchStorageMedia = async () => {
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      if (res.ok && data.success && data.media) {
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
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success && data.media) {
        setStorageMedia((prev) => [data.media, ...prev]);

        // Automatically assign and apply newly uploaded file
        const isAudio =
          data.media.fileType?.startsWith('audio') ||
          /\.(mp3|wav|ogg|webm|m4a)$/i.test(data.media.url || data.media.filename);

        if (isAudio || storagePickerMode === 'sound') {
          setSoundUrl(data.media.url);
          playSound(data.media.url, soundVolume);
        } else {
          setMediaUrl(data.media.url);
        }

        // Close picker after a brief moment
        setTimeout(() => {
          closeStoragePicker();
        }, 400);
      } else {
        setUploadError(data.error || 'Failed to upload media file');
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setUploadError(err.message || 'Network error during upload');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  const obsUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/overlay/${effectiveToken}`
    : `https://streambotkh.com/overlay/${effectiveToken}`;

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
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
      donorName: demoDonorName,
      donorMessage: demoMessage,
      amount: demoAmount,
      currency: 'USD',
      bankingName: 'ABA Bank',
      templateStyle,
      textTemplate,
      textColor,
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

  // Test TTS Audio: Reads BOTH headline announcement text and donor message
  const handleTestTtsAudio = () => {
    setIsTtsPlaying(true);
    try {
      const template = textTemplate || '{donator} donated {amount} through superchat!';
      const formattedAmount = `$${Number(demoAmount).toFixed(2)}`;

      const headline = template
        .replace(/\{donator\}/gi, demoDonorName)
        .replace(/\{name\}/gi, demoDonorName)
        .replace(/\{amount\}/gi, formattedAmount)
        .replace(/\{currency\}/gi, 'USD')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

      const cleanMsg = (demoMessage || '')
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();

      // Read BOTH headline announcement text AND donor message!
      const fullSpeech = cleanMsg ? `${headline}. ${cleanMsg}` : headline;

      const isKhmer = /[\u1780-\u17FF]/.test(fullSpeech) || ttsType.startsWith('kiritts');
      const lang = isKhmer ? 'km' : 'en';

      let ttsAudioUrl = '';
      if (ttsType === 'cloned' && clonedVoiceSampleUrl) {
        ttsAudioUrl = clonedVoiceSampleUrl;
      } else {
        // High quality Neural TTS synthesizing Piseth & Sreymom Khmer voices with mixed-language support
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
        minAmountCondition: Number(minAmountCondition) || 1.0,
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
        textTemplate,
        animationStyle,
        ttsEnabled,
        ttsMinAmount: Number(ttsMinAmount),
        ttsType,
        clonedVoiceName,
        clonedVoiceSampleUrl
      };

      if (!isNew && box?._id) {
        const res = await fetch(`/api/alert-boxes/${box._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
    .replace(/\{amount\}/gi, `$${demoAmount.toFixed(2)}`)
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
      <header className="flex-shrink-0 h-16 border-b border-slate-800/80 bg-[#090D18]/95 px-4 sm:px-6 flex items-center justify-between gap-4 z-20 backdrop-blur-md">
        
        {/* Left: Back/Collapse Button & Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-slate-200 hover:text-white text-xs font-mono font-bold transition-all shadow-md group"
          >
            {inlineMode ? (
              <>
                <ChevronUp size={15} className="text-cyan-400 group-hover:-translate-y-0.5 transition-transform" />
                <span>Collapse Box</span>
              </>
            ) : (
              <>
                <ArrowLeft size={15} className="text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Dashboard</span>
              </>
            )}
          </button>

          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider hidden md:inline">Donation Studio /</span>
              <h2 className="text-sm sm:text-base font-bold text-white truncate font-['Chakra_Petch']">
                {name || 'Untitled Donation Alert'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                Condition ≥ ${minAmountCondition.toFixed(2)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden md:block">
              Click any category on the left list to expand &amp; configure • Live Real-Time Preview
            </p>
          </div>
        </div>

        {/* Right: OBS Studio Browser Source URL with Copy Icon & Save Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* OBS Studio Browser Source URL with Copy Icon */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono max-w-[320px]">
            <Monitor size={14} className="text-cyan-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-400 truncate select-all flex-1" title={obsUrl}>
              {obsUrl}
            </span>
            <button
              type="button"
              onClick={copyObsUrl}
              title={copiedUrl ? 'Copied OBS URL!' : 'Copy OBS Browser Source URL'}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors flex-shrink-0"
            >
              {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Test Alert Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSimulateAlert}
            disabled={isSimulating}
            className="border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 font-mono text-xs font-bold shadow-[0_0_12px_rgba(0,240,255,0.15)] flex items-center gap-1.5"
          >
            <Play size={13} className={isSimulating ? 'text-cyan-400 animate-spin fill-cyan-400' : 'text-cyan-400 fill-cyan-400'} />
            <span className="hidden sm:inline">{isSimulating ? 'Playing Alert...' : 'Test Alert'}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs px-4 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          >
            {savedSuccess ? (
              <>
                <Check size={14} className="text-slate-950" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={14} className="text-slate-950" />
                <span>Save Box</span>
              </>
            )}
          </Button>

          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              title="Delete this donation box"
              className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors"
            >
              <Trash2 size={15} />
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
          className={`w-full lg:w-[440px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#090D18] z-10 ${
            inlineMode ? '' : 'overflow-hidden'
          }`}
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
            {/* CATEGORY 1: TEXT & MESSAGING                             */}
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
                      <span>1. Text &amp; Messaging Format</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {animationStyle.toUpperCase()} • {durationSeconds}s duration
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
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">Insert tag:</span>
                    {['{donator}', '{amount}', '{context}', '{currency}'].map((tag) => (
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

                {/* Headline Text Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 block">
                    Headline Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
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

                {/* Animation Style */}
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
            {/* CATEGORY 2: REACTION IMAGE & GIF                         */}
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
                      2. Reaction Image &amp; GIF
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {showImage ? `Active • Layout: ${layoutMode}` : 'Hidden'}
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
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">
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
                              name: 'Google Cloud Neural TTS',
                              desc: 'Universal crisp English & multilingual voice model'
                            },
                            {
                              id: 'kiritts-male',
                              name: 'KiriTTS Male (Neural Khmer / EN)',
                              desc: 'Open-source Cambodian male voice for ABA tips'
                            },
                            {
                              id: 'kiritts-female',
                              name: 'KiriTTS Female (Neural Khmer / EN)',
                              desc: 'Open-source Cambodian female voice for ABA tips'
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
            {/* CATEGORY 4: CUSTOM FONT & NEON STYLING                   */}
            {/* -------------------------------------------------------- */}
            <div
              className={`rounded-2xl border transition-all overflow-hidden ${
                activeTab === 'font'
                  ? 'border-cyan-500/40 bg-[#0B101E] shadow-[0_0_20px_rgba(0,240,255,0.08)]'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'font' ? null : 'font')}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTab === 'font'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Palette size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-['Chakra_Petch']">
                      4. Custom Font &amp; Neon Styling
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono flex items-center gap-1.5">
                      <span>{fontFamily} ({fontSize}px)</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                        style={{ backgroundColor: glowColor }}
                      />
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'font' ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {activeTab === 'font' && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                  {/* Font Family Selector with live preview */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Font Family
                    </label>
                    <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {FONT_OPTIONS.map((f) => {
                        const isSelected = fontFamily === f.id;
                        return (
                          <div
                            key={f.id}
                            onClick={() => setFontFamily(f.id)}
                            className={`px-3 py-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-sm font-bold block truncate" style={{ fontFamily: `"${f.id}", sans-serif` }}>
                                {f.label}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-500">
                              {f.category}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Font Size Slider */}
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
                      Neon Glow & Border Accent
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

                  {/* Template Frame Style */}
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
                </div>
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* CATEGORY 5: SOUND & AUDIO EFFECT                         */}
            {/* -------------------------------------------------------- */}
            <div
              className={`rounded-2xl border transition-all overflow-hidden ${
                activeTab === 'sound'
                  ? 'border-cyan-500/40 bg-[#0B101E] shadow-[0_0_20px_rgba(0,240,255,0.08)]'
                  : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'sound' ? null : 'sound')}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTab === 'sound'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <Volume2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white font-['Chakra_Petch']">
                      5. Chime Sound &amp; Audio Effect
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      Volume: {Math.round(soundVolume * 100)}% • {soundUrl.split('/').pop()}
                    </div>
                  </div>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    activeTab === 'sound' ? 'rotate-180 text-cyan-400' : ''
                  }`}
                />
              </button>

              {activeTab === 'sound' && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                  {/* Active Audio Chime & Storage Picker */}
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
                        title="Play Current Chime"
                      >
                        <Play size={14} fill="currentColor" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={soundUrl}
                          onChange={(e) => setSoundUrl(e.target.value)}
                          placeholder="https://.../sound.mp3"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-cyan-400 truncate"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sound Preset Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Sound Chime Preset
                    </label>
                    <div className="space-y-2">
                      {SOUND_PRESETS.map((snd) => {
                        const isSelected = soundUrl === snd.url;
                        return (
                          <div
                            key={snd.url}
                            onClick={() => {
                              setSoundUrl(snd.url);
                              playSound(snd.url, soundVolume);
                            }}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
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

                  {/* Custom Sound URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Or Enter Custom Audio URL (.mp3 / .wav)
                    </label>
                    <input
                      type="text"
                      value={soundUrl}
                      onChange={(e) => setSoundUrl(e.target.value)}
                      placeholder="https://.../sound.mp3"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 truncate"
                    />
                  </div>

                  {/* Sound Volume Slider */}
                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-300">Volume</span>
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
                        className="text-[11px] font-mono"
                      >
                        <Play size={11} fill="currentColor" />
                        <span>Test Chime</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------------------------------------------------------- */}
            {/* CATEGORY 6: CONDITION THRESHOLD & RULES                  */}
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
                      6. Condition Threshold &amp; Rules
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
                        step="0.5"
                        min="0.1"
                        value={minAmountCondition}
                        onChange={(e) => setMinAmountCondition(parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Tips equal to or greater than this amount will display this alert box.
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
              onClick={onBack}
              className="text-xs font-mono"
            >
              {inlineMode ? 'Collapse' : 'Cancel'}
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
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#070A12] p-4 sm:p-6 lg:p-8 space-y-6">
          
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

            {/* Background Simulator Switcher & Scale Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCanvasBg('dark')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    canvasBg === 'dark' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dark OBS
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasBg('game')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    canvasBg === 'game' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Gameplay Mock
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasBg('transparent')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    canvasBg === 'transparent' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Transparent
                </button>
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
          {/* THE INTERACTIVE OBS STREAM CANVAS SIMULATOR               */}
          {/* ========================================================== */}
          <div
            className={`w-full rounded-3xl border-2 border-slate-800 relative overflow-hidden transition-all flex items-center justify-center p-6 sm:p-12 min-h-[440px] shadow-2xl ${
              canvasBg === 'dark'
                ? 'bg-[#05070E]'
                : canvasBg === 'transparent'
                ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950'
                : 'bg-cover bg-center'
            }`}
            style={{
              backgroundImage:
                canvasBg === 'game'
                  ? 'linear-gradient(rgba(5, 7, 14, 0.65), rgba(5, 7, 14, 0.85)), url(https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1920&q=80)'
                  : undefined
            }}
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
                      <span>Uploading Media...</span>
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
