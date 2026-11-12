export interface ChatAnimationOption {
  id: string;
  name: string;
  category: string;
  desc: string;
}

export const ANIMATION_STYLES: ChatAnimationOption[] = [
  { id: 'slide-left', name: 'Slide Left', category: 'Slide', desc: 'Smooth slide from left' },
  { id: 'slide-right', name: 'Slide Right', category: 'Slide', desc: 'Smooth slide from right' },
  { id: 'slide-up', name: 'Slide Up', category: 'Slide', desc: 'Upward slide from bottom' },
  { id: 'slide-down', name: 'Slide Down', category: 'Slide', desc: 'Downward slide from top' },
  { id: 'fade-in', name: 'Fade In', category: 'Fade', desc: 'Classic opacity fade' },
  { id: 'zoom-in', name: 'Zoom Pop', category: 'Scale', desc: 'Scale pop from center' },
  { id: 'zoom-out', name: 'Zoom Overshoot', category: 'Scale', desc: 'Scale in with overshoot' },
  { id: 'bounce-in', name: 'Bounce Pop', category: 'Bouncy', desc: 'Playful bouncy spring' },
  { id: 'flip-x', name: '3D Flip X', category: '3D', desc: '3D horizontal flip' },
  { id: 'flip-y', name: '3D Flip Y', category: '3D', desc: '3D vertical flip' },
  { id: 'rotate-in', name: 'Rotate Swing', category: 'Rotate', desc: 'Slight tilt & swing in' },
  { id: 'skew-slide', name: 'Cyber Skew', category: 'Cyber', desc: 'Cyberpunk skew slide' },
  { id: 'elastic-drop', name: 'Elastic Drop', category: 'Drop', desc: 'Springy gravity drop' },
  { id: 'blur-in', name: 'Blur Reveal', category: 'Blur', desc: 'Defocus to sharp text' },
  { id: 'glitch-pop', name: 'Glitch Stutter', category: 'Cyber', desc: 'Digital stutter burst' },
  { id: 'neon-pulse', name: 'Neon Pulse', category: 'Glow', desc: 'Cyan neon glow pulse' },
  { id: 'arcade-step', name: '8-Bit Arcade', category: 'Retro', desc: 'Stepped pixel jump' },
  { id: 'shimmer-wave', name: 'Shimmer Wave', category: 'Wave', desc: 'Subtle shimmer wave' },
  { id: 'speed-dash', name: 'Speed Dash', category: 'Speed', desc: 'Fast supersonic dash' },
  { id: 'float-up', name: 'Float Drift', category: 'Float', desc: 'Gentle buoyant rise' }
];

export interface ChatFontOption {
  id: string;
  name: string;
}

