'use client';

import { Socket } from 'socket.io-client';

export interface MediaItem {
  _id: string;
  userId: string;
  filename: string;
  storedFilename: string;
  url: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface StorageInfo {
  plan: string;
  planLabel: string;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
}

export interface MediaResponseData {
  media: MediaItem[];
  storage: StorageInfo | null;
}

type MediaListener = (data: MediaResponseData) => void;

const CACHE_STORAGE_KEY = 'streamneon_media_cache';
const CACHE_ETAG_KEY = 'streamneon_media_etag';
const CACHE_TIMESTAMP_KEY = 'streamneon_media_time';

// Module-level in-memory cache to prevent refetching and maintain instantaneous UI renders
let memoryCache: {
  media: MediaItem[];
  storage: StorageInfo | null;
  etag: string | null;
  timestamp: number;
} | null = null;

// Track active in-flight request to deduplicate concurrent calls
let inFlightFetch: Promise<MediaResponseData> | null = null;

// Listeners subscribed to media updates
const listeners = new Set<MediaListener>();

// Socket binding tracker
let attachedSocket: Socket | null = null;

function loadSessionCache(): { media: MediaItem[]; storage: StorageInfo | null; etag: string | null; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const etag = sessionStorage.getItem(CACHE_ETAG_KEY) || null;
    const timeStr = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    const timestamp = timeStr ? parseInt(timeStr, 10) : 0;
    return {
      media: Array.isArray(parsed?.media) ? parsed.media : [],
      storage: parsed?.storage || null,
      etag,
      timestamp
    };
  } catch (e) {
    return null;
  }
}

function saveSessionCache(media: MediaItem[], storage: StorageInfo | null, etag: string | null) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify({ media, storage }));
    if (etag) {
      sessionStorage.setItem(CACHE_ETAG_KEY, etag);
    }
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    // Ignore storage quota errors in private browsing
  }
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('streamneon_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function notifyListeners(data: MediaResponseData) {
  listeners.forEach((listener) => {
    try {
      listener(data);
    } catch (e) {
      console.warn('Error in mediaService listener:', e);
    }
  });
}

