import { getIO } from './socketService';
import axios from 'axios';
import { db } from '../database/db';

export interface PokemonCommentEvent {
  id: string;
  author: string;
  avatar?: string;
  message: string;
  pokemonId?: number;
  timestamp: number;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  // Standard video, short, live stream, or youtu.be
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

class YouTubeChatService {
  private activeStreams: Map<
    string,
    {
      videoId: string;
      interval: NodeJS.Timeout;
      seenMessageIds: Set<string>;
      lastPollTime: number;
    }
  > = new Map();

  /**
   * Broadcast a comment to a streamer's overlay room
   */
  public emitPokemonComment(token: string, comment: PokemonCommentEvent) {
    try {
      const io = getIO();
      if (io) {
        // Emit to both token room and broadcast for preview
        io.to(token).emit('pokemon:comment', comment);
        io.emit(`pokemon:comment:${token}`, comment);
      }
    } catch (err: any) {
      console.warn('⚠️ [YouTubeChatService] Socket emit error:', err.message);
    }
  }

  /**
   * Broadcast updated settings to overlay and connected manager previews
   */
  public emitSettingsUpdated(token: string, settings: any) {
    try {
      const io = getIO();
      if (io) {
        io.to(token).emit('pokemon:settings_updated', settings);
        io.emit(`pokemon:settings_updated:${token}`, settings);
        io.emit('pokemon:settings_updated', { token, ...settings });
      }
    } catch (err: any) {
      console.warn('⚠️ [YouTubeChatService] Socket settings emit error:', err.message);
    }
  }

  /**
   * Start polling a YouTube live stream chat for a streamer
   */
  public startListener(token: string, youtubeUrl: string) {
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube Live Stream URL. Please check your link.');
    }

    // Stop existing listener if any
    this.stopListener(token);

    const seenMessageIds = new Set<string>();

    const poll = async () => {
      try {
        await this.pollYouTubeLiveChat(token, videoId, seenMessageIds);
      } catch (err: any) {
        // Silent recovery
      }
    };

    // Run first poll immediately
    poll();

    // Poll every 5 seconds for new live chat messages
    const interval = setInterval(poll, 5000);

    this.activeStreams.set(token, {
      videoId,
      interval,
      seenMessageIds,
      lastPollTime: Date.now()
    });

    console.log(`⚡ [YouTube Live Chat] Started listener for token [${token}] on video [${videoId}]`);
  }

  /**
   * Stop polling
   */
  public stopListener(token: string) {
    const session = this.activeStreams.get(token);
    if (session) {
      clearInterval(session.interval);
      this.activeStreams.delete(token);
      console.log(`⚡ [YouTube Live Chat] Stopped listener for token [${token}]`);
    }
  }

  /**
   * Check if a streamer's listener is active
   */
  public isListening(token: string): boolean {
    return this.activeStreams.has(token);
  }

  public getActiveVideoId(token: string): string | null {
    return this.activeStreams.get(token)?.videoId || null;
  }

  /**
   * Poll YouTube live chat page / innertube
   */
  private async pollYouTubeLiveChat(token: string, videoId: string, seenIds: Set<string>) {
    try {
      const liveChatUrl = `https://www.youtube.com/live_chat?v=${videoId}`;
      const res = await axios.get(liveChatUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 4500
      });

      const html = res.data;
      if (typeof html !== 'string') return;

      // Match ytInitialData JSON object
      const jsonMatch = html.match(/window\["ytInitialData"\]\s*=\s*({.+?});<\/script>/s) ||
        html.match(/var\s+ytInitialData\s*=\s*({.+?});<\/script>/s);

      if (!jsonMatch || !jsonMatch[1]) return;

      const data = JSON.parse(jsonMatch[1]);
      const actions =
        data?.contents?.liveChatRenderer?.actions ||
        data?.continuationContents?.liveChatContinuation?.actions ||
        [];

      for (const action of actions) {
        const item = action?.addChatItemAction?.item;
        const textMessage = item?.liveChatTextMessageRenderer;

        if (textMessage) {
          const id = textMessage.id;
          if (seenIds.has(id)) continue;
          seenIds.add(id);

          // Prevent set from growing infinitely
          if (seenIds.size > 2000) {
            const first = seenIds.values().next().value;
            if (first) seenIds.delete(first);
          }

          const author = textMessage?.authorName?.simpleText || 'Anonymous Viewer';
          const avatar = textMessage?.authorPhoto?.thumbnails?.[0]?.url;
          const messageParts = textMessage?.message?.runs || [];
          const message = messageParts.map((r: any) => r.text || '').join('');

          if (message) {
            this.emitPokemonComment(token, {
              id: id || `yt_${Date.now()}_${Math.random()}`,
              author,
              avatar,
              message,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (err: any) {
      // Ignored for network resilience
    }
  }
}

export const youtubeChatService = new YouTubeChatService();
