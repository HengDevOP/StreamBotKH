import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/db';
import { youtubeChatService } from '@/server/services/youtubeChatService';
import { POKEMON_ROSTER } from '@/utils/pokemonData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    let settings = db.prepare('SELECT * FROM pokemon_widget_settings WHERE streamer_token = ?').get(token) as any;

    if (!settings) {
      db.prepare(`
        INSERT INTO pokemon_widget_settings (
          streamer_token, youtube_url, listener_active, default_pokemon,
          allowed_pokemon, bubble_duration, max_on_screen, walk_speed,
          scale, show_name, sound_enabled, theme, overlay_width, overlay_height
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        token,
        '',
        0,
        1, // Bulbasaur default
        '1,4,7,25,39,54,94,133,143,149,151,448',
        8,
        12,
        'normal',
        'medium',
        1,
        1,
        'transparent',
        1920,
        360
      );
      settings = db.prepare('SELECT * FROM pokemon_widget_settings WHERE streamer_token = ?').get(token) as any;
    }

    const isListening = youtubeChatService.isListening(token);
    const activeVideoId = youtubeChatService.getActiveVideoId(token);

    return NextResponse.json({
      success: true,
      settings: {
        streamerToken: settings.streamer_token,
        youtubeUrl: settings.youtube_url || '',
        listenerActive: isListening ? 1 : (settings.listener_active || 0),
        defaultPokemon: settings.default_pokemon || 1,
        allowedPokemon: (settings.allowed_pokemon || '1,4,7,25,39,54,94,133,143,149,151,448')
          .split(',')
          .map((id: string) => parseInt(id.trim(), 10))
          .filter(Boolean),
        bubbleDuration: settings.bubble_duration || 8,
        maxOnScreen: settings.max_on_screen || 12,
        walkSpeed: settings.walk_speed || 'normal',
        scale: settings.scale || 'medium',
        showName: settings.show_name !== 0,
        soundEnabled: false,
        theme: settings.theme || 'transparent',
        overlayWidth: settings.overlay_width || 1920,
        overlayHeight: settings.overlay_height || 360
      },
      isListening,
      activeVideoId,
      roster: POKEMON_ROSTER
    });
  } catch (error: any) {
    console.error('❌ [Pokemon Widget API GET Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.streamerToken || body.token || 'demo-token';
    const action = body.action;

    // Handle Manual / Test Comment
    if (action === 'test_comment') {
      const author = body.author || 'Viewer' + Math.floor(100 + Math.random() * 900);
      const message = body.message || 'Bulbasaur is the best! 🌱 Let’s go stream!';
      const pokemonId = body.pokemonId ? parseInt(body.pokemonId, 10) : undefined;

      const commentEvent = {
        id: 'test_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        author,
        message,
        pokemonId,
        timestamp: Date.now()
      };

      youtubeChatService.emitPokemonComment(token, commentEvent);

      return NextResponse.json({
        success: true,
        message: `Dispatched test comment from ${author}!`,
        comment: commentEvent
      });
    }

    // Handle Toggle YouTube Chat Listener
    if (action === 'start_listener') {
      const youtubeUrl = body.youtubeUrl;
      if (!youtubeUrl) {
        return NextResponse.json({ success: false, error: 'Please enter a valid YouTube Live link.' }, { status: 400 });
      }

      youtubeChatService.startListener(token, youtubeUrl);

      db.prepare(`
        UPDATE pokemon_widget_settings
        SET youtube_url = ?, listener_active = 1, updated_at = datetime('now')
        WHERE streamer_token = ?
      `).run(youtubeUrl, token);

      return NextResponse.json({
        success: true,
        isListening: true,
        message: 'YouTube Live Chat listener started!'
      });
    }

    if (action === 'stop_listener') {
      youtubeChatService.stopListener(token);

      db.prepare(`
        UPDATE pokemon_widget_settings
        SET listener_active = 0, updated_at = datetime('now')
        WHERE streamer_token = ?
      `).run(token);

      return NextResponse.json({
        success: true,
        isListening: false,
        message: 'YouTube Live Chat listener stopped.'
      });
    }

    // Handle Saving Full Settings
    const {
      youtubeUrl,
      defaultPokemon,
      allowedPokemon,
      bubbleDuration,
      maxOnScreen,
      walkSpeed,
      scale,
      showName,
      soundEnabled,
      theme,
      overlayWidth,
      overlayHeight
    } = body;

    const allowedStr = Array.isArray(allowedPokemon) ? allowedPokemon.join(',') : '1,4,7,25,39,54,94,133,143,149,151,448';

    db.prepare(`
      INSERT INTO pokemon_widget_settings (
        streamer_token, youtube_url, default_pokemon, allowed_pokemon,
        bubble_duration, max_on_screen, walk_speed, scale,
        show_name, sound_enabled, theme, overlay_width, overlay_height, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(streamer_token) DO UPDATE SET
        youtube_url = excluded.youtube_url,
        default_pokemon = excluded.default_pokemon,
        allowed_pokemon = excluded.allowed_pokemon,
        bubble_duration = excluded.bubble_duration,
        max_on_screen = excluded.max_on_screen,
        walk_speed = excluded.walk_speed,
        scale = excluded.scale,
        show_name = excluded.show_name,
        sound_enabled = excluded.sound_enabled,
        theme = excluded.theme,
        overlay_width = excluded.overlay_width,
        overlay_height = excluded.overlay_height,
        updated_at = datetime('now')
    `).run(
      token,
      youtubeUrl || '',
      defaultPokemon || 1,
      allowedStr,
      bubbleDuration || 8,
      maxOnScreen || 12,
      walkSpeed || 'normal',
      scale || 'medium',
      showName ? 1 : 0,
      0, // sound disabled
      theme || 'transparent',
      overlayWidth || 1920,
      overlayHeight || 360
    );

    const updatedSettings = {
      streamerToken: token,
      youtubeUrl: youtubeUrl || '',
      defaultPokemon: defaultPokemon || 1,
      allowedPokemon: allowedStr.split(',').map((id: string) => parseInt(id.trim(), 10)).filter(Boolean),
      bubbleDuration: bubbleDuration || 8,
      maxOnScreen: maxOnScreen || 12,
      walkSpeed: walkSpeed || 'normal',
      scale: scale || 'medium',
      showName: showName !== false && showName !== 0,
      soundEnabled: false,
      theme: theme || 'transparent',
      overlayWidth: overlayWidth || 1920,
      overlayHeight: overlayHeight || 360
    };

    youtubeChatService.emitSettingsUpdated(token, updatedSettings);

    return NextResponse.json({
      success: true,
      message: 'Pokémon widget settings saved successfully!',
      settings: updatedSettings
    });
  } catch (error: any) {
    console.error('❌ [Pokemon Widget API POST Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