export const mediaService = {
  /**
   * Synchronously get cached media items immediately (from memory or session storage)
   * Prevents blank flashing / spinners on page reload
   */
  getCachedMedia(): MediaItem[] {
    if (memoryCache?.media) return memoryCache.media;
    const session = loadSessionCache();
    if (session) {
      memoryCache = session;
      return session.media;
    }
    return [];
  },

  getCachedStorage(): StorageInfo | null {
    if (memoryCache?.storage) return memoryCache.storage;
    const session = loadSessionCache();
    if (session) {
      memoryCache = session;
      return session.storage;
    }
    return null;
  },

  /**
   * Subscribe to real-time media changes
   */
  subscribe(listener: MediaListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Fetch media library with caching, ETag support, and in-flight request deduplication.
   * If called multiple times simultaneously, only a single network request is performed.
   */
  async fetchMedia(options: { force?: boolean } = {}): Promise<MediaResponseData> {
    const { force = false } = options;
    const now = Date.now();

    // 1. Initial memory cache check
    if (!memoryCache) {
      memoryCache = loadSessionCache();
    }

    // 2. If recent cache exists and not forced, return immediately
    const CACHE_FRESHNESS_WINDOW = 10000; // 10 seconds
    if (!force && memoryCache && (now - memoryCache.timestamp < CACHE_FRESHNESS_WINDOW) && memoryCache.media.length > 0) {
      return {
        media: memoryCache.media,
        storage: memoryCache.storage
      };
    }

    // 3. Return existing in-flight promise if one is already pending
    if (inFlightFetch) {
      return inFlightFetch;
    }

    // 4. Perform network request with conditional ETag
    inFlightFetch = (async () => {
      try {
        const headers: Record<string, string> = {
          ...getAuthHeaders()
        };

        if (memoryCache?.etag && !force) {
          headers['If-None-Match'] = memoryCache.etag;
        }

        const res = await fetch('/api/media', { headers });

        // 304 Not Modified -> Reuse existing cache with updated timestamp
        if (res.status === 304 && memoryCache) {
          memoryCache.timestamp = Date.now();
          saveSessionCache(memoryCache.media, memoryCache.storage, memoryCache.etag);
          return {
            media: memoryCache.media,
            storage: memoryCache.storage
          };
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const mediaList: MediaItem[] = data.media || [];
        const storage: StorageInfo | null = data.storage || null;
        const etag = res.headers.get('ETag') || data.etag || null;

        memoryCache = {
          media: mediaList,
          storage,
          etag,
          timestamp: Date.now()
        };

        saveSessionCache(mediaList, storage, etag);
        notifyListeners({ media: mediaList, storage });

        return { media: mediaList, storage };
      } catch (err) {
        // If network failed but we have stale cache, gracefully fall back to cache
        if (memoryCache?.media) {
          console.warn('⚠️ [MediaService] Network fetch failed, using fallback cache:', err);
          return {
            media: memoryCache.media,
            storage: memoryCache.storage
          };
        }
        throw err;
      } finally {
        inFlightFetch = null;
      }
    })();

    return inFlightFetch;
  },

  /**
   * Upload file to media library
   */
  async uploadMedia(file: File): Promise<{ media: MediaItem; storage: StorageInfo }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/media', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Upload failed');
    }

    const newMedia: MediaItem = data.media;
    const newStorage: StorageInfo = data.storage;

    // Prepend to current cache
    const currentMedia = memoryCache?.media || [];
    const updatedMedia = [newMedia, ...currentMedia.filter((m) => m._id !== newMedia._id)];

    memoryCache = {
      media: updatedMedia,
      storage: newStorage,
      etag: null,
      timestamp: Date.now()
    };

    saveSessionCache(updatedMedia, newStorage, null);
    notifyListeners({ media: updatedMedia, storage: newStorage });

    return { media: newMedia, storage: newStorage };
  },

  /**
   * Delete or prune media asset
   */
  async deleteMedia(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json().catch(() => ({}));

      // If 200 OK or 404 Not Found (already removed or ghost item), prune it from client cache!
      if (res.ok || res.status === 404 || data?.pruned) {
        if (memoryCache) {
          const updatedMedia = memoryCache.media.filter((m) => m._id !== id);
          memoryCache = {
            ...memoryCache,
            media: updatedMedia,
            storage: data.storage || memoryCache.storage,
            timestamp: Date.now()
          };
          saveSessionCache(updatedMedia, memoryCache.storage, memoryCache.etag);
          notifyListeners({ media: updatedMedia, storage: memoryCache.storage });
        }
        return true;
      }

      throw new Error(data.error || 'Delete failed');
    } catch (err: any) {
      // If error indicates not found or 404, gracefully prune from local cache
      if (err?.message?.includes('not found') || err?.message?.includes('404')) {
        if (memoryCache) {
          const updatedMedia = memoryCache.media.filter((m) => m._id !== id);
          memoryCache = {
            ...memoryCache,
            media: updatedMedia,
            timestamp: Date.now()
          };
          saveSessionCache(updatedMedia, memoryCache.storage, memoryCache.etag);
          notifyListeners({ media: updatedMedia, storage: memoryCache.storage });
        }
        return true;
      }
      throw err;
    }
  },

  /**
   * Attach WebSocket listeners for real-time sync across multiple tabs/windows
   */
  attachSocket(socket: Socket | null) {
    if (!socket || attachedSocket === socket) return;
    attachedSocket = socket;

    socket.on('media:updated', (payload: any) => {
      console.log('⚡ [MediaService] WebSocket media:updated received');
      if (Array.isArray(payload?.media)) {
        memoryCache = {
          media: payload.media,
          storage: payload.storage || memoryCache?.storage || null,
          etag: null,
          timestamp: Date.now()
        };
        saveSessionCache(payload.media, memoryCache.storage, null);
        notifyListeners({ media: payload.media, storage: memoryCache.storage });
      } else {
        // Trigger background revalidate if payload was just an announcement
        mediaService.fetchMedia({ force: true }).catch(() => {});
      }
    });

    socket.on('media:deleted', (payload: any) => {
      console.log('⚡ [MediaService] WebSocket media:deleted received:', payload?.mediaId);
      const mediaId = payload?.mediaId;
      if (mediaId && memoryCache) {
        const updatedMedia = memoryCache.media.filter((m) => m._id !== mediaId);
        memoryCache = {
          ...memoryCache,
          media: updatedMedia,
          timestamp: Date.now()
        };
        saveSessionCache(updatedMedia, memoryCache.storage, memoryCache.etag);
        notifyListeners({ media: updatedMedia, storage: memoryCache.storage });
      } else {
        mediaService.fetchMedia({ force: true }).catch(() => {});
      }
    });
  }
};
