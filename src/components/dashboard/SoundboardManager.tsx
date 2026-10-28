'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Keyboard,
  Play,
  Square,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers,
  Search,
  X,
  FolderUp,
  HelpCircle,
  Megaphone,
  Smile,
  DollarSign,
  Trophy,
  Frown,
  Flame,
  Zap,
  Bell,
  AlertCircle,
  Skull,
  TrendingUp,
  Radio,
  Crosshair,
  Activity,
  Mic,
  Music
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { triggerSoundEffect, stopAllActiveSounds } from '../../utils/soundboardSynth';

export interface SoundboardItem {
  id: string;
  streamerToken: string;
  title: string;
  category: string;
  soundUrl: string;
  keybind: string;
  keybindCode: string;
  keybindDisplay: string;
  volume: number;
  color: string;
  iconName: string;
  durationSeconds: number;
  isLoop: boolean;
  sortOrder: number;
}

export interface SoundboardSettings {
  id: string;
  token: string;
  masterVolume: number;
  isListening: boolean;
  outputMode: 'local' | 'overlay' | 'both';
  playbackMode: 'overlap' | 'solo';
  showVisualAlert: boolean;
  stopKeybind: string;
}

interface SoundboardManagerProps {
  streamerToken?: string;
}

const CATEGORIES = ['All', 'Laugh', 'Ohhhhh', 'Memes', 'Gaming', 'Reactions', 'Alerts', 'Custom'] as const;

