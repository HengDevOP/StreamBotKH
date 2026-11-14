import { KHMER_FONTS_2019 } from './khmerFonts';

export interface LeaderboardFontOption {
  id: string;
  name: string;
  category: 'English & Gaming' | 'Khmer Unicode' | 'KhmerAng Studio' | 'System & Web';
}

export const LEADERBOARD_GOOGLE_FONTS_CSS = `
@import url('https://fonts.cdnfonts.com/css/pricedown');
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Audiowide&family=Battambang:wght@400;700;900&family=Bayon&family=Bebas+Neue&family=Bokor&family=Bungee&family=Chakra+Petch:wght@400;600;700;800&family=Chenla&family=Cinzel:wght@600;800&family=Comic+Neue:wght@700&family=Content:wght@400;700&family=Dangrek&family=Fasthand&family=Fira+Code:wght@500;700&family=Freehand&family=Hanuman:wght@400;700;900&family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Kanit:wght@400;600;700;800&family=Kantumruy+Pro:wght@400;600;700&family=Kdam+Thmor+Pro&family=Khmer&family=Koh+Santepheap:wght@400;700;900&family=Koulen&family=Lobster&family=Metal&family=Montserrat:wght@500;700;800;900&family=Moul&family=Moulpali&family=Nokora:wght@400;700;900&family=Noto+Sans+Khmer:wght@400;600;700;900&family=Odor+Mean+Chey&family=Open+Sans:wght@600;700;800&family=Orbitron:wght@500;700;900&family=Oswald:wght@500;700&family=Outfit:wght@500;700;800&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:wght@700;900&family=Poppins:wght@500;600;700;800&family=Preahvihear&family=Press+Start+2P&family=Rajdhani:wght@600;700&family=Righteous&family=Roboto:wght@500;700;900&family=Russo+One&family=Siemreap&family=Space+Grotesk:wght@500;700&family=Suwannaphum:wght@400;700;900&family=Taprom&family=Teko:wght@600;700&family=VT323&display=swap');
`;

