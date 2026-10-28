'use client';

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bell,
  Layers,
  Video,
  Trophy,
  Volume2,
  Disc,
  Target,
  Timer,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Tv,
  Play,
  Copy,
  Check,
  Mic,
  Upload,
  Zap,
  ShieldCheck,
  Crown,
  Sliders,
  Monitor
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { useAudio } from '../hooks/useAudio';

export interface ResourceFeatureDefinition {
  slug: string;
  title: string;
  headline: string;
  badge: string;
  planBadge: 'ALL PLANS' | 'PRO PLAN';
  shortSub: string;
  description: string;
  dashboardTab: string;
  color: string;
  icon: any;
  obsDimensions: { width: string; height: string; fps: string };
  obsRouteExample: string;
  highlights: { title: string; desc: string }[];
  steps: string[];
}

export const RESOURCE_FEATURE_PAGES: ResourceFeatureDefinition[] = [
  {
    slug: 'donations-alerts',
    title: 'Donations Alerts',
    headline: 'Live ABA PayWay & Bakong KHQR Tip Alerts with AI Voice Clone',
    badge: 'REAL-TIME STREAM OVERLAY',
    planBadge: 'ALL PLANS',
    shortSub: 'Live ABA & Bakong KHQR tip alerts',
    description:
      'Create unlimited condition-based donation categories ($1+, $5+, $20+, $50+) that automatically trigger custom holographic animations, reaction GIFs, audio chimes, and Khmer/English neural Text-to-Speech (TTS) or your own AI-cloned voice on OBS Studio.',
    dashboardTab: 'donation',
    color: '#00F0FF',
    icon: Bell,
    obsDimensions: { width: '1920 px', height: '1080 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/:your_token',
    highlights: [
      {
        title: 'Expandable Condition Categories',
        desc: 'Organize alert tiers in a clean list ($1, $5, $10, $50+) and click any tier to expand its full studio editor and live preview inline.'
      },
      {
        title: 'Khmer & English Neural TTS + Voice Clone',
        desc: 'Supports Google Cloud Neural TTS, KiriTTS Male/Female Cambodian voices, and 10-second custom streamer AI Voice Cloning.'
      },
      {
        title: 'Custom Fonts, Reaction GIFs & Chimes',
        desc: 'Pick from 9+ gaming & cyberpunk fonts, holographic frame templates, and custom MP4/GIF/MP3/WAV media from your storage.'
      },
      {
        title: 'Zero-Latency ABA & Bakong Sync',
        desc: 'Fires in under 300ms via WebSocket the moment a viewer scans your KHQR code from ABA Mobile, ACLEDA, Wing, or any Cambodian bank.'
      }
    ],
    steps: [
      'Open your StreamBotKH Dashboard and select Donations Alerts from the sidebar.',
      'Click on any Donation Category in the list to expand its configuration studio inline (or click Create Donation Category).',
      'Customize your Headline Message, Reaction GIF, Custom Font, Sound Chime, TTS Voice Model, and Condition Threshold.',
      'Copy your OBS Studio Browser Source URL and paste it into an OBS Browser Source (1920x1080, 60 FPS).'
    ]
  },
  {
    slug: 'media-share',
    title: 'Media Share & Cloud Storage',
    headline: 'High-Speed Streamer Cloud Media Library (All Formats Supported)',
    badge: 'CLOUD ASSET VAULT',
    planBadge: 'ALL PLANS',
    shortSub: 'Viewer audio & visual stream sync',
    description:
      'Upload, preview, and manage all your custom stream assets in one centralized vault. Supports MP4, GIF, MP3, WAV, WEBM, OGG, MOV, PNG, JPG, and WEBP with up to 500MB of high-speed cloud storage on the Pro Plan.',
    dashboardTab: 'media',
    color: '#3B82F6',
    icon: Layers,
    obsDimensions: { width: '1920 px', height: '1080 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/:your_token',
    highlights: [
      {
        title: 'Supports All Formatted Files',
        desc: 'Upload video clips (MP4, WEBM, MOV), animated stickers (GIF, WEBP, PNG), and high-fidelity audio tracks (MP3, WAV, OGG, M4A).'
      },
      {
        title: 'Up to 500MB Pro Cloud Storage',
        desc: 'Free plan includes 20MB starter storage, while Pro Plan unlocks 500MB of dedicated cloud asset storage.'
      },
      {
        title: 'Instant Studio Integration',
        desc: 'Select any uploaded video, GIF, or sound directly inside your Donation Alerts, Soundboard, Leaderboard, or Goal widgets.'
      },
      {
        title: 'Built-In Media Player Preview',
        desc: 'Preview video animations and audition audio waveforms right inside the Media Library before assigning them to live overlays.'
      }
    ],
    steps: [
      'Navigate to Dashboard → Media Library under the Storage section.',
      'Click Upload Media and choose any MP4, GIF, MP3, WAV, or image file from your computer.',
      'Preview your uploaded files directly in the media grid with one click.',
      'Assign your uploaded media to any Donation Alert category or Soundboard hotkey.'
    ]
  },
  {
    slug: 'video-alerts',
    title: 'Video Alerts',
    headline: 'YouTube Media Share & Donor Video Clips on Stream',
    badge: 'INTERACTIVE MEDIA SHARE',
    planBadge: 'PRO PLAN',
    shortSub: 'YouTube media share video alerts',
    description:
      'Let your supporters attach YouTube links to their donations and watch their favorite clips play automatically on your OBS stream! Configure minimum tip thresholds, price-per-second rules, and maximum clip duration.',
    dashboardTab: 'video-alerts',
    color: '#EC4899',
    icon: Video,
    obsDimensions: { width: '1280 px', height: '720 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/video/:your_token',
    highlights: [
      {
        title: 'Automatic YouTube Embed Playback',
        desc: 'Extracts YouTube video IDs and start timestamps automatically when a donor submits a qualifying tip.'
      },
      {
        title: 'Dynamic Price-Per-Second Rules',
        desc: 'Set your own minimum tip amount (e.g. $2.00) and maximum playback seconds so you stay in full control of stream pacing.'
      },
      {
        title: 'Dedicated Video-Only OBS Route',
        desc: 'Use the dedicated /overlay/video/:token browser source to position YouTube media share anywhere on your scene.'
      },
      {
        title: 'Live Skip, Pause & Moderation',
        desc: 'Instantly pause, mute, or skip any playing donor video directly from your streamer dashboard.'
      }
    ],
    steps: [
      'Open Dashboard → Video Alerts (Available on Pro Plan).',
      'Enable YouTube Video Media Share and configure your Minimum Donation Amount and Max Duration Seconds.',
      'Copy the dedicated Video Overlay URL (/overlay/video/:token) into OBS Studio.',
      'Test a sample YouTube alert from the dashboard to verify video and audio framing.'
    ]
  },
  {
    slug: 'leaderboard',
    title: 'Donor Leaderboard',
    headline: 'Top Supporters Live Ranking Widget (20 Custom Designs)',
    badge: '20 HOLOGRAPHIC STYLES',
    planBadge: 'PRO PLAN',
    shortSub: 'Top supporters ranking (20 designs)',
    description:
      'Showcase your top supporters in real time on your stream! Choose from 20 handcrafted holographic, cyberpunk, esports, royal gold, and minimal themes that automatically update whenever a viewer tips.',
    dashboardTab: 'leaderboard',
    color: '#F59E0B',
    icon: Trophy,
    obsDimensions: { width: '500 px', height: '700 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/leaderboard/:your_token',
    highlights: [
      {
        title: '20 Distinct Visual Themes',
        desc: 'Switch effortlessly between Neon Cyber, Royal Gold Crown, Esports HUD, Glass Hologram, Retro Arcade, and 15+ more themes.'
      },
      {
        title: 'Real-Time Auto-Sorting',
        desc: 'Automatically recalculates and animates donor rankings the instant a new ABA or Bakong KHQR donation arrives.'
      },
      {
        title: 'All-Time, Monthly & Stream Session Modes',
        desc: 'Filter top donors by current stream session, monthly champions, or all-time hall of fame.'
      },
      {
        title: 'Custom Crowns, Medals & Avatars',
        desc: 'Highlights #1, #2, and #3 top supporters with animated trophies, glowing badges, and formatted USD/KHR totals.'
      }
    ],
    steps: [
      'Go to Dashboard → Leaderboard in your Streamer Workstation.',
      'Browse the 20 preset themes and customize title text, max rows displayed, and accent colors.',
      'Copy your Leaderboard Widget URL (/overlay/leaderboard/:token) and add it as an OBS Browser Source.',
      'Position the leaderboard overlay on your Starting Soon, Intermission, or Gameplay scene.'
    ]
  },
  {
    slug: 'soundboard',
    title: 'Stream Soundboard',
    headline: 'PC Keyboard Hotkey SFX Engine with Instant OBS Sync',
    badge: 'PC HOTKEY ENGINE',
    planBadge: 'PRO PLAN',
    shortSub: 'PC hotkey SFX engine with instant play',
    description:
      'Turn your keyboard into a professional broadcast deck! Bind custom sound effects (MP3, WAV, OGG) to PC keyboard shortcuts and trigger them instantaneously in both your headphones and your OBS Browser Source overlay.',
    dashboardTab: 'soundboard',
    color: '#10B981',
    icon: Volume2,
    obsDimensions: { width: '600 px', height: '400 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/soundboard/:your_token',
    highlights: [
      {
        title: 'Custom PC Keyboard Shortcuts',
        desc: 'Bind any key combination (e.g. F1, Ctrl+1, Alt+H) to fire meme sounds, applause, airhorns, or clutch stingers.'
      },
      {
        title: 'Dual Local + OBS Broadcast Playback',
        desc: 'Plays simultaneously in your dashboard and across your OBS Soundboard Overlay via ultra-fast WebSocket events.'
      },
      {
        title: 'Per-Pad Volume, Color & Icon Control',
        desc: 'Customize every sound pad with its own neon color, emoji/icon, title, and independent gain slider.'
      },
      {
        title: 'Direct Media Library Sync',
        desc: 'Import any MP3 or WAV file from your 500MB Cloud Media Library in seconds.'
      }
    ],
    steps: [
      'Open Dashboard → Soundboard and click Add Sound Pad.',
      'Pick an audio track from your Media Library or upload a new MP3/WAV file.',
      'Click Record Keybind and press your desired PC shortcut key.',
      'Add the Soundboard Overlay URL (/overlay/soundboard/:token) to OBS Studio so viewers hear every trigger.'
    ]
  },
  {
    slug: 'wheels',
    title: 'Spinning Wheels',
    headline: 'Interactive Giveaway & Punishment Spinning Wheels',
    badge: 'CROWD ENGAGEMENT',
    planBadge: 'PRO PLAN',
    shortSub: 'Interactive spinning wheel giveaways',
    description:
      'Boost stream excitement and viewer retention with customizable physics-based spinning wheels! Run donor giveaways, game challenges, or subathon rewards that spin smoothly at 60 FPS with confetti and fanfare.',
    dashboardTab: 'wheel',
    color: '#8B5CF6',
    icon: Disc,
    obsDimensions: { width: '800 px', height: '800 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/:your_token',
    highlights: [
      {
        title: 'Smooth 60 FPS Physics Wheel',
        desc: 'Realistic easing, tick audio synthesis as slices pass the pointer, and celebratory winner modal with confetti.'
      },
      {
        title: 'Unlimited Custom Slices & Weights',
        desc: 'Add, color-code, or toggle individual prize slices on the fly during your broadcast.'
      },
      {
        title: 'Auto-Trigger on Qualifying Tips',
        desc: 'Optionally trigger a wheel spin automatically when a supporter donates above your target threshold.'
      },
      {
        title: 'One-Click Spin from Dashboard',
        desc: 'Trigger spins manually from your dashboard while broadcasting the wheel live to your audience.'
      }
    ],
    steps: [
      'Open Dashboard → Wheels in your Streamer Workstation.',
      'Add your custom prize or challenge slices and customize each slice color.',
      'Click Spin Wheel to test the physics animation and winner announcement.',
      'Display the wheel on your stream via OBS Browser Source or screen capture.'
    ]
  },
  {
    slug: 'goal',
    title: 'Stream Goals',
    headline: 'Customizable Live Donation Progress Bars',
    badge: 'LIVE FUNDING TRACKER',
    planBadge: 'PRO PLAN',
    shortSub: 'Customizable stream donation progress',
    description:
      'Rally your community around your next milestone—whether it is a new gaming PC, a 24-hour subathon, or a charity drive. Features animated neon progress bars that fill up automatically with every USD or KHR tip.',
    dashboardTab: 'goal',
    color: '#14B8A6',
    icon: Target,
    obsDimensions: { width: '800 px', height: '250 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/goal/:your_token',
    highlights: [
      {
        title: 'Real-Time Progress Fill',
        desc: 'Automatically converts KHR and USD donations and animates the progress bar percentage live on stream.'
      },
      {
        title: 'Multiple Bar & HUD Designs',
        desc: 'Choose from sleek cyberpunk progress bars, compact minimal pills, or holographic glass trackers.'
      },
      {
        title: 'Multiple Concurrent Goals',
        desc: 'Create separate goals for daily stream targets and long-term hardware upgrades using ?goalId= parameters.'
      },
      {
        title: 'Goal Completion Celebration',
        desc: 'Triggers special visual glow effects when your community hits 100% of the target amount.'
      }
    ],
    steps: [
      'Navigate to Dashboard → Goals and click Create New Goal.',
      'Set your Goal Title (e.g. "New RTX 4080 Upgrade"), Target Amount ($ USD), and Starting Amount.',
      'Customize the bar colors, font style, and glow intensity.',
      'Copy the Goal Overlay URL (/overlay/goal/:token) and add it to OBS Studio.'
    ]
  },
  {
    slug: 'timer',
    title: 'Subathon Timer',
    headline: 'Automated Subathon Countdown Timer with Donation Top-Ups',
    badge: 'SUBATHON ENGINE',
    planBadge: 'PRO PLAN',
    shortSub: 'Subathon countdown with auto top-ups',
    description:
      'Run effortless marathon streams and subathons! Every time a viewer donates via ABA PayWay or Bakong KHQR, the timer automatically adds bonus minutes or seconds per dollar in real time.',
    dashboardTab: 'timer',
    color: '#F97316',
    icon: Timer,
    obsDimensions: { width: '600 px', height: '250 px', fps: '60 FPS' },
    obsRouteExample: '/overlay/timer/:your_token',
    highlights: [
      {
        title: 'Automatic Time Top-Ups on Tip',
        desc: 'Configure exactly how many seconds or minutes are added per $1.00 USD (or 4,000 KHR) donated.'
      },
      {
        title: 'Live Start, Pause, Add & Reset Controls',
        desc: 'Control your countdown clock in real time from the dashboard without touching OBS.'
      },
      {
        title: 'Max Cap & Overtime Protection',
        desc: 'Set an optional maximum timer cap so your subathon stays within your schedule.'
      },
      {
        title: 'High-Contrast 60 FPS Digital Display',
        desc: 'Crisp monospace cyber typography with animated "+05:00 Added!" floating notifications.'
      }
    ],
    steps: [
      'Open Dashboard → Timer in your Streamer Workstation.',
      'Set your Initial Duration (e.g. 04:00:00) and Seconds Added Per $1 Donated (e.g. 60 seconds).',
      'Copy the Timer Overlay URL (/overlay/timer/:token) into OBS Studio.',
      'Click Start Timer on your dashboard to begin the live countdown!'
    ]
  }
];

interface ResourceFeaturePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const ResourceFeaturePage: React.FC<ResourceFeaturePageProps> = ({ onNavigate }) => {
  const { featureSlug } = useParams<{ featureSlug?: string }>();
  const navigate = useNavigate();
  const { user, loginWithGoogleRedirect } = useAuth();
  const { playSynthNeonChime } = useAudio();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [simTriggered, setSimTriggered] = useState(false);

  const feature =
    RESOURCE_FEATURE_PAGES.find((f) => f.slug === featureSlug || f.dashboardTab === featureSlug) ||
    RESOURCE_FEATURE_PAGES[0];

  const IconComponent = feature.icon;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://streambotkh.com';
  const sampleObsUrl = `${origin}${feature.obsRouteExample.replace(':your_token', user?.overlayToken || 'your_secret_token')}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(sampleObsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleLaunchFeature = () => {
    if (user) {
      navigate(`/dashboard?tab=${feature.dashboardTab}`);
    } else {
      loginWithGoogleRedirect();
    }
  };

  const handleRunInteractiveDemo = () => {
    setSimTriggered(true);
    playSynthNeonChime(0.8);
    setTimeout(() => setSimTriggered(false), 3500);
  };

  return (
    <div className="relative min-h-screen py-10 sm:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-14">
      {/* Ambient Glow */}
      <div
        className="absolute top-8 left-1/2 -translate-x-1/2 w-[650px] h-[320px] rounded-full blur-[150px] pointer-events-none -z-10 opacity-20"
        style={{ backgroundColor: feature.color }}
      />

      {/* Top Feature Switcher Pills (Jump between all 8 Resource Feature Landing Pages) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => navigate('/resources')}
            className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>All Resources &amp; Developer Docs</span>
          </button>

          <span className="text-[11px] font-mono text-slate-500">
            STREAMBOTKH FEATURE LANDING PAGES
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
          {RESOURCE_FEATURE_PAGES.map((item) => {
            const ItemIcon = item.icon;
            const isCurrent = item.slug === feature.slug;
            return (
              <button
                key={item.slug}
                onClick={() => navigate(`/resources/${item.slug}`)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                  isCurrent
                    ? 'bg-white/[0.09] text-white border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <ItemIcon size={14} style={{ color: item.color }} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* HERO SECTION: FEATURE SHOWCASE + INTERACTIVE PREVIEW           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column: Feature Pitch & CTA */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border"
              style={{
                backgroundColor: `${feature.color}15`,
                color: feature.color,
                borderColor: `${feature.color}40`
              }}
            >
              <IconComponent size={13} />
              <span>{feature.badge}</span>
            </span>

            <span
              className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
                feature.planBadge === 'PRO PLAN'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {feature.planBadge === 'PRO PLAN' ? '★ PRO PLAN FEATURE' : '✓ AVAILABLE ON ALL PLANS'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white font-['Chakra_Petch'] tracking-tight leading-[1.1]">
            {feature.headline}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {feature.description}
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleLaunchFeature}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black font-mono text-xs sm:text-sm px-6 py-3.5 shadow-[0_0_25px_rgba(0,240,255,0.35)]"
            >
              <span>{user ? `Open ${feature.title} in Dashboard` : `Sign In to Use ${feature.title}`}</span>
              <ArrowRight size={16} />
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleRunInteractiveDemo}
              className="border-slate-700 hover:border-cyan-400 text-slate-200 font-mono text-xs sm:text-sm px-5 py-3.5"
            >
              <Play size={15} className="text-cyan-400 fill-cyan-400" />
              <span>{simTriggered ? 'Simulating Live Overlay...' : 'Test Live Preview'}</span>
            </Button>
          </div>

          {/* Quick Spec Pills */}
          <div className="grid grid-cols-3 gap-3 pt-4 max-w-lg">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase">OBS CANVAS</div>
              <div className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">
                {feature.obsDimensions.width} × {feature.obsDimensions.height}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase">FRAME RATE</div>
              <div className="text-xs sm:text-sm font-bold text-cyan-400 font-mono mt-0.5">
                {feature.obsDimensions.fps}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase">SYNC ENGINE</div>
              <div className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                WebSocket &lt;300ms
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Visual Mockup Canvas */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-[#090D18] border-2 border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
            {/* Top Mockup Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-300">
                  OBS LIVE PREVIEW • {feature.title.toUpperCase()}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                1080p60
              </span>
            </div>

            {/* Interactive Preview Stage */}
            <div className="min-h-[260px] rounded-2xl bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-950 border border-slate-800/90 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div
                className={`w-full max-w-sm rounded-2xl p-5 border transition-all duration-300 ${
                  simTriggered ? 'scale-105 shadow-2xl' : 'scale-100'
                }`}
                style={{
                  backgroundColor: '#0B101E',
                  borderColor: `${feature.color}60`,
                  boxShadow: simTriggered ? `0 0 35px ${feature.color}40` : `0 0 15px ${feature.color}15`
                }}
              >
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center border"
                  style={{
                    backgroundColor: `${feature.color}15`,
                    borderColor: `${feature.color}40`,
                    color: feature.color
                  }}
                >
                  <IconComponent size={24} />
                </div>

                {feature.slug === 'donations-alerts' && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                      ABA PAYWAY • VERIFIED TIP
                    </div>
                    <div className="text-base font-black text-white font-['Chakra_Petch']">
                      CyberSamurai donated <span className="text-cyan-400">$10.00</span>!
                    </div>
                    <p className="text-xs text-slate-300 italic">
                      &ldquo;Insane clutch round bro! Keep streaming 🔥&rdquo;
                    </p>
                  </div>
                )}

                {feature.slug === 'media-share' && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono font-bold text-blue-400">500MB CLOUD ASSET VAULT</div>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {['MP4', 'GIF', 'MP3', 'WAV', 'WEBM', 'PNG'].map((ext) => (
                        <span key={ext} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-white font-bold">
                          .{ext}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">Instant preview &amp; one-click overlay assignment</p>
                  </div>
                )}

                {feature.slug === 'video-alerts' && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-pink-400 font-bold uppercase">
                      YOUTUBE MEDIA SHARE • 00:30 CLIP
                    </div>
                    <div className="text-sm font-bold text-white font-['Chakra_Petch']">
                      ▶ Playing Donor Clip from @ValkyrieKH ($5.00)
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-pink-500 h-full w-2/3 animate-pulse" />
                    </div>
                  </div>
                )}

                {feature.slug === 'leaderboard' && (
                  <div className="space-y-2 text-left">
                    <div className="text-[10px] font-mono text-amber-400 font-bold text-center uppercase">
                      ★ TOP STREAM SUPPORTERS ★
                    </div>
                    {[
                      { rank: '#1', name: 'KingSokha', amount: '$125.00', color: 'text-amber-400' },
                      { rank: '#2', name: 'NeonValkyrie', amount: '$80.00', color: 'text-slate-200' },
                      { rank: '#3', name: 'PhnomPenhPro', amount: '$45.00', color: 'text-amber-600' }
                    ].map((row) => (
                      <div key={row.rank} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
                        <span className={`font-bold ${row.color}`}>{row.rank} {row.name}</span>
                        <span className="text-cyan-400 font-bold">{row.amount}</span>
                      </div>
                    ))}
                  </div>
                )}

                {feature.slug === 'soundboard' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                      PC HOTKEY TRIGGERED
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'F1', name: 'Airhorn Hype' },
                        { key: 'F2', name: 'GG EZ Clutch' },
                        { key: 'CTRL+1', name: 'Anime Wow' },
                        { key: 'ALT+S', name: 'Victory Synth' }
                      ].map((pad) => (
                        <div key={pad.key} className="p-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-left">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            {pad.key}
                          </span>
                          <div className="text-[11px] font-bold text-white mt-1 truncate">{pad.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {feature.slug === 'wheels' && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                      60 FPS GIVEAWAY WHEEL
                    </div>
                    <div className="text-base font-black text-white font-['Chakra_Petch']">
                      🎉 Winner: 1v1 Custom Match!
                    </div>
                    <p className="text-[11px] text-slate-400">Custom weighted slices &amp; confetti burst</p>
                  </div>
                )}

                {feature.slug === 'goal' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white font-bold">New Streaming PC Goal</span>
                      <span className="text-teal-400 font-bold">$380 / $500 (76%)</span>
                    </div>
                    <div className="w-full h-3.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                      <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-teal-400 to-cyan-400" />
                    </div>
                  </div>
                )}

                {feature.slug === 'timer' && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-orange-400 font-bold uppercase">
                      SUBATHON MARATHON TIMER (+1 MIN / $1)
                    </div>
                    <div className="text-3xl font-black font-mono text-white tracking-wider">
                      05 : 42 : 19
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[10px] font-bold">
                      +05:00 Added by @CyberSamurai!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* OBS Browser Source URL Preview Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>OBS Browser Source Endpoint</span>
                <button
                  onClick={handleCopyUrl}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 truncate">
                {sampleObsUrl}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* KEY CAPABILITIES & BENEFITS GRID                               */}
      {/* ============================================================== */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white font-['Chakra_Petch']">
            Why Streamers Love {feature.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Engineered specifically for Cambodian creators using ABA PayWay, Bakong KHQR, and OBS Studio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {feature.highlights.map((item, idx) => (
            <Card
              key={idx}
              className="p-6 bg-[#090D18] border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${feature.color}15`,
                    color: feature.color
                  }}
                >
                  <CheckCircle2 size={16} />
                </div>
                <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-10">
                {item.desc}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* STEP-BY-STEP OBS & DASHBOARD SETUP GUIDE                       */}
      {/* ============================================================== */}
      <Card className="p-6 sm:p-8 bg-[#090D18] border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tv size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Chakra_Petch']">
                How to Set Up {feature.title} in Under 60 Seconds
              </h3>
              <p className="text-xs text-slate-400">
                Compatible with OBS Studio, Streamlabs Desktop, and PRISM Live Studio
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleLaunchFeature}
            className="bg-cyan-400 text-slate-950 font-bold font-mono text-xs"
          >
            <span>Configure Now</span>
            <ArrowRight size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {feature.steps.map((stepText, index) => (
            <div
              key={index}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-mono font-black"
                  style={{
                    backgroundColor: `${feature.color}20`,
                    color: feature.color
                  }}
                >
                  0{index + 1}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {stepText}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
