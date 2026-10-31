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
  Music,
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
  // Synchronous single-playback guard (avoids stale state when spamming clicks / hotkeys)
  const currentPlayingIdRef = useRef<string | null>(null);
  const playbackClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Drag & Drop Reordering State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch data (strictly capped to 9 sound pads maximum)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/soundboard?token=${effectiveToken}`);
      const data = await res.json();
      if (data.success) {
        if (data.settings) setSettings(data.settings);
        if (data.items) {
          const limitedItems = (data.items as SoundboardItem[]).slice(0, 9);
          setItems(limitedItems);
        }
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

  // Pre-cache all pad audio into memory for instant, zero-latency playback
  useEffect(() => {
    if (items.length > 0) {
      preloadAudioBatch(items.map((it) => it.soundUrl));
    }
  }, [items]);

  // Drag & Drop Handlers for Pad Index Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (recordingItemId) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    const fromIndex = draggedIndex;
    setDraggedIndex(null);

    if (fromIndex === null || fromIndex === dropIndex) return;

    // Reorder items in state
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(dropIndex, 0, moved);

    const reordered = updated.slice(0, 9).map((it, idx) => ({
      ...it,
      sortOrder: idx + 1
    }));

    setItems(reordered);

    // Persist new ordering to database
    try {
      await fetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: effectiveToken,
          action: 'reorder_items',
          itemIds: reordered.map((it) => it.id)
        })
      });
    } catch (err) {
      console.error('[Soundboard] Failed to save pad order:', err);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const clearPlaybackState = useCallback((soundId?: string) => {
    if (soundId && currentPlayingIdRef.current !== soundId) return;
    currentPlayingIdRef.current = null;
    if (playbackClearTimerRef.current) {
      clearTimeout(playbackClearTimerRef.current);
      playbackClearTimerRef.current = null;
    }
    setPlayingSoundIds(new Set());
  }, []);

  // Stop the currently playing sound (local + OBS overlay)
  const stopCurrentSound = useCallback(() => {
    stopAllActiveSounds();
    clearPlaybackState();
    fetch('/api/soundboard/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: effectiveToken, action: 'stop' })
    }).catch(() => {});
  }, [effectiveToken, clearPlaybackState]);

  // Trigger Play Sound (from UI click or Keybind)
  // Single playback only: never overlap sounds.
  //  - Triggering the pad that is already playing stops it (toggle).
  //  - Triggering a different pad cuts off the current sound and plays the new one.
  const handlePlaySound = useCallback(
    (item: SoundboardItem) => {
      // 1. Same pad already playing -> toggle stop, do NOT play again
      if (currentPlayingIdRef.current === item.id) {
        stopCurrentSound();
        return;
      }

      // 2. Cut off anything currently playing before starting the new sound
      stopAllActiveSounds();
      if (playbackClearTimerRef.current) {
        clearTimeout(playbackClearTimerRef.current);
        playbackClearTimerRef.current = null;
      }
      currentPlayingIdRef.current = item.id;
      setPlayingSoundIds(new Set([item.id]));

      // 3. Local PC sound playback if enabled
      if (settings.outputMode === 'local' || settings.outputMode === 'both') {
        triggerSoundEffect(
          item.id,
          item.soundUrl,
          item.volume,
          settings.masterVolume,
          () => clearPlaybackState(item.id)
        );
      } else {
        // Local audio disabled: clear playing state after the pad duration
        playbackClearTimerRef.current = setTimeout(() => {
          clearPlaybackState(item.id);
        }, Math.max(1000, item.durationSeconds * 1000));
      }

      // 4. Emit / Send to OBS Browser Source if overlay enabled
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
    [effectiveToken, settings, stopCurrentSound, clearPlaybackState]
  );

  // Stop All Sounds (Panic Button)
  const handleStopAll = useCallback(() => {
    stopCurrentSound();
  }, [stopCurrentSound]);

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
        // Ignore OS key auto-repeat while a hotkey is held down (prevents spam re-triggers)
        if (e.repeat) return;
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
    if (!confirm('Reset soundboard to the 9 original stream sounds? Your custom sound pads will be replaced.')) {
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
    if (items.length >= 9) {
      alert('Soundboard is limited to 9 pads maximum. Please delete or edit an existing pad.');
      return;
    }
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

  // Render Icon helper - Volume icon used for all soundboards
  const renderIcon = (_name?: string, size = 20) => {
    return <Volume2 size={size} />;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Keybind Listener Bar (Fully Responsive) */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#090D18] border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-3 min-w-0">
            {/* Title & Badge */}
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-shrink-0 shadow-inner">
                <Volume2 size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-wide font-sans">
                    STREAM SOUNDBOARD & HOTKEY ENGINE
                  </h1>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex-shrink-0">
                    PC KEYBIND
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Assign keyboard hotkeys to play sound effects instantly on your PC and broadcast to OBS Studio.
                </p>
              </div>
            </div>

            {/* Listener Status Badge & Quick Tools */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
              <button
                onClick={handleToggleListening}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
                  settings.isListening
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                    : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    settings.isListening ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="truncate">
                  {settings.isListening ? 'PC KEYBOARD LISTENER: ARMED & ACTIVE' : 'KEYBOARD LISTENER: PAUSED'}
                </span>
                <span className="text-[10px] underline opacity-70 hidden sm:inline flex-shrink-0">
                  {settings.isListening ? '(Click to Pause)' : '(Click to Enable)'}
                </span>
              </button>

              <button
                onClick={() => setIsCheatSheetOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-300 hover:text-white transition-colors flex-shrink-0"
              >
                <Keyboard size={14} className="text-cyan-400 flex-shrink-0" />
                <span>Hotkey Cheat Sheet</span>
              </button>

              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs text-slate-300 hover:text-white transition-colors flex-shrink-0"
              >
                <Sliders size={14} className="text-purple-400 flex-shrink-0" />
                <span>Output & Audio Routing</span>
              </button>
            </div>
          </div>

          {/* Quick Actions & Panic Button (Responsive Grid on Mobile / Flex on Tablet & Desktop) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full xl:w-auto xl:justify-end pt-3 xl:pt-0 border-t border-slate-800/80 xl:border-t-0">
            {/* Master Volume Slider */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex-1 sm:flex-initial justify-between sm:justify-start min-w-[150px]">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 size={16} className="text-slate-400 flex-shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
                  className="w-16 sm:w-20 md:w-24 accent-cyan-400 cursor-pointer h-1.5 rounded-lg bg-slate-700"
                />
              </div>
              <span className="text-xs font-mono text-slate-300 w-9 text-right font-bold flex-shrink-0">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>

            {/* Pad Counter Badge */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono flex-shrink-0">
              <span className="text-slate-400">Pads:</span>
              <span className={items.length >= 9 ? 'text-amber-400 font-bold' : 'text-cyan-400 font-bold'}>
                {items.length}/9
              </span>
            </div>

            {/* Panic Stop Button */}
            <button
              onClick={handleStopAll}
              title="Stop all currently playing sounds immediately"
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 font-mono font-bold text-xs transition-all shadow-lg shadow-rose-500/10 flex-1 sm:flex-initial whitespace-nowrap"
            >
              <Square size={13} className="fill-rose-400 text-rose-400 flex-shrink-0" />
              <span>STOP ALL</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 font-bold">
                ESC
              </span>
            </button>

            {/* Add Sound Button (Max 9 Pads) */}
            <button
              onClick={openAddModal}
              disabled={items.length >= 9}
              title={items.length >= 9 ? 'Maximum limit of 9 soundboard pads reached' : 'Add new sound pad'}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all w-full sm:w-auto flex-shrink-0 whitespace-nowrap ${
                items.length >= 9
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 cursor-pointer'
              }`}
            >
              <Plus size={16} className="flex-shrink-0" />
              <span>{items.length >= 9 ? 'Max 9 Pads Reached' : 'Add Sound Pad'}</span>
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
            title="Restore default 9 sounds"
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
            disabled={items.length >= 9}
            className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 ${
              items.length >= 9
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer'
            }`}
          >
            <Plus size={14} />
            <span>{items.length >= 9 ? 'Max 9 Pads Reached' : 'Add Sound Pad'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredItems.map((item, index) => {
            const isPlaying = playingSoundIds.has(item.id);
            const isRecordingThis = recordingItemId === item.id;
            const itemColor = item.color || '#00F0FF';
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
                className={`relative group rounded-3xl p-4 sm:p-5 transition-all duration-300 border flex flex-col justify-between select-none cursor-default backdrop-blur-md overflow-hidden ${
                  isBeingDragged
                    ? 'opacity-30 scale-95 border-dashed border-cyan-400 bg-cyan-950/30'
                    : isDraggedOver
                    ? 'border-cyan-400 ring-2 ring-cyan-400/80 scale-[1.03] bg-[#0c182e] shadow-2xl shadow-cyan-500/20'
                    : isPlaying
                    ? 'scale-[1.02] bg-gradient-to-b from-[#131d33] to-[#0b101e]'
                    : isRecordingThis
                    ? 'border-cyan-400 ring-2 ring-cyan-400/60 bg-[#0E1526]'
                    : 'bg-gradient-to-b from-[#0f1527] to-[#080c18] border-slate-800/90 hover:border-slate-700 hover:from-[#131b31] hover:to-[#0a0f1e] hover:-translate-y-0.5 hover:shadow-xl'
                }`}
                style={{
                  borderColor: isPlaying ? itemColor : isRecordingThis ? '#00F0FF' : undefined,
                  boxShadow: isPlaying
                    ? `0 0 35px ${itemColor}45, 0 10px 30px rgba(0,0,0,0.7)`
                    : isBeingDragged
                    ? undefined
                    : `0 4px 20px rgba(0,0,0,0.35)`
                }}
              >
                {/* Subtle Top-Edge Bevel Highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

                {/* Subtle Ambient Color Glow inside the card */}
                <div
                  className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-opacity duration-500"
                  style={{
                    backgroundColor: itemColor,
                    opacity: isPlaying ? 0.35 : 0.08
                  }}
                />

                {/* Top Row: Drag Handle + Index Badge + Keybind Keycap + Category */}
                <div className="flex items-center justify-between gap-2 relative z-10 mb-4">
                  {/* Left: Drag Handle & Index Badge */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div
                      title="Drag to change soundboard pad index / position"
                      className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-lg hover:bg-slate-800/80 text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      <GripVertical size={14} />
                    </div>
                    <span className="font-mono text-[10px] font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md shadow-inner">
                      #{index + 1}
                    </span>
                  </div>

                  {/* Center: Tactile Mechanical Hotkey Keycap */}
                  <div className="flex items-center gap-1 min-w-0">
                    <button
                      onClick={() => setRecordingItemId(item.id)}
                      title="Click to bind a new key from your PC keyboard"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all truncate shadow-[0_2px_0_rgba(0,0,0,0.6)] active:translate-y-0.5 ${
                        isRecordingThis
                          ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/80 shadow-[0_0_15px_rgba(0,240,255,0.6)] animate-pulse'
                          : item.keybindDisplay
                          ? 'bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-cyan-400/70 text-slate-100 group-hover:text-white'
                          : 'bg-slate-900/70 border border-dashed border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-400'
                      }`}
                    >
                      <Keyboard size={12} className={item.keybindDisplay ? 'text-cyan-400 flex-shrink-0' : 'text-slate-500 flex-shrink-0'} />
                      <span className="truncate tracking-wider">{isRecordingThis ? 'PRESS KEY...' : item.keybindDisplay || '+ KEY'}</span>
                    </button>

                    {item.keybindDisplay && (
                      <button
                        onClick={(e) => handleClearKeybind(item.id, e)}
                        title="Clear keybind"
                        className="p-1 rounded-md hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Category Pill */}
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 flex-shrink-0 truncate max-w-[84px]">
                    {item.category}
                  </span>
                </div>

                {/* Center: Tactile Pad Icon + Title + Audio Spectrum */}
                <div
                  onClick={() => handlePlaySound(item)}
                  className="cursor-pointer flex flex-col items-center justify-center text-center py-4 px-2 rounded-2xl hover:bg-white/[0.03] transition-all relative z-10 group/btn active:scale-[0.98]"
                >
                  {/* Glowing Tactile Disc */}
                  <div className="relative mb-3.5">
                    {/* Pulsing ring when playing */}
                    {isPlaying && (
                      <div
                        className="absolute -inset-2 rounded-3xl opacity-40 animate-ping pointer-events-none"
                        style={{ backgroundColor: itemColor }}
                      />
                    )}

                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 relative z-10 shadow-lg ${
                        isPlaying ? 'scale-110' : 'group-hover/btn:scale-105'
                      }`}
                      style={{
                        backgroundColor: `${itemColor}15`,
                        border: `1.5px solid ${itemColor}${isPlaying ? 'CC' : '50'}`,
                        color: itemColor,
                        boxShadow: isPlaying
                          ? `0 0 25px ${itemColor}80, inset 0 0 15px ${itemColor}40`
                          : `0 4px 15px rgba(0,0,0,0.4)`
                      }}
                    >
                      {isPlaying ? (
                        <div className="flex items-end gap-1 h-7">
                          {[0.4, 0.9, 0.6, 1.0, 0.7].map((h, i) => (
                            <div
                              key={i}
                              className="w-1.5 rounded-full animate-pulse"
                              style={{
                                backgroundColor: itemColor,
                                height: `${h * 100}%`,
                                animationDuration: `${0.4 + i * 0.15}s`
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <Volume2 size={28} className="transition-transform group-hover/btn:scale-110" />
                      )}
                    </div>
                  </div>

                  {/* Sound Title */}
                  <div className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate max-w-full font-sans group-hover/btn:text-cyan-300 transition-colors">
                    {item.title}
                  </div>

                  {/* Audio Metadata Pill */}
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800/80">
                      ⏱ {item.durationSeconds.toFixed(1)}s
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800/80">
                      Vol {Math.round(item.volume * 100)}%
                    </span>
                  </div>
                </div>

                {/* Bottom Row Controls: Play/Stop + Edit + Delete */}
                <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2 relative z-10 mt-3">
                  <button
                    onClick={() => handlePlaySound(item)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-md active:scale-95 ${
                      isPlaying
                        ? 'bg-rose-500/20 border border-rose-500 text-rose-300 shadow-rose-500/20'
                        : 'bg-slate-900/90 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square size={13} className="fill-rose-400 text-rose-400" />
                        <span>STOP</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} style={{ color: itemColor }} className="fill-current" />
                        <span>PLAY</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openEditModal(item)}
                    title="Edit sound settings"
                    className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete pad"
                    className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-colors"
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

              {/* Playback Mode: Single playback enforced (no overlapping sounds) */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300">Playback Mode</label>
                <div className="p-3 rounded-xl border bg-cyan-500/10 border-cyan-500/50 text-white">
                  <div className="font-bold">Single Playback (No Overlap)</div>
                  <div className="text-[10px] opacity-70 mt-1">
                    Only one sound plays at a time. Pressing the same pad again stops it; pressing a different pad cuts off the current sound.
                  </div>
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

      {/* 6. Add / Edit Sound Pad Modal (Redesigned Studio Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#0B101E] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 relative overflow-hidden max-h-[92vh] flex flex-col">
            {/* Top Glow Accent responding to selected color */}
            <div
              className="absolute top-0 inset-x-0 h-1 transition-colors duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${formData.color}, transparent)`
              }}
            />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-2xl transition-colors duration-300 flex-shrink-0"
                  style={{
                    backgroundColor: `${formData.color}15`,
                    border: `1.5px solid ${formData.color}40`,
                    color: formData.color,
                    boxShadow: `0 0 15px ${formData.color}25`
                  }}
                >
                  <Volume2 size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-sans tracking-wide">
                    {editingItem ? 'EDIT SOUND PAD' : 'NEW SOUNDBOARD PAD'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure sound audio source, category, volume & visual styling
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1 scrollbar-thin scrollbar-thumb-slate-800">
              {/* Real-time Interactive Mini Pad Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{
                      backgroundColor: `${formData.color}20`,
                      border: `1.5px solid ${formData.color}60`,
                      color: formData.color,
                      boxShadow: `0 0 18px ${formData.color}35`
                    }}
                  >
                    <Volume2 size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold text-white truncate font-sans">
                      {formData.title.trim() || 'Untitled Sound Pad'}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                      <span className="uppercase font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                        {formData.category}
                      </span>
                      <span>•</span>
                      <span>⏱ {formData.durationSeconds}s</span>
                      <span>•</span>
                      <span>Vol {Math.round(formData.volume * 100)}%</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => triggerSoundEffect('preview', formData.soundUrl, formData.volume, 0.8)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  <Play size={12} className="fill-cyan-400 text-cyan-400" />
                  <span>Preview</span>
                </button>
              </div>

              {/* Title & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 flex items-center justify-between">
                    <span>Sound Title</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">Max 25 chars</span>
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Airhorn Blast, Bruh, GG..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 text-white outline-none font-sans text-xs transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 text-white outline-none font-sans text-xs cursor-pointer transition-colors"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sound Audio Source Selector */}
              <div className="space-y-2">
                <label className="font-bold text-slate-300">Audio Source</label>
                <div className="flex border border-slate-800/90 rounded-2xl p-1 bg-slate-950/80">
                  <button
                    type="button"
                    onClick={() => setActiveTabType('presets')}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTabType === 'presets'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>Preset SFX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabType('upload')}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTabType === 'upload'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FolderUp size={13} />
                    <span>Upload Audio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabType('url')}
                    className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTabType === 'url'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ExternalLink size={13} />
                    <span>Direct URL</span>
                  </button>
                </div>

                {/* Preset SFX Grid */}
                {activeTabType === 'presets' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-950 rounded-2xl border border-slate-900 scrollbar-thin scrollbar-thumb-slate-800">
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
                              durationSeconds: ps.dur
                            }));
                            triggerSoundEffect('preview', ps.id, 0.8, 0.8);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                            selected
                              ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400/40'
                              : 'bg-slate-900/80 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          <div className="font-extrabold text-[11px] truncate flex items-center justify-between">
                            <span>{ps.name}</span>
                            {selected && <Check size={12} className="text-cyan-400 flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                            <span>{ps.dur}s</span>
                            <span>•</span>
                            <span className="truncate">{ps.category}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Upload File */}
                {activeTabType === 'upload' && (
                  <div className="p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/60 text-center space-y-2.5 transition-colors">
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
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                      <FolderUp size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">
                        {uploadingFile ? 'Uploading sound clip...' : 'Choose an audio file from your computer'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Supports MP3, WAV, OGG, M4A up to 15MB
                      </div>
                    </div>
                    {formData.soundUrl && !formData.soundUrl.startsWith('synth:') && (
                      <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl truncate inline-block max-w-full">
                        Selected: {formData.soundUrl}
                      </div>
                    )}
                    {uploadError && <div className="text-[11px] font-mono text-rose-400">{uploadError}</div>}
                    <div>
                      <button
                        type="button"
                        disabled={uploadingFile}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer shadow-sm active:scale-95 transition-all"
                      >
                        {uploadingFile ? 'Uploading...' : 'Browse Computer Files'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Direct URL Input */}
                {activeTabType === 'url' && (
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.soundUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, soundUrl: e.target.value }))}
                      placeholder="https://example.com/sound.mp3 or /uploads/..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-white outline-none font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Volume & Duration Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-850">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>Pad Volume</span>
                    <span className="font-mono text-cyan-400 font-bold">{Math.round(formData.volume * 100)}%</span>
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
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-850">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>Duration (seconds)</span>
                    <span className="font-mono text-cyan-400 font-bold">{formData.durationSeconds}s</span>
                  </div>
                  <input
                    type="number"
                    min="0.2"
                    max="30"
                    step="0.1"
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData((prev) => ({ ...prev, durationSeconds: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono outline-none focus:border-cyan-500"
                  />
                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    OBS alert display time
                  </div>
                </div>
              </div>

              {/* Theme Color Selector */}
              <div className="space-y-2 pt-1">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>Theme Aura Color</span>
                  <span className="text-[10px] font-mono text-slate-500">{formData.color}</span>
                </label>
                <div className="flex flex-wrap items-center gap-2.5 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-850">
                  {COLOR_OPTIONS.map((col) => {
                    const isSelected = formData.color === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, color: col }))}
                        className={`w-7 h-7 rounded-full transition-all cursor-pointer relative ${
                          isSelected ? 'scale-115 ring-2 ring-white shadow-lg' : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: col,
                          boxShadow: isSelected ? `0 0 14px ${col}` : undefined
                        }}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between flex-shrink-0">
              <button
                type="button"
                onClick={() => triggerSoundEffect('test', formData.soundUrl, formData.volume, 0.8)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-cyan-400 text-cyan-300 font-mono text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <Play size={13} className="fill-cyan-400 text-cyan-400" />
                <span>Test Sound</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSound}
                  className="px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer active:scale-95"
                  style={{
                    backgroundColor: formData.color || '#00F0FF',
                    color: '#090D18',
                    boxShadow: `0 0 20px ${formData.color || '#00F0FF'}50`
                  }}
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
