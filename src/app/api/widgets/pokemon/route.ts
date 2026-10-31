import { NextRequest, NextResponse } from 'next/server';
import { getPokemonSettingsCollection } from '@/server/database/mongo';
import { youtubeChatService } from '@/server/services/youtubeChatService';
import { POKEMON_ROSTER } from '@/utils/pokemonData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'demo-token';

    const col = await getPokemonSettingsCollection();
    let settings = await col.findOne({ streamerToken: token }) as any;

    if (!settings) {
      settings = {
        streamerToken: token,
        youtubeUrl: '',
        listenerActive: false,
        defaultPokemon: 1,
        allowedPokemon: '1,4,7,25,39,54,94,133,143,149,151,448',
        bubbleDuration: 8,
        maxOnScreen: 12,
        walkSpeed: 'normal',
        scale: 'medium',
        showName: true,
        soundEnabled: false,
        theme: 'transparent',
        overlayWidth: 1920,
        overlayHeight: 360,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await col.insertOne(settings);
    }

    const isListening = youtubeChatService.isListening(token);
    const activeVideoId = youtubeChatService.getActiveVideoId(token);

    const allowedList = typeof settings.allowedPokemon === 'string'
      ? settings.allowedPokemon.split(',').map((id: string) => parseInt(id.trim(), 10)).filter(Boolean)
      : Array.isArray(settings.allowedPokemon) ? settings.allowedPokemon : [1, 4, 7, 25, 39, 54, 94, 133, 143, 149, 151, 448];

    return NextResponse.json({
      success: true,
      settings: {
        streamerToken: settings.streamerToken || token,
        youtubeUrl: settings.youtubeUrl || '',
        listenerActive: isListening ? 1 : (settings.listenerActive ? 1 : 0),
        defaultPokemon: settings.defaultPokemon || 1,
        allowedPokemon: allowedList,
        bubbleDuration: settings.bubbleDuration || 8,
        maxOnScreen: settings.maxOnScreen || 12,
        walkSpeed: settings.walkSpeed || 'normal',
        scale: settings.scale || 'medium',
        showName: settings.showName !== false,
        soundEnabled: false,
        theme: settings.theme || 'transparent',
        overlayWidth: settings.overlayWidth || 1920,
        overlayHeight: settings.overlayHeight || 360
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
    const col = await getPokemonSettingsCollection();

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

      await col.updateOne(
        { streamerToken: token },
        {
          $set: {
            youtubeUrl,
            listenerActive: true,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        isListening: true,
        message: 'YouTube Live Chat listener started!'
      });
    }

    if (action === 'stop_listener') {
      youtubeChatService.stopListener(token);

      await col.updateOne(
        { streamerToken: token },
        {
          $set: {
            listenerActive: false,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

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
      theme,
      overlayWidth,
      overlayHeight
    } = body;

    const allowedStr = Array.isArray(allowedPokemon) ? allowedPokemon.join(',') : '1,4,7,25,39,54,94,133,143,149,151,448';

    await col.updateOne(
      { streamerToken: token },
      {
        $set: {
          streamerToken: token,
          youtubeUrl: youtubeUrl || '',
          defaultPokemon: defaultPokemon || 1,
          allowedPokemon: allowedStr,
          bubbleDuration: bubbleDuration || 8,
          maxOnScreen: maxOnScreen || 12,
          walkSpeed: walkSpeed || 'normal',
          scale: scale || 'medium',
          showName: Boolean(showName),
          soundEnabled: false,
          theme: theme || 'transparent',
          overlayWidth: overlayWidth || 1920,
          overlayHeight: overlayHeight || 360,
          updatedAt: new Date()
        }
      },
      { upsert: true }
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