const PRESET_SYNTH_SOUNDS = [
  // 1. LAUGH SOUNDS
  { id: '/sounds/memes/laugh-oh-no-no-no.mp3', name: 'Oh No No No (Laugh)', category: 'Laugh', icon: 'Smile', color: '#F59E0B', dur: 5.5 },
  { id: '/sounds/memes/laugh-funny.mp3', name: 'Funny Wheeze Laugh', category: 'Laugh', icon: 'Smile', color: '#EC4899', dur: 2.8 },
  { id: '/sounds/memes/laugh-baby.mp3', name: 'Baby Laughing Meme', category: 'Laugh', icon: 'Smile', color: '#EAB308', dur: 3.3 },
  { id: '/sounds/memes/laugh-cat.mp3', name: 'Cat Laugh Meme', category: 'Laugh', icon: 'Smile', color: '#10B981', dur: 1.8 },
  { id: '/sounds/memes/laugh-ha-goteem.mp3', name: "HA! Got 'Eem!", category: 'Laugh', icon: 'Smile', color: '#3B82F6', dur: 2.2 },

  // 2. OHHHHHHHH SOUND GROUP
  { id: '/sounds/memes/oh-crowd.mp3', name: 'Rap Battle OOOOH!', category: 'Ohhhhh', icon: 'Flame', color: '#EF4444', dur: 3.0 },
  { id: '/sounds/memes/oh-supa-hot.mp3', name: 'Supa Hot Fire (Boom Bam)', category: 'Ohhhhh', icon: 'Flame', color: '#F97316', dur: 3.1 },
  { id: '/sounds/memes/oh-sike-wrong-number.mp3', name: 'Sike! Wrong Number!', category: 'Ohhhhh', icon: 'Sparkles', color: '#8B5CF6', dur: 3.2 },
  { id: '/sounds/memes/oh-wombo-combo.mp3', name: 'Wombo Combo! OHHH!', category: 'Ohhhhh', icon: 'Zap', color: '#06B6D4', dur: 4.0 },
  { id: '/sounds/memes/oh-baby-a-triple.mp3', name: 'Oh Baby A Triple!', category: 'Ohhhhh', icon: 'Trophy', color: '#EAB308', dur: 2.5 },
  { id: '/sounds/memes/oh-omg-loud.mp3', name: 'Oh My God! (Loud MLG)', category: 'Ohhhhh', icon: 'AlertCircle', color: '#F43F5E', dur: 4.8 },
  { id: '/sounds/memes/oh-my-god.mp3', name: 'Oh My God! (Wow)', category: 'Ohhhhh', icon: 'Bell', color: '#10B981', dur: 1.0 },
  { id: '/sounds/memes/oh-roblox-oof.mp3', name: 'Roblox OOF!', category: 'Ohhhhh', icon: 'Skull', color: '#F59E0B', dur: 0.6 },
  { id: '/sounds/memes/oh-minecraft-oof.mp3', name: 'Minecraft OOF!', category: 'Ohhhhh', icon: 'Crosshair', color: '#84CC16', dur: 0.4 },
  { id: '/sounds/memes/oh-fahhh.mp3', name: 'FAAAAAHHHHH!', category: 'Ohhhhh', icon: 'Mic', color: '#A855F7', dur: 1.2 },

  // 3. VIRAL MEME SOUNDS
  { id: '/sounds/memes/meme-vine-boom.mp3', name: 'Vine Boom', category: 'Memes', icon: 'Flame', color: '#EF4444', dur: 0.7 },
  { id: '/sounds/memes/meme-emotional-damage.mp3', name: 'Emotional Damage!', category: 'Memes', icon: 'Frown', color: '#8B5CF6', dur: 1.7 },
  { id: '/sounds/memes/meme-metal-pipe.mp3', name: 'Metal Pipe Clang', category: 'Memes', icon: 'Activity', color: '#06B6D4', dur: 1.4 },
  { id: '/sounds/memes/meme-fbi-open-up.mp3', name: 'FBI OPEN UP!', category: 'Memes', icon: 'Megaphone', color: '#F43F5E', dur: 2.4 },
  { id: '/sounds/memes/meme-to-be-continued.mp3', name: 'To Be Continued (JoJo)', category: 'Memes', icon: 'Music', color: '#F59E0B', dur: 4.8 },
  { id: '/sounds/memes/meme-john-cena.mp3', name: 'John Cena 🎺', category: 'Memes', icon: 'Trophy', color: '#10B981', dur: 5.0 },
  { id: '/sounds/memes/meme-damn-son.mp3', name: "Damn Son Where'd You", category: 'Memes', icon: 'Sparkles', color: '#EC4899', dur: 2.4 },
  { id: '/sounds/memes/meme-he-need-milk.mp3', name: 'He Need Some Milk!', category: 'Memes', icon: 'Smile', color: '#3B82F6', dur: 2.8 },
  { id: '/sounds/memes/meme-no-god-please.mp3', name: 'No God Please No!', category: 'Memes', icon: 'Skull', color: '#EF4444', dur: 3.2 },
  { id: '/sounds/memes/meme-windows-error.mp3', name: 'Windows XP Error', category: 'Memes', icon: 'AlertCircle', color: '#F43F5E', dur: 0.6 },
  { id: '/sounds/memes/meme-windows-startup.mp3', name: 'Windows XP Startup', category: 'Memes', icon: 'Bell', color: '#06B6D4', dur: 3.7 },
  { id: '/sounds/memes/meme-among-us.mp3', name: 'Among Us Reveal', category: 'Memes', icon: 'Skull', color: '#EF4444', dur: 3.1 },
  { id: '/sounds/memes/meme-discord-ping.mp3', name: 'Discord Ghost Ping', category: 'Alerts', icon: 'Bell', color: '#6366F1', dur: 0.4 },
  { id: '/sounds/memes/meme-rizz.mp3', name: 'Rizz Sound Effect', category: 'Memes', icon: 'Sparkles', color: '#EC4899', dur: 2.4 },
  { id: '/sounds/memes/meme-huh-cat.mp3', name: 'Huh? Cat Meme', category: 'Memes', icon: 'Smile', color: '#EAB308', dur: 0.9 },
  { id: '/sounds/memes/meme-yeet.mp3', name: 'YEET!', category: 'Memes', icon: 'TrendingUp', color: '#14B8A6', dur: 1.3 },
  { id: '/sounds/memes/meme-spongebob-fail.mp3', name: 'SpongeBob Fail', category: 'Reactions', icon: 'Frown', color: '#F59E0B', dur: 1.7 },
  { id: '/sounds/memes/meme-sad-violin.mp3', name: 'Sad Violin Solo', category: 'Reactions', icon: 'Music', color: '#8B5CF6', dur: 2.3 },
  { id: '/sounds/memes/meme-tactical-nuke.mp3', name: 'Tactical Nuke Alert', category: 'Gaming', icon: 'Radio', color: '#F97316', dur: 4.8 },
  { id: '/sounds/memes/meme-hitmarker.mp3', name: 'Hitmarker Tick', category: 'Gaming', icon: 'Crosshair', color: '#84CC16', dur: 0.2 },
  { id: 'synth:airhorn', name: 'Triple Airhorn 3X', category: 'Memes', icon: 'Megaphone', color: '#EF4444', dur: 1.0 },
  { id: 'synth:kaching', name: 'Ka-Ching Money', category: 'Alerts', icon: 'DollarSign', color: '#10B981', dur: 1.1 }
];

