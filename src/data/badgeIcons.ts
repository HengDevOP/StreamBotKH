import React from 'react';
import {
  Crown,
  Star,
  Flame,
  Sparkles,
  ShieldCheck,
  Shield,
  Zap,
  Heart,
  Trophy,
  Medal,
  Award,
  Gem,
  Swords,
  Gamepad2,
  Skull,
  Ghost,
  Rocket,
  Target,
  Crosshair,
  Bomb,
  Dice5,
  HeartHandshake,
  ThumbsUp,
  Smile,
  Coffee,
  Music,
  Headphones,
  Radio,
  Tv,
  Sun,
  Moon,
  Eye,
  Compass,
  Anchor,
  Key,
  Lock,
  Flag,
  Bell,
  Gift,
  DollarSign,
  Coins,
  Wallet,
  Feather,
  Hexagon,
  BadgeCheck,
  CheckCircle2,
  ShieldAlert,
  Wand2
} from 'lucide-react';

export type BadgeCategory = 'All' | 'Popular' | 'Gaming & Action' | 'Royalty & Ranks' | 'Symbols & Vibes';

export interface BadgeIconDefinition {
  id: string;
  label: string;
  category: 'Popular' | 'Gaming & Action' | 'Royalty & Ranks' | 'Symbols & Vibes';
  icon: React.ElementType;
  keywords?: string[];
}

