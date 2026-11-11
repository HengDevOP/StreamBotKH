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
  GripVertical
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { triggerSoundEffect, stopAllActiveSounds, preloadAudioBatch } from '../../utils/soundboardSynth';

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
  '#FFFFFF',
  '#A3A3A3',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899'
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

  if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].includes(e.code)) {
    return { code: '', display: '' };
  }

  parts.push(keyPart);
  const display = parts.join(' + ');
  return { code: e.code, display };
}

export const SoundboardManager: React.FC<SoundboardManagerProps> = ({ streamerToken }) => {
  const { socket } = useSocket();
  const effectiveToken = streamerToken || 'demo_token';

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

  // Drag and Drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SoundboardItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-vine-boom.mp3',
    keybind: '',
    keybindCode: '',
    keybindDisplay: '',
    volume: 0.9,
    color: '#FFFFFF',
    iconName: 'Volume2',
    durationSeconds: 1.5,
    isLoop: false
  });

  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // References
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
        setItems(data.items || []);
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            masterVolume: typeof data.settings.masterVolume === 'number' ? data.settings.masterVolume : 0.8
          }));
        }
        const audioUrls = (data.items || []).map((it: SoundboardItem) => it.soundUrl).filter(Boolean);
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
        triggerSoundEffect(
          item.id,
          item.soundUrl,
          item.volume,
          settings.masterVolume,
          () => {
            setPlayingSoundIds((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
          }
        );
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
      const matched = currentItems.find((it) => it.keybindCode && it.keybindCode.toLowerCase() === e.code.toLowerCase());

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
      prev.map((it) => (it.id === itemId ? { ...it, keybind: code, keybindCode: code, keybindDisplay: display } : it))
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
      prev.map((it) => (it.id === itemId ? { ...it, keybind: '', keybindCode: '', keybindDisplay: '' } : it))
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

  const handleToggleListening = async () => {
    const nextState = !settings.isListening;
    setSettings((prev) => ({ ...prev, isListening: nextState }));
    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          isListening: nextState
        })
      });
    } catch (err) {
      console.error('Failed to toggle listening state:', err);
    }
  };

  const handleMasterVolumeChange = async (vol: number) => {
    setSettings((prev) => ({ ...prev, masterVolume: vol }));
    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          masterVolume: vol
        })
      });
    } catch (err) {
      console.error('Failed to update master volume:', err);
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
        setItems(data.items || []);
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

  // Add / Edit Sound Modal
  const openAddModal = () => {
    setEditingItem(null);
    const nextKeyNum = items.length + 1;
    setFormData({
      title: 'New Sound',
      category: 'Memes',
      soundUrl: '/sounds/memes/meme-vine-boom.mp3',
      keybind: `Digit${nextKeyNum}`,
      keybindCode: `Digit${nextKeyNum}`,
      keybindDisplay: `${nextKeyNum}`,
      volume: 0.9,
      color: '#FFFFFF',
      iconName: 'Volume2',
      durationSeconds: 1.5,
      isLoop: false
    });
    setCustomAudioFile(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: SoundboardItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category || 'Memes',
      soundUrl: item.soundUrl,
      keybind: item.keybind,
      keybindCode: item.keybindCode,
      keybindDisplay: item.keybindDisplay,
      volume: item.volume,
      color: item.color || '#FFFFFF',
      iconName: item.iconName || 'Volume2',
      durationSeconds: item.durationSeconds || 1.5,
      isLoop: item.isLoop || false
    });
    setCustomAudioFile(null);
    setIsAddModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this sound pad?')) return;
    setItems((prev) => prev.filter((it) => it.id !== itemId));
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

  const handleCustomAudioUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('category', 'audio');

      const res = await fetch('/api/media', { method: 'POST', body: uploadData });
      const data = await res.json();
      if (data.success && data.media?.url) {
        setFormData((prev) => ({
          ...prev,
          soundUrl: data.media.url,
          title: prev.title === 'New Sound' ? file.name.replace(/\.[^/.]+$/, '') : prev.title
        }));
      } else {
        alert(data.error || 'Failed to upload audio file.');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSound = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a sound title.');
      return;
    }

    try {
      const payload: any = {
        token: effectiveToken,
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

      if (editingItem) {
        payload.action = 'update_item';
        payload.item = { ...payload, id: editingItem.id };
      } else {
        payload.action = 'add_item';
      }

      const res = await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        fetchSoundboard();
      } else {
        alert(data.error || 'Failed to save sound pad.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error saving sound.');
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

  return (
    <div className="space-y-6">
      {/* 1. Main Header Card */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">Soundboard</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-[#262626]">
                Overlay Widget
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Assign keyboard hotkeys to trigger sound effects instantly on PC and broadcast them to OBS Studio.
            </p>
          </div>

          {/* Quick Controls Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Listener Toggle */}
            <button
              onClick={handleToggleListening}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                settings.isListening
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-neutral-900 border-[#262626] text-neutral-400'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  settings.isListening ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
                }`}
              />
              <span>{settings.isListening ? 'Key Listener Active' : 'Key Listener Paused'}</span>
            </button>

            {/* Hotkey Cheat Sheet */}
            <button
              onClick={() => setIsCheatSheetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-xs text-neutral-300 hover:text-white transition-colors"
            >
              <Keyboard size={13} className="text-neutral-400" />
              <span>Hotkeys</span>
            </button>

            {/* Audio Routing */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-xs text-neutral-300 hover:text-white transition-colors"
            >
              <Sliders size={13} className="text-neutral-400" />
              <span>Routing</span>
            </button>

            {/* Master Volume */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181818] border border-[#262626] text-xs text-neutral-300">
              <Volume2 size={14} className="text-neutral-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-white cursor-pointer h-1 rounded"
              />
              <span className="font-mono text-[11px] w-8 text-right text-neutral-400">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>

            {/* Stop All Button */}
            <button
              onClick={handleStopAll}
              title="Stop all currently playing sounds immediately (ESC)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition-colors"
            >
              <Square size={12} className="fill-red-400 text-red-400" />
              <span>Stop All (ESC)</span>
            </button>

            {/* Add Sound Button */}
            <button
              onClick={openAddModal}
              disabled={items.length >= 9}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                items.length >= 9
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-[#262626]'
                  : 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
              }`}
            >
              <Plus size={14} />
              <span>{items.length >= 9 ? 'Max 9 Pads' : 'Add Sound'}</span>
            </button>
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

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-[#141414] border border-[#262626] text-neutral-400 hover:text-white hover:border-neutral-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar & Reset Defaults */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search sounds or hotkeys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] focus:border-neutral-400 text-xs text-white placeholder-neutral-500 outline-none"
            />
          </div>

          <button
            onClick={handleResetDefaults}
            title="Restore default sounds"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#262626] hover:border-neutral-500 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Recording Prompt Pill if active */}
      {recordingItemId && (
        <div className="p-3.5 rounded-xl bg-[#1c1c1c] border border-white text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5">
            <Keyboard size={16} />
            <span className="text-xs font-medium">Press any key on your PC keyboard (e.g. 1, Space, F1, Alt+Q)...</span>
          </div>
          <button
            onClick={() => setRecordingItemId(null)}
            className="px-2.5 py-1 rounded bg-[#2a2a2a] text-xs text-neutral-300 hover:text-white cursor-pointer"
          >
            Cancel (ESC)
          </button>
        </div>
      )}

      {/* 3. Sound Pads Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-neutral-400">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading soundboard...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#141414] border border-[#262626] text-center space-y-3">
          <VolumeX size={32} className="mx-auto text-neutral-600" />
          <div className="text-sm font-semibold text-white">No sound pads found</div>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery
              ? `No sounds match "${searchQuery}". Try a different keyword.`
              : 'Add your first sound pad using the button above or reset to defaults.'}
          </p>
          <button
            onClick={openAddModal}
            disabled={items.length >= 9}
            className={`px-3.5 py-2 rounded-lg font-medium text-xs inline-flex items-center gap-1.5 ${
              items.length >= 9
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-[#262626]'
                : 'bg-white hover:bg-neutral-200 text-black cursor-pointer'
            }`}
          >
            <Plus size={14} />
            <span>Add Sound Pad</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item, index) => {
            const isPlaying = playingSoundIds.has(item.id);
            const isRecordingThis = recordingItemId === item.id;
            const isBeingDragged = draggedIndex === index;
            const isDraggedOver = dragOverIndex === index;

            return (
              <div
                key={item.id}
                draggable={!recordingItemId}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative rounded-xl p-4 transition-all duration-200 border flex flex-col justify-between select-none ${
                  isBeingDragged
                    ? 'opacity-30 border-dashed border-white bg-[#1a1a1a]'
                    : isDraggedOver
                    ? 'border-white bg-[#1e1e1e] scale-[1.01]'
                    : isPlaying
                    ? 'border-white bg-[#1a1a1a]'
                    : isRecordingThis
                    ? 'border-white bg-[#181818]'
                    : 'bg-[#141414] border-[#262626] hover:border-neutral-500'
                }`}
              >
                {/* Top Row: Drag Handle + Index Badge + Keybind Tag + Actions */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      title="Drag to reorder pad"
                      className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white transition-colors"
                    >
                      <GripVertical size={14} />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">
                      #{index + 1}
                    </span>
                    <button
                      onClick={() => setRecordingItemId(item.id)}
                      title="Click to assign hotkey"
                      className={`font-mono text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${
                        item.keybindDisplay
                          ? 'bg-[#1e1e1e] border border-[#333] text-neutral-200 hover:border-neutral-400'
                          : 'bg-[#181818] border border-dashed border-[#333] text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {item.keybindDisplay || '+ Key'}
                    </button>
                  </div>

                  {/* Edit & Delete Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keybindDisplay && (
                      <button
                        onClick={() => handleClearKeybind(item.id)}
                        title="Remove keybind"
                        className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(item)}
                      title="Edit sound pad"
                      className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete sound pad"
                      className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Center Content: Title, Category, Duration */}
                <div className="my-2 min-w-0">
                  <div className="text-sm font-semibold text-white truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                    <span className="capitalize">{item.category}</span>
                    <span>•</span>
                    <span>{item.durationSeconds || 1.5}s</span>
                  </div>
                </div>

                {/* Bottom Row: Play Button & Volume Slider */}
                <div className="pt-3 border-t border-[#262626] flex items-center justify-between gap-3 mt-2">
                  <button
                    onClick={() => handlePlaySound(item)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isPlaying
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                        : 'bg-white hover:bg-neutral-200 text-black'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square size={12} className="fill-current" />
                        <span>Playing...</span>
                      </>
                    ) : (
                      <>
                        <Play size={12} className="fill-current" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Volume2 size={13} className="text-neutral-500" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={item.volume}
                      onChange={(e) => handleItemVolumeChange(item.id, parseFloat(e.target.value))}
                      onMouseUp={(e) => handleCommitItemVolume(item.id, parseFloat((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => handleCommitItemVolume(item.id, parseFloat((e.target as HTMLInputElement).value))}
                      className="w-14 sm:w-16 accent-white cursor-pointer h-1 rounded"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Hotkey Cheat Sheet Modal */}
      {isCheatSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold text-white">Keyboard Hotkeys</h3>
              </div>
              <button
                onClick={() => setIsCheatSheetOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              When the PC Keyboard Listener is armed, pressing these keys will trigger sound effects instantly:
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#181818] border border-[#262626] text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-mono text-neutral-500">#{idx + 1}</span>
                    <span className="font-medium text-white truncate">{it.title}</span>
                  </div>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded shrink-0 ${
                      it.keybindDisplay
                        ? 'bg-[#222] border border-[#333] text-neutral-200'
                        : 'bg-neutral-900 text-neutral-500'
                    }`}
                  >
                    {it.keybindDisplay || 'No Key'}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-between text-xs text-neutral-400">
              <span>Panic Stop: <strong className="text-red-400 font-mono">ESC</strong></span>
              <button
                onClick={() => setIsCheatSheetOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Audio Routing & Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold text-white">Soundboard Audio Routing</h3>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Output Destination */}
              <div className="space-y-2">
                <label className="font-medium text-neutral-300">Audio Output Destination</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'both', label: 'PC & OBS', desc: 'Hear on PC + stream to OBS' },
                    { id: 'local', label: 'Local PC', desc: 'Desktop audio only' },
                    { id: 'overlay', label: 'OBS Only', desc: 'Browser source only' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSettings((prev) => ({ ...prev, outputMode: m.id as any }))}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                        settings.outputMode === m.id
                          ? 'bg-white text-black border-white'
                          : 'bg-[#181818] border-[#262626] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs">{m.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Banner on OBS */}
              <div className="p-3 rounded-lg bg-[#181818] border border-[#262626] flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Show Banner on OBS</div>
                  <div className="text-[11px] text-neutral-400">Display animated sound effect name on stream</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showVisualAlert}
                  onChange={(e) => setSettings((prev) => ({ ...prev, showVisualAlert: e.target.checked }))}
                  className="w-4 h-4 accent-white cursor-pointer"
                />
              </div>

              {/* Panic Shortcut Info */}
              <div className="p-3 rounded-lg bg-[#181818] border border-[#262626] flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">Panic Stop Key</div>
                  <div className="text-[11px] text-neutral-400">Instantly stops all playing sounds</div>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {settings.stopKeybind}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#262626] flex justify-end gap-2">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] text-neutral-300 hover:text-white text-xs cursor-pointer"
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
                className="px-4 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add / Edit Sound Pad Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4 text-white max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Volume2 size={18} className="text-neutral-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingItem ? 'Edit Sound Pad' : 'New Sound Pad'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Sound Title */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Sound Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Vine Boom"
                  className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#181818] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-400 cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sound Audio Source */}
              <div className="space-y-2">
                <label className="font-medium text-neutral-300">Choose Sound from Built-in Library</label>
                <div className="max-h-36 overflow-y-auto space-y-1 bg-[#181818] border border-[#262626] rounded-lg p-2">
                  {PRESET_SYNTH_SOUNDS.map((s) => {
                    const isSelected = formData.soundUrl === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            soundUrl: s.id,
                            title: formData.title === 'New Sound' ? s.name : formData.title,
                            durationSeconds: s.dur,
                            category: s.category
                          })
                        }
                        className={`p-2 rounded-md flex items-center justify-between text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-white text-black font-semibold'
                            : 'hover:bg-[#222] text-neutral-300'
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerSoundEffect('preview', s.id, formData.volume, 0.8);
                          }}
                          className={`p-1 rounded ${
                            isSelected ? 'text-black hover:opacity-75' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Play size={11} className="fill-current" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload Custom MP3 */}
              <div className="space-y-1.5">
                <label className="font-medium text-neutral-300">Or Upload Custom Audio (MP3, WAV)</label>
                <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-[#262626] hover:border-neutral-400 bg-[#181818] cursor-pointer text-neutral-400 hover:text-white transition-colors">
                  <FolderUp size={15} />
                  <span>{isUploading ? 'Uploading...' : customAudioFile ? customAudioFile.name : 'Choose audio file'}</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCustomAudioFile(file);
                        handleCustomAudioUpload(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Volume */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-neutral-300">Pad Volume</label>
                  <span className="text-neutral-400">{Math.round(formData.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: parseFloat(e.target.value) })}
                  className="w-full accent-white cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => triggerSoundEffect('test', formData.soundUrl, formData.volume, 0.8)}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-neutral-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={11} className="fill-current" />
                <span>Test Sound</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#222] border border-[#262626] text-neutral-300 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSound}
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Create Pad'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
