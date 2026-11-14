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
  Search,
  X,
  FolderUp,
  GripVertical,
  PanelRight,
  Eye,
  EyeOff,
  Smile,
  Flame,
  Sparkles,
  Zap,
  Trophy,
  AlertCircle,
  Bell,
  Skull,
  Crosshair,
  Mic,
  Frown,
  Activity,
  Megaphone,
  Music,
  TrendingUp,
  Radio,
  DollarSign
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import {
  triggerSoundEffect,
  stopAllActiveSounds,
  preloadAudioBatch
} from '../../utils/soundboardSynth';
import { SoundboardSkeleton } from './DashboardSkeleton';
import { MediaPickerModal } from './MediaPickerModal';
import { MediaItem } from './MediaLibraryManager';

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

export interface SoundboardManagerProps {
  streamerToken?: string;
  isRightbarOpen?: boolean;
  onToggleRightbar?: () => void;
  onCloseRightbar?: () => void;
}

const MAX_SOUNDBOARD_PADS = 18;

const CATEGORIES = [
  'All',
  'Laugh',
  'Ohhhhh',
  'Memes',
  'Gaming',
  'Reactions',
  'Alerts',
  'Custom'
] as const;

const PAD_ICONS: Record<string, React.ComponentType<any>> = {
  Volume2,
  Smile,
  Flame,
  Sparkles,
  Zap,
  Trophy,
  AlertCircle,
  Bell,
  Skull,
  Crosshair,
  Mic,
  Frown,
  Activity,
  Megaphone,
  Music,
  TrendingUp,
  Radio,
  DollarSign
};

const ICON_OPTIONS = Object.keys(PAD_ICONS);

const COLOR_OPTIONS = [
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#E2E8F0'
];

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
  { id: '/sounds/memes/meme-john-cena.mp3', name: 'John Cena', category: 'Memes', icon: 'Trophy', color: '#10B981', dur: 5.0 },
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

  if (
    [
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'ShiftLeft',
      'ShiftRight',
      'MetaLeft',
      'MetaRight'
    ].includes(e.code)
  ) {
    return { code: '', display: '' };
  }

  parts.push(keyPart);
  const display = parts.join(' + ');
  return { code: e.code, display };
}

