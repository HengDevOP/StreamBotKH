import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { getIO } from '@/server/services/socketService';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// Curated Popular Internet Meme Soundboard (Laughs, Ohhhhh Group, & Top Viral Memes)
const DEFAULT_SOUNDBOARD_ITEMS = [
  // 1. LAUGH SOUNDS
  {
    title: 'Oh No No No (Laugh)',
    category: 'Laugh',
    soundUrl: '/sounds/memes/laugh-oh-no-no-no.mp3',
    keybind: '1',
    keybindCode: 'Digit1',
    keybindDisplay: '1',
    volume: 0.85,
    color: '#F59E0B',
    iconName: 'Smile',
    durationSeconds: 5.5,
    isLoop: 0,
    sortOrder: 1
  },
  {
    title: 'Funny Wheeze Laugh',
    category: 'Laugh',
    soundUrl: '/sounds/memes/laugh-funny.mp3',
    keybind: '2',
    keybindCode: 'Digit2',
    keybindDisplay: '2',
    volume: 0.85,
    color: '#EC4899',
    iconName: 'Smile',
    durationSeconds: 2.8,
    isLoop: 0,
    sortOrder: 2
  },
  {
    title: 'Baby Laughing',
    category: 'Laugh',
    soundUrl: '/sounds/memes/laugh-baby.mp3',
    keybind: '3',
    keybindCode: 'Digit3',
    keybindDisplay: '3',
    volume: 0.85,
    color: '#EAB308',
    iconName: 'Smile',
    durationSeconds: 3.3,
    isLoop: 0,
    sortOrder: 3
  },
  {
    title: 'Cat Laugh Meme',
    category: 'Laugh',
    soundUrl: '/sounds/memes/laugh-cat.mp3',
    keybind: '4',
    keybindCode: 'Digit4',
    keybindDisplay: '4',
    volume: 0.85,
    color: '#10B981',
    iconName: 'Smile',
    durationSeconds: 1.8,
    isLoop: 0,
    sortOrder: 4
  },
  {
    title: "HA! Got 'Eem!",
    category: 'Laugh',
    soundUrl: '/sounds/memes/laugh-ha-goteem.mp3',
    keybind: '5',
    keybindCode: 'Digit5',
    keybindDisplay: '5',
    volume: 0.85,
    color: '#3B82F6',
    iconName: 'Smile',
    durationSeconds: 2.2,
    isLoop: 0,
    sortOrder: 5
  },

  // 2. OHHHHHHHH SOUND GROUP
  {
    title: 'Rap Battle OOOOH!',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-crowd.mp3',
    keybind: '1',
    keybindCode: 'Numpad1',
    keybindDisplay: 'NUM 1',
    volume: 0.9,
    color: '#EF4444',
    iconName: 'Flame',
    durationSeconds: 3.0,
    isLoop: 0,
    sortOrder: 6
  },
  {
    title: 'Supa Hot Fire (Boom Bam)',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-supa-hot.mp3',
    keybind: '2',
    keybindCode: 'Numpad2',
    keybindDisplay: 'NUM 2',
    volume: 0.9,
    color: '#F97316',
    iconName: 'Flame',
    durationSeconds: 3.1,
    isLoop: 0,
    sortOrder: 7
  },
  {
    title: 'Sike! Wrong Number!',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-sike-wrong-number.mp3',
    keybind: '3',
    keybindCode: 'Numpad3',
    keybindDisplay: 'NUM 3',
    volume: 0.9,
    color: '#8B5CF6',
    iconName: 'Sparkles',
    durationSeconds: 3.2,
    isLoop: 0,
    sortOrder: 8
  },
  {
    title: 'Wombo Combo! OHHH!',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-wombo-combo.mp3',
    keybind: '4',
    keybindCode: 'Numpad4',
    keybindDisplay: 'NUM 4',
    volume: 0.85,
    color: '#06B6D4',
    iconName: 'Zap',
    durationSeconds: 4.0,
    isLoop: 0,
    sortOrder: 9
  },
  {
    title: 'Oh Baby A Triple!',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-baby-a-triple.mp3',
    keybind: '5',
    keybindCode: 'Numpad5',
    keybindDisplay: 'NUM 5',
    volume: 0.85,
    color: '#EAB308',
    iconName: 'Trophy',
    durationSeconds: 2.5,
    isLoop: 0,
    sortOrder: 10
  },
  {
    title: 'Oh My God! (Loud MLG)',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-omg-loud.mp3',
    keybind: '6',
    keybindCode: 'Numpad6',
    keybindDisplay: 'NUM 6',
    volume: 0.8,
    color: '#F43F5E',
    iconName: 'AlertCircle',
    durationSeconds: 4.8,
    isLoop: 0,
    sortOrder: 11
  },
  {
    title: 'Oh My God! (Wow)',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-my-god.mp3',
    keybind: '7',
    keybindCode: 'Numpad7',
    keybindDisplay: 'NUM 7',
    volume: 0.85,
    color: '#10B981',
    iconName: 'Bell',
    durationSeconds: 1.0,
    isLoop: 0,
    sortOrder: 12
  },
  {
    title: 'Roblox OOF!',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-roblox-oof.mp3',
    keybind: '8',
    keybindCode: 'Numpad8',
    keybindDisplay: 'NUM 8',
    volume: 0.9,
    color: '#F59E0B',
    iconName: 'Skull',
    durationSeconds: 0.6,
    isLoop: 0,
    sortOrder: 13
  },
  {
    title: 'Minecraft OOF!',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-minecraft-oof.mp3',
    keybind: '9',
    keybindCode: 'Numpad9',
    keybindDisplay: 'NUM 9',
    volume: 0.9,
    color: '#84CC16',
    iconName: 'Crosshair',
    durationSeconds: 0.4,
    isLoop: 0,
    sortOrder: 14
  },
  {
    title: 'FAAAAAHHHHH!',
    category: 'Ohhhhh',
    soundUrl: '/sounds/memes/oh-fahhh.mp3',
    keybind: '0',
    keybindCode: 'Numpad0',
    keybindDisplay: 'NUM 0',
    volume: 0.85,
    color: '#A855F7',
    iconName: 'Mic',
    durationSeconds: 1.2,
    isLoop: 0,
    sortOrder: 15
  },

  // 3. OTHER VIRAL INTERNET MEMES
  {
    title: 'Vine Boom',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-vine-boom.mp3',
    keybind: 'F1',
    keybindCode: 'F1',
    keybindDisplay: 'F1',
    volume: 0.9,
    color: '#EF4444',
    iconName: 'Flame',
    durationSeconds: 0.7,
    isLoop: 0,
    sortOrder: 16
  },
  {
    title: 'Emotional Damage!',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-emotional-damage.mp3',
    keybind: 'F2',
    keybindCode: 'F2',
    keybindDisplay: 'F2',
    volume: 0.9,
    color: '#8B5CF6',
    iconName: 'Frown',
    durationSeconds: 1.7,
    isLoop: 0,
    sortOrder: 17
  },
  {
    title: 'Metal Pipe Clang',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-metal-pipe.mp3',
    keybind: 'F3',
    keybindCode: 'F3',
    keybindDisplay: 'F3',
    volume: 0.85,
    color: '#06B6D4',
    iconName: 'Activity',
    durationSeconds: 1.4,
    isLoop: 0,
    sortOrder: 18
  },
  {
    title: 'FBI OPEN UP!',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-fbi-open-up.mp3',
    keybind: 'F4',
    keybindCode: 'F4',
    keybindDisplay: 'F4',
    volume: 0.85,
    color: '#F43F5E',
    iconName: 'Megaphone',
    durationSeconds: 2.4,
    isLoop: 0,
    sortOrder: 19
  },
  {
    title: 'To Be Continued',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-to-be-continued.mp3',
    keybind: 'F5',
    keybindCode: 'F5',
    keybindDisplay: 'F5',
    volume: 0.8,
    color: '#F59E0B',
    iconName: 'Music',
    durationSeconds: 4.8,
    isLoop: 0,
    sortOrder: 20
  },
  {
    title: 'John Cena Theme',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-john-cena.mp3',
    keybind: 'F6',
    keybindCode: 'F6',
    keybindDisplay: 'F6',
    volume: 0.8,
    color: '#10B981',
    iconName: 'Trophy',
    durationSeconds: 5.0,
    isLoop: 0,
    sortOrder: 21
  },
  {
    title: "Damn Son Where'd You",
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-damn-son.mp3',
    keybind: 'F7',
    keybindCode: 'F7',
    keybindDisplay: 'F7',
    volume: 0.85,
    color: '#EC4899',
    iconName: 'Sparkles',
    durationSeconds: 2.4,
    isLoop: 0,
    sortOrder: 22
  },
  {
    title: 'He Need Some Milk!',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-he-need-milk.mp3',
    keybind: 'F8',
    keybindCode: 'F8',
    keybindDisplay: 'F8',
    volume: 0.85,
    color: '#3B82F6',
    iconName: 'Smile',
    durationSeconds: 2.8,
    isLoop: 0,
    sortOrder: 23
  },
  {
    title: 'No God Please No!',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-no-god-please.mp3',
    keybind: 'F9',
    keybindCode: 'F9',
    keybindDisplay: 'F9',
    volume: 0.85,
    color: '#EF4444',
    iconName: 'Skull',
    durationSeconds: 3.2,
    isLoop: 0,
    sortOrder: 24
  },
  {
    title: 'Windows XP Error',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-windows-error.mp3',
    keybind: 'F10',
    keybindCode: 'F10',
    keybindDisplay: 'F10',
    volume: 0.85,
    color: '#F43F5E',
    iconName: 'AlertCircle',
    durationSeconds: 0.6,
    isLoop: 0,
    sortOrder: 25
  },
  {
    title: 'Windows XP Startup',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-windows-startup.mp3',
    keybind: 'F11',
    keybindCode: 'F11',
    keybindDisplay: 'F11',
    volume: 0.8,
    color: '#06B6D4',
    iconName: 'Bell',
    durationSeconds: 3.7,
    isLoop: 0,
    sortOrder: 26
  },
  {
    title: 'Among Us Reveal',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-among-us.mp3',
    keybind: 'F12',
    keybindCode: 'F12',
    keybindDisplay: 'F12',
    volume: 0.85,
    color: '#EF4444',
    iconName: 'Skull',
    durationSeconds: 3.1,
    isLoop: 0,
    sortOrder: 27
  },
  {
    title: 'Discord Ping',
    category: 'Alerts',
    soundUrl: '/sounds/memes/meme-discord-ping.mp3',
    keybind: 'q',
    keybindCode: 'KeyQ',
    keybindDisplay: 'Q',
    volume: 0.9,
    color: '#6366F1',
    iconName: 'Bell',
    durationSeconds: 0.4,
    isLoop: 0,
    sortOrder: 28
  },
  {
    title: 'Rizz Sound Effect',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-rizz.mp3',
    keybind: 'e',
    keybindCode: 'KeyE',
    keybindDisplay: 'E',
    volume: 0.85,
    color: '#EC4899',
    iconName: 'Sparkles',
    durationSeconds: 2.4,
    isLoop: 0,
    sortOrder: 29
  },
  {
    title: 'Huh? Cat Meme',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-huh-cat.mp3',
    keybind: 'r',
    keybindCode: 'KeyR',
    keybindDisplay: 'R',
    volume: 0.9,
    color: '#EAB308',
    iconName: 'Smile',
    durationSeconds: 0.9,
    isLoop: 0,
    sortOrder: 30
  },
  {
    title: 'YEET!',
    category: 'Memes',
    soundUrl: '/sounds/memes/meme-yeet.mp3',
    keybind: 't',
    keybindCode: 'KeyT',
    keybindDisplay: 'T',
    volume: 0.9,
    color: '#14B8A6',
    iconName: 'TrendingUp',
    durationSeconds: 1.3,
    isLoop: 0,
    sortOrder: 31
  },
  {
    title: 'SpongeBob Sad Fail',
    category: 'Reactions',
    soundUrl: '/sounds/memes/meme-spongebob-fail.mp3',
    keybind: 'y',
    keybindCode: 'KeyY',
    keybindDisplay: 'Y',
    volume: 0.85,
    color: '#F59E0B',
    iconName: 'Frown',
    durationSeconds: 1.7,
    isLoop: 0,
    sortOrder: 32
  },
  {
    title: 'Sad Violin Solo',
    category: 'Reactions',
    soundUrl: '/sounds/memes/meme-sad-violin.mp3',
    keybind: 'u',
    keybindCode: 'KeyU',
    keybindDisplay: 'U',
    volume: 0.8,
    color: '#8B5CF6',
    iconName: 'Music',
    durationSeconds: 2.3,
    isLoop: 0,
    sortOrder: 33
  },
  {
    title: 'Tactical Nuke Alert',
    category: 'Gaming',
    soundUrl: '/sounds/memes/meme-tactical-nuke.mp3',
    keybind: 'g',
    keybindCode: 'KeyG',
    keybindDisplay: 'G',
    volume: 0.85,
    color: '#F97316',
    iconName: 'Radio',
    durationSeconds: 4.8,
    isLoop: 0,
    sortOrder: 34
  },
  {
    title: 'Hitmarker Tick',
    category: 'Gaming',
    soundUrl: '/sounds/memes/meme-hitmarker.mp3',
    keybind: 'h',
    keybindCode: 'KeyH',
    keybindDisplay: 'H',
    volume: 0.9,
    color: '#84CC16',
    iconName: 'Crosshair',
    durationSeconds: 0.2,
    isLoop: 0,
    sortOrder: 35
  },
  {
    title: 'Triple MLG Airhorn',
    category: 'Memes',
    soundUrl: 'synth:airhorn',
    keybind: 'b',
    keybindCode: 'KeyB',
    keybindDisplay: 'B',
    volume: 0.85,
    color: '#EF4444',
    iconName: 'Megaphone',
    durationSeconds: 1.0,
    isLoop: 0,
    sortOrder: 36
  },
  {
    title: 'Ka-Ching Money',
    category: 'Alerts',
    soundUrl: 'synth:kaching',
    keybind: 'm',
    keybindCode: 'KeyM',
    keybindDisplay: 'M',
    volume: 0.8,
    color: '#10B981',
    iconName: 'DollarSign',
    durationSeconds: 1.1,
    isLoop: 0,
    sortOrder: 37
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    // 1. Get or create Soundboard Settings
    let settings = db.prepare('SELECT * FROM stream_soundboards WHERE streamer_token = ?').get(token) as any;
    if (!settings) {
      const newSettingsId = uuidv4();
      db.prepare(`
        INSERT INTO stream_soundboards (
          id, streamer_token, master_volume, is_listening, output_mode, playback_mode,
          show_visual_alert, stop_keybind, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        newSettingsId,
        token,
        0.8,
        1,
        'both',
        'overlap',
        1,
        'Escape'
      );
      settings = db.prepare('SELECT * FROM stream_soundboards WHERE id = ?').get(newSettingsId) as any;
    }

    // 2. Get or seed Soundboard Items
    let items = db.prepare('SELECT * FROM stream_soundboard_items WHERE streamer_token = ? ORDER BY sort_order ASC, created_at ASC').all(token) as any[];

    if (!items || items.length === 0) {
      const insertStmt = db.prepare(`
        INSERT INTO stream_soundboard_items (
          id, streamer_token, title, category, sound_url, keybind, keybind_code,
          keybind_display, volume, color, icon_name, duration_seconds, is_loop, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      DEFAULT_SOUNDBOARD_ITEMS.forEach((def, index) => {
        insertStmt.run(
          uuidv4(),
          token,
          def.title,
          def.category,
          def.soundUrl,
          def.keybind,
          def.keybindCode,
          def.keybindDisplay,
          def.volume,
          def.color,
          def.iconName,
          def.durationSeconds,
          def.isLoop,
          index + 1
        );
      });

      items = db.prepare('SELECT * FROM stream_soundboard_items WHERE streamer_token = ? ORDER BY sort_order ASC, created_at ASC').all(token) as any[];
    }

    // Map database snake_case to camelCase
    const formattedSettings = {
      id: settings.id,
      token: settings.streamer_token,
      masterVolume: settings.master_volume ?? 0.8,
      isListening: Boolean(settings.is_listening ?? 1),
      outputMode: settings.output_mode || 'both',
      playbackMode: settings.playback_mode || 'overlap',
      showVisualAlert: Boolean(settings.show_visual_alert ?? 1),
      stopKeybind: settings.stop_keybind || 'Escape'
    };

    const formattedItems = (items || []).map((it) => ({
      id: it.id,
      streamerToken: it.streamer_token,
      title: it.title,
      category: it.category || 'Memes',
      soundUrl: it.sound_url,
      keybind: it.keybind || '',
      keybindCode: it.keybind_code || '',
      keybindDisplay: it.keybind_display || '',
      volume: it.volume ?? 0.8,
      color: it.color || '#00F0FF',
      iconName: it.icon_name || 'Volume2',
      durationSeconds: it.duration_seconds ?? 2.0,
      isLoop: Boolean(it.is_loop ?? 0),
      sortOrder: it.sort_order ?? 0
    }));

    return NextResponse.json({
      success: true,
      settings: formattedSettings,
      items: formattedItems
    });
  } catch (error: any) {
    console.error('[API /api/soundboard] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch soundboard' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token || 'demo-token';
    const action = body.action || 'update_settings';

    // ACTION: Reset to default sounds
    if (action === 'reset_defaults') {
      db.prepare('DELETE FROM stream_soundboard_items WHERE streamer_token = ?').run(token);

      const insertStmt = db.prepare(`
        INSERT INTO stream_soundboard_items (
          id, streamer_token, title, category, sound_url, keybind, keybind_code,
          keybind_display, volume, color, icon_name, duration_seconds, is_loop, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      DEFAULT_SOUNDBOARD_ITEMS.forEach((def, index) => {
        insertStmt.run(
          uuidv4(),
          token,
          def.title,
          def.category,
          def.soundUrl,
          def.keybind,
          def.keybindCode,
          def.keybindDisplay,
          def.volume,
          def.color,
          def.iconName,
          def.durationSeconds,
          def.isLoop,
          index + 1
        );
      });

      const io = getIO();
      if (io) {
        io.to(`overlay:${token}`).emit('soundboard:update', { token, type: 'reset' });
      }

      return NextResponse.json({ success: true, message: 'Soundboard reset to default sounds' });
    }

    // ACTION: Add new sound pad
    if (action === 'add_item') {
      const item = body.item;
      if (!item || !item.title) {
        return NextResponse.json({ success: false, error: 'Sound title is required' }, { status: 400 });
      }

      const id = item.id || uuidv4();
      const count = (db.prepare('SELECT COUNT(*) as c FROM stream_soundboard_items WHERE streamer_token = ?').get(token) as any)?.c || 0;

      db.prepare(`
        INSERT INTO stream_soundboard_items (
          id, streamer_token, title, category, sound_url, keybind, keybind_code,
          keybind_display, volume, color, icon_name, duration_seconds, is_loop, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        id,
        token,
        item.title,
        item.category || 'Custom',
        item.soundUrl || 'synth:airhorn',
        item.keybind || '',
        item.keybindCode || '',
        item.keybindDisplay || '',
        item.volume ?? 0.8,
        item.color || '#00F0FF',
        item.iconName || 'Volume2',
        item.durationSeconds ?? 2.0,
        item.isLoop ? 1 : 0,
        count + 1
      );

      const io = getIO();
      if (io) {
        io.to(`overlay:${token}`).emit('soundboard:update', { token, type: 'item_added' });
      }

      return NextResponse.json({ success: true, id, message: 'Sound added successfully' });
    }

    // ACTION: Update a specific sound pad (e.g. keybind change, rename, volume)
    if (action === 'update_item') {
      const item = body.item;
      if (!item || !item.id) {
        return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 });
      }

      db.prepare(`
        UPDATE stream_soundboard_items SET
          title = COALESCE(?, title),
          category = COALESCE(?, category),
          sound_url = COALESCE(?, sound_url),
          keybind = COALESCE(?, keybind),
          keybind_code = COALESCE(?, keybind_code),
          keybind_display = COALESCE(?, keybind_display),
          volume = COALESCE(?, volume),
          color = COALESCE(?, color),
          icon_name = COALESCE(?, icon_name),
          duration_seconds = COALESCE(?, duration_seconds),
          is_loop = COALESCE(?, is_loop)
        WHERE id = ? AND streamer_token = ?
      `).run(
        item.title,
        item.category,
        item.soundUrl,
        item.keybind !== undefined ? item.keybind : null,
        item.keybindCode !== undefined ? item.keybindCode : null,
        item.keybindDisplay !== undefined ? item.keybindDisplay : null,
        item.volume,
        item.color,
        item.iconName,
        item.durationSeconds,
        item.isLoop !== undefined ? (item.isLoop ? 1 : 0) : null,
        item.id,
        token
      );

      const io = getIO();
      if (io) {
        io.to(`overlay:${token}`).emit('soundboard:update', { token, type: 'item_updated' });
      }

      return NextResponse.json({ success: true, message: 'Sound pad updated successfully' });
    }

    // ACTION: Delete a sound pad
    if (action === 'delete_item') {
      const itemId = body.itemId;
      if (!itemId) {
        return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 });
      }

      db.prepare('DELETE FROM stream_soundboard_items WHERE id = ? AND streamer_token = ?').run(itemId, token);

      const io = getIO();
      if (io) {
        io.to(`overlay:${token}`).emit('soundboard:update', { token, type: 'item_deleted' });
      }

      return NextResponse.json({ success: true, message: 'Sound pad deleted' });
    }

    // ACTION: Save overall soundboard settings
    const {
      masterVolume,
      isListening,
      outputMode,
      playbackMode,
      showVisualAlert,
      stopKeybind
    } = body;

    let existing = db.prepare('SELECT id FROM stream_soundboards WHERE streamer_token = ?').get(token) as any;

    if (existing) {
      db.prepare(`
        UPDATE stream_soundboards SET
          master_volume = COALESCE(?, master_volume),
          is_listening = COALESCE(?, is_listening),
          output_mode = COALESCE(?, output_mode),
          playback_mode = COALESCE(?, playback_mode),
          show_visual_alert = COALESCE(?, show_visual_alert),
          stop_keybind = COALESCE(?, stop_keybind),
          updated_at = datetime('now')
        WHERE streamer_token = ?
      `).run(
        masterVolume !== undefined ? masterVolume : null,
        isListening !== undefined ? (isListening ? 1 : 0) : null,
        outputMode || null,
        playbackMode || null,
        showVisualAlert !== undefined ? (showVisualAlert ? 1 : 0) : null,
        stopKeybind || null,
        token
      );
    } else {
      db.prepare(`
        INSERT INTO stream_soundboards (
          id, streamer_token, master_volume, is_listening, output_mode, playback_mode,
          show_visual_alert, stop_keybind, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        uuidv4(),
        token,
        masterVolume ?? 0.8,
        isListening !== undefined ? (isListening ? 1 : 0) : 1,
        outputMode || 'both',
        playbackMode || 'overlap',
        showVisualAlert !== undefined ? (showVisualAlert ? 1 : 0) : 1,
        stopKeybind || 'Escape'
      );
    }

    const io = getIO();
    if (io) {
      io.to(`overlay:${token}`).emit('soundboard:update', { token, type: 'settings_saved' });
    }

    return NextResponse.json({
      success: true,
      message: 'Soundboard settings saved successfully'
    });
  } catch (error: any) {
    console.error('[API /api/soundboard] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update soundboard' },
      { status: 500 }
    );
  }
}
