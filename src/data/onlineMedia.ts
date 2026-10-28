export interface OnlineMediaItem {
  id: string;
  name: string;
  category: 'Cash & Tips' | 'Gaming' | 'Memes' | 'Alerts & Chimes' | 'Hype & Cheers';
  url: string;
  durationSeconds: number;
  icon: string;
  color: string;
  tags: string[];
  description: string;
}

export const POPULAR_ALERT_SOUNDS: OnlineMediaItem[] = [
  {
    id: 'online-cash-register',
    name: 'Classic Cash Register (Ka-Ching!)',
    category: 'Cash & Tips',
    url: '/sounds/cash-register-kaching.mp3',
    durationSeconds: 1.4,
    icon: 'DollarSign',
    color: '#10B981',
    tags: ['money', 'cash', 'tip', 'donation', 'kaching', 'popular'],
    description: 'The golden standard sound effect for monetary donations and superchats.'
  },
  {
    id: 'online-mario-coin',
    name: 'Super Mario Coin Drop',
    category: 'Gaming',
    url: '/sounds/mario-coin.mp3',
    durationSeconds: 0.7,
    icon: 'Sparkles',
    color: '#F59E0B',
    tags: ['mario', 'coin', 'retro', '8bit', 'nintendo', 'pickup'],
    description: 'Crisp, nostalgic 8-bit coin jump sound for gaming livestream tips.'
  },
  {
    id: 'online-neon-chime',
    name: 'Neon Cyber Synth Chime',
    category: 'Alerts & Chimes',
    url: '/sounds/neon-chime.mp3',
    durationSeconds: 2.2,
    icon: 'Volume2',
    color: '#00F0FF',
    tags: ['synth', 'neon', 'cyber', 'clean', 'bell', 'alert'],
    description: 'Futuristic crystalline chime chord designed for high-FPS OBS stream overlays.'
  },
  {
    id: 'online-vine-boom',
    name: 'Vine Boom (Bass Impact)',
    category: 'Memes',
    url: '/sounds/memes/meme-vine-boom.mp3',
    durationSeconds: 0.7,
    icon: 'Flame',
    color: '#EF4444',
    tags: ['vine', 'boom', 'thud', 'bass', 'meme', 'jumpscare'],
    description: 'Heavy cinematic sub-bass hit. The most iconic comedy reaction sound online.'
  },
  {
    id: 'online-emotional-damage',
    name: 'Emotional Damage!',
    category: 'Memes',
    url: '/sounds/memes/meme-emotional-damage.mp3',
    durationSeconds: 1.7,
    icon: 'Zap',
    color: '#8B5CF6',
    tags: ['emotional', 'damage', 'steven he', 'funny', 'asian dad'],
    description: 'Famous comedy shout by Steven He. Perfect for troll or roast donation messages.'
  },
  {
    id: 'online-fbi-open-up',
    name: 'FBI OPEN UP! + Door Breach',
    category: 'Memes',
    url: '/sounds/memes/meme-fbi-open-up.mp3',
    durationSeconds: 2.4,
    icon: 'Megaphone',
    color: '#F43F5E',
    tags: ['fbi', 'open up', 'police', 'door', 'breach', 'loud', 'raid'],
    description: 'Intense megaphone order followed by a door kick. Top-tier dramatic alert sound.'
  },
  {
    id: 'online-john-cena',
    name: 'John Cena Fanfare (🎺 🎺)',
    category: 'Hype & Cheers',
    url: '/sounds/memes/meme-john-cena.mp3',
    durationSeconds: 5.0,
    icon: 'Trophy',
    color: '#10B981',
    tags: ['john cena', 'wwe', 'trumpet', 'fanfare', 'hype', 'victory'],
    description: 'High-energy brass fanfare explosion when a massive VIP donation lands.'
  },
  {
    id: 'online-among-us',
    name: 'Among Us Emergency Reveal',
    category: 'Gaming',
    url: '/sounds/memes/meme-among-us.mp3',
    durationSeconds: 3.1,
    icon: 'Skull',
    color: '#EF4444',
    tags: ['among us', 'sus', 'imposter', 'reveal', 'emergency', 'gaming'],
    description: 'Ominous sci-fi bass ping signaling an imposter or dramatic stream alert.'
  },
  {
    id: 'online-discord-ping',
    name: 'Discord Ghost Notification Ping',
    category: 'Alerts & Chimes',
    url: '/sounds/memes/meme-discord-ping.mp3',
    durationSeconds: 0.4,
    icon: 'Bell',
    color: '#6366F1',
    tags: ['discord', 'ping', 'notification', 'chat', 'direct message'],
    description: 'Hyper-realistic Discord message ping that tricks every streamer into checking chat.'
  },
  {
    id: 'online-windows-startup',
    name: 'Windows XP Startup Chime',
    category: 'Alerts & Chimes',
    url: '/sounds/memes/meme-windows-startup.mp3',
    durationSeconds: 3.7,
    icon: 'Bell',
    color: '#06B6D4',
    tags: ['windows', 'xp', 'startup', 'nostalgia', 'microsoft', 'retro'],
    description: 'Glorious nostalgic synth brass intro from Windows XP. Warm and crowd-pleasing.'
  },
  {
    id: 'online-windows-error',
    name: 'Windows Error Tone (Chord)',
    category: 'Alerts & Chimes',
    url: '/sounds/memes/meme-windows-error.mp3',
    durationSeconds: 0.6,
    icon: 'AlertCircle',
    color: '#F43F5E',
    tags: ['windows', 'error', 'ding', 'chord', 'fail'],
    description: 'Instant classic critical stop sound. Great for prank alerts or small donations.'
  },
  {
    id: 'online-metal-pipe',
    name: 'Metal Pipe Clang Drop',
    category: 'Memes',
    url: '/sounds/memes/meme-metal-pipe.mp3',
    durationSeconds: 1.4,
    icon: 'Activity',
    color: '#06B6D4',
    tags: ['metal pipe', 'clang', 'falling', 'metallic', 'loud', 'random'],
    description: 'Reverberant acoustic hollow pipe hitting floor. Viral internet meme favorite.'
  },
  {
    id: 'online-tactical-nuke',
    name: 'Tactical Nuke Incoming! Siren',
    category: 'Gaming',
    url: '/sounds/memes/meme-tactical-nuke.mp3',
    durationSeconds: 4.8,
    icon: 'Radio',
    color: '#F97316',
    tags: ['cod', 'mw2', 'nuke', 'siren', 'tactical', 'incoming', 'loud'],
    description: 'Call of Duty 25-killstreak alert announcement: Tactical Nuke incoming, it is over!'
  },
  {
    id: 'online-to-be-continued',
    name: 'To Be Continued (Roundabout JoJo)',
    category: 'Memes',
    url: '/sounds/memes/meme-to-be-continued.mp3',
    durationSeconds: 4.8,
    icon: 'Music',
    color: '#F59E0B',
    tags: ['jojo', 'roundabout', 'yes', 'anime', 'cliffhanger', 'to be continued'],
    description: 'Iconic acoustic guitar & driving funk bass groove from JoJos Bizarre Adventure.'
  },
  {
    id: 'online-minecraft-oof',
    name: 'Minecraft Classic OOF',
    category: 'Gaming',
    url: '/sounds/memes/oh-minecraft-oof.mp3',
    durationSeconds: 0.4,
    icon: 'Gamepad2',
    color: '#84CC16',
    tags: ['minecraft', 'steve', 'oof', 'damage', 'hit', 'classic'],
    description: 'The legendary Steves grunt from beta Minecraft when taking fall or lava damage.'
  },
  {
    id: 'online-roblox-oof',
    name: 'Roblox Original OOF',
    category: 'Gaming',
    url: '/sounds/memes/oh-roblox-oof.mp3',
    durationSeconds: 0.5,
    icon: 'Gamepad2',
    color: '#EC4899',
    tags: ['roblox', 'oof', 'death', 'sound effect', 'gaming'],
    description: 'Original high-pitched Roblox character reset sound that defined a decade of memes.'
  },
  {
    id: 'online-stadium-crowd',
    name: 'Stadium Crowd Standing Ovation',
    category: 'Hype & Cheers',
    url: '/sounds/memes/oh-crowd.mp3',
    durationSeconds: 2.8,
    icon: 'Heart',
    color: '#EC4899',
    tags: ['cheer', 'applause', 'crowd', 'standing ovation', 'clap', 'vip'],
    description: 'Thunderous stadium cheer with whistles and applause for major tip achievements.'
  },
  {
    id: 'online-sad-violin',
    name: 'Sad Violin Dramatic Solo',
    category: 'Memes',
    url: '/sounds/memes/meme-sad-violin.mp3',
    durationSeconds: 2.3,
    icon: 'Music',
    color: '#8B5CF6',
    tags: ['sad', 'violin', 'crying', 'dramatic', 'melodrama', 'fail'],
    description: 'Weepy orchestral violin solo for emotional stories or game over reactions.'
  },
  {
    id: 'online-spongebob-fail',
    name: 'SpongeBob Fail (Womp Womp)',
    category: 'Memes',
    url: '/sounds/memes/meme-spongebob-fail.mp3',
    durationSeconds: 1.7,
    icon: 'Frown',
    color: '#F59E0B',
    tags: ['spongebob', 'fail', 'womp womp', 'trombone', 'cartoon'],
    description: 'Classic muted brass wah-wah-wah-waaah trombone drop when plans go wrong.'
  },
  {
    id: 'online-baby-triple',
    name: 'Oh Baby A Triple! (MLG Hype)',
    category: 'Hype & Cheers',
    url: '/sounds/memes/oh-baby-a-triple.mp3',
    durationSeconds: 2.4,
    icon: 'Zap',
    color: '#06B6D4',
    tags: ['oh baby a triple', 'mlg', 'sniper', 'cod', 'clutch', 'hype'],
    description: 'The golden age of Call of Duty montage parodies. Pure unrestrained celebration.'
  }
];

export const ONLINE_MEDIA_CATEGORIES = [
  'All',
  'Cash & Tips',
  'Gaming',
  'Memes',
  'Alerts & Chimes',
  'Hype & Cheers'
] as const;
