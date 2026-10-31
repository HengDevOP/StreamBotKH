'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
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

// Official 4-color Google Icon
const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

// Official Telegram Icon
const TelegramIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
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

// 4 Categorized Mega Menu Columns matching Streamlabs-style Architecture
const MEGA_MENU_SECTIONS: MegaMenuSection[] = [
  {
    header: 'Most popular',
    items: [
      {
        title: '2D Pokémon',
        sub: 'Interactive chat avatars & retro bubbles',
        href: '/resources/2d-pokemon',
        icon: Gamepad2,
        color: '#10B981',
        actionText: 'Studio Preview'
      },
      {
        title: 'Donation Alerts',
        sub: 'Dynamic Bakong KHQR & ABA alerts',
        href: '/resources/donations-alerts',
        icon: Bell,
        color: '#00F0FF'
      },
      {
        title: 'Leaderboard',
        sub: 'Top supporter rankings & 20 themes',
        href: '/resources/leaderboard',
        icon: Trophy,
        color: '#F59E0B'
      },
      {
        title: 'Video Alerts',
        sub: 'YouTube media share & video clips',
        href: '/resources/video-alerts',
        icon: Video,
        color: '#EC4899'
      },
      {
        title: 'Theme Library',
        sub: 'Widget themes & stream overlays',
        href: '/resources/media-share',
        icon: Layers,
        color: '#6366F1'
      }
    ]
  },
  {
    header: 'Stream and record',
    items: [
      {
        title: 'StreamBot TV',
        sub: 'Live broadcast station & multi-view',
        href: '/tv',
        icon: Tv,
        color: '#10B981',
        badge: 'LIVE'
      },
      {
        title: 'Subathon Timer',
        sub: 'Live countdown with auto top-ups',
        href: '/resources/timer',
        icon: Timer,
        color: '#F97316'
      },
      {
        title: 'Stream Goals',
        sub: 'Customizable stream donation progress',
        href: '/resources/goal',
        icon: Target,
        color: '#14B8A6'
      },
      {
        title: 'Soundboard',
        sub: 'PC hotkey SFX engine with instant play',
        href: '/resources/soundboard',
        icon: Volume2,
        color: '#10B981'
      },
      {
        title: 'Media Library',
        sub: 'Cloud storage for MP4, GIF & sounds',
        href: '/dashboard?tab=media',
        icon: HardDrive,
        color: '#3B82F6'
      },
      {
        title: 'Tip QR Overlay',
        sub: 'Scan-to-tip on OBS stream screen',
        href: '/dashboard?tab=overview',
        icon: QrCode,
        color: '#00F0FF'
      },
      {
        title: 'Spinning Wheel',
        sub: 'Custom giveaways & lucky spins',
        href: '/resources/wheels',
        icon: Disc,
        color: '#8B5CF6'
      }
    ]
  },
  {
    header: 'Level up your brand',
    items: [
      {
        title: 'YouTube Guide',
        sub: 'Access helpful videos and updates',
        href: '/resources/youtube-guide',
        icon: Youtube,
        color: '#FF0000'
      },
      {
        title: 'Facebook Guide',
        sub: 'Facebook Gaming & Cambodia live reach',
        href: '/resources/facebook-guide',
        icon: Facebook,
        color: '#1877F2'
      },
      {
        title: 'Instagram Guide',
        sub: 'Vertical 9:16 OBS streams & engagement',
        href: '/resources/instagram-guide',
        icon: Instagram,
        color: '#E1306C'
      },
      {
        title: 'TikTok Trending',
        sub: 'Viral sounds & TikTok Live growth',
        href: '/resources/tiktok-trending',
        icon: Flame,
        color: '#00F2FE',
        badge: 'HOT'
      },
      {
        title: 'Discord Community',
        sub: 'Connect with 2,400+ creators',
        href: '/discord',
        icon: MessageSquare,
        color: '#5865F2'
      },
      {
        title: 'Live System Status',
        sub: 'Realtime database, API & socket nodes',
        href: '/status',
        icon: Activity,
        color: '#10B981'
      }
    ]
  },
  {
    header: 'Earn money streaming',
    items: [
      {
        title: 'Tipping',
        sub: 'Allow viewers to support you',
        href: '/dashboard?tab=payments',
        icon: CreditCard,
        color: '#00F0FF',
        badge: '0% FEE'
      },
      {
        title: 'Sponsorships',
        sub: 'Get paid to stream & brand banners',
        href: '/pricing',
        icon: DollarSign,
        color: '#10B981'
      },
      {
        title: 'Pro Plan Ultra',
        sub: 'One plan, all the pro features',
        href: '/pricing',
        icon: Sparkles,
        color: '#A855F7'
      },
      {
        title: 'Support Desk',
        sub: 'Claim ticket & live chat with staff',
        href: '/dashboard?tab=tickets',
        icon: Headphones,
        color: '#F59E0B'
      }
    ]
  }
];