export const SoundboardManager: React.FC<SoundboardManagerProps> = ({
  streamerToken,
  isRightbarOpen: controlledIsRightbarOpen,
  onToggleRightbar,
  onCloseRightbar
}) => {
  const { socket } = useSocket();
  const effectiveToken = streamerToken || 'demo_token';

  // Rightbar state
  const [internalRightbarOpen, setInternalRightbarOpen] = useState(true);
  const isRightbarOpen =
    controlledIsRightbarOpen !== undefined ? controlledIsRightbarOpen : internalRightbarOpen;

  const toggleRightbar = () => {
    if (onToggleRightbar) {
      onToggleRightbar();
    } else {
      setInternalRightbarOpen((prev) => !prev);
    }
  };

  const closeRightbar = () => {
    if (onCloseRightbar) {
      onCloseRightbar();
    } else {
      setInternalRightbarOpen(false);
    }
  };

  const [activeRightbarTab, setActiveRightbarTab] = useState<'pad' | 'routing' | 'hotkeys'>('pad');

  const [items, setItems] = useState<SoundboardItem[]>([]);
  const [settings, setSettings] = useState<SoundboardSettings>({
    id: '',
    token: effectiveToken,
    masterVolume: 0.8,
    isListening: true,
    outputMode: 'both',
    playbackMode: 'solo',
    showVisualAlert: true,
    stopKeybind: 'Escape'
  });

  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordingItemId, setRecordingItemId] = useState<string | null>(null);
  const [playingSoundIds, setPlayingSoundIds] = useState<Set<string>>(new Set());
  const [copiedObs, setCopiedObs] = useState(false);
  const [showOverlayToken, setShowOverlayToken] = useState(false);

  // Drag and Drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Selected / Editing item in Rightbar Pad Editor
  const [editingItem, setEditingItem] = useState<SoundboardItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: 'New Sound',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-vine-boom.mp3',
    keybind: 'Digit1',
    keybindCode: 'Digit1',
    keybindDisplay: '1',
    volume: 0.9,
    color: '#F59E0B',
    iconName: 'Flame',
    durationSeconds: 1.5,
    isLoop: false
  });

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [selectedMediaName, setSelectedMediaName] = useState<string>('');
  const [isSavingPad, setIsSavingPad] = useState(false);

  const itemsRef = useRef<SoundboardItem[]>([]);
  itemsRef.current = items;
  const settingsRef = useRef<SoundboardSettings>(settings);
  settingsRef.current = settings;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const obsUrl = `${origin}/overlay/soundboard/${effectiveToken}`;

  const handleCopyObs = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedObs(true);
    setTimeout(() => setCopiedObs(false), 2000);
  };

  // 1. Fetch Soundboard Items and Settings
  const fetchSoundboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/soundboard?token=${effectiveToken}`);
      const data = await res.json();
      if (data.success) {
        const fetchedItems: SoundboardItem[] = data.items || [];
        setItems(fetchedItems);
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            masterVolume:
              typeof data.settings.masterVolume === 'number' ? data.settings.masterVolume : 0.8
          }));
        }
        const audioUrls = fetchedItems.map((it) => it.soundUrl).filter(Boolean);
        preloadAudioBatch(audioUrls);
      }
    } catch (err) {
      console.error('[Soundboard] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveToken]);

  useEffect(() => {
    fetchSoundboard();
  }, [fetchSoundboard]);

  // 2. Play / Stop Sound Handler
  const handlePlaySound = useCallback(
    (item: SoundboardItem) => {
      if (playingSoundIds.has(item.id)) {
        stopAllActiveSounds();
        setPlayingSoundIds(new Set());
        if (socket && (settings.outputMode === 'overlay' || settings.outputMode === 'both')) {
          socket.emit('soundboard:stop', { token: effectiveToken });
        }
        return;
      }

      stopAllActiveSounds();
      setPlayingSoundIds(new Set([item.id]));

      if (settings.outputMode === 'local' || settings.outputMode === 'both') {
        triggerSoundEffect(item.id, item.soundUrl, item.volume, settings.masterVolume, () => {
          setPlayingSoundIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        });
      }

      if (socket && (settings.outputMode === 'overlay' || settings.outputMode === 'both')) {
        socket.emit('soundboard:play', {
          token: effectiveToken,
          itemId: item.id,
          title: item.title,
          soundUrl: item.soundUrl,
          volume: item.volume,
          masterVolume: settings.masterVolume,
          color: item.color,
          iconName: item.iconName,
          durationSeconds: item.durationSeconds
        });
      }
    },
    [playingSoundIds, settings, effectiveToken, socket]
  );

  const handleStopAll = useCallback(() => {
    stopAllActiveSounds();
    setPlayingSoundIds(new Set());
    if (socket) {
      socket.emit('soundboard:stop', { token: effectiveToken });
    }
  }, [socket, effectiveToken]);

  // 3. Global Keyboard Hotkey Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

      if (recordingItemId) {
        e.preventDefault();
        e.stopPropagation();

        if (e.code === 'Escape') {
          setRecordingItemId(null);
          return;
        }

        const formatted = formatKeybind(e);
        if (!formatted.code) return;

        handleSaveKeybind(recordingItemId, formatted.code, formatted.display);
        setRecordingItemId(null);
        return;
      }

      if (isInput) return;

      if (e.code === settingsRef.current.stopKeybind || e.code === 'Escape') {
        e.preventDefault();
        handleStopAll();
        return;
      }

      if (!settingsRef.current.isListening) return;

      const currentItems = itemsRef.current;
      const matched = currentItems.find(
        (it) => it.keybindCode && it.keybindCode.toLowerCase() === e.code.toLowerCase()
      );

      if (matched) {
        e.preventDefault();
        handlePlaySound(matched);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingItemId, handlePlaySound, handleStopAll]);

  // 4. Save Keybind
  const handleSaveKeybind = async (itemId: string, code: string, display: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, keybind: code, keybindCode: code, keybindDisplay: display } : it
      )
    );

    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_item',
          token: effectiveToken,
          item: { id: itemId, keybind: code, keybindCode: code, keybindDisplay: display }
        })
      });
    } catch (err) {
      console.error('Failed to save keybind:', err);
    }
  };

  const handleClearKeybind = async (itemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, keybind: '', keybindCode: '', keybindDisplay: '' } : it
      )
    );

    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_item',
          token: effectiveToken,
          item: { id: itemId, keybind: '', keybindCode: '', keybindDisplay: '' }
        })
      });
    } catch (err) {
      console.error('Failed to clear keybind:', err);
    }
  };

  const handleUpdateSettings = async (partial: Partial<SoundboardSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          masterVolume: next.masterVolume,
          isListening: next.isListening,
          outputMode: next.outputMode,
          playbackMode: next.playbackMode,
          showVisualAlert: next.showVisualAlert,
          stopKeybind: next.stopKeybind
        })
      });
    } catch (err) {
      console.error('Failed to update soundboard settings:', err);
    }
  };

  const handleItemVolumeChange = (itemId: string, volume: number) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, volume } : it)));
  };

  const handleCommitItemVolume = async (itemId: string, volume: number) => {
    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_item',
          token: effectiveToken,
          item: { id: itemId, volume }
        })
      });
    } catch (err) {
      console.error('Failed to commit volume:', err);
    }
  };

  // Reset to default sounds
  const handleResetDefaults = async () => {
    if (!confirm('Reset soundboard to the default 9 sounds? Custom items will be replaced.')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_defaults', token: effectiveToken })
      });
      const data = await res.json();
      if (data.success) {
        await fetchSoundboard();
      }
    } catch (err) {
      console.error('Failed to reset defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (_e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newItems = [...items];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    const updatedWithOrder = newItems.map((it, idx) => ({ ...it, sortOrder: idx }));
    setItems(updatedWithOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder_items',
          token: effectiveToken,
          itemIds: updatedWithOrder.map((it) => it.id),
          orderedIds: updatedWithOrder.map((it) => it.id)
        })
      });
    } catch (err) {
      console.error('Failed to save reordered soundboard:', err);
    }
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Open Rightbar in Add New Pad mode
  const openAddPadInRightbar = () => {
    setEditingItem(null);
    const nextKeyNum = items.length + 1;
    const defaultColor = COLOR_OPTIONS[items.length % COLOR_OPTIONS.length] || '#F59E0B';
    setFormData({
      title: 'New Sound',
      category: 'Memes',
      soundUrl: '/sounds/memes/meme-vine-boom.mp3',
      keybind: nextKeyNum <= 9 ? `Digit${nextKeyNum}` : '',
      keybindCode: nextKeyNum <= 9 ? `Digit${nextKeyNum}` : '',
      keybindDisplay: nextKeyNum <= 9 ? `${nextKeyNum}` : '',
      volume: 0.9,
      color: defaultColor,
      iconName: 'Flame',
      durationSeconds: 1.5,
      isLoop: false
    });
    setSelectedMediaName('');
    setActiveRightbarTab('pad');
    if (!isRightbarOpen) {
      toggleRightbar();
    }
  };

  // Open Rightbar in Edit Pad mode
  const openEditPadInRightbar = (item: SoundboardItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category || 'Memes',
      soundUrl: item.soundUrl,
      keybind: item.keybind,
      keybindCode: item.keybindCode,
      keybindDisplay: item.keybindDisplay,
      volume: item.volume,
      color: item.color || '#F59E0B',
      iconName: item.iconName || 'Volume2',
      durationSeconds: item.durationSeconds || 1.5,
      isLoop: item.isLoop || false
    });
    const isBuiltIn = PRESET_SYNTH_SOUNDS.some((s) => s.id === item.soundUrl);
    setSelectedMediaName(
      !isBuiltIn && item.soundUrl
        ? item.soundUrl.split('/').pop() || item.title
        : ''
    );
    setActiveRightbarTab('pad');
    if (!isRightbarOpen) {
      toggleRightbar();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this sound pad?')) return;
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    if (editingItem?.id === itemId) {
      setEditingItem(null);
    }
    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_item', token: effectiveToken, itemId })
      });
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleSaveSound = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a sound title.');
      return;
    }

    if (!editingItem && items.length >= MAX_SOUNDBOARD_PADS) {
      alert(`Maximum limit of ${MAX_SOUNDBOARD_PADS} soundboard pads reached.`);
      return;
    }

    setIsSavingPad(true);
    try {
      const itemData = {
        id: editingItem?.id,
        title: formData.title.trim(),
        category: formData.category,
        soundUrl: formData.soundUrl,
        keybind: formData.keybindCode,
        keybindCode: formData.keybindCode,
        keybindDisplay: formData.keybindDisplay,
        volume: formData.volume,
        color: formData.color,
        iconName: formData.iconName,
        durationSeconds: formData.durationSeconds,
        isLoop: formData.isLoop
      };

      const payload: any = {
        token: effectiveToken,
        action: editingItem ? 'update_item' : 'add_item',
        item: itemData,
        ...itemData
      };

      const res = await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await fetchSoundboard();
        if (!editingItem) {
          openAddPadInRightbar();
        }
      } else {
        alert(data.error || 'Failed to save sound pad.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error saving sound.');
    } finally {
      setIsSavingPad(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((it) => {
    const matchesCat = selectedCategory === 'All' || it.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (it.keybindDisplay && it.keybindDisplay.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const renderPadIcon = (iconName: string, color: string, size = 16) => {
    const IconComp = PAD_ICONS[iconName] || Volume2;
    return <IconComp size={size} style={{ color: color || '#F59E0B' }} />;
  };

  if (loading && items.length === 0) {
    return <SoundboardSkeleton />;
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 w-full h-full overflow-hidden relative">
      {/* ============================================================== */}
      {/* LEFT MAIN WORKSPACE: SOUNDBOARD DECK + BOTTOM OBS SOURCE BAR   */}
      {/* ============================================================== */}
      <div className="flex-1 min-w-0 bg-[#0B0F19] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden min-h-[480px]">
        {/* Top Header Bar */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Volume2 size={15} className="text-slate-300 shrink-0" />
            <span className="text-xs font-semibold text-white truncate">Soundboard Deck</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
              {items.length}/{MAX_SOUNDBOARD_PADS} Pads
            </span>
            <button
              type="button"
              onClick={() => handleUpdateSettings({ isListening: !settings.isListening })}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1.5 transition-colors cursor-pointer ${
                settings.isListening
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
              title="Toggle PC keyboard hotkey listener"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  settings.isListening ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>{settings.isListening ? 'KEYS ACTIVE' : 'KEYS PAUSED'}</span>
            </button>
          </div>

          {/* Right Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Master Volume */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Volume2 size={13} className="text-slate-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) =>
                  handleUpdateSettings({ masterVolume: parseFloat(e.target.value) })
                }
                className="w-16 accent-slate-200 cursor-pointer h-1 rounded"
              />
              <span className="font-mono text-[10px] w-7 text-right text-slate-300">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>

            {/* Stop All Button */}
            <button
              type="button"
              onClick={handleStopAll}
              className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Stop all playing sounds (ESC)"
            >
              <Square size={11} className="fill-current" />
              <span>Stop (ESC)</span>
            </button>

            {/* Add Sound Pad Button (Up to 18) */}
            <button
              type="button"
              onClick={openAddPadInRightbar}
              disabled={items.length >= MAX_SOUNDBOARD_PADS}
              className="px-3 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={13} />
              <span>
                {items.length >= MAX_SOUNDBOARD_PADS
                  ? `Max ${MAX_SOUNDBOARD_PADS} Pads`
                  : 'Add Sound'}
              </span>
            </button>

            {!isRightbarOpen && (
              <button
                type="button"
                onClick={toggleRightbar}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Soundboard Configuration"
              >
                <PanelRight size={13} />
                <span className="hidden sm:inline">Config</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter & Search Sub-Bar */}
        <div className="px-4 py-2.5 border-b border-slate-800/80 bg-[#0B0F19] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 sm:w-52">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                placeholder="Search pad or hotkey..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              title="Reset to default 9 sounds"
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Recording Prompt Banner if active */}
        {recordingItemId && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <Keyboard size={15} className="text-amber-400 animate-pulse" />
              <span>
                Press any key on your keyboard to bind (e.g. <strong>1</strong>, <strong>F1</strong>,{' '}
                <strong>Alt+Q</strong>)...
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRecordingItemId(null)}
              className="px-2.5 py-1 rounded bg-slate-800 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel (ESC)
            </button>
          </div>
        )}

        {/* Main Scrollable Sound Pads Grid (Up to 18 Pads) */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length === 0 ? (
            <div className="h-full min-h-[260px] rounded-xl bg-[#090D16] border border-slate-800/80 flex flex-col items-center justify-center p-8 text-center gap-3">
              <VolumeX size={28} className="text-slate-600" />
              <div className="text-sm font-semibold text-white">No sound pads found</div>
              <p className="text-xs text-slate-400 max-w-sm">
                {searchQuery
                  ? `No sounds match "${searchQuery}". Try another keyword.`
                  : 'Click "Add Sound" to create up to 18 custom sound pads.'}
              </p>
              {items.length < MAX_SOUNDBOARD_PADS && (
                <button
                  type="button"
                  onClick={openAddPadInRightbar}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Sound Pad</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredItems.map((item, index) => {
                const isPlaying = playingSoundIds.has(item.id);
                const isRecordingThis = recordingItemId === item.id;
                const isBeingDragged = draggedIndex === index;
                const isDraggedOver = dragOverIndex === index;
                const isEditingThis = editingItem?.id === item.id;
                const padColor = item.color || '#F59E0B';

                return (
                  <div
                    key={item.id}
                    draggable={!recordingItemId}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl p-3.5 transition-all duration-150 border flex flex-col justify-between select-none ${
                      isBeingDragged
                        ? 'opacity-40 border-dashed border-slate-500 bg-slate-900'
                        : isDraggedOver
                        ? 'border-slate-400 bg-slate-900'
                        : isPlaying
                        ? 'border-emerald-500/60 bg-slate-900/90'
                        : isEditingThis
                        ? 'border-slate-500 bg-slate-900/70'
                        : isRecordingThis
                        ? 'border-amber-400 bg-slate-900'
                        : 'bg-[#090D16] border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Drag Handle + Index + Keybind + Edit/Delete */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          title="Drag to reorder pad"
                          className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <GripVertical size={13} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">#{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => setRecordingItemId(item.id)}
                          title="Click to assign keyboard shortcut"
                          className={`font-mono text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            isRecordingThis
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : item.keybindDisplay
                              ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                              : 'bg-slate-950 border-dashed border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {isRecordingThis ? 'Press key...' : item.keybindDisplay || '+ Key'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.keybindDisplay && (
                          <button
                            type="button"
                            onClick={() => handleClearKeybind(item.id)}
                            title="Clear keybind"
                            className="p-1 rounded text-slate-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditPadInRightbar(item)}
                          title="Edit pad in rightbar"
                          className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          title="Delete sound pad"
                          className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Pad Icon Badge + Title & Category */}
                    <div className="flex items-center gap-3 my-1.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${padColor}18`,
                          borderColor: `${padColor}45`
                        }}
                      >
                        {renderPadIcon(item.iconName, padColor, 17)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-xs font-semibold text-white truncate"
                          title={item.title}
                        >
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <span className="truncate">{item.category}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">
                            {item.durationSeconds || 1.5}s
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Play Trigger & Volume Slider */}
                    <div className="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => handlePlaySound(item)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          isPlaying
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                            : 'bg-white hover:bg-slate-200 text-slate-950'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square size={11} className="fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play size={11} className="fill-current" />
                            <span>Play</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Volume2 size={12} className="text-slate-500" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={item.volume}
                          onChange={(e) =>
                            handleItemVolumeChange(item.id, parseFloat(e.target.value))
                          }
                          onMouseUp={(e) =>
                            handleCommitItemVolume(
                              item.id,
                              parseFloat((e.target as HTMLInputElement).value)
                            )
                          }
                          onTouchEnd={(e) =>
                            handleCommitItemVolume(
                              item.id,
                              parseFloat((e.target as HTMLInputElement).value)
                            )
                          }
                          className="w-14 accent-slate-200 cursor-pointer h-1 rounded"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quick Add Pad Slot Card when under 18 pads */}
              {items.length < MAX_SOUNDBOARD_PADS && selectedCategory === 'All' && !searchQuery && (
                <button
                  type="button"
                  onClick={openAddPadInRightbar}
                  className="rounded-xl p-4 border border-dashed border-slate-800 hover:border-slate-600 bg-[#090D16]/50 hover:bg-[#090D16] text-slate-400 hover:text-white transition-colors flex flex-col items-center justify-center gap-2 min-h-[138px] cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Plus size={15} />
                  </div>
                  <div className="text-xs font-semibold">Add Sound Pad</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Slot {items.length + 1} of {MAX_SOUNDBOARD_PADS}
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom OBS Source URL Dock Bar */}
        <div className="p-3.5 border-t border-slate-800/80 bg-[#090D16] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline">
              OBS SOURCE URL:
            </span>
            <div className="flex-1 flex items-center rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 overflow-hidden min-w-0">
              <span className="text-xs font-mono text-slate-300 select-all truncate">
                {showOverlayToken
                  ? obsUrl
                  : `${obsUrl.split('/overlay/soundboard/')[0]}/overlay/soundboard/••••••••••••••••`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowOverlayToken(!showOverlayToken)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title={showOverlayToken ? 'Hide token' : 'Show token'}
            >
              {showOverlayToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyObs}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedObs ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedObs ? 'Copied URL' : 'Copy OBS URL'}</span>
            </button>

            <a
              href={obsUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Open Soundboard Overlay in New Tab"
            >
              <ExternalLink size={13} />
              <span>Popup</span>
            </a>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MOBILE BACKDROP OVERLAY                                        */}
      {/* ============================================================== */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity duration-300 ease-in-out ${
          isRightbarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeRightbar}
      />

      {/* ============================================================== */}
      {/* ANIMATED RIGHTBAR: PAD EDITOR, AUDIO ROUTING & HOTKEYS         */}
      {/* ============================================================== */}
      <div
        className={`fixed lg:static top-0 right-0 bottom-0 z-50 lg:z-auto w-full max-w-[390px] lg:max-w-none shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out ${
          isRightbarOpen
            ? 'translate-x-0 lg:w-[360px] xl:w-[400px] lg:opacity-100 pointer-events-auto'
            : 'translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:-ml-4 pointer-events-none'
        }`}
      >
        <aside className="w-full max-w-[390px] lg:max-w-none lg:w-[360px] xl:w-[400px] bg-[#0B0F19] border-l lg:border border-slate-800/80 lg:rounded-xl flex flex-col h-full overflow-hidden">
          {/* Rightbar Header */}
          <div className="px-4 py-3 border-b border-slate-800/80 bg-[#090D16] flex items-center justify-between gap-2 shrink-0">
            <div>
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Soundboard Configuration
              </h3>
              <p className="text-[11px] text-slate-400">
                Add up to {MAX_SOUNDBOARD_PADS} sound pads, icons, colors &amp; routing
              </p>
            </div>
            <button
              type="button"
              onClick={closeRightbar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Configuration"
            >
              <X size={15} />
            </button>
          </div>

          {/* Rightbar Section Tabs */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-[#090D16] border-b border-slate-800/80 shrink-0">
            {(
              [
                { id: 'pad', label: editingItem ? 'Edit Pad' : 'Add Pad' },
                { id: 'routing', label: 'Routing' },
                { id: 'hotkeys', label: 'Hotkeys' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRightbarTab(tab.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeRightbarTab === tab.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable Rightbar Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* TAB 1: ADD / EDIT SOUND PAD */}
            {activeRightbarTab === 'pad' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {editingItem ? `Editing: ${editingItem.title}` : 'Create New Sound Pad'}
                  </span>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={openAddPadInRightbar}
                      className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      + New Pad instead
                    </button>
                  )}
                </div>

                {/* Sound Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-medium block">Sound Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Vine Boom"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-600"
                  />
                </div>

                {/* Category & Pad Color */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-300 font-medium block">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-slate-600 cursor-pointer"
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-300 font-medium block">Pad Volume</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={formData.volume}
                        onChange={(e) =>
                          setFormData({ ...formData, volume: parseFloat(e.target.value) })
                        }
                        className="w-full accent-slate-200 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-slate-300 w-8 text-right">
                        {Math.round(formData.volume * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pad Color Swatches */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-medium block">Pad Color</label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COLOR_OPTIONS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: hex })}
                        className={`w-6 h-6 rounded-md border transition-transform cursor-pointer ${
                          formData.color.toLowerCase() === hex.toLowerCase()
                            ? 'scale-110 border-white ring-1 ring-white'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Pad Icon Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-medium block">Pad Icon</label>
                  <div className="grid grid-cols-6 gap-1.5 p-2 rounded-lg bg-[#090D16] border border-slate-800">
                    {ICON_OPTIONS.map((iconKey) => {
                      const isSelected = formData.iconName === iconKey;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setFormData({ ...formData, iconName: iconKey })}
                          title={iconKey}
                          className={`p-2 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 border-slate-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {renderPadIcon(
                            iconKey,
                            isSelected ? formData.color : '#94A3B8',
                            15
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Built-in Sound Library */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-medium block">
                    Built-in Sound Library ({PRESET_SYNTH_SOUNDS.length})
                  </label>
                  <div className="max-h-44 overflow-y-auto space-y-1 bg-[#090D16] border border-slate-800 rounded-lg p-1.5">
                    {PRESET_SYNTH_SOUNDS.map((s) => {
                      const isSelected = formData.soundUrl === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedMediaName('');
                            setFormData({
                              ...formData,
                              soundUrl: s.id,
                              title:
                                formData.title === 'New Sound' || !editingItem
                                  ? s.name
                                  : formData.title,
                              durationSeconds: s.dur,
                              category: s.category,
                              iconName: s.icon,
                              color: s.color
                            });
                          }}
                          className={`px-2.5 py-1.5 rounded-md flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-slate-800 text-white font-semibold border border-slate-600'
                              : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {renderPadIcon(s.icon, s.color, 13)}
                            <span className="truncate">{s.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerSoundEffect('preview', s.id, formData.volume, 0.8);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white shrink-0"
                            title="Preview sound"
                          >
                            <Play size={11} className="fill-current" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Choose Audio from Media Library */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-medium block">
                    Or Choose Audio from Media Library
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMediaPickerOpen(true)}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 hover:border-slate-500 bg-[#090D16] cursor-pointer text-slate-300 hover:text-white transition-colors"
                  >
                    <FolderUp size={14} className="shrink-0" />
                    <span className="truncate">
                      {selectedMediaName || 'Choose from Media Library'}
                    </span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      triggerSoundEffect('test', formData.soundUrl, formData.volume, 0.8)
                    }
                    className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play size={11} className="fill-current" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      isSavingPad || (!editingItem && items.length >= MAX_SOUNDBOARD_PADS)
                    }
                    onClick={handleSaveSound}
                    className="flex-1 py-2 px-4 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={13} />
                    <span>
                      {isSavingPad
                        ? 'Saving...'
                        : editingItem
                        ? 'Update Sound Pad'
                        : `Create Pad (${items.length}/${MAX_SOUNDBOARD_PADS})`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: AUDIO ROUTING SETTINGS */}
            {activeRightbarTab === 'routing' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-300 block">
                    Audio Output Destination
                  </label>
                  <div className="space-y-2">
                    {[
                      {
                        id: 'both',
                        label: 'PC & OBS Overlay',
                        desc: 'Hear locally on PC and broadcast to OBS Browser Source'
                      },
                      {
                        id: 'local',
                        label: 'Local PC Only',
                        desc: 'Play through your desktop audio only'
                      },
                      {
                        id: 'overlay',
                        label: 'OBS Overlay Only',
                        desc: 'Play inside OBS Browser Source only'
                      }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleUpdateSettings({ outputMode: m.id as any })}
                        className={`w-full p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          settings.outputMode === m.id
                            ? 'bg-slate-800 border-slate-600 text-white'
                            : 'bg-[#090D16] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-semibold text-xs text-white">{m.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <div className="font-medium text-xs text-white">Show Visual Banner on OBS</div>
                    <div className="text-[11px] text-slate-400">
                      Display sound pad title &amp; icon on stream when triggered
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showVisualAlert}
                    onChange={(e) =>
                      handleUpdateSettings({ showVisualAlert: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-white focus:ring-0"
                  />
                </label>

                <div className="p-3.5 rounded-xl bg-[#090D16] border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-xs text-white">Panic Stop Shortcut</div>
                    <div className="text-[11px] text-slate-400">
                      Instantly stops all active sounds
                    </div>
                  </div>
                  <span className="font-mono text-xs px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                    {settings.stopKeybind}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: KEYBOARD HOTKEYS LIST */}
            {activeRightbarTab === 'hotkeys' && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">
                  Click any keybind badge on a pad to assign a new shortcut.
                </p>
                <div className="space-y-1.5">
                  {items.map((it, idx) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#090D16] border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                        {renderPadIcon(it.iconName, it.color, 13)}
                        <span className="font-medium text-white truncate">{it.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecordingItemId(it.id)}
                        className={`font-mono text-[11px] px-2 py-0.5 rounded border shrink-0 cursor-pointer ${
                          recordingItemId === it.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : it.keybindDisplay
                            ? 'bg-slate-900 border-slate-700 text-slate-200'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        {recordingItemId === it.id
                          ? 'Press key...'
                          : it.keybindDisplay || 'Assign'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Media Library Audio Picker Modal */}
      {isMediaPickerOpen && (
        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => setIsMediaPickerOpen(false)}
          filterMode="audio"
          initialSection="uploads"
          currentUrl={formData.soundUrl}
          title="Choose Audio from Media Library"
          subtitle="Select an uploaded audio file from your library or pick from preset sounds."
          onSelect={(url: string, item?: MediaItem) => {
            const rawName =
              item?.filename || url.split('/').pop() || 'Custom Audio';
            const cleanTitle = rawName.replace(/\.[^/.]+$/, '');
            setSelectedMediaName(rawName);
            setFormData((prev) => ({
              ...prev,
              soundUrl: url,
              title: prev.title === 'New Sound' || !prev.title.trim() ? cleanTitle : prev.title
            }));
            setIsMediaPickerOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default SoundboardManager;
