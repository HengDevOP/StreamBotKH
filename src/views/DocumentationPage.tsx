'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Tv,
  ShieldCheck,
  Zap,
  Bot,
  CreditCard,
  DollarSign,
  Volume2,
  QrCode,
  Play,
  Target,
  Disc,
  HardDrive,
  AlertTriangle,
  Info,
  CheckCircle2,
  Menu,
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Smartphone,
  Laptop,
  HelpCircle,
  FileCode,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Layers,
  Flame,
  Sun,
  Moon
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

interface DocumentationPageProps {
  onNavigate?: (page: string, params?: any) => void;
}

interface DocArticle {
  id: string;
  category: string;
  categoryTitle: string;
  title: string;
  description: string;
  readTime: string;
  lastUpdated: string;
  tags: string[];
  content: {
    overview: string;
    callout?: {
      type: 'tip' | 'warning' | 'info' | 'important';
      title: string;
      message: string;
    };
    steps?: {
      title: string;
      detail: string;
      code?: string;
      language?: string;
    }[];
    table?: {
      caption?: string;
      headers: string[];
      rows: string[][];
    };
    codeBlock?: {
      title?: string;
      language: string;
      code: string;
    };
    faq?: {
      q: string;
      a: string;
    }[];
  };
}

const DOC_CATEGORIES = [
  { id: 'getting-started', title: 'Getting Started', icon: Zap },
  { id: 'obs-software', title: 'OBS & Streaming Software', icon: Tv },
  { id: 'payments', title: 'Payments & Bakong KHQR', icon: CreditCard },
  { id: 'widgets', title: 'Stream Widgets & Alerts', icon: Sparkles },
  { id: 'automations', title: 'Automations & Bots', icon: Bot },
  { id: 'developer-api', title: 'Developer API & Webhooks', icon: Terminal },
  { id: 'troubleshooting', title: 'Troubleshooting & Support', icon: HelpCircle }
];