// Flat list for quick reference
const RESOURCE_FEATURES = MEGA_MENU_SECTIONS.flatMap((s) => s.items);

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, loading, logout, loginWithGoogleRedirect } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#070A12]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Mobile Menu Toggle + Logo + Title ("streambotkh.com") + Nav Menu */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
            {/* Mobile menu toggle on the left side */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 sm:p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors flex-shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Logo on the left & Title "streambotkh.com" */}
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
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none min-w-0 mr-1 sm:mr-2"
            >
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
                <img
                  src="/images/logo-192.png"
                  alt="streambotkh.com logo"
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.6)] transition-all duration-200"
                />
              </div>

              <div className="flex items-center min-w-0">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white font-['Chakra_Petch'] truncate">
                  streambot<span className="text-cyan-400">kh</span>
                </span>
                <span className="hidden xxs:inline text-[10px] sm:text-xs font-mono font-semibold text-slate-400 ml-0.5">
                  .com
                </span>
              </div>
            </Link>

            {/* Nav Menu directly after the title with own route page links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-1.5 pl-3 lg:pl-4 border-l border-slate-800/80">
              {/* 1. Home Route (/) */}
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
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  active('/', 'home')
                    ? 'text-white bg-white/[0.08] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Home
              </Link>

              {/* TV Direct Live Stream Route */}
              <Link
                to="/tv"
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors ${
                  active('/tv', 'tv')
                    ? 'text-emerald-400 bg-emerald-500/10 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Tv size={13} className="text-emerald-400" />
                <span>TV</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </Link>

              {/* 2. Resources Dropdown Menu (on hover shows list of features) */}
              <div
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => handleNav('/resources', 'resources')}
                  className={`flex items-center gap-1 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                    active('/resources', 'resources') || dropdownOpen
                      ? 'text-white bg-white/[0.08] shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>Resources</span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180 text-cyan-400' : 'text-slate-500'
                    }`}
                  />
                </button>

                {/* Mega Dropdown Menu matching Streamlabs Multi-Column Design */}
                {dropdownOpen && (
                  <div
                    className="absolute top-full left-[-40px] lg:left-[-100px] xl:left-[-140px] mt-2.5 w-[92vw] max-w-[980px] p-6 rounded-2xl bg-[#090D18]/98 backdrop-blur-2xl border border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      boxShadow: '0 25px 65px -15px rgba(0,0,0,0.95), 0 0 35px rgba(0,240,255,0.06)'
                    }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
                      {MEGA_MENU_SECTIONS.map((section) => (
                        <div key={section.header} className="space-y-3">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono pb-1 border-b border-slate-800/60">
                            {section.header}
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
                                  className="p-2 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-slate-800 cursor-pointer transition-all group"
                                >
                                  <div className="flex items-start gap-2.5">
                                    <div
                                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                                      style={{
                                        backgroundColor: `${item.color || '#00F0FF'}15`,
                                        color: item.color || '#00F0FF'
                                      }}
                                    >
                                      <IconComp size={15} />
                                    </div>
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight">
                                          {item.title}
                                        </span>
                                        {item.badge && (
                                          <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold uppercase tracking-wider">
                                            {item.badge}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 leading-tight">
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
                    <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px]">All OBS &amp; Payment Nodes Operational • 0% Platform Fee</span>
                      </div>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleNav('/resources', 'resources');
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>Explore All Creator Hub Docs</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Pricing Route (/pricing) */}
              <Link
                to="/pricing"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('pricing');
                  }
                }}
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  active('/pricing', 'pricing')
                    ? 'text-white bg-white/[0.08] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Pricing
              </Link>

              {/* 4. Documents Route (/documents) */}
              <Link
                to="/documents"
                onClick={(e) => {
                  if (onNavigate) {
                    e.preventDefault();
                    onNavigate('documents');
                  }
                }}
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
                  active('/documents', 'documents') || active('/resources', 'resources')
                    ? 'text-white bg-white/[0.08] shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                Documents
              </Link>
            </nav>
          </div>

          {/* Right Section: Social Redirect URL Icons & Sign in with Google / Profile Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Social Redirect URL Icons: Telegram & Discord */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <a
                href="https://t.me/streambotkh"
                target="_blank"
                rel="noopener noreferrer"
                title="Telegram Channel (t.me/streambotkh)"
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-[#229ED9] hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Telegram"
              >
                <TelegramIcon />
              </a>

              <a
                href="https://discord.gg/streambotkh"
                target="_blank"
                rel="noopener noreferrer"
                title="Discord Community (discord.gg/streambotkh)"
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-[#5865F2] hover:bg-white/[0.06] transition-colors flex items-center justify-center cursor-pointer"
                aria-label="Discord"
              >
                <DiscordIcon />
              </a>
            </div>
            {/* User authenticated: Show ONLY the profile logo */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/dashboard"
                  title="Dashboard"
                  onClick={(e) => {
                    if (onNavigate) {
                      e.preventDefault();
                      onNavigate('dashboard');
                    }
                  }}
                  className="p-1 sm:p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all flex items-center justify-center group"
                >
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.displayName || 'Profile'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 object-cover ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                  />
                </Link>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500/50 hover:text-red-400 text-slate-400 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : loading ? (
              /* Sleek Avatar Skeleton while verifying auth */
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900/80 border border-slate-800/80 animate-pulse flex items-center justify-center p-1 sm:p-1.5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 animate-pulse" />
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
                  className="group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] hover:border-white/[0.25] text-white text-xs font-semibold transition-all duration-200 cursor-pointer flex-shrink-0 shadow-sm"
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070A12]/98 border-b border-slate-800 px-4 py-3 space-y-1 animate-fadeIn shadow-2xl">
          <button
            onClick={() => handleNav('/', 'home')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
              active('/', 'home')
                ? 'text-white bg-white/[0.08]'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Home
          </button>

          <button
            onClick={() => handleNav('/tv', 'tv')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between ${
              active('/tv', 'tv')
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Tv size={14} className="text-emerald-400" />
              <span>StreamBot TV</span>
            </span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
          </button>

          {/* Resources Accordion */}
          <div>
            <button
              onClick={() => setMobileResourcesOpen(!mobileResourcesOpen)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.04] flex items-center justify-between"
            >
              <span>Resources &amp; Features</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${mobileResourcesOpen ? 'rotate-180 text-cyan-400' : 'text-slate-500'}`}
              />
            </button>

            {mobileResourcesOpen && (
              <div className="pl-2 space-y-3 py-2 border-l border-slate-800 ml-2 my-1">
                {MEGA_MENU_SECTIONS.map((sec) => (
                  <div key={sec.header} className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 px-2 block">
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
                            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 flex items-center justify-between gap-2 group"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: `${item.color || '#00F0FF'}15`,
                                  color: item.color || '#00F0FF'
                                }}
                              >
                                <IconComp size={12} />
                              </span>
                              <span className="truncate">{item.title}</span>
                            </span>
                            {item.badge ? (
                              <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-mono font-bold">
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

          <button
            onClick={() => handleNav('/pricing', 'pricing')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
              active('/pricing', 'pricing')
                ? 'text-white bg-white/[0.08]'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Pricing
          </button>

          <button
            onClick={() => handleNav('/documents', 'documents')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
              active('/documents', 'documents') || active('/resources', 'resources')
                ? 'text-white bg-white/[0.08]'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Documents
          </button>

          <a
            href="https://t.me/streambotkh"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-slate-300 hover:text-[#229ED9] hover:bg-white/[0.04]"
          >
            <TelegramIcon />
            <span>Telegram Channel (t.me/streambotkh)</span>
          </a>

          <a
            href="https://discord.gg/streambotkh"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-slate-300 hover:text-[#5865F2] hover:bg-white/[0.04]"
          >
            <DiscordIcon />
            <span>Discord Community (discord.gg/streambotkh)</span>
          </a>

          {!user && !loading && (
            <div className="pt-2 border-t border-slate-800">
              <a
                href={`/api/auth/google?origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  loginWithGoogleRedirect();
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
