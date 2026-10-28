export interface PokemonMeta {
  id: number;
  name: string;
  category: string;
  type: string;
  primaryColor: string;
  secondaryColor: string;
  spriteUrl: string;
  idleSpriteUrl: string;
  fallbackSpriteUrl: string;
  width: number;
  height: number;
  cryText: string;
}

export const POKEMON_ROSTER: PokemonMeta[] = [
  {
    id: 1,
    name: 'Bulbasaur',
    category: 'Seed Pokémon',
    type: 'Grass / Poison',
    primaryColor: '#10B981',
    secondaryColor: '#059669',
    spriteUrl: '/assets/pokemon/1.gif',
    idleSpriteUrl: '/assets/pokemon/1_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/1.gif',
    width: 64,
    height: 60,
    cryText: 'Bulba! Bulbasaur! 🌱'
  },
  {
    id: 4,
    name: 'Charmander',
    category: 'Lizard Pokémon',
    type: 'Fire',
    primaryColor: '#F97316',
    secondaryColor: '#DC2626',
    spriteUrl: '/assets/pokemon/4.gif',
    idleSpriteUrl: '/assets/pokemon/4_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/4.gif',
    width: 60,
    height: 60,
    cryText: 'Char! Char! 🔥'
  },
  {
    id: 7,
    name: 'Squirtle',
    category: 'Tiny Turtle Pokémon',
    type: 'Water',
    primaryColor: '#00F0FF',
    secondaryColor: '#2563EB',
    spriteUrl: '/assets/pokemon/7.gif',
    idleSpriteUrl: '/assets/pokemon/7_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/7.gif',
    width: 60,
    height: 56,
    cryText: 'Squir-tle! 💧'
  },
  {
    id: 25,
    name: 'Pikachu',
    category: 'Mouse Pokémon',
    type: 'Electric',
    primaryColor: '#FACC15',
    secondaryColor: '#EAB308',
    spriteUrl: '/assets/pokemon/25.gif',
    idleSpriteUrl: '/assets/pokemon/25_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/25.gif',
    width: 64,
    height: 64,
    cryText: 'Pika-Pikachu! ⚡'
  },
  {
    id: 133,
    name: 'Eevee',
    category: 'Evolution Pokémon',
    type: 'Normal',
    primaryColor: '#D97706',
    secondaryColor: '#B45309',
    spriteUrl: '/assets/pokemon/133.gif',
    idleSpriteUrl: '/assets/pokemon/133_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/133.gif',
    width: 58,
    height: 58,
    cryText: 'Eev-vee! ✨'
  },
  {
    id: 94,
    name: 'Gengar',
    category: 'Shadow Pokémon',
    type: 'Ghost / Poison',
    primaryColor: '#A855F7',
    secondaryColor: '#7E22CE',
    spriteUrl: '/assets/pokemon/94.gif',
    idleSpriteUrl: '/assets/pokemon/94_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/94.gif',
    width: 66,
    height: 62,
    cryText: 'Gen-garrr! 👻'
  },
  {
    id: 143,
    name: 'Snorlax',
    category: 'Sleeping Pokémon',
    type: 'Normal',
    primaryColor: '#0D9488',
    secondaryColor: '#0F766E',
    spriteUrl: '/assets/pokemon/143.gif',
    idleSpriteUrl: '/assets/pokemon/143_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/143.gif',
    width: 76,
    height: 68,
    cryText: 'Zzz... Snorrr... 💤'
  },
  {
    id: 54,
    name: 'Psyduck',
    category: 'Duck Pokémon',
    type: 'Water',
    primaryColor: '#FBBF24',
    secondaryColor: '#D97706',
    spriteUrl: '/assets/pokemon/54.gif',
    idleSpriteUrl: '/assets/pokemon/54_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/54.gif',
    width: 56,
    height: 56,
    cryText: 'Psy-yi-yi... 🌀'
  },
  {
    id: 39,
    name: 'Jigglypuff',
    category: 'Balloon Pokémon',
    type: 'Normal / Fairy',
    primaryColor: '#F472B6',
    secondaryColor: '#DB2777',
    spriteUrl: '/assets/pokemon/39.gif',
    idleSpriteUrl: '/assets/pokemon/39_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/39.gif',
    width: 54,
    height: 54,
    cryText: 'Jiggly-puff! 🎵'
  },
  {
    id: 151,
    name: 'Mew',
    category: 'New Species Pokémon',
    type: 'Psychic',
    primaryColor: '#EC4899',
    secondaryColor: '#BE185D',
    spriteUrl: '/assets/pokemon/151.gif',
    idleSpriteUrl: '/assets/pokemon/151_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/151.gif',
    width: 58,
    height: 58,
    cryText: 'Mew! Mewww~ 🌸'
  },
  {
    id: 149,
    name: 'Dragonite',
    category: 'Dragon Pokémon',
    type: 'Dragon / Flying',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    spriteUrl: '/assets/pokemon/149.gif',
    idleSpriteUrl: '/assets/pokemon/149_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/149.gif',
    width: 76,
    height: 74,
    cryText: 'Raaawrr! 🐉'
  },
  {
    id: 448,
    name: 'Lucario',
    category: 'Aura Pokémon',
    type: 'Fighting / Steel',
    primaryColor: '#3B82F6',
    secondaryColor: '#1D4ED8',
    spriteUrl: '/assets/pokemon/448.gif',
    idleSpriteUrl: '/assets/pokemon/448_idle.gif',
    fallbackSpriteUrl: '/assets/pokemon/448.gif',
    width: 66,
    height: 70,
    cryText: 'Aura Sphere! 🥋'
  }
];

export function getPokemonById(id: number): PokemonMeta {
  return POKEMON_ROSTER.find((p) => p.id === id) || POKEMON_ROSTER[0];
}

export function getRandomPokemon(allowedIds?: number[]): PokemonMeta {
  const pool = allowedIds && allowedIds.length > 0
    ? POKEMON_ROSTER.filter((p) => allowedIds.includes(p.id))
    : POKEMON_ROSTER;
  const targetPool = pool.length > 0 ? pool : POKEMON_ROSTER;
  const randomIndex = Math.floor(Math.random() * targetPool.length);
  return targetPool[randomIndex];
}