const DOC_ARTICLES: DocArticle[] = [
  // ===================== GETTING STARTED =====================
  {
    id: 'quickstart',
    category: 'getting-started',
    categoryTitle: 'Getting Started',
    title: 'Quick Start Guide',
    description: 'Set up your Cambodian livestream tip alerts and Bakong KHQR in under 5 minutes.',
    readTime: '4 min read',
    lastUpdated: 'November 2026',
    tags: ['quickstart', 'setup', 'beginner', 'first-time'],
    content: {
      overview: 'StreamBotKH is Cambodia’s dedicated live tipping and overlay platform. It enables live content creators on YouTube, Facebook Gaming, and TikTok Live to accept instant direct bank tips via ABA Mobile, ACLEDA toanChet, and Bakong KHQR with zero platform cuts.',
      callout: {
        type: 'tip',
        title: '0% Platform Commission',
        message: 'StreamBotKH charges 0% fees on all viewer donations. Money transfers directly into your personal bank account via NBC Bakong with zero waiting time.'
      },
      steps: [
        {
          title: 'Sign in with Google',
          detail: 'Click "Sign In with Google" at the top right of the navigation bar. Your Creator Studio account is initialized automatically.'
        },
        {
          title: 'Link Your Cambodian Bank Account',
          detail: 'Head to Creator Studio > Bank Settings. Enter your ABA Account Number or NBC Bakong Account ID to enable real-time payment verification.'
        },
        {
          title: 'Copy Your Unique Browser Source URL',
          detail: 'Go to Creator Studio > Alertbox. In the top bar, click "Copy Overlay URL". This secret URL embeds your live 60 FPS alerts directly into OBS Studio.'
        },
        {
          title: 'Add Browser Source in OBS Studio',
          detail: 'In OBS Studio, click (+) under Sources -> "Browser". Paste your URL, set Width to 600 and Height to 800, and check "Shutdown source when not visible".'
        },
        {
          title: 'Run a Test Donation',
          detail: 'In your Alertbox dashboard, click "Send Test Alert". Watch your test donation play on screen with audio chimes and voice TTS!'
        }
      ]
    }
  },
  {
    id: 'architecture',
    category: 'getting-started',
    categoryTitle: 'Getting Started',
    title: 'Platform Architecture & Protocol',
    description: 'Understand the end-to-end P2P payment verification and real-time alert engine.',
    readTime: '5 min read',
    lastUpdated: 'November 2026',
    tags: ['architecture', 'bakong', 'websocket', 'infrastructure'],
    content: {
      overview: 'StreamBotKH utilizes a high-availability microservices architecture optimized for sub-100ms latency. The diagram below illustrates how a viewer tip moves from their banking app onto your broadcast screen.',
      callout: {
        type: 'info',
        title: 'Direct Bank-to-Bank Transfers',
        message: 'StreamBotKH never holds your money in escrow or takes custody of your funds. Every transaction is a direct P2P transfer between the donor and creator using the National Bank of Cambodia EMVCo Bakong standard.'
      },
      steps: [
        {
          title: '1. Dynamic KHQR Generation',
          detail: 'When a viewer opens your tip page (@yourusername), our engine synthesizes a unique one-time EMVCo compliant Bakong KHQR code embedded with a CRC16-CCITT checksum and unique tracking reference.'
        },
        {
          title: '2. Payment Execution',
          detail: 'The donor scans using ABA Mobile, ACLEDA, Wing, or any Bakong member app. The bank clears the transfer through the NBC Bakong protocol.'
        },
        {
          title: '3. Instant Webhook Verification',
          detail: 'The transaction is matched with the donor message, currency (USD or KHR), and sender tag in under 120ms.'
        },
        {
          title: '4. WebSocket Broadcast to OBS',
          detail: 'Our low-latency socket engine broadcasts the alert payload to all connected OBS browser sources at 60 FPS, triggering animations, audio chimes, and KiriTTS voice synthesis.'
        }
      ]
    }
  },

  // ===================== OBS & STREAM SOFTWARE =====================
  {
    id: 'obs-studio',
    category: 'obs-software',
    categoryTitle: 'OBS & Streaming Software',
    title: 'OBS Studio Integration Guide',
    description: 'Embed transparent 60 FPS alert overlays and optimize CPU performance in OBS Studio.',
    readTime: '6 min read',
    lastUpdated: 'November 2026',
    tags: ['obs', 'obs-studio', 'overlay', 'browser-source', '60fps'],
    content: {
      overview: 'StreamBotKH browser source overlays are pre-configured with transparent alpha channels, hardware acceleration support, and WebAudio chime synthesizers for OBS Studio 28.0+ on Windows and macOS.',
      callout: {
        type: 'important',
        title: 'Recommended Resolution',
        message: 'Always set Width: 600 and Height: 800 for the Alertbox browser source. This prevents mascot stickers or longer donor messages from getting clipped.'
      },
      steps: [
        {
          title: 'Open OBS Studio & Select Your Live Scene',
          detail: 'In OBS Studio, navigate to the Scenes panel and select your primary gaming or chatting scene.'
        },
        {
          title: 'Add a New Browser Source',
          detail: 'In the Sources panel, click (+) and select "Browser". Name the source "StreamBotKH Alerts".'
        },
        {
          title: 'Configure Recommended Dimensions',
          detail: 'Paste your secret overlay URL into the URL field. Set Width: 600, Height: 800, and FPS: 60.',
          code: 'Width: 600\nHeight: 800\nFPS: 60\nCustom CSS: (Leave Default or empty)',
          language: 'text'
        },
        {
          title: 'Enable Audio Monitoring (Optional)',
          detail: 'If you want alert chimes to route through your stream headphones, check "Control audio via OBS". In Advanced Audio Properties, set StreamBotKH Alerts to "Monitor and Output".'
        }
      ],
      table: {
        caption: 'Optimal OBS Browser Source Dimensions',
        headers: ['Widget Name', 'Width', 'Height', 'FPS', 'Recommended Placement'],
        rows: [
          ['Alertbox (Donations)', '600 px', '800 px', '60 FPS', 'Top-Center or Center-Screen'],
          ['Video Share (Media)', '854 px', '480 px', '60 FPS', 'Bottom-Right or Top-Right'],
          ['Stream Goal Bar', '650 px', '120 px', '60 FPS', 'Top-Left or Bottom-Center'],
          ['Live Stream Chat', '400 px', '600 px', '60 FPS', 'Bottom-Left or Right-Third'],
          ['Tip QR Overlay', '300 px', '380 px', '30 FPS', 'Screen Corner (Top or Bottom)']
        ]
      }
    }
  },
  {
    id: 'streamlabs',
    category: 'obs-software',
    categoryTitle: 'OBS & Streaming Software',
    title: 'Streamlabs Desktop Setup',
    description: 'Add StreamBotKH alerts to Streamlabs Desktop on Windows and Mac.',
    readTime: '4 min read',
    lastUpdated: 'November 2026',
    tags: ['streamlabs', 'slobs', 'overlay', 'setup'],
    content: {
      overview: 'Streamlabs Desktop seamlessly supports StreamBotKH overlays through its native Browser Source plugin with complete hardware acceleration.',
      steps: [
        {
          title: 'Create a Browser Source in Streamlabs',
          detail: 'Click (+) under Sources, select "Browser Source", and click Add Source.'
        },
        {
          title: 'Paste Your Alertbox URL',
          detail: 'Paste your unique URL from Creator Studio > Alertbox. Enter Width: 600 and Height: 800.'
        },
        {
          title: 'Check "Shutdown source when not visible"',
          detail: 'This frees CPU memory whenever you switch to a pause or BRB scene.'
        }
      ]
    }
  },

  // ===================== PAYMENTS & BAKONG =====================
  {
    id: 'bakong-khqr',
    category: 'payments',
    categoryTitle: 'Payments & Bakong KHQR',
    title: 'NBC Bakong KHQR Integration',
    description: 'How dynamic EMVCo KHQR generation and bank clearing work across 30+ member institutions.',
    readTime: '7 min read',
    lastUpdated: 'November 2026',
    tags: ['bakong', 'khqr', 'payments', 'aba', 'acleda', 'riel', 'usd'],
    content: {
      overview: 'Bakong KHQR is the universal QR payment standard developed by the National Bank of Cambodia (NBC). StreamBotKH generates compliant dynamic EMVCo QR codes that work across all Cambodian mobile banking applications.',
      callout: {
        type: 'tip',
        title: 'Universal Banking Support',
        message: 'Viewers do not need an account at the same bank as you. A donor using ACLEDA or Wing can scan an ABA KHQR code without any cross-bank fees.'
      },
      table: {
        caption: 'Supported Member Banks & Wallets',
        headers: ['Bank / Wallet', 'Payment Method', 'Settlement Time', 'Fee to Creator'],
        rows: [
          ['ABA Mobile', 'Bakong KHQR / PayWay', 'Instant (< 1 sec)', '0% Free'],
          ['Bakong App', 'Direct NBC Protocol', 'Instant (< 1 sec)', '0% Free'],
          ['ACLEDA toanChet', 'Bakong KHQR', 'Instant (< 1 sec)', '0% Free'],
          ['Wing Bank App', 'Wing KHQR', 'Instant (< 1 sec)', '0% Free'],
          ['Canadia Bank', 'Bakong KHQR', 'Instant (< 1 sec)', '0% Free'],
          ['Sathapana Mobile', 'Bakong KHQR', 'Instant (< 1 sec)', '0% Free'],
          ['J Trust Royal / CPBank', 'Bakong KHQR', 'Instant (< 1 sec)', '0% Free']
        ]
      },
      steps: [
        {
          title: 'Dual USD ($) and Khmer Riel (៛) Support',
          detail: 'Viewers can toggle between USD and KHR with a single click. The platform auto-converts based on the official NBC reference exchange rate.'
        },
        {
          title: 'One-Time Security Checksums',
          detail: 'Each generated QR includes a 16-bit CRC checksum and timestamp to protect against replay attacks and stale payment attempts.'
        }
      ]
    }
  },

  // ===================== STREAM WIDGETS & ALERTS =====================
  {
    id: 'alertbox',
    category: 'widgets',
    categoryTitle: 'Stream Widgets & Alerts',
    title: 'Alertbox Customization & Sounds',
    description: 'Personalize alert layouts, animated mascots, custom MP3 sounds, and text templates.',
    readTime: '6 min read',
    lastUpdated: 'November 2026',
    tags: ['alertbox', 'mascot', 'audio', 'templates', 'animations'],
    content: {
      overview: 'Alertbox is your primary stream interaction engine. You can customize layout modes (Top, Left, Right, Bottom), animation styles (Zoom, Glitch, Bounce, 3D Flip), audio volumes, and donor text templates.',
      callout: {
        type: 'tip',
        title: 'Dynamic Template Variables',
        message: 'Use {donator} for the donor name, {amount} for formatted currency ($5.00 or 20,000 ៛), and {message} for the viewer message.'
      },
      steps: [
        {
          title: 'Selecting a Layout Mode',
          detail: 'Choose Top (Mascot above text), Left (Mascot beside text), Right, or Bottom layout depending on your screen layout.'
        },
        {
          title: 'Choosing Animated Mascots or Custom MP4/GIF',
          detail: 'Pick from 48+ built-in Pokémon & MLBB animated emotes, or upload your own transparent GIF or WebM clip from the Media Library.'
        },
        {
          title: 'Configuring Sound Volume & Custom Chimes',
          detail: 'Set alert volume between 0% and 100%. Upload your own MP3 sound effects or choose from 8 studio-engineered alert chimes.'
        }
      ]
    }
  },
  {
    id: 'video-share',
    category: 'widgets',
    categoryTitle: 'Stream Widgets & Alerts',
    title: 'Video Share (Media Share) Setup',
    description: 'Allow viewers to share YouTube gameplay clips and music videos with live scrubber.',
    readTime: '5 min read',
    lastUpdated: 'November 2026',
    tags: ['video-share', 'media-share', 'youtube', 'scrubber', 'video'],
    content: {
      overview: 'Video Share allows viewers to submit YouTube video links with their tips. Videos queue automatically, display a live countdown scrubber bar, and feature automatic audio ducking so clips never overpower your microphone.',
      callout: {
        type: 'warning',
        title: 'Moderation & Safe Browsing',
        message: 'You can enable "Hold for Review" in your Creator Studio to manually approve video submissions before they broadcast live on your OBS screen.'
      },
      steps: [
        {
          title: 'Set Price Per Second',
          detail: 'In Creator Studio > Video Share, set your minimum threshold (e.g. $1.00 for 10 seconds, $0.10 for each additional second).'
        },
        {
          title: 'Embed Video Share Browser Source',
          detail: 'Add a separate Browser Source in OBS with Width: 854 and Height: 480. Position it wherever you prefer media playback to appear.'
        },
        {
          title: 'Skip or Mute Controls',
          detail: 'Use your dashboard control panel or hotkeys to instantly skip or mute any inappropriate video with 0 delay.'
        }
      ]
    }
  },
  {
    id: 'tts-engine',
    category: 'widgets',
    categoryTitle: 'Stream Widgets & Alerts',
    title: 'Neural Khmer TTS & Voice Cloning',
    description: 'Configure automated Khmer and English text-to-speech voice alerts during gameplay.',
    readTime: '5 min read',
    lastUpdated: 'November 2026',
    tags: ['tts', 'khmer-tts', 'kiritts', 'voice', 'audio'],
    content: {
      overview: 'StreamBotKH features an intelligent bilingual TTS synthesizer powered by KiriTTS and neural voice engines, capable of reading mixed Khmer and English gaming slang naturally.',
      callout: {
        type: 'info',
        title: 'Anti-Spam Threshold',
        message: 'Set a minimum dollar or riel amount for TTS (e.g. $1.00 or 4,000 ៛) to prevent viewers from spamming voice cheers.'
      },
      steps: [
        {
          title: 'Choose a Voice Persona',
          detail: 'Select between Natural Khmer Female (Sophea), Energetic Gaming Male (Dara), or Bilingual Studio.'
        },
        {
          title: 'Profanity & URL Filter',
          detail: 'Our engine automatically sanitizes abusive words, phone numbers, and phishing URLs before text reaches the speech synthesizer.'
        }
      ]
    }
  },

  // ===================== AUTOMATIONS & BOTS =====================
  {
    id: 'telegram-bot',
    category: 'automations',
    categoryTitle: 'Automations & Bots',
    title: 'Telegram Instant Notification Bot',
    description: 'Receive real-time push alerts on every donation with sender tag, bank, and reference.',
    readTime: '4 min read',
    lastUpdated: 'November 2026',
    tags: ['telegram', 'bot', 'notifications', 'mobile'],
    content: {
      overview: 'Stay updated on every viewer tip even when you step away from your streaming desk. Our official Telegram bot notifies you instantaneously with full donor details, bank names, and payment receipts.',
      callout: {
        type: 'tip',
        title: 'Free for All Creators',
        message: 'The Telegram Notification Bot is 100% free with unlimited push notifications and instant pairing.'
      },
      steps: [
        {
          title: 'Generate Your Secret Pairing Code',
          detail: 'In Creator Studio > Telegram Bot, click "Generate Pairing Code". You will receive a 6-digit key.'
        },
        {
          title: 'Start @StreamBotKH_Bot in Telegram',
          detail: 'Open Telegram, search for @StreamBotKH_Bot, and click "Start".'
        },
        {
          title: 'Send Your Pairing Key',
          detail: 'Paste your 6-digit key to the bot. You will receive an immediate confirmation message linking your channel.'
        }
      ]
    }
  },

  // ===================== DEVELOPER API =====================
  {
    id: 'api-overview',
    category: 'developer-api',
    categoryTitle: 'Developer API & Webhooks',
    title: 'REST API & Authentication',
    description: 'Build custom overlays, Discord bots, and analytics dashboards with our REST endpoints.',
    readTime: '6 min read',
    lastUpdated: 'November 2026',
    tags: ['api', 'developer', 'rest', 'auth', 'webhooks'],
    content: {
      overview: 'Integrate StreamBotKH directly into your custom web apps, Discord bots, or OBS scripts using our secure REST API and HMAC webhook signatures.',
      callout: {
        type: 'important',
        title: 'API Rate Limits',
        message: 'Standard accounts can make up to 120 requests per minute. Pro accounts enjoy up to 600 requests per minute.'
      },
      codeBlock: {
        title: 'Example: Fetch Streamer Stats & Verified Status',
        language: 'bash',
        code: `curl -X GET "https://streambotkh.com/api/streamer/verified" \\
  -H "Accept: application/json"`
      },
      table: {
        caption: 'Core API Endpoints',
        headers: ['Method', 'Endpoint', 'Description', 'Auth Required'],
        rows: [
          ['GET', '/api/streamer/verified', 'Returns all verified streamers & live status', 'No'],
          ['GET', '/api/donations/recent', 'Returns recent stream contributions', 'Yes (Token)'],
          ['POST', '/api/donations/khqr', 'Generates dynamic Bakong KHQR for donor', 'No'],
          ['POST', '/api/alert-boxes/test', 'Dispatches simulated test alert to OBS', 'Yes (Token)']
        ]
      }
    }
  },

  // ===================== TROUBLESHOOTING =====================
  {
    id: 'obs-troubleshoot',
    category: 'troubleshooting',
    categoryTitle: 'Troubleshooting & Support',
    title: 'OBS Black Screen & Troubleshooting',
    description: 'Resolve common issues with browser sources, audio routing, and hardware acceleration.',
    readTime: '5 min read',
    lastUpdated: 'November 2026',
    tags: ['troubleshoot', 'black-screen', 'audio-fix', 'faq'],
    content: {
      overview: 'If your OBS alerts appear black, fail to play audio, or freeze, follow the diagnostic checklist below to resolve the issue in seconds.',
      callout: {
        type: 'warning',
        title: 'Browser Hardware Acceleration',
        message: 'In OBS Studio Settings > Advanced, make sure "Enable Browser Source Hardware Acceleration" is checked, then restart OBS.'
      },
      steps: [
        {
          title: '1. Refresh Cache of Current Page',
          detail: 'Right-click your browser source in OBS Studio, select Properties, scroll down and click "Refresh cache of current page".'
        },
        {
          title: '2. Check "Shutdown source when not visible"',
          detail: 'If left unchecked, OBS might hold stale connections in the background when switching scenes.'
        },
        {
          title: '3. Verify URL Protocol',
          detail: 'Ensure the URL starts with https://. Unencrypted http:// links may be blocked by your operating system firewall.'
        }
      ],
      faq: [
        {
          q: 'Why does my sound not play in OBS?',
          a: 'In OBS Studio, right-click the browser source > Properties > check "Control audio via OBS". Open Advanced Audio Properties and set the source audio to "Monitor and Output".'
        },
        {
          q: 'What if a donor paid but the alert didn\'t trigger?',
          a: 'Transactions typically verify within 1-2 seconds. If a donor transfers using an unsupported payment format or bank memo, you can manually trigger or credit the alert from Creator Studio > Recent Tips.'
        }
      ]
    }
  }
];