const COLOR_OPTIONS = [
  '#00F0FF', // Cyan
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Sky
  '#EAB308', // Yellow
  '#3B82F6', // Blue
  '#84CC16'  // Lime
];

// Helper to format keyboard event into display string and code
function formatKeybind(e: KeyboardEvent): { code: string; display: string } {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('CTRL');
  if (e.altKey) parts.push('ALT');
  if (e.shiftKey) parts.push('SHIFT');

  let keyPart = e.code;

  if (e.code.startsWith('Numpad')) {
    keyPart = `NUM ${e.code.replace('Numpad', '')}`;
  } else if (e.code.startsWith('Digit')) {
    keyPart = e.code.replace('Digit', '');
  } else if (e.code.startsWith('Key')) {
    keyPart = e.code.replace('Key', '');
  } else if (e.code === 'Space') {
    keyPart = 'SPACE';
  } else if (e.code === 'Enter') {
    keyPart = 'ENTER';
  } else if (e.code === 'Tab') {
    keyPart = 'TAB';
  } else if (e.code === 'Escape') {
    keyPart = 'ESC';
  }

  // Avoid adding duplicate modifier name if key pressed was the modifier itself
  if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
    return { code: e.code, display: keyPart };
  }

  parts.push(keyPart);
  return {
    code: e.code,
    display: parts.join(' + ')
  };
}

