export type ChatOverlayTheme = 'default' | 'gta-v' | 'gta-6' | 'minecraft';

export interface ChatThemePreset {
  id: ChatOverlayTheme;
  name: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
  icon: string;
  previewBg: string;
  description: string;
  recommendedSettings: {
    fontFamily: string;
    authorFontFamily: string;
    messageFontFamily: string;
    fontSize: string;
    lineStyle: 'inline' | 'indented' | 'stacked';
    authorColor: string;
    messageColor: string;
    animationStyle: string;
    textShadowStyle: 'none' | 'soft' | 'strong' | 'glow' | 'custom';
    textShadowColor: string;
    textShadowBlur: number;
    textBorderWidth: number;
    textBorderColor: string;
    soundUrl?: string;
  };
}

export const CHAT_THEMES: ChatThemePreset[] = [
  {
    id: 'default',
    name: 'Cyber Neon (Classic)',
    subtitle: 'Original Streamer Layout',
    badge: 'CLASSIC',
    badgeColor: '#00F0FF',
    badgeBorder: 'rgba(0, 240, 255, 0.4)',
    badgeBg: 'rgba(0, 240, 255, 0.1)',
    icon: '⚡',
    previewBg: 'linear-gradient(135deg, #090d18 0%, #030712 100%)',
    description: 'Clean, versatile live chat with customizable typography, colors, animations, and inline/stacked layouts.',
    recommendedSettings: {
      fontFamily: 'Chakra Petch',
      authorFontFamily: 'Chakra Petch',
      messageFontFamily: 'Inter',
      fontSize: 'base',
      lineStyle: 'inline',
      authorColor: '#00F0FF',
      messageColor: '#FFFFFF',
      animationStyle: 'slide-left',
      textShadowStyle: 'none',
      textShadowColor: 'rgba(0, 0, 0, 0.95)',
      textShadowBlur: 0,
      textBorderWidth: 0,
      textBorderColor: '#000000',
      soundUrl: '/sounds/cash-register-kaching.mp3'
    }
  },
  {
    id: 'gta-v',
    name: 'GTA V (Los Santos)',
    subtitle: 'Grand Theft Auto V HUD',
    badge: 'GTA V',
    badgeColor: '#48BB78',
    badgeBorder: 'rgba(72, 187, 120, 0.5)',
    badgeBg: 'rgba(72, 187, 120, 0.12)',
    icon: '⭐',
    previewBg: 'linear-gradient(135deg, #0e1217 0%, #1a202c 100%)',
    description: 'Cinematic Los Santos tactical HUD card with wanted stars, GTA cash green accent borders, and iconic Pricedown / Bebas typography.',
    recommendedSettings: {
      fontFamily: 'Montserrat',
      authorFontFamily: 'Pricedown Bl',
      messageFontFamily: 'Inter',
      fontSize: 'base',
      lineStyle: 'stacked',
      authorColor: '#48BB78',
      messageColor: '#F7FAFC',
      animationStyle: 'slide-left',
      textShadowStyle: 'strong',
      textShadowColor: 'rgba(0, 0, 0, 0.95)',
      textShadowBlur: 4,
      textBorderWidth: 0,
      textBorderColor: '#000000',
      soundUrl: '/sounds/cash-register-kaching.mp3'
    }
  },
  {
    id: 'gta-6',
    name: 'GTA 6 (Vice City)',
    subtitle: 'GTA VI Vice City Sunset',
    badge: 'GTA VI',
    badgeColor: '#FF2A85',
    badgeBorder: 'rgba(255, 42, 133, 0.6)',
    badgeBg: 'rgba(255, 42, 133, 0.2)',
    icon: '🌴',
    previewBg: 'linear-gradient(135deg, #4A0E4E 0%, #BE185D 45%, #EA580C 85%, #F59E0B 100%)',
    description: 'Authentic GTA VI Vice City sunset gradient card background with glowing neon pink/cyan outlines, official Pricedown & Righteous typography, and the signature VI sunset badge.',
    recommendedSettings: {
      fontFamily: 'Righteous',
      authorFontFamily: 'Pricedown Bl',
      messageFontFamily: 'Inter',
      fontSize: 'base',
      lineStyle: 'stacked',
      authorColor: '#00F0FF',
      messageColor: '#FFFFFF',
      animationStyle: 'zoom-in',
      textShadowStyle: 'strong',
      textShadowColor: 'rgba(0, 0, 0, 0.95)',
      textShadowBlur: 4,
      textBorderWidth: 0,
      textBorderColor: '#000000',
      soundUrl: '/sounds/neon-chime.mp3'
    }
  },
  {
    id: 'minecraft',
    name: 'Minecraft (Pixel 8-Bit)',
    subtitle: 'Authentic In-Game Chat HUD',
    badge: 'MINECRAFT',
    badgeColor: '#55FF55',
    badgeBorder: 'rgba(85, 255, 85, 0.5)',
    badgeBg: 'rgba(85, 255, 85, 0.12)',
    icon: '⛏️',
    previewBg: 'linear-gradient(135deg, #141414 0%, #202020 100%)',
    description: 'Authentic Minecraft in-game chat box with blocky pixel fonts, diamond & emerald icons, [VIP] rank brackets, and 8-bit text shadows.',
    recommendedSettings: {
      fontFamily: 'Press Start 2P',
      authorFontFamily: 'Press Start 2P',
      messageFontFamily: 'Press Start 2P',
      fontSize: 'sm',
      lineStyle: 'inline',
      authorColor: '#55FF55',
      messageColor: '#FFFFFF',
      animationStyle: 'fade-in',
      textShadowStyle: 'custom',
      textShadowColor: '#000000',
      textShadowBlur: 0,
      textBorderWidth: 0,
      textBorderColor: '#000000',
      soundUrl: '/sounds/memes/oh-minecraft-oof.mp3'
    }
  }
];