export const CHAT_FONTS: ChatFontOption[] = [
  { id: 'Pricedown Bl', name: 'Pricedown (GTA Official)' },
  { id: 'Righteous', name: 'Righteous (Vice City Synth)' },
  { id: 'Russo One', name: 'Russo One (Heavy Impact)' },
  { id: 'Chakra Petch', name: 'Chakra Petch (Cyberpunk)' },
  { id: 'Inter', name: 'Inter (Clean & Modern)' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono (Code / Tech)' },
  { id: 'Orbitron', name: 'Orbitron (Futuristic Sci-Fi)' },
  { id: 'Press Start 2P', name: 'Press Start 2P (Retro 8-Bit)' },
  { id: 'Bebas Neue', name: 'Bebas Neue (Tall Condensed)' },
  { id: 'Kanit', name: 'Kanit (Modern Bold)' },
  { id: 'Montserrat', name: 'Montserrat (Geometric)' },
  { id: 'Permanent Marker', name: 'Permanent Marker (Graffiti / Brush)' },
  { id: 'VT323', name: 'VT323 (Arcade Terminal)' },
  { id: 'Outfit', name: 'Outfit (Sleek Minimal)' },
  { id: 'Poppins', name: 'Poppins (Friendly Round)' }
];

export const CHAT_ANIMATIONS_CSS = `
@import url('https://fonts.cdnfonts.com/css/pricedown');
@import url('https://fonts.googleapis.com/css2?family=Righteous&family=Russo+One&family=Outfit:wght@400;600;700;800;900&family=Poppins:wght@400;600;700;800&display=swap');

/* Completely hide all scrollbars in chat overlay & preview containers */
.no-scrollbar::-webkit-scrollbar,
::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
}
.no-scrollbar,
* {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

@keyframes anim-slide-left {
  0% { opacity: 0; transform: translateX(-40px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes anim-slide-right {
  0% { opacity: 0; transform: translateX(40px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes anim-slide-up {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes anim-slide-down {
  0% { opacity: 0; transform: translateY(-30px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes anim-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes anim-zoom-in {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes anim-zoom-out {
  0% { opacity: 0; transform: scale(1.3); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes anim-bounce-in {
  0% { opacity: 0; transform: scale(0.3); }
  50% { transform: scale(1.08); }
  70% { transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes anim-flip-x {
  0% { opacity: 0; transform: perspective(400px) rotateX(90deg); }
  100% { opacity: 1; transform: perspective(400px) rotateX(0deg); }
}
@keyframes anim-flip-y {
  0% { opacity: 0; transform: perspective(400px) rotateY(90deg); }
  100% { opacity: 1; transform: perspective(400px) rotateY(0deg); }
}
@keyframes anim-rotate-in {
  0% { opacity: 0; transform: rotate(-15deg) scale(0.8); }
  100% { opacity: 1; transform: rotate(0deg) scale(1); }
}
@keyframes anim-skew-slide {
  0% { opacity: 0; transform: skewX(-20deg) translateX(-40px); }
  100% { opacity: 1; transform: skewX(0deg) translateX(0); }
}
@keyframes anim-elastic-drop {
  0% { opacity: 0; transform: translateY(-50px); }
  60% { transform: translateY(8px); }
  80% { transform: translateY(-4px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes anim-blur-in {
  0% { opacity: 0; filter: blur(10px); }
  100% { opacity: 1; filter: blur(0px); }
}
@keyframes anim-glitch-pop {
  0% { opacity: 0; transform: translate(-5px, 3px); }
  25% { opacity: 0.8; transform: translate(5px, -3px); }
  50% { transform: translate(-3px, -2px); }
  75% { transform: translate(2px, 1px); }
  100% { opacity: 1; transform: translate(0, 0); }
}
@keyframes anim-neon-pulse {
  0% { opacity: 0; filter: drop-shadow(0 0 20px #00F0FF); transform: scale(0.95); }
  50% { opacity: 1; filter: drop-shadow(0 0 10px #00F0FF); }
  100% { opacity: 1; filter: none; transform: scale(1); }
}
@keyframes anim-arcade-step {
  0% { opacity: 0; transform: translateY(20px); }
  33% { transform: translateY(14px); }
  66% { transform: translateY(7px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes anim-shimmer-wave {
  0% { opacity: 0; transform: translateX(-15px); }
  50% { opacity: 0.7; }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes anim-speed-dash {
  0% { opacity: 0; transform: translateX(-80px) scaleX(1.4); }
  70% { transform: translateX(5px) scaleX(0.95); }
  100% { opacity: 1; transform: translateX(0) scaleX(1); }
}
@keyframes anim-float-up {
  0% { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}

.chat-anim-slide-left { animation: anim-slide-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-slide-right { animation: anim-slide-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-slide-up { animation: anim-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-slide-down { animation: anim-slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-fade-in { animation: anim-fade-in 0.3s ease-out forwards; }
.chat-anim-zoom-in { animation: anim-zoom-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
.chat-anim-zoom-out { animation: anim-zoom-out 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-bounce-in { animation: anim-bounce-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
.chat-anim-flip-x { animation: anim-flip-x 0.4s ease-out forwards; }
.chat-anim-flip-y { animation: anim-flip-y 0.4s ease-out forwards; }
.chat-anim-rotate-in { animation: anim-rotate-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-skew-slide { animation: anim-skew-slide 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-elastic-drop { animation: anim-elastic-drop 0.5s ease-out forwards; }
.chat-anim-blur-in { animation: anim-blur-in 0.35s ease-out forwards; }
.chat-anim-glitch-pop { animation: anim-glitch-pop 0.35s ease-out forwards; }
.chat-anim-neon-pulse { animation: anim-neon-pulse 0.4s ease-out forwards; }
.chat-anim-arcade-step { animation: anim-arcade-step 0.3s steps(4) forwards; }
.chat-anim-shimmer-wave { animation: anim-shimmer-wave 0.35s ease-out forwards; }
.chat-anim-speed-dash { animation: anim-speed-dash 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.chat-anim-float-up { animation: anim-float-up 0.4s ease-out forwards; }
`;
