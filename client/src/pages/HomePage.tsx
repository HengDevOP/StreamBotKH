import React, { useState } from 'react';
import {
  Zap,
  Radio,
  Bell,
  DollarSign,
  Bot,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Play,
  Sparkles,
  Volume2,
  Tv,
  CheckCircle2,
  Flame,
  QrCode
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAudio } from '../hooks/useAudio';
import confetti from 'canvas-confetti';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { playSynthNeonChime } = useAudio();
  const [demoAmount, setDemoAmount] = useState(10);
  const [demoDonor, setDemoDonor] = useState('CyberNinja');
  const [demoMessage, setDemoMessage] = useState('GG WP! Outstanding clutches in that match! 🚀🔥');
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  const triggerLiveDemoAlert = (amount: number, donor: string, msg: string) => {
    setDemoAmount(amount);
    setDemoDonor(donor);
    setDemoMessage(msg);
    setIsPlayingDemo(true);

    // Audio SFX
    playSynthNeonChime(0.9);

    // Confetti
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00F0FF', '#FF007A', '#8B5CF6', '#10B981', '#FBBF24']
      });
    } catch (e) {}

    setTimeout(() => {
      setIsPlayingDemo(false);
    }, 4000);
  };

  return (
    <div className="relative overflow-hidden space-y-24 pb-28">
      {/* Background Grid */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 text-center space-y-8 max-w-5xl mx-auto px-4">
        {/* Holographic Pill */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <span className="tracking-widest uppercase font-semibold text-[11px]">
            NEXT-GEN LIVESTREAM OVERLAYS & ABA BAKONG KHQR
          </span>
          <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-400 text-[10px] font-bold border border-pink-500/30">
            PRO
          </span>
        </div>

        {/* Dynamic Hero Title */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white uppercase leading-none font-['Chakra_Petch']">
            LEVEL UP YOUR STREAM WITH <br />
            <span className="bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              INSTANT LIVE ALERTS
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal pt-2">
            The all-in-one donation gateway built for Cambodian streamers. Accept instant tips via <b className="text-white font-semibold">ABA Mobile</b> and <b className="text-white font-semibold">Bakong KHQR</b> with zero-latency OBS screen animations, TTS audio, and Telegram notifications.
          </p>
        </div>

        {/* CTA Launchpad */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onNavigate('dashboard')}
            icon={<Zap size={18} className="fill-slate-950" />}
            className="w-full sm:w-auto px-6 py-3 text-sm font-bold"
          >
            Launch Streamer Deck
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigate('donate', { username: 'neonstreamer' })}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
          >
            Test Tip Page (/@neonstreamer)
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigate('pricing')}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold border-slate-800 hover:border-slate-600 bg-slate-900/60"
          >
            Pricing Plans
          </Button>
        </div>

        {/* Interactive Live Alert Simulator Studio on Homepage */}
        <div className="pt-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 px-2">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Tv size={14} /> LIVE OVERLAY SIMULATOR
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              60 FPS BROWSER SOURCE READY
            </span>
          </div>

          {/* Alert Preview Screen Frame */}
          <div className="p-7 rounded-2xl bg-[#090D18] border border-slate-800 relative overflow-hidden transition-all duration-300">
            {/* Cyber Corner brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60" />

            <div className="flex flex-col sm:flex-row items-center gap-5 text-left">
              {/* Mascot / Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700 p-1 bg-slate-900">
                  <img
                    src="https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif"
                    alt="Reaction"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-pink-600 text-white font-mono font-bold text-[9px] uppercase">
                  NEW TIP
                </div>
              </div>

              {/* Text & Amount */}
              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    ABA BAKONG NETWORK
                  </span>
                  <span className="text-xs font-mono text-slate-500">Just now</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-white font-['Chakra_Petch'] uppercase flex items-center justify-center sm:justify-start gap-2">
                  <span>{demoDonor}</span>
                  <span className="text-cyan-400 font-mono neon-text-cyan">${demoAmount.toFixed(2)}</span>
                </h3>

                <p className="text-sm text-slate-200 italic font-medium leading-snug">
                  "{demoMessage}"
                </p>

                {/* Animated Equalizer soundwave */}
                <div className="flex items-center justify-center sm:justify-start gap-1 pt-2">
                  <span className="text-[10px] font-mono text-slate-400 mr-1">AUDIO WAVE:</span>
                  <div className="w-1 h-3 bg-cyan-400 rounded-full eq-bar-1" />
                  <div className="w-1 h-5 bg-pink-500 rounded-full eq-bar-2" />
                  <div className="w-1 h-4 bg-purple-500 rounded-full eq-bar-3" />
                  <div className="w-1 h-6 bg-cyan-400 rounded-full eq-bar-4" />
                  <div className="w-1 h-3 bg-pink-500 rounded-full eq-bar-5" />
                </div>
              </div>
            </div>

            {/* Interactive Demo Buttons Below Card */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-mono text-slate-400">Try Sample Trigger:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerLiveDemoAlert(5, 'PhoenixAce', 'Insane snipe bro! Clutch god 🔥')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-cyan-300 transition-all active:scale-95"
                >
                  ⚡ $5.00 Sniping Tip
                </button>
                <button
                  onClick={() => triggerLiveDemoAlert(50, 'WhaleSupporter', 'VIP Donation for the stream upgrade! 👑💎')}
                  className="px-3 py-1.5 rounded-xl bg-pink-950/40 hover:bg-pink-900/50 border border-pink-500/40 text-xs font-bold text-pink-300 transition-colors active:scale-95"
                >
                  👑 $50.00 VIP Drop
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stream Marquee Ticker */}
      <section className="border-y border-slate-800 bg-slate-950/60 py-3.5 overflow-hidden relative">
        <div className="max-w-7xl mx-auto flex items-center gap-6 px-4">
          <div className="flex items-center gap-2 flex-shrink-0 text-xs font-mono font-bold text-pink-400 uppercase tracking-widest">
            <Flame size={16} className="text-pink-500" />
            <span>LIVE TIP FEED:</span>
          </div>

          <div className="flex items-center gap-8 overflow-x-auto text-xs font-mono whitespace-nowrap scrollbar-none text-slate-300">
            <span className="flex items-center gap-1.5">
              <b className="text-white">MegaFan</b> sent <b className="text-cyan-400 font-mono">$15.00</b> via Bakong KHQR
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <b className="text-white">KompongGamer</b> sent <b className="text-pink-400 font-mono">40,000 ៛</b> via ABA PayWay
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <b className="text-white">CyberSamurai</b> sent <b className="text-cyan-400 font-mono">$10.00</b> via Bakong KHQR
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <b className="text-white">PixelQueen</b> sent <b className="text-cyan-400 font-mono">$5.00</b> via Bakong KHQR
            </span>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-5xl font-black text-white font-['Chakra_Petch'] tracking-wide uppercase">
            ENGINEERED FOR PRO BROADCASTERS
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Everything you need to monetize your livestreams across Twitch, YouTube, TikTok, and Facebook Live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <Card glow="cyan" className="p-8 space-y-4 relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 transition-colors">
              <QrCode size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white font-['Chakra_Petch']">
              Dynamic Bakong KHQR
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Generates individual EMVCo-compliant QR codes with exact dollar and Khmer Riel totals. Compatible with ABA Mobile, Acleda, Canadia, and all Bakong apps.
            </p>
            <div className="pt-2 text-xs font-mono text-cyan-400 flex items-center gap-1">
              <CheckCircle2 size={14} /> Tag-Length-Value (TLV) Standard
            </div>
          </Card>

          {/* Feature 2 */}
          <Card glow="pink" className="p-8 space-y-4 relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 transition-colors">
              <Tv size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white font-['Chakra_Petch']">
              OBS 60FPS Overlay
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ultra-lightweight transparent browser source. Features glowing neon border animations, customizable sound volume, confetti explosions, and Web Speech TTS.
            </p>
            <div className="pt-2 text-xs font-mono text-pink-400 flex items-center gap-1">
              <CheckCircle2 size={14} /> Zero Audio Overlap Queuing
            </div>
          </Card>

          {/* Feature 3 */}
          <Card glow="purple" className="p-8 space-y-4 relative overflow-hidden group">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 transition-colors">
              <Bot size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white font-['Chakra_Petch']">
              Telegram Alert Bot
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Pair your phone via <code className="text-purple-300">/start</code> in seconds. Get instant push notifications on every tip, query balance, and trigger alerts remotely.
            </p>
            <div className="pt-2 text-xs font-mono text-purple-400 flex items-center gap-1">
              <CheckCircle2 size={14} /> Instant Pushback Listener
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing Plans Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 scroll-mt-28">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400">
            <Sparkles size={14} />
            <span>TRANSPARENT CREATOR PRICING</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white font-['Chakra_Petch'] tracking-wide uppercase">
            CHOOSE YOUR STREAM POWER LEVEL
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Get started for free or supercharge your broadcast with automated Telegram alerts, custom audio synthesis, and zero platform fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Plan 1: Free Starter */}
          <Card glow="cyan" className="p-8 space-y-6 flex flex-col justify-between border-slate-800 bg-[#0B0F19] relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">FREE STARTER</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">NO CARD REQ.</span>
              </div>
              <div>
                <div className="text-4xl font-black text-white font-['Chakra_Petch']">$0</div>
                <div className="text-xs text-amber-400 font-mono font-semibold pt-1">10% platform fee per donation</div>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-cyan-400 flex-shrink-0" />
                  <span>Dynamic Bakong KHQR checkouts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-cyan-400 flex-shrink-0" />
                  <span>OBS 60FPS browser source overlay</span>
                </li>
                <li className="flex items-center gap-2.5 text-amber-300">
                  <span className="font-mono font-bold text-amber-400">10%</span>
                  <span>Platform fee cut on tips</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-cyan-400 flex-shrink-0" />
                  <span>Web Audio synth alert chimes</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <span className="w-4 text-center">-</span>
                  <span>Telegram bot alerts</span>
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('dashboard')}
              className="w-full font-bold"
            >
              Start Free (10% Fee)
            </Button>
          </Card>

          {/* Plan 2: Pro Streamer (Popular) */}
          <Card glow="pink" className="p-8 space-y-6 flex flex-col justify-between border-2 border-pink-500/50 bg-[#0E1424] relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-pink-600 text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1">
              <Flame size={12} />
              RECOMMENDED
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-400">PRO STREAMER</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">8,000 ៛/MO</span>
              </div>
              <div>
                <div className="text-4xl font-black text-white font-['Chakra_Petch']">
                  $1.99 <span className="text-sm font-normal text-slate-400 font-sans">/ month</span>
                </div>
                <div className="text-xs text-emerald-400 font-mono font-semibold pt-1">0% fee cut on all tips</div>
              </div>
              <ul className="space-y-3 text-xs text-slate-200 pt-2">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0" />
                  <span className="font-semibold text-emerald-400">0% platform fee (No cut)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0" />
                  <span>ABA PayWay instant pushback webhook</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0" />
                  <span>Telegram Alert Bot integration</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0" />
                  <span>Web Speech TTS reader for donor tips</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0" />
                  <span>Custom neon alert skins & duration control</span>
                </li>
              </ul>
            </div>
            <Button
              variant="neon-pink"
              size="md"
              onClick={() => onNavigate('dashboard')}
              className="w-full font-bold"
            >
              Get Pro ($1.99/mo)
            </Button>
          </Card>

          {/* Plan 3: Esports Studio */}
          <Card glow="purple" className="p-8 space-y-6 flex flex-col justify-between border-slate-800 bg-[#0B0F19] relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">STUDIO & ESPORTS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">20,000 ៛/MO</span>
              </div>
              <div>
                <div className="text-4xl font-black text-white font-['Chakra_Petch']">
                  $4.99 <span className="text-sm font-normal text-slate-400 font-sans">/ month</span>
                </div>
                <div className="text-xs text-emerald-400 font-mono font-semibold pt-1">0% fee cut on all tips</div>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0" />
                  <span className="font-semibold text-emerald-400">0% platform fee (No cut)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0" />
                  <span>Multi-seat streamer overlay tokens</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0" />
                  <span>Custom domain & branded tip URL</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0" />
                  <span>Dedicated high-frequency WebSocket node</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-purple-400 flex-shrink-0" />
                  <span>24/7 priority Telegram direct SLA</span>
                </li>
              </ul>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onNavigate('dashboard')}
              className="w-full font-bold border-purple-500/40 text-purple-200 hover:bg-purple-950/40"
            >
              Get Studio ($4.99/mo)
            </Button>
          </Card>
        </div>
      </section>

      {/* Cambodian Banking Network Logos */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-6">
        <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
          POWERED BY CAMBODIA'S NATIONAL PAYMENT INFRASTRUCTURE
        </span>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 opacity-80">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm font-black text-cyan-400 font-mono tracking-wider">
            ABA BANK PAYWAY
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm font-black text-red-500 font-mono tracking-wider">
            BAKONG KHQR
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm font-black text-blue-400 font-mono tracking-wider">
            EMVCo STANDARDS
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm font-black text-emerald-400 font-mono tracking-wider">
            SOCKET.IO ENGINE
          </div>
        </div>
      </section>

      {/* Bottom Launch Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="relative p-10 sm:p-14 rounded-2xl bg-[#0B0F19] border border-slate-800 overflow-hidden text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black text-white font-['Chakra_Petch'] tracking-wide">
            UPGRADE YOUR STREAM TODAY
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto">
            Ready to give your viewers the smoothest tip experience with instant live screen glory?
          </p>
          <div className="flex justify-center pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('dashboard')}
              icon={<ArrowRight size={18} />}
              className="px-8 py-3 font-bold text-sm"
            >
              Enter Streamer Portal
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
