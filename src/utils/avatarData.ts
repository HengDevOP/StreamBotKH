export interface AvatarItem {
  id: string;
  name: string;
  category: 'robot' | 'stream' | 'anime' | 'creature' | 'custom';
  description: string;
  avatarUrl: string;
  celebrateUrl?: string;
  idleUrl?: string;
  defaultScale?: number;
  tag?: string;
}

export const AVATAR_ROSTER: AvatarItem[] = [
  {
    id: 'cyber-bot',
    name: 'StreamBot Pro',
    category: 'robot',
    description: 'Official AI stream companion with futuristic cyber vibes',
    avatarUrl: '/images/streambot-thumbsup-sticker.png',
    celebrateUrl: '/images/streambot-thumbsup-sticker.png',
    tag: 'ORIGINAL'
  },
  {
    id: 'party-parrot',
    name: 'Party Parrot',
    category: 'stream',
    description: 'The cult-classic hyper-vibe dancing parrot for hype moments',
    avatarUrl: '/uploads/presets/gifs/stream_partyparrot_15.webp',
    celebrateUrl: '/uploads/presets/gifs/stream_partyparrot_15.webp',
    tag: 'POPULAR'
  },
  {
    id: 'chibi-layla',
    name: 'Cheerleader Layla',
    category: 'anime',
    description: 'Animated anime cheerleader hyping up your chat and tips',
    avatarUrl: '/mlbb/layla_cheerleader_pompoms.gif',
    celebrateUrl: '/mlbb/layla_celebrate_popper.gif',
    tag: 'ANIMATED'
  },
  {
    id: 'pusheen-snack',
    name: 'Pusheen Kitty',
    category: 'creature',
    description: 'Adorable chubby cat casually wandering and munching snacks',
    avatarUrl: '/uploads/presets/gifs/pusheen_eats_1.gif',
    celebrateUrl: '/uploads/presets/gifs/pusheen_eats_6.gif',
    tag: 'CUTE'
  },
  {
    id: 'pepe-dance',
    name: 'Groove Frog',
    category: 'stream',
    description: 'The legendary meme streamer grooving to the live stream beat',
    avatarUrl: '/uploads/presets/gifs/stream_pepepls_6.webp',
    celebrateUrl: '/uploads/presets/gifs/stream_pepepls_6.webp',
    tag: 'MEME'
  },
  {
    id: 'alien-groove',
    name: 'Alien Dancer',
    category: 'robot',
    description: 'Intergalactic green dancer doing smooth party wave moves',
    avatarUrl: '/uploads/presets/gifs/stream_aliendance_19.webp',
    celebrateUrl: '/uploads/presets/gifs/stream_aliendance_19.webp',
    tag: 'VIBES'
  },
  {
    id: 'electric-mouse',
    name: 'Sparky Runner',
    category: 'creature',
    description: 'High-voltage electric mouse running across your stream floor',
    avatarUrl: '/assets/pokemon/25.gif',
    celebrateUrl: '/assets/pokemon/25_idle.gif',
    tag: 'RETRO'
  },
  {
    id: 'shadow-ghost',
    name: 'Shadow Specter',
    category: 'creature',
    description: 'Cheeky purple phantom floating across the screen',
    avatarUrl: '/assets/pokemon/94.gif',
    celebrateUrl: '/assets/pokemon/94_idle.gif',
    tag: 'SPOOKY'
  },
  {
    id: 'gamer-layla',
    name: 'Pro Gamer Layla',
    category: 'anime',
    description: 'Hardcore gamer girl clutching matches with controller',
    avatarUrl: '/mlbb/layla_gaming_controller.gif',
    celebrateUrl: '/mlbb/layla_champion_trophy.gif',
    tag: 'GAMER'
  },
  {
    id: 'pet-pet',
    name: 'Wholesome PetPet',
    category: 'stream',
    description: 'Warm headpatting friend cheering on the community',
    avatarUrl: '/uploads/presets/gifs/stream_petpet_2.webp',
    celebrateUrl: '/uploads/presets/gifs/stream_petpet_2.webp',
    tag: 'WHOLESOME'
  },
  {
    id: 'cozy-snorlax',
    name: 'Cozy Giant',
    category: 'creature',
    description: 'Chilled-out giant lumbering across the screen in slow motion',
    avatarUrl: '/assets/pokemon/143.gif',
    celebrateUrl: '/assets/pokemon/143_idle.gif',
    tag: 'RELAX'
  },
  {
    id: 'mystic-mew',
    name: 'Mystic Mew',
    category: 'creature',
    description: 'Mythical pink spirit gently drifting across the stream',
    avatarUrl: '/assets/pokemon/151.gif',
    celebrateUrl: '/assets/pokemon/151_idle.gif',
    tag: 'MYTHIC'
  }
];

export function getAvatarById(id: string): AvatarItem {
  return AVATAR_ROSTER.find((a) => a.id === id) || AVATAR_ROSTER[0];
}

export function getRandomAvatar(): AvatarItem {
  const index = Math.floor(Math.random() * AVATAR_ROSTER.length);
  return AVATAR_ROSTER[index];
}
