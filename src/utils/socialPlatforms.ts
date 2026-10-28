export interface SocialLinkItem {
  id: string;
  url: string;
  title?: string;
  platform?: string;
  icon?: string;
  color?: string;
}

export function detectPlatform(rawUrl: string): {
  platform: string;
  defaultTitle: string;
  iconUrl: string;
  color: string;
  brandColor: string;
} {
  const url = (rawUrl || '').trim();
  const lower = url.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return {
      platform: 'youtube',
      defaultTitle: 'YouTube',
      iconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
      color: '#FF0000',
      brandColor: 'bg-red-500/15 text-red-400 border-red-500/30 hover:border-red-400'
    };
  }

  if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch')) {
    return {
      platform: 'facebook',
      defaultTitle: 'Facebook',
      iconUrl: 'https://www.google.com/s2/favicons?domain=facebook.com&sz=64',
      color: '#1877F2',
      brandColor: 'bg-blue-600/15 text-blue-400 border-blue-500/30 hover:border-blue-400'
    };
  }

  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return {
      platform: 'instagram',
      defaultTitle: 'Instagram',
      iconUrl: 'https://www.google.com/s2/favicons?domain=instagram.com&sz=64',
      color: '#E4405F',
      brandColor: 'bg-pink-600/15 text-pink-400 border-pink-500/30 hover:border-pink-400'
    };
  }

  if (lower.includes('tiktok.com')) {
    return {
      platform: 'tiktok',
      defaultTitle: 'TikTok',
      iconUrl: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=64',
      color: '#FE2C55',
      brandColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:border-cyan-400'
    };
  }

  if (lower.includes('t.me') || lower.includes('telegram.me')) {
    return {
      platform: 'telegram',
      defaultTitle: 'Telegram',
      iconUrl: 'https://www.google.com/s2/favicons?domain=telegram.org&sz=64',
      color: '#229ED9',
      brandColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30 hover:border-sky-400'
    };
  }

  if (lower.includes('discord.gg') || lower.includes('discord.com')) {
    return {
      platform: 'discord',
      defaultTitle: 'Discord',
      iconUrl: 'https://www.google.com/s2/favicons?domain=discord.com&sz=64',
      color: '#5865F2',
      brandColor: 'bg-indigo-600/15 text-indigo-300 border-indigo-500/30 hover:border-indigo-400'
    };
  }

  if (lower.includes('twitch.tv')) {
    return {
      platform: 'twitch',
      defaultTitle: 'Twitch',
      iconUrl: 'https://www.google.com/s2/favicons?domain=twitch.tv&sz=64',
      color: '#9146FF',
      brandColor: 'bg-purple-600/15 text-purple-300 border-purple-500/30 hover:border-purple-400'
    };
  }

  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return {
      platform: 'twitter',
      defaultTitle: 'X (Twitter)',
      iconUrl: 'https://www.google.com/s2/favicons?domain=x.com&sz=64',
      color: '#E7E9EA',
      brandColor: 'bg-slate-700/30 text-white border-slate-600/40 hover:border-slate-400'
    };
  }

  if (lower.includes('kick.com')) {
    return {
      platform: 'kick',
      defaultTitle: 'Kick',
      iconUrl: 'https://www.google.com/s2/favicons?domain=kick.com&sz=64',
      color: '#53FC18',
      brandColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
    };
  }

  if (lower.includes('github.com')) {
    return {
      platform: 'github',
      defaultTitle: 'GitHub',
      iconUrl: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
      color: '#F0F6FC',
      brandColor: 'bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
    };
  }

  // Generic website: extract domain and use Google's 64px favicon proxy
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, '');
    return {
      platform: 'website',
      defaultTitle: host || 'Website',
      iconUrl: `https://www.google.com/s2/favicons?domain=${host}&sz=64`,
      color: '#00F0FF',
      brandColor: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40 hover:border-cyan-400'
    };
  } catch {
    return {
      platform: 'website',
      defaultTitle: 'Website',
      iconUrl: 'https://www.google.com/s2/favicons?domain=google.com&sz=64',
      color: '#00F0FF',
      brandColor: 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40 hover:border-cyan-400'
    };
  }
}

export function sanitizeSocialLinks(rawLinks: any[], isPro: boolean): SocialLinkItem[] {
  if (!Array.isArray(rawLinks)) return [];
  const maxAllowed = isPro ? 5 : 1;

  const sanitized: SocialLinkItem[] = [];
  for (const item of rawLinks.slice(0, maxAllowed)) {
    if (!item) continue;
    let url = typeof item === 'string' ? item.trim() : String(item.url || '').trim();
    if (!url) continue;

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const detected = detectPlatform(url);
    const title = (typeof item === 'object' && item.title ? String(item.title).trim() : '') || detected.defaultTitle;
    const id = (typeof item === 'object' && item.id ? String(item.id) : '') || `link-${Math.random().toString(36).slice(2, 9)}`;

    sanitized.push({
      id,
      url,
      title,
      platform: detected.platform,
      icon: detected.iconUrl,
      color: detected.color
    });
  }

  return sanitized;
}