export const SoundboardManager: React.FC<SoundboardManagerProps> = ({ streamerToken }) => {
  const { socket } = useSocket();
  const effectiveToken = streamerToken || 'demo-token';

  // State
  const [settings, setSettings] = useState<SoundboardSettings>({
    id: '',
    token: effectiveToken,
    masterVolume: 0.8,
    isListening: true,
    outputMode: 'both',
    playbackMode: 'overlap',
    showVisualAlert: true,
    stopKeybind: 'Escape'
  });

  const [items, setItems] = useState<SoundboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Active playing sound tracker
  const [playingSoundIds, setPlayingSoundIds] = useState<Set<string>>(new Set());

  // Key recording state
  const [recordingItemId, setRecordingItemId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SoundboardItem | null>(null);

  // Add Sound Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Memes',
    soundUrl: 'synth:airhorn',
    keybindCode: '',
    keybindDisplay: '',
    volume: 0.8,
    color: '#00F0FF',
    iconName: 'Megaphone',
    durationSeconds: 1.0
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTabType, setActiveTabType] = useState<'presets' | 'upload' | 'url'>('presets');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OBS URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const obsUrl = `${origin}/overlay/soundboard/${effectiveToken}`;

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/soundboard?token=${effectiveToken}`);
      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(data.settings);
        if (data.items) setItems(data.items);
      }
    } catch (err) {
      console.error('[Soundboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger Play Sound (from UI click or Keybind)
  const handlePlaySound = useCallback(
    (item: SoundboardItem) => {
      // 1. If Solo playback mode, stop previous sounds first
      if (settings.playbackMode === 'solo') {
        stopAllActiveSounds();
        setPlayingSoundIds(new Set([item.id]));
      } else {
        setPlayingSoundIds((prev) => new Set(prev).add(item.id));
      }

      // 2. Local PC sound playback if enabled
      if (settings.outputMode === 'local' || settings.outputMode === 'both') {
        triggerSoundEffect(
          item.id,
          item.soundUrl,
          item.volume,
          settings.masterVolume,
          () => {
            // Callback when sound finishes
            setPlayingSoundIds((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
          }
        );
      } else {
        // Just clear playing state after duration if local audio disabled
        setTimeout(() => {
          setPlayingSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }, Math.max(1000, item.durationSeconds * 1000));
      }

      // 3. Emit / Send to OBS Browser Source if overlay enabled
      if (settings.outputMode === 'overlay' || settings.outputMode === 'both') {
        fetch('/api/soundboard/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: effectiveToken,
            soundId: item.id,
            title: item.title,
            category: item.category,
            soundUrl: item.soundUrl,
            volume: item.volume,
            masterVolume: settings.masterVolume,
            color: item.color,
            iconName: item.iconName,
            durationSeconds: item.durationSeconds,
            showVisualAlert: settings.showVisualAlert,
            action: 'play'
          })
        }).catch(() => {});
      }
    },
    [effectiveToken, settings]
  );

  // Stop All Sounds (Panic Button)
  const handleStopAll = useCallback(() => {
    stopAllActiveSounds();
    setPlayingSoundIds(new Set());

    fetch('/api/soundboard/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: effectiveToken,
        action: 'stop'
      })
    }).catch(() => {});
  }, [effectiveToken]);

  // Global PC Keybind Listener Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If currently recording a keybind for a specific pad
      if (recordingItemId) {
        e.preventDefault();
        e.stopPropagation();

        if (e.code === 'Escape') {
          // Cancel recording
          setRecordingItemId(null);
          return;
        }

        const { code, display } = formatKeybind(e);

        // Update item with new keybind
        fetch('/api/soundboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: effectiveToken,
            action: 'update_item',
            item: {
              id: recordingItemId,
              keybind: e.key,
              keybindCode: code,
              keybindDisplay: display
            }
          })
        })
          .then((res) => res.json())
          .then((res) => {
            if (res.success) {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === recordingItemId
                    ? { ...it, keybind: e.key, keybindCode: code, keybindDisplay: display }
                    : it
                )
              );
            }
          })
          .finally(() => {
            setRecordingItemId(null);
          });

        return;
      }

      // 2. If keyboard listener is disabled by user, do nothing
      if (!settings.isListening) return;

      // 3. Stop / Panic Keybind (default: Escape)
      if (e.code === settings.stopKeybind || e.key === settings.stopKeybind) {
        handleStopAll();
        return;
      }

      // 4. Typing guard: If user is actively typing in a form input or textarea,
      // ignore regular letter/number typing, but allow F-Keys (F1-F12) or Alt/Ctrl hotkeys!
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');

      const isFKey = e.code.startsWith('F') && !isNaN(Number(e.code.replace('F', '')));
      const hasModifier = e.ctrlKey || e.altKey;

      if (isInput && !isFKey && !hasModifier) {
        // Streamer is typing in search or form - let normal typing pass through
        return;
      }

      // 5. Match Keybind in Soundboard Items
      const matchingItem = items.find((item) => {
        if (!item.keybindCode) return false;

        // Exact code match (e.g. "Numpad1", "F1", "KeyQ", "Digit1", "Space")
        if (item.keybindCode === e.code) return true;

        // Key match fallback (e.g. "1", "q")
        if (item.keybind && item.keybind.toLowerCase() === e.key.toLowerCase()) return true;

        return false;
      });

      if (matchingItem) {
        // Prevent browser defaults for bound keys (e.g. Space scrolling page, F1 opening Windows help)
        if (['Space', 'F1', 'F3', 'F4', 'F5', 'F6', 'F7', 'Tab'].includes(e.code)) {
          e.preventDefault();
        }
        handlePlaySound(matchingItem);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [items, settings, recordingItemId, effectiveToken, handlePlaySound, handleStopAll]);

  // Toggle PC Keybind Listener
  const handleToggleListening = async () => {
    const nextVal = !settings.isListening;
    setSettings((prev) => ({ ...prev, isListening: nextVal }));

    await fetch('/api/soundboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: effectiveToken,
        isListening: nextVal
      })
    });
  };

  // Update Master Volume
  const handleMasterVolumeChange = async (vol: number) => {
    setSettings((prev) => ({ ...prev, masterVolume: vol }));
    await fetch('/api/soundboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: effectiveToken,
        masterVolume: vol
      })
    });
  };

  // Reset to Default Sounds
  const handleResetDefaults = async () => {
    if (!confirm('Reset soundboard to the 16 original stream sounds? Your custom sound pads will be replaced.')) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          action: 'reset_defaults'
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this sound pad?')) return;

    setItems((prev) => prev.filter((it) => it.id !== itemId));
    await fetch('/api/soundboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: effectiveToken,
        action: 'delete_item',
        itemId
      })
    });
  };

  // Clear Keybind on a Pad
  const handleClearKeybind = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, keybind: '', keybindCode: '', keybindDisplay: '' } : it))
    );

    await fetch('/api/soundboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: effectiveToken,
        action: 'update_item',
        item: {
          id: itemId,
          keybind: '',
          keybindCode: '',
          keybindDisplay: ''
        }
      })
    });
  };

  // File Upload Handler
  const handleFileUpload = async (file: File) => {
    try {
      setUploadingFile(true);
      setUploadError(null);

      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/soundboard/upload', {
        method: 'POST',
        body: form
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFormData((prev) => ({
          ...prev,
          soundUrl: data.url,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
          category: 'Custom'
        }));
      } else {
        setUploadError(data.error || 'Upload failed');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  // Save New / Edited Sound
  const handleSaveSound = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a sound title');
      return;
    }

    try {
      if (editingItem) {
        // Update existing
        await fetch('/api/soundboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: effectiveToken,
            action: 'update_item',
            item: {
              id: editingItem.id,
              title: formData.title,
              category: formData.category,
              soundUrl: formData.soundUrl,
              volume: formData.volume,
              color: formData.color,
              iconName: formData.iconName,
              durationSeconds: formData.durationSeconds
            }
          })
        });
      } else {
        // Add new
        await fetch('/api/soundboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: effectiveToken,
            action: 'add_item',
            item: {
              title: formData.title,
              category: formData.category,
              soundUrl: formData.soundUrl,
              keybind: '',
              keybindCode: formData.keybindCode || '',
              keybindDisplay: formData.keybindDisplay || '',
              volume: formData.volume,
              color: formData.color,
              iconName: formData.iconName,
              durationSeconds: formData.durationSeconds
            }
          })
        });
      }

      await fetchData();
      setIsAddModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to save sound:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: SoundboardItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      soundUrl: item.soundUrl,
      keybindCode: item.keybindCode,
      keybindDisplay: item.keybindDisplay,
      volume: item.volume,
      color: item.color,
      iconName: item.iconName,
      durationSeconds: item.durationSeconds
    });
    setIsAddModalOpen(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: 'Memes',
      soundUrl: 'synth:airhorn',
      keybindCode: '',
      keybindDisplay: '',
      volume: 0.8,
      color: '#00F0FF',
      iconName: 'Megaphone',
      durationSeconds: 1.0
    });
    setIsAddModalOpen(true);
  };

  // Filtered Items
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keybindDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Render Icon helper
  const renderIcon = (name: string, size = 20) => {
    switch (name) {
      case 'Megaphone':
        return <Megaphone size={size} />;
      case 'Smile':
        return <Smile size={size} />;
      case 'DollarSign':
        return <DollarSign size={size} />;
      case 'Trophy':
        return <Trophy size={size} />;
      case 'Frown':
        return <Frown size={size} />;
      case 'Sparkles':
        return <Sparkles size={size} />;
      case 'Flame':
        return <Flame size={size} />;
      case 'Zap':
        return <Zap size={size} />;
      case 'Bell':
        return <Bell size={size} />;
      case 'AlertCircle':
        return <AlertCircle size={size} />;
      case 'Skull':
        return <Skull size={size} />;
      case 'TrendingUp':
        return <TrendingUp size={size} />;
      case 'Radio':
        return <Radio size={size} />;
      case 'Crosshair':
        return <Crosshair size={size} />;
      case 'Activity':
        return <Activity size={size} />;
      case 'Mic':
        return <Mic size={size} />;
      default:
        return <Volume2 size={size} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Keybind Listener Bar */}
      <div className="p-6 rounded-3xl bg-[#090D18] border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Volume2 size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-wide font-sans flex items-center gap-2">
                  <span>STREAM SOUNDBOARD & HOTKEY ENGINE</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    PC KEYBIND
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Assign keyboard hotkeys to play sound effects instantly on your PC and broadcast to OBS Studio.
                </p>
              </div>
            </div>

            {/* Listener Status Badge */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleToggleListening}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  settings.isListening
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    settings.isListening ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {settings.isListening ? 'PC KEYBOARD LISTENER: ARMED & ACTIVE' : 'KEYBOARD LISTENER: PAUSED'}
                </span>
                <span className="text-[10px] underline ml-1 opacity-70">
                  {settings.isListening ? '(Click to Pause)' : '(Click to Enable)'}
                </span>
              </button>

              <button
                onClick={() => setIsCheatSheetOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <Keyboard size={14} className="text-cyan-400" />
                <span>Hotkey Cheat Sheet</span>
              </button>

              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <Sliders size={14} className="text-purple-400" />
                <span>Output & Audio Routing</span>
              </button>
            </div>
          </div>

          {/* Quick Actions & Panic Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Master Volume Slider */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <Volume2 size={16} className="text-slate-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                className="w-24 accent-cyan-400 cursor-pointer h-1.5 rounded-lg bg-slate-700"
              />
              <span className="text-xs font-mono text-slate-300 w-10 text-right">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>

            {/* Panic Stop Button */}
            <button
              onClick={handleStopAll}
              title="Stop all currently playing sounds immediately"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 font-mono font-bold text-xs transition-all shadow-lg shadow-rose-500/10"
            >
              <Square size={14} className="fill-rose-400 text-rose-400" />
              <span>STOP ALL</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 font-bold">
                ESC
              </span>
            </button>

            {/* Add Sound Button */}
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
            >
              <Plus size={16} />
              <span>Add Sound Pad</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search sounds or hotkeys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500/50 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <button
            onClick={handleResetDefaults}
            title="Restore default 16 sounds"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap"
          >
            <RefreshCw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Recording Prompt Pill if active */}
      {recordingItemId && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border-2 border-cyan-400 text-cyan-300 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
              <Keyboard size={20} className="animate-bounce" />
            </div>
            <div>
              <div className="text-sm font-bold font-sans">
                PRESS ANY KEY ON YOUR PC KEYBOARD (e.g. F1, Num 1, Space, 1, Alt+Q)...
              </div>
              <div className="text-xs opacity-75 font-mono">
                Press ESC to cancel • Listening to hardware keyboard input
              </div>
            </div>
          </div>
          <button
            onClick={() => setRecordingItemId(null)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-300 hover:text-white border border-slate-700"
          >
            Cancel (ESC)
          </button>
        </div>
      )}

      {/* 3. Sound Pads Grid */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-cyan-400">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-wider text-slate-400">LOADING SOUNDBOARD PADS...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 rounded-3xl bg-[#090D18] border border-slate-800 text-center space-y-3">
          <VolumeX size={36} className="mx-auto text-slate-600" />
          <div className="text-sm font-bold text-white">No sound pads found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No sounds match "${searchQuery}". Try a different keyword.`
              : 'Add your first sound pad using the button above or reset to default sounds.'}
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus size={14} />
            <span>Add Sound Pad</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isPlaying = playingSoundIds.has(item.id);
            const isRecordingThis = recordingItemId === item.id;
            const itemColor = item.color || '#00F0FF';

            return (
              <div
                key={item.id}
                className={`relative group rounded-2xl p-4 transition-all duration-200 border flex flex-col justify-between select-none ${
                  isPlaying
                    ? 'shadow-2xl scale-[1.02]'
                    : isRecordingThis
                    ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-[#0E1526]'
                    : 'hover:border-slate-700 bg-[#090D18] border-slate-800/80 hover:bg-[#0c1222]'
                }`}
                style={{
                  borderColor: isPlaying ? itemColor : isRecordingThis ? '#00F0FF' : undefined,
                  boxShadow: isPlaying ? `0 0 25px ${itemColor}40, 0 10px 30px rgba(0,0,0,0.5)` : undefined
                }}
              >
                {/* Playing Sound Wave Overlay Glow */}
                {isPlaying && (
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none opacity-20"
                    style={{ backgroundColor: itemColor }}
                  />
                )}

                {/* Top Row: Keybind Badge + Category */}
                <div className="flex items-center justify-between gap-2 relative z-10 mb-3">
                  {/* Hotkey Badge Button */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRecordingItemId(item.id)}
                      title="Click to bind a new key from your PC keyboard"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                        isRecordingThis
                          ? 'bg-cyan-500 text-slate-950 animate-pulse'
                          : item.keybindDisplay
                          ? 'bg-slate-900 border border-slate-700 hover:border-cyan-400/70 text-slate-200 group-hover:text-white'
                          : 'bg-slate-900/60 border border-dashed border-slate-700 hover:border-cyan-400 text-slate-500 hover:text-cyan-400'
                      }`}
                    >
                      <Keyboard size={12} className={item.keybindDisplay ? 'text-cyan-400' : 'text-slate-500'} />
                      <span>{isRecordingThis ? 'PRESS KEY...' : item.keybindDisplay || '+ BIND KEY'}</span>
                    </button>

                    {item.keybindDisplay && (
                      <button
                        onClick={(e) => handleClearKeybind(item.id, e)}
                        title="Clear keybind"
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Category Pill */}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                    {item.category}
                  </span>
                </div>

                {/* Center: Pad Icon + Title + Waveform */}
                <div
                  onClick={() => handlePlaySound(item)}
                  className="cursor-pointer flex flex-col items-center justify-center text-center py-4 px-2 rounded-xl hover:bg-white/[0.02] transition-colors relative z-10 group/btn"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform mb-3 ${
                      isPlaying ? 'scale-110' : 'group-hover/btn:scale-105'
                    }`}
                    style={{
                      backgroundColor: `${itemColor}15`,
                      border: `1.5px solid ${itemColor}60`,
                      color: itemColor,
                      boxShadow: isPlaying ? `0 0 20px ${itemColor}60` : undefined
                    }}
                  >
                    {isPlaying ? (
                      <div className="flex items-end gap-1 h-6">
                        {[0.4, 1.0, 0.7, 0.9].map((h, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full animate-pulse"
                            style={{
                              backgroundColor: itemColor,
                              height: `${h * 100}%`,
                              animationDelay: `${i * 0.15}s`
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      renderIcon(item.iconName, 26)
                    )}
                  </div>

                  <div className="text-sm font-bold text-white tracking-wide truncate max-w-full">
                    {item.title}
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {item.durationSeconds.toFixed(1)}s • Vol {Math.round(item.volume * 100)}%
                  </div>
                </div>

                {/* Bottom Row Controls: Play/Stop + Edit + Delete */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 relative z-10 mt-2">
                  <button
                    onClick={() => handlePlaySound(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                    style={{
                      backgroundColor: isPlaying ? itemColor : `${itemColor}15`,
                      color: isPlaying ? '#090D18' : itemColor,
                      border: `1px solid ${itemColor}40`
                    }}
                  >
                    {isPlaying ? <Square size={13} className="fill-current" /> : <Play size={13} />}
                    <span>{isPlaying ? 'PLAYING...' : 'PLAY'}</span>
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    title="Edit sound settings"
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete pad"
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Hotkey Cheat Sheet Modal */}
      {isCheatSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0B101E] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Keyboard size={20} className="text-cyan-400" />
                <h3 className="text-base font-bold text-white font-sans">PC KEYBOARD HOTKEY CHEAT SHEET</h3>
              </div>
              <button
                onClick={() => setIsCheatSheetOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              When the PC Keyboard Listener is active, press any of these keys on your physical keyboard to trigger sound
              effects while streaming:
            </p>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: it.color || '#00F0FF' }}
                      />
                      <span className="text-xs font-bold text-slate-200 truncate">{it.title}</span>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                        it.keybindDisplay
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {it.keybindDisplay || 'NO KEY'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Panic Stop Shortcut: <strong className="text-rose-400">ESC</strong></span>
              <button
                onClick={() => setIsCheatSheetOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
              >
                Close Cheat Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Audio Routing & Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0B101E] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Sliders size={20} className="text-purple-400" />
                <h3 className="text-base font-bold text-white font-sans">SOUNDBOARD ROUTING & BEHAVIOR</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Output Mode */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300">Audio Output Destination</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'Both PC & OBS', desc: 'Hear on PC + stream to OBS' },
                    { id: 'local', label: 'Local PC Only', desc: 'Desktop audio capture' },
                    { id: 'overlay', label: 'OBS Overlay Only', desc: 'Browser source audio' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSettings((prev) => ({ ...prev, outputMode: m.id as any }))}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        settings.outputMode === m.id
                          ? 'bg-purple-500/20 border-purple-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold">{m.label}</div>
                      <div className="text-[10px] opacity-70 mt-1">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Playback Mode: Overlap vs Solo */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300">Playback Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, playbackMode: 'overlap' }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.playbackMode === 'overlap'
                        ? 'bg-cyan-500/20 border-cyan-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">Polyphonic (Overlap)</div>
                    <div className="text-[10px] opacity-70 mt-1">Spamming keys plays multiple sounds simultaneously</div>
                  </button>

                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, playbackMode: 'solo' }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.playbackMode === 'solo'
                        ? 'bg-cyan-500/20 border-cyan-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">Solo (Cutoff)</div>
                    <div className="text-[10px] opacity-70 mt-1">Pressing a new sound cuts off the previous sound</div>
                  </button>
                </div>
              </div>

              {/* Visual Banner on OBS Overlay */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">Show Visual Banner on OBS Stream</div>
                  <div className="text-[11px] text-slate-400">
                    Displays animated sound effect banner with soundwaves on stream
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showVisualAlert}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showVisualAlert: e.target.checked }))}
                  className="w-4 h-4 accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Panic Shortcut */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">Panic Stop Key</div>
                  <div className="text-[11px] text-slate-400">Immediately mutes and stops all audio</div>
                </div>
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {settings.stopKeybind}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/soundboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: effectiveToken,
                      outputMode: settings.outputMode,
                      playbackMode: settings.playbackMode,
                      showVisualAlert: settings.showVisualAlert,
                      masterVolume: settings.masterVolume
                    })
                  });
                  setIsSettingsModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add / Edit Sound Pad Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#0B101E] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Plus size={20} className="text-cyan-400" />
                <h3 className="text-base font-bold text-white font-sans">
                  {editingItem ? 'EDIT SOUND PAD' : 'ADD NEW SOUND PAD'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Sound Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Airhorn Blast, Bruh..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-white outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sound Source Selector */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300">Sound Audio Source</label>
                <div className="flex border border-slate-800 rounded-xl p-1 bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setActiveTabType('presets')}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      activeTabType === 'presets' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Preset SFX
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabType('upload')}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      activeTabType === 'upload' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Upload MP3/WAV
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabType('url')}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                      activeTabType === 'url' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Direct URL
                  </button>
                </div>

                {/* Preset SFX Grid */}
                {activeTabType === 'presets' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-900">
                    {PRESET_SYNTH_SOUNDS.map((ps) => {
                      const selected = formData.soundUrl === ps.id;
                      return (
                        <button
                          key={ps.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              soundUrl: ps.id,
                              title: prev.title || ps.name,
                              category: ps.category,
                              color: ps.color,
                              iconName: ps.icon,
                              durationSeconds: ps.dur
                            }));
                            triggerSoundEffect('preview', ps.id, 0.8, 0.8);
                          }}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            selected
                              ? 'bg-cyan-500/20 border-cyan-400 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="font-bold text-[11px] truncate">{ps.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{ps.dur}s</div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Upload File */}
                {activeTabType === 'upload' && (
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(f);
                      }}
                      className="hidden"
                    />
                    <FolderUp size={24} className="mx-auto text-slate-400" />
                    <div className="text-xs font-bold text-white">
                      {uploadingFile ? 'Uploading sound clip...' : 'Choose an MP3, WAV, or OGG file (max 15MB)'}
                    </div>
                    {formData.soundUrl && !formData.soundUrl.startsWith('synth:') && (
                      <div className="text-[11px] font-mono text-emerald-400 truncate">
                        Selected: {formData.soundUrl}
                      </div>
                    )}
                    {uploadError && <div className="text-[11px] font-mono text-rose-400">{uploadError}</div>}
                    <button
                      type="button"
                      disabled={uploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      {uploadingFile ? 'Uploading...' : 'Browse Computer Files'}
                    </button>
                  </div>
                )}

                {/* URL Input */}
                {activeTabType === 'url' && (
                  <input
                    type="text"
                    value={formData.soundUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, soundUrl: e.target.value }))}
                    placeholder="https://example.com/sound.mp3 or /uploads/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-white outline-none font-mono text-xs"
                  />
                )}
              </div>

              {/* Volume & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>Pad Volume</span>
                    <span className="font-mono text-cyan-400">{Math.round(formData.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={formData.volume}
                    onChange={(e) => setFormData((prev) => ({ ...prev, volume: parseFloat(e.target.value) }))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 rounded bg-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>Duration (seconds)</span>
                    <span className="font-mono text-cyan-400">{formData.durationSeconds}s</span>
                  </div>
                  <input
                    type="number"
                    min="0.2"
                    max="30"
                    step="0.1"
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData((prev) => ({ ...prev, durationSeconds: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Theme Color</label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color: col }))}
                      className="w-6 h-6 rounded-full transition-transform"
                      style={{
                        backgroundColor: col,
                        transform: formData.color === col ? 'scale(1.25)' : 'scale(1)',
                        boxShadow: formData.color === col ? `0 0 10px ${col}` : undefined
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => triggerSoundEffect('test', formData.soundUrl, formData.volume, 0.8)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-mono text-xs flex items-center gap-1.5"
              >
                <Play size={13} />
                <span>Test Sound</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSound}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-cyan-500/20"
                >
                  {editingItem ? 'Save Changes' : 'Create Sound Pad'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