export const BADGE_ICON_LIST: BadgeIconDefinition[] = [
  // Popular / Defaults
  { id: 'Crown', label: 'Crown', category: 'Popular', icon: Crown, keywords: ['king', 'queen', 'vip', 'royal'] },
  { id: 'Star', label: 'Star', category: 'Popular', icon: Star, keywords: ['favorite', 'rating', 'shine'] },
  { id: 'Flame', label: 'Flame', category: 'Popular', icon: Flame, keywords: ['fire', 'hot', 'streak', 'lit'] },
  { id: 'Sparkles', label: 'Sparkles', category: 'Popular', icon: Sparkles, keywords: ['magic', 'shine', 'glitter', 'stars'] },
  { id: 'ShieldCheck', label: 'Shield Check', category: 'Popular', icon: ShieldCheck, keywords: ['safe', 'verified', 'mod'] },
  { id: 'Zap', label: 'Lightning Zap', category: 'Popular', icon: Zap, keywords: ['electric', 'flash', 'power', 'energy'] },
  { id: 'Heart', label: 'Heart', category: 'Popular', icon: Heart, keywords: ['love', 'like', 'supporter', 'sub'] },
  { id: 'Gem', label: 'Diamond Gem', category: 'Popular', icon: Gem, keywords: ['diamond', 'crystal', 'valuable', 'rich'] },

  // Gaming & Action
  { id: 'Gamepad2', label: 'Gamepad', category: 'Gaming & Action', icon: Gamepad2, keywords: ['game', 'controller', 'gamer', 'play'] },
  { id: 'Swords', label: 'Swords', category: 'Gaming & Action', icon: Swords, keywords: ['combat', 'pvp', 'battle', 'rpg'] },
  { id: 'Trophy', label: 'Trophy', category: 'Gaming & Action', icon: Trophy, keywords: ['winner', 'champion', 'first', 'gold'] },
  { id: 'Medal', label: 'Medal', category: 'Gaming & Action', icon: Medal, keywords: ['reward', 'honor', 'rank'] },
  { id: 'Award', label: 'Award Ribbon', category: 'Gaming & Action', icon: Award, keywords: ['prize', 'achievement'] },
  { id: 'Target', label: 'Target', category: 'Gaming & Action', icon: Target, keywords: ['bullseye', 'aim', 'goal'] },
  { id: 'Crosshair', label: 'Crosshair', category: 'Gaming & Action', icon: Crosshair, keywords: ['fps', 'sniper', 'shooter', 'aim'] },
  { id: 'Skull', label: 'Skull', category: 'Gaming & Action', icon: Skull, keywords: ['death', 'hardcore', 'pirate', 'boss'] },
  { id: 'Ghost', label: 'Ghost', category: 'Gaming & Action', icon: Ghost, keywords: ['spooky', 'phantom', 'spirit'] },
  { id: 'Rocket', label: 'Rocket', category: 'Gaming & Action', icon: Rocket, keywords: ['space', 'boost', 'launch', 'to the moon'] },
  { id: 'Bomb', label: 'Bomb', category: 'Gaming & Action', icon: Bomb, keywords: ['explosive', 'tnt', 'blast'] },
  { id: 'Dice5', label: 'Dice', category: 'Gaming & Action', icon: Dice5, keywords: ['luck', 'random', 'roll', 'gamble'] },

  // Royalty & Ranks
  { id: 'BadgeCheck', label: 'Verified Badge', category: 'Royalty & Ranks', icon: BadgeCheck, keywords: ['official', 'verified', 'approved'] },
  { id: 'CheckCircle2', label: 'Checkmark Circle', category: 'Royalty & Ranks', icon: CheckCircle2, keywords: ['done', 'ok', 'verified'] },
  { id: 'Shield', label: 'Shield', category: 'Royalty & Ranks', icon: Shield, keywords: ['armor', 'defense', 'protect'] },
  { id: 'ShieldAlert', label: 'Shield Alert', category: 'Royalty & Ranks', icon: ShieldAlert, keywords: ['warning', 'security', 'guard'] },
  { id: 'Flag', label: 'Victory Flag', category: 'Royalty & Ranks', icon: Flag, keywords: ['banner', 'goal', 'finish'] },
  { id: 'Key', label: 'Master Key', category: 'Royalty & Ranks', icon: Key, keywords: ['unlock', 'access', 'secret'] },
  { id: 'Lock', label: 'Vault Lock', category: 'Royalty & Ranks', icon: Lock, keywords: ['secure', 'exclusive', 'private'] },
  { id: 'Hexagon', label: 'Hexagon Rank', category: 'Royalty & Ranks', icon: Hexagon, keywords: ['tier', 'badge', 'crypto'] },

  // Symbols & Vibes
  { id: 'Wand2', label: 'Magic Wand', category: 'Symbols & Vibes', icon: Wand2, keywords: ['wizard', 'magic', 'cast', 'glow'] },
  { id: 'HeartHandshake', label: 'Handshake', category: 'Symbols & Vibes', icon: HeartHandshake, keywords: ['partner', 'deal', 'community'] },
  { id: 'ThumbsUp', label: 'Thumbs Up', category: 'Symbols & Vibes', icon: ThumbsUp, keywords: ['like', 'good', 'approve'] },
  { id: 'Smile', label: 'Happy Smile', category: 'Symbols & Vibes', icon: Smile, keywords: ['fun', 'joy', 'smile'] },
  { id: 'Coffee', label: 'Coffee Cup', category: 'Symbols & Vibes', icon: Coffee, keywords: ['cafe', 'drink', 'morning', 'tea'] },
  { id: 'Music', label: 'Music Note', category: 'Symbols & Vibes', icon: Music, keywords: ['song', 'melody', 'beat'] },
  { id: 'Headphones', label: 'Headphones', category: 'Symbols & Vibes', icon: Headphones, keywords: ['audio', 'listen', 'sound'] },
  { id: 'Radio', label: 'Radio Broadcast', category: 'Symbols & Vibes', icon: Radio, keywords: ['live', 'on-air', 'podcast'] },
  { id: 'Tv', label: 'TV Screen', category: 'Symbols & Vibes', icon: Tv, keywords: ['screen', 'monitor', 'display'] },
  { id: 'Sun', label: 'Golden Sun', category: 'Symbols & Vibes', icon: Sun, keywords: ['day', 'warm', 'light', 'bright'] },
  { id: 'Moon', label: 'Crescent Moon', category: 'Symbols & Vibes', icon: Moon, keywords: ['night', 'sleep', 'dark'] },
  { id: 'Eye', label: 'Watcher Eye', category: 'Symbols & Vibes', icon: Eye, keywords: ['look', 'spectator', 'vision'] },
  { id: 'Compass', label: 'Compass', category: 'Symbols & Vibes', icon: Compass, keywords: ['travel', 'explore', 'map'] },
  { id: 'Anchor', label: 'Anchor', category: 'Symbols & Vibes', icon: Anchor, keywords: ['ship', 'ocean', 'heavy'] },
  { id: 'Bell', label: 'Bell Alert', category: 'Symbols & Vibes', icon: Bell, keywords: ['notify', 'ding', 'sub'] },
  { id: 'Gift', label: 'Gift Box', category: 'Symbols & Vibes', icon: Gift, keywords: ['present', 'bonus', 'membership'] },
  { id: 'DollarSign', label: 'Dollar', category: 'Symbols & Vibes', icon: DollarSign, keywords: ['money', 'cash', 'usd', 'tip'] },
  { id: 'Coins', label: 'Coins', category: 'Symbols & Vibes', icon: Coins, keywords: ['currency', 'token', 'gold'] },
  { id: 'Wallet', label: 'Wallet', category: 'Symbols & Vibes', icon: Wallet, keywords: ['funds', 'payment', 'balance'] },
  { id: 'Feather', label: 'Feather', category: 'Symbols & Vibes', icon: Feather, keywords: ['light', 'soft', 'pen', 'write'] }
];

export const BADGE_ICONS_MAP: Record<string, React.ElementType> = Object.fromEntries(
  BADGE_ICON_LIST.map((b) => [b.id.toLowerCase(), b.icon])
);

// Helpful aliases
BADGE_ICONS_MAP['shield'] = ShieldCheck;
BADGE_ICONS_MAP['diamond'] = Gem;
BADGE_ICONS_MAP['fire'] = Flame;
BADGE_ICONS_MAP['lightning'] = Zap;

export function getBadgeIconComponent(iconName?: string): React.ElementType {
  if (!iconName) return Crown;
  const lower = String(iconName).trim().toLowerCase();
  return BADGE_ICONS_MAP[lower] || Crown;
}