export const DocumentationPage: React.FC<DocumentationPageProps> = ({ onNavigate }) => {
  const params = useParams<{ docId?: string }>();
  const navigate = useNavigate();

  // Selected article state
  const [selectedDocId, setSelectedDocId] = useState<string>(params.docId || 'quickstart');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'no' | null>(null);
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('light-mode');
    }
    return false;
  });

  const toggleTheme = () => {
    if (isLightMode) {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('streambot_theme_mode', 'dark');
      setIsLightMode(false);
    } else {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('streambot_theme_mode', 'light');
      setIsLightMode(true);
    }
  };

  // Sync route param with state
  useEffect(() => {
    if (params.docId && DOC_ARTICLES.some((a) => a.id === params.docId)) {
      setSelectedDocId(params.docId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [params.docId]);

  const currentArticle = useMemo<DocArticle>(() => {
    const found = DOC_ARTICLES.find((a) => a.id === selectedDocId);
    return found || DOC_ARTICLES[0];
  }, [selectedDocId]);

  // Search filter
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return DOC_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.categoryTitle.toLowerCase().includes(query) ||
        a.tags.some((t) => t.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Next / Previous article calculation
  const currentIndex = DOC_ARTICLES.findIndex((a) => a.id === currentArticle.id);
  const prevArticle = currentIndex > 0 ? DOC_ARTICLES[currentIndex - 1] : null;
  const nextArticle = currentIndex < DOC_ARTICLES.length - 1 ? DOC_ARTICLES[currentIndex + 1] : null;

  const handleSelectArticle = (docId: string) => {
    setSelectedDocId(docId);
    setSearchQuery('');
    setMobileSidebarOpen(false);
    setFeedbackGiven(null);
    navigate(`/documentation/${docId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  return (
    <div className="doc-app-canvas min-h-screen flex flex-col bg-[#070A12] text-slate-200">
      {/* ===================== TOP DOCUMENTATION SELF-CONTAINED HEADER ===================== */}
      <header className="doc-top-bar sticky top-0 z-50 h-14 sm:h-16 bg-[#090D18]/95 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-3">
          {/* Left: Mobile Sidebar Toggle + Brand Logo & Title + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex-shrink-0"
              aria-label="Toggle Documentation Sidebar"
            >
              {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Brand Logo & Title */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 select-none group flex-shrink-0"
              title="Return to StreamBotKH Homepage (Opens in new window)"
            >
              <img
                src="/images/logo-192.png"
                alt="StreamBotKH"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform"
              />
              <div className="hidden xxs:flex items-center gap-1.5 font-['Chakra_Petch']">
                <span className="text-sm sm:text-base font-bold text-white tracking-tight">
                  streambot<span className="text-cyan-400">kh</span>
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[9px] uppercase tracking-wider border border-cyan-500/30">
                  DOCS
                </span>
              </div>
            </a>

            {/* Vertical Divider */}
            <div className="hidden sm:block w-px h-5 bg-slate-800/80" />

            {/* Breadcrumb Path */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 truncate">
              <span className="hover:text-cyan-400 cursor-pointer" onClick={() => handleSelectArticle('quickstart')}>
                Guides
              </span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="text-slate-400 truncate">{currentArticle.categoryTitle}</span>
              <ChevronRight size={12} className="text-slate-600" />
              <span className="text-cyan-400 font-semibold truncate">{currentArticle.title}</span>
            </div>
          </div>

          {/* Right: Quick Search Box + External Nav + Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            <div className="relative w-36 xs:w-44 sm:w-60">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search docs (⌘K)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <span>Main Site</span>
              <ExternalLink size={11} />
            </a>

            <a
              href="/creator"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors"
            >
              <span>Creator Studio</span>
              <ExternalLink size={11} />
            </a>

            {/* Theme Toggle Button (Day / Night Mode) */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
              aria-label="Toggle Theme Mode"
              title="Toggle Day/Night Mode"
            >
              {isLightMode ? <Moon size={15} className="text-cyan-400" /> : <Sun size={15} className="text-amber-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* ===================== MAIN DOCUMENTATION BODY ===================== */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex relative">
        {/* ===================== LEFT SIDEBAR (STICKY & RESPONSIVE) ===================== */}
        <aside
          className={`doc-sidebar fixed lg:sticky top-14 sm:top-16 z-30 w-72 sm:w-80 h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] flex-shrink-0 overflow-y-auto p-4 sm:p-6 bg-[#070A12] lg:bg-transparent border-r border-slate-800/80 transition-transform duration-300 select-none ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Search Result Listing when user types */}
          {searchResults ? (
            <div className="space-y-3">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
                Found {searchResults.length} {searchResults.length === 1 ? 'Match' : 'Matches'}
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/60 text-xs text-slate-400 text-center">
                  No matching doc guides found.
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectArticle(item.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 ${
                        item.id === currentArticle.id
                          ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30'
                          : 'hover:bg-white/[0.05] text-slate-300'
                      }`}
                    >
                      <span className="font-bold">{item.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.categoryTitle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Categorized Doc Nav Links */
            <nav className="space-y-6">
              {DOC_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const articlesInCat = DOC_ARTICLES.filter((a) => a.category === cat.id);
                if (articlesInCat.length === 0) return null;

                return (
                  <div key={cat.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono px-2">
                      <CatIcon size={13} className="text-cyan-400" />
                      <span>{cat.title}</span>
                    </div>

                    <div className="space-y-0.5 pl-2 border-l border-slate-800/80 ml-3">
                      {articlesInCat.map((item) => {
                        const isSelected = item.id === currentArticle.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectArticle(item.id)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between group ${
                              isSelected
                                ? 'bg-cyan-500/15 text-cyan-300 font-bold shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                          >
                            <span className="truncate">{item.title}</span>
                            {isSelected && <ChevronRight size={13} className="text-cyan-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Sidebar Quick Action Card */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/30 via-slate-950 to-slate-900 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white font-['Chakra_Petch']">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span>Need Help Live?</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Join our official Cambodian streamer Telegram community for 24/7 OBS assistance.
                  </p>
                  <a
                    href="https://t.me/streambotkh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 hover:underline font-bold"
                  >
                    <span>Open Telegram Channel</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </nav>
          )}
        </aside>

        {/* Mobile Backdrop Overlay */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
          />
        )}

        {/* ===================== CENTER CONTENT ARTICLE AREA ===================== */}
        <main className="doc-content-area flex-1 min-w-0 p-4 sm:p-8 lg:p-12 space-y-8 max-w-4xl">
          {/* Article Header */}
          <div className="space-y-3 pb-6 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                {currentArticle.categoryTitle}
              </span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                <Clock size={12} />
                <span>{currentArticle.readTime}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-['Chakra_Petch']">
              {currentArticle.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {currentArticle.description}
            </p>
          </div>

          {/* Overview Prose */}
          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed space-y-4">
            <p>{currentArticle.content.overview}</p>
          </div>

          {/* Optional Callout Alert */}
          {currentArticle.content.callout && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5 shadow-md ${
                currentArticle.content.callout.type === 'tip'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : currentArticle.content.callout.type === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                  : currentArticle.content.callout.type === 'important'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  : 'bg-cyan-950/20 border-cyan-500/30 text-cyan-300'
              }`}
            >
              {currentArticle.content.callout.type === 'tip' && <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5 text-emerald-400" />}
              {currentArticle.content.callout.type === 'warning' && <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-amber-400" />}
              {currentArticle.content.callout.type === 'important' && <Zap size={18} className="flex-shrink-0 mt-0.5 text-rose-400" />}
              {currentArticle.content.callout.type === 'info' && <Info size={18} className="flex-shrink-0 mt-0.5 text-cyan-400" />}

              <div className="space-y-1 min-w-0">
                <div className="font-bold font-mono text-xs uppercase tracking-wide">
                  {currentArticle.content.callout.title}
                </div>
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {currentArticle.content.callout.message}
                </div>
              </div>
            </div>
          )}

          {/* Step-by-Step Instructions */}
          {currentArticle.content.steps && (
            <div className="space-y-5 pt-2">
              <h2 className="text-lg sm:text-xl font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide flex items-center gap-2">
                <Layers size={18} className="text-cyan-400" />
                <span>Step-by-Step Setup</span>
              </h2>

              <div className="space-y-4">
                {currentArticle.content.steps.map((st, i) => (
                  <div
                    key={i}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start gap-3.5"
                  >
                    <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white font-['Chakra_Petch']">
                        {st.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {st.detail}
                      </p>

                      {st.code && (
                        <div className="relative mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                          <button
                            onClick={() => copyText(st.code!, i)}
                            className="absolute top-2 right-2 p-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Copy Code"
                          >
                            {copiedCodeIndex === i ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                          <pre className="pr-8">{st.code}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Table if present */}
          {currentArticle.content.table && (
            <div className="space-y-3 pt-4">
              {currentArticle.content.table.caption && (
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {currentArticle.content.table.caption}
                </div>
              )}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
                      {currentArticle.content.table.headers.map((h, idx) => (
                        <th key={idx} className="p-3 font-semibold uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {currentArticle.content.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3">
                            {cIdx === 0 ? <span className="font-bold text-white">{cell}</span> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Standalone Code Snippet */}
          {currentArticle.content.codeBlock && (
            <div className="space-y-2 pt-4">
              {currentArticle.content.codeBlock.title && (
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  {currentArticle.content.codeBlock.title}
                </div>
              )}
              <div className="relative p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                <button
                  onClick={() => copyText(currentArticle.content.codeBlock!.code, 999)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                  title="Copy snippet"
                >
                  {copiedCodeIndex === 999 ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
                <pre className="pr-16">{currentArticle.content.codeBlock.code}</pre>
              </div>
            </div>
          )}

          {/* FAQ Accordion if present */}
          {currentArticle.content.faq && (
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-white font-['Chakra_Petch'] uppercase tracking-wide">
                Frequently Asked Inquiries
              </h2>
              <div className="space-y-3">
                {currentArticle.content.faq.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
                    <div className="text-xs sm:text-sm font-bold text-cyan-300 font-mono">
                      Q: {item.q}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== ARTICLE FOOTER: HELPFUL + NEXT/PREV ===================== */}
          <div className="pt-8 border-t border-slate-800/80 space-y-6">
            {/* Feedback Widget */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/30 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">Was this documentation page helpful?</span>
              <div className="flex items-center gap-2">
                {feedbackGiven ? (
                  <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Check size={13} />
                    Thank you for your feedback!
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => setFeedbackGiven('yes')}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <ThumbsUp size={12} />
                      <span>Yes</span>
                    </button>
                    <button
                      onClick={() => setFeedbackGiven('no')}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 transition-colors"
                    >
                      <ThumbsDown size={12} />
                      <span>No</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Next / Previous Article Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prevArticle ? (
                <button
                  onClick={() => handleSelectArticle(prevArticle.id)}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-cyan-500/40 text-left transition-all group flex flex-col justify-between space-y-1"
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
                    Previous Topic
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {prevArticle.title}
                  </span>
                </button>
              ) : (
                <div />
              )}

              {nextArticle ? (
                <button
                  onClick={() => handleSelectArticle(nextArticle.id)}
                  className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/80 hover:border-cyan-500/40 text-right transition-all group flex flex-col justify-between space-y-1"
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center justify-end gap-1">
                    Next Topic
                    <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                    {nextArticle.title}
                  </span>
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
