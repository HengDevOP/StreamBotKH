'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronDown,
  Bell,
  Layers,
  Video,
  Trophy,
  Volume2,
  Disc,
  Target,
  Timer,
  Tv,
  Gamepad2,
  Youtube,
  Facebook,
  Instagram,
  Flame,
  HardDrive,
  QrCode,
  MessageSquare,
  Activity,
  CreditCard,
  DollarSign,
  Sparkles,
  Headphones,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onNavigate?: (page: string, params?: any) => void;
  currentPage?: string;
}

// Official 4-color Google Icon (Properly sized 20x20 matching Google Identity specifications)
const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

// Official Discord Icon
const DiscordIcon = () => (
  <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

// Official Telegram Icon
const TelegramIcon = () => (
  <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.195 1.006.128.832.942z" />
  </svg>
);

export interface MegaMenuItem {
  title: string;
  sub: string;
  href: string;
  icon: any;
  color?: string;
  badge?: string;
  actionText?: string;
}

export interface MegaMenuSection {
  header: string;
  items: MegaMenuItem[];
}

// Categorized Products Mega Menu Columns
const PRODUCTS_MENU_SECTIONS: MegaMenuSection[] = [
  {
    header: 'Overlays & Alerts',
    items: [
      {
        title: 'Alert Box',
        sub: 'Instant Bakong KHQR, ABA & ACLEDA 60 FPS alerts',
        href: '/resources/donations-alerts',
        icon: Bell,
        color: '#00F0FF',
        badge: '0.02s'
      },
      {
        title: 'Video Share',
        sub: 'YouTube media share player & video donor cheers',
        href: '/resources/video-alerts',
        icon: Video,
        color: '#EC4899',
        badge: 'OBS'
      },
      {
        title: 'Khmer AI TTS',
        sub: 'Automated Cambodian neural voice donor speech reader',
        href: '/creator?tab=tts',
        icon: Volume2,
        color: '#10B981',
        badge: 'VOICE'
      },
      {
        title: 'Custom Overlay Studio',
        sub: 'Drag-and-drop multi-widget broadcast layout studio',
        href: '/creator?tab=custom-overlay',
        icon: Layers,
        color: '#8B5CF6'
      },
      {
        title: 'Theme Library',
        sub: 'Custom streamer overlay themes and neon presets',
        href: '/resources/media-share',
        icon: Sparkles,
        color: '#F59E0B'
      }
    ]
  },
  {
    header: 'Widgets & Interactive',
    items: [
      {
        title: 'Live Chat Widget',
        sub: 'Multistream unified chat for OBS Studio & vMix',
        href: '/creator?tab=live-chat',
        icon: MessageSquare,
        color: '#00F0FF',
        badge: 'SYNC'
      },
      {
        title: 'Goal Tracker',
        sub: 'Realtime stream donation and subscriber goals',
        href: '/resources/goal',
        icon: Target,
        color: '#14B8A6'
      },
      {
        title: 'Leaderboard',
        sub: 'Top tipper rankings & VIP donor hall of fame',
        href: '/resources/leaderboard',
        icon: Trophy,
        color: '#F59E0B'
      },
      {
        title: '2D Pokémon Avatars',
        sub: 'Retro chat avatars & interactive interactive sprites',
        href: '/resources/2d-pokemon',
        icon: Gamepad2,
        color: '#10B981',
        actionText: 'Studio Preview'
      },
      {
        title: 'Spinning Wheel',
        sub: 'Custom lucky wheel giveaways & interactive chat games',
        href: '/resources/wheels',
        icon: Disc,
        color: '#EC4899'
      },
      {
        title: 'Subathon Timer',
        sub: 'Dynamic live countdown clock with auto tip extensions',
        href: '/resources/timer',
        icon: Timer,
        color: '#F97316'
      }
    ]
  },
  {
    header: 'Monetization & Television',
    items: [
      {
        title: 'Direct KHQR Tipping',
        sub: 'Zero platform cuts, instant ABA & Bakong transfers',
        href: '/creator?tab=payments',
        icon: CreditCard,
        color: '#00F0FF',
        badge: '0% FEE'
      },
      {
        title: 'StreamBot Television',
        sub: '24/7 Creator broadcast station & multi-view player',
        href: '/tv',
        icon: Tv,
        color: '#10B981',
        badge: 'LIVE'
      },
      {
        title: 'Subscribers & Members',
        sub: 'Tiered monthly supporter perks & badges',
        href: '/creator?tab=subscribers',
        icon: Sparkles,
        color: '#A855F7'
      },
      {
        title: 'Soundboard',
        sub: 'Hotkey sound effects engine with instant play',
        href: '/resources/soundboard',
        icon: Headphones,
        color: '#F97316'
      },
      {
        title: 'Media Cloud Storage',
        sub: 'Unlimited storage for MP4, GIF & sound effects',
        href: '/creator?tab=media',
        icon: HardDrive,
        color: '#3B82F6'
      }
    ]
  }
];

// Flat list for quick reference
const RESOURCE_FEATURES = PRODUCTS_MENU_SECTIONS.flatMap((s) => s.items);

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, loading, loginWithGoogleRedirect } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  const active = (path: string, key: string) => {
    if (currentPage) return currentPage === key;
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  const handleNav = (path: string, key: string, params?: any) => {
    if (key === 'login' || path === '/login') {
      setMobileMenuOpen(false);
      setDropdownOpen(false);
      loginWithGoogleRedirect();
      return;
    }
    if (key === 'documentation' || path === '/documentation' || path === '/docs' || key === 'documents' || path === '/documents') {
      setMobileMenuOpen(false);
      setDropdownOpen(false);
      window.open('/documentation', '_blank');
      return;
    }
    if (key === 'home' || path === '/') {
      if (pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    if (onNavigate) {
      onNavigate(key, params);
    } else {
      navigate(path);
    }
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  const handleMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#080D1A]/50 backdrop-blur-xl border-b border-white/[0.05] shadow-[0_4px_30px_rgba(0,0,0,0.35)] transition-colors duration-300">
      <div className="max-w-[1720px] 2xl:max-w-[1840px] mx-auto px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        {/* Expanded Navbar Height: h-16 sm:h-20 lg:h-20 */}
        <div className="flex items-center justify-between h-16 sm:h-20 lg:h-20">
          {/* Left: Mobile Menu Toggle + Logo + Title ("streambotkh.com") + Nav Menu */}
          <div className="flex items-center gap-3 sm:gap-5 lg:gap-7 min-w-0">
            {/* Mobile menu toggle on the left side */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors flex-shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Logo on the left & Title "StreamWidgets" (Links to Home) */}
            <Link
              to="/"
              onClick={(e) => {
                if (pathname === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('home');
                }
              }}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none min-w-0 mr-1 sm:mr-3"
            >
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/logo-192.png"
                  alt="StreamWidgets logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-[0_0_10px_rgba(0,240,255,0.45)] group-hover:scale-105 group-hover:drop-shadow-[0_0_15px_rgba(0,240,255,0.7)] transition-all duration-200"
                />
              </div>

              <div className="flex items-center min-w-0">
                <span className="text-base sm:text-xl font-extrabold tracking-tight text-white font-['Chakra_Petch'] truncate">
                  Stream<span className="text-cyan-400">Widgets</span>
                </span>
              </div>
            </Link>

            {/* Nav Menu directly after title with own route links (No Home, replaced with Products) */}
            <nav className="hidden md:flex items-center gap-1.5 lg:gap-2.5 pl-4 lg:pl-6 border-l border-white/10">
              {/* 1. Products Dropdown (Hover or Click) */}
              <div
                ref={dropdownContainerRef}
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dropdownTimeoutRef.current) {
                      clearTimeout(dropdownTimeoutRef.current);
                    }
                    setDropdownOpen((prev) => !prev);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-[15px] font-bold tracking-wide transition-colors ${
                    dropdownOpen || active('/resources', 'resources') || active('/creator', 'creator')
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span>Products</span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180 text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                </button>

                {/* Mega Dropdown Menu matching exact main card design */}
                {dropdownOpen && (
                  <div
                    data-mega-menu="true"
                    className="mega-menu-container absolute top-full left-[-20px] lg:left-[-60px] xl:left-[-80px] mt-2.5 w-[94vw] max-w-[1020px] p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#0C1222]/98 via-[#070A14]/98 to-[#090E1D]/98 border-2 border-white/15 shadow-2xl z-50 animate-dropdown-slide backdrop-blur-2xl"
                    style={{
                      boxShadow: '0 25px 65px -15px rgba(0,0,0,0.95), 0 0 45px rgba(255,255,255,0.06)'
                    }}
                  >
                    {/* Subtle Cyber Grid matching Main Card */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-2xl" />

                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 select-none">
                      {PRODUCTS_MENU_SECTIONS.map((section) => (
                        <div key={section.header} className="space-y-3">
                          <div className="mega-menu-header text-xs font-bold text-slate-300 uppercase tracking-wider font-mono pb-1.5 border-b border-white/10 flex items-center justify-between">
                            <span>{section.header}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
                          </div>
                          <div className="space-y-1">
                            {section.items.map((item) => {
                              const IconComp = item.icon;
                              return (
                                <div
                                  key={item.title}
                                  onClick={() => {
                                    setDropdownOpen(false);
                                    handleNav(item.href, item.href.replace(/^\//, ''));
                                  }}
                                  className="mega-menu-item p-2.5 rounded-xl cursor-pointer transition-all hover:bg-white/[0.06] group"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="mega-menu-icon w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                                      style={{
                                        backgroundColor: `${item.color || '#00F0FF'}15`,
                                        color: item.color || '#00F0FF'
                                      }}
                                    >
                                      <IconComp size={17} />
                                    </div>
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="mega-menu-title text-sm font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight">
                                          {item.title}
                                        </span>
                                        {item.badge && (
                                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold uppercase tracking-wider">
                                            {item.badge}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mega-menu-sub text-xs text-slate-400 leading-tight">
                                        {item.sub}
                                      </div>
                                      {item.actionText && (
                                        <div className="pt-1">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-[10px] font-mono transition-colors shadow-sm shadow-emerald-500/20">
                                            <span>{item.actionText}</span>
                                            <ArrowRight size={10} />
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Status & Hub Bar */}
                    <div className="relative z-10 mega-menu-footer mt-5 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] text-slate-300">
                          All OBS &amp; Payment Nodes Operational • 0% Platform Fee
                        </span>
                      </div>
                      <a
                        href="/documentation"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setDropdownOpen(false)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>Explore All Creator Hub Docs</span>
                        <ArrowRight size={12} />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Television Direct Live Stream Route */}
              <Link
                to="/tv"
                className={`flex items-center px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-[15px] font-bold tracking-wide transition-colors ${
                  active('/tv', 'tv')
                    ? 'text-emerald-400 font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Television</span>
              </Link>

              {/* 3. Pricing Route (/pricing) */}
              <Link
                to="/pricing"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('pricing');
                  }
                }}
                className={`px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-[15px] font-bold tracking-wide transition-colors ${
                  active('/pricing', 'pricing')
                    ? 'text-white font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Pricing
              </Link>

              {/* 4. Documentations Route (Opens in new window page) */}
              <a
                href="/documentation"
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3.5 lg:px-4 py-2 sm:py-2.5 rounded-xl text-sm sm:text-[15px] font-bold tracking-wide transition-colors ${
                  active('/documentation', 'documentation') || active('/docs', 'docs')
                    ? 'text-white font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Documentations
              </a>
            </nav>
          </div>

          {/* Right Section: Social Icons & Google Auth / Profile */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Social Redirect Icons: Telegram & Discord */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <a
                href="https://t.me/streambotkh"
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram Channel (t.me/streambotkh)"
                className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-[#229ED9] hover:bg-white/[0.08] transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Telegram"
              >
                <TelegramIcon />
              </a>

              <a
                href="https://discord.gg/streambotkh"
                target="_blank"
                rel="noopener noreferrer"
                title="Discord Community (discord.gg/streambotkh)"
                className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-[#5865F2] hover:bg-white/[0.08] transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Discord"
              >
                <DiscordIcon />
              </a>
            </div>

            {/* User authenticated: Show Profile avatar */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/creator"
                  title="Creator Panel"
                  onClick={(e) => {
                    if (onNavigate) {
                      e.preventDefault();
                      onNavigate('creator');
                    }
                  }}
                  className="p-0.5 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all flex items-center justify-center group flex-shrink-0"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.displayName || 'Profile'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                  />
                </Link>
              </div>
            ) : loading ? (
              /* Sleek Avatar Skeleton while verifying auth */
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/80 border border-slate-800/80 animate-pulse flex items-center justify-center p-0.5 flex-shrink-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href={`/api/auth/google?origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                  onClick={(e) => {
                    e.preventDefault();
                    loginWithGoogleRedirect();
                  }}
                  className="group relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-white/[0.25] text-white text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer flex-shrink-0 shadow-sm"
                >
                  <GoogleIcon />
                  <span className="hidden sm:inline">Sign in with Google</span>
                  <span className="hidden xxs:inline sm:hidden">Sign in</span>
                  <span className="xxs:hidden">Login</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================== MOBILE SLIDE-DOWN MENU ===================== */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A0E1A]/98 backdrop-blur-2xl px-4 py-4 space-y-2 max-h-[85vh] overflow-y-auto">
          {/* 1. Products Accordion (Replaces "Home") */}
          <div>
            <button
              onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-white/[0.04] flex items-center justify-between"
            >
              <span>Products</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${
                  mobileProductsOpen ? 'rotate-180 text-cyan-400' : 'text-slate-400'
                }`}
              />
            </button>

            {mobileProductsOpen && (
              <div className="pl-2 space-y-3 py-2 border-l border-white/10 ml-2 my-1">
                {PRODUCTS_MENU_SECTIONS.map((sec) => (
                  <div key={sec.header} className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 block">
                      {sec.header}
                    </span>
                    <div className="space-y-0.5">
                      {sec.items.map((item) => {
                        const IconComp = item.icon;
                        return (
                          <button
                            key={item.title}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              handleNav(item.href, item.href.replace(/^\//, ''));
                            }}
                            className="w-full text-left px-2 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 flex items-center justify-between gap-2 group"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${item.color || '#00F0FF'}15`,
                                  color: item.color || '#00F0FF'
                                }}
                              >
                                <IconComp size={13} />
                              </span>
                              <span className="truncate font-semibold">{item.title}</span>
                            </span>
                            {item.badge ? (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-mono font-bold">
                                {item.badge}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                                {item.sub}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Television Direct Link */}
          <button
            onClick={() => handleNav('/tv', 'tv')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold flex items-center ${
              active('/tv', 'tv')
                ? 'text-emerald-400 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Television</span>
          </button>

          {/* 3. Pricing */}
          <button
            onClick={() => handleNav('/pricing', 'pricing')}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold ${
              active('/pricing', 'pricing')
                ? 'text-white font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Pricing
          </button>

          {/* 4. Documentations */}
          <a
            href="/documentation"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold block ${
              active('/documentation', 'documentation') || active('/docs', 'docs')
                ? 'text-white font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Documentations
          </a>

          {/* Social Links on Mobile */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-2">
            <a
              href="https://t.me/streambotkh"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] border border-white/10"
            >
              Telegram
            </a>
            <a
              href="https://discord.gg/streambotkh"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] border border-white/10"
            >
              Discord
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