const ENGLISH_AND_GAMING_FONTS: LeaderboardFontOption[] = [
  { id: 'Chakra Petch', name: 'Chakra Petch', category: 'English & Gaming' },
  { id: 'Inter', name: 'Inter', category: 'English & Gaming' },
  { id: 'Montserrat', name: 'Montserrat', category: 'English & Gaming' },
  { id: 'Orbitron', name: 'Orbitron', category: 'English & Gaming' },
  { id: 'Bebas Neue', name: 'Bebas Neue', category: 'English & Gaming' },
  { id: 'Kanit', name: 'Kanit', category: 'English & Gaming' },
  { id: 'Outfit', name: 'Outfit', category: 'English & Gaming' },
  { id: 'Poppins', name: 'Poppins', category: 'English & Gaming' },
  { id: 'Russo One', name: 'Russo One', category: 'English & Gaming' },
  { id: 'Righteous', name: 'Righteous', category: 'English & Gaming' },
  { id: 'Pricedown Bl', name: 'Pricedown (GTA)', category: 'English & Gaming' },
  { id: 'Press Start 2P', name: 'Press Start 2P (8-Bit)', category: 'English & Gaming' },
  { id: 'VT323', name: 'VT323 (Terminal)', category: 'English & Gaming' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono', category: 'English & Gaming' },
  { id: 'Fira Code', name: 'Fira Code', category: 'English & Gaming' },
  { id: 'Space Grotesk', name: 'Space Grotesk', category: 'English & Gaming' },
  { id: 'Rajdhani', name: 'Rajdhani', category: 'English & Gaming' },
  { id: 'Teko', name: 'Teko', category: 'English & Gaming' },
  { id: 'Oswald', name: 'Oswald', category: 'English & Gaming' },
  { id: 'Anton', name: 'Anton', category: 'English & Gaming' },
  { id: 'Bungee', name: 'Bungee', category: 'English & Gaming' },
  { id: 'Audiowide', name: 'Audiowide', category: 'English & Gaming' },
  { id: 'Permanent Marker', name: 'Permanent Marker', category: 'English & Gaming' },
  { id: 'Cinzel', name: 'Cinzel', category: 'English & Gaming' },
  { id: 'Playfair Display', name: 'Playfair Display', category: 'English & Gaming' },
  { id: 'Roboto', name: 'Roboto', category: 'English & Gaming' },
  { id: 'Open Sans', name: 'Open Sans', category: 'English & Gaming' },
  { id: 'Lobster', name: 'Lobster', category: 'English & Gaming' },
  { id: 'Pacifico', name: 'Pacifico', category: 'English & Gaming' },
  { id: 'Comic Neue', name: 'Comic Neue', category: 'English & Gaming' }
];

const KHMER_UNICODE_FONTS: LeaderboardFontOption[] = [
  { id: 'Koulen', name: 'Koulen (គូលែន)', category: 'Khmer Unicode' },
  { id: 'Battambang', name: 'Battambang (បាត់ដំបង)', category: 'Khmer Unicode' },
  { id: 'Kantumruy Pro', name: 'Kantumruy Pro (កន្ទុំរុយ)', category: 'Khmer Unicode' },
  { id: 'Noto Sans Khmer', name: 'Noto Sans Khmer', category: 'Khmer Unicode' },
  { id: 'Moul', name: 'Moul (មូល)', category: 'Khmer Unicode' },
  { id: 'Bayon', name: 'Bayon (បាយ័ន)', category: 'Khmer Unicode' },
  { id: 'Siemreap', name: 'Siemreap (សៀមរាប)', category: 'Khmer Unicode' },
  { id: 'Hanuman', name: 'Hanuman (ហនុមាន)', category: 'Khmer Unicode' },
  { id: 'Koh Santepheap', name: 'Koh Santepheap (កោះសន្តិភាព)', category: 'Khmer Unicode' },
  { id: 'Kdam Thmor Pro', name: 'Kdam Thmor Pro (ក្ដាមថ្ម)', category: 'Khmer Unicode' },
  { id: 'Odor Mean Chey', name: 'Odor Mean Chey (ឧត្តរមានជ័យ)', category: 'Khmer Unicode' },
  { id: 'Preahvihear', name: 'Preahvihear (ព្រះវិហារ)', category: 'Khmer Unicode' },
  { id: 'Dangrek', name: 'Dangrek (ដងរែក)', category: 'Khmer Unicode' },
  { id: 'Bokor', name: 'Bokor (បូកគោ)', category: 'Khmer Unicode' },
  { id: 'Suwannaphum', name: 'Suwannaphum (សុវណ្ណភូមិ)', category: 'Khmer Unicode' },
  { id: 'Nokora', name: 'Nokora (នគរា)', category: 'Khmer Unicode' },
  { id: 'Khmer', name: 'Khmer Standard', category: 'Khmer Unicode' },
  { id: 'Content', name: 'Content Khmer', category: 'Khmer Unicode' },
  { id: 'Chenla', name: 'Chenla (ចេនឡា)', category: 'Khmer Unicode' },
  { id: 'Moulpali', name: 'Moulpali (មូលបាលី)', category: 'Khmer Unicode' },
  { id: 'Metal', name: 'Metal (មេតាល់)', category: 'Khmer Unicode' },
  { id: 'Taprom', name: 'Taprom (តាព្រហ្ម)', category: 'Khmer Unicode' },
  { id: 'Fasthand', name: 'Fasthand Khmer', category: 'Khmer Unicode' },
  { id: 'Freehand', name: 'Freehand Khmer', category: 'Khmer Unicode' }
];

const KHMER_ANG_STUDIO_FONTS: LeaderboardFontOption[] = KHMER_FONTS_2019.map((f) => ({
  id: f.family,
  name: f.name,
  category: f.category === 'English & Display' ? 'English & Gaming' : 'KhmerAng Studio'
}));

const SYSTEM_WEB_FONTS: LeaderboardFontOption[] = [
  { id: 'system-ui', name: 'System Default UI', category: 'System & Web' },
  { id: 'Arial', name: 'Arial', category: 'System & Web' },
  { id: 'Impact', name: 'Impact', category: 'System & Web' },
  { id: 'Verdana', name: 'Verdana', category: 'System & Web' },
  { id: 'Trebuchet MS', name: 'Trebuchet MS', category: 'System & Web' },
  { id: 'Georgia', name: 'Georgia', category: 'System & Web' },
  { id: 'Times New Roman', name: 'Times New Roman', category: 'System & Web' },
  { id: 'Courier New', name: 'Courier New', category: 'System & Web' }
];

// Deduplicate by font id while preserving order
const seenIds = new Set<string>();
export const ALL_CLIENT_FONTS: LeaderboardFontOption[] = [
  ...ENGLISH_AND_GAMING_FONTS,
  ...KHMER_UNICODE_FONTS,
  ...KHMER_ANG_STUDIO_FONTS,
  ...SYSTEM_WEB_FONTS
].filter((f) => {
  if (seenIds.has(f.id)) return false;
  seenIds.add(f.id);
  return true;
});
