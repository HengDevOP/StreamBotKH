import React, { useState } from 'react';
import {
  Tv,
  CreditCard,
  Send,
  Code,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Sparkles,
  Terminal,
  Layers,
  Volume2,
  CheckCircle2,
  HelpCircle,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

interface ResourcesPageProps {
  onNavigate: (page: string) => void;
}

export const ResourcesPage: React.FC<ResourcesPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'obs' | 'payway' | 'bakong' | 'telegram' | 'api'>('obs');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="relative min-h-screen py-12 px-4 sm:px-6 lg:px-8 space-y-16 max-w-7xl mx-auto">
      {/* Background Cyber Ambient Lights */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400">
          <BookOpen size={14} />
          <span className="uppercase tracking-widest font-semibold">STREAMBOTKH CREATOR & DEVELOPER HUB</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Resources & Documentation
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Step-by-step setup guides, payment integration tutorials, and technical reference docs to optimize your live stream alerts.
        </p>
      </div>

      {/* Navigation Category Tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap pb-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('obs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
            activeTab === 'obs'
              ? 'bg-pink-600 text-white'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Tv size={16} />
          <span>OBS Studio Overlay</span>
        </button>

        <button
          onClick={() => setActiveTab('payway')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
            activeTab === 'payway'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CreditCard size={16} />
          <span>ABA PayWay Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('bakong')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
            activeTab === 'bakong'
              ? 'bg-red-500 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <FileCode size={16} />
          <span>Bakong KHQR Standards</span>
        </button>

        <button
          onClick={() => setActiveTab('telegram')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
            activeTab === 'telegram'
              ? 'bg-purple-600 text-white font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Send size={16} />
          <span>Telegram Alert Bot</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
            activeTab === 'api'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Terminal size={16} />
          <span>REST & Socket API</span>
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="animate-fadeIn space-y-8">
        {/* 1. OBS Studio Overlay */}
        {activeTab === 'obs' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card glow="pink" className="p-6 sm:p-8 space-y-6 border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400">
                    <Tv size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                      OBS Studio & Streamlabs Browser Source
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      Target URL format: http://localhost:5173/overlay/:your_token
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-300">
                  <p>
                    StreamBotKH provides a 100% transparent browser overlay that renders real-time CSS cyber animations, Web Audio synthesized chimes, and browser Text-to-Speech (TTS) for donation messages.
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                    <div className="text-pink-400 font-bold uppercase tracking-wider">
                      Optimal OBS Browser Settings
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-slate-200">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">WIDTH</span>
                        <b className="text-white text-base">800 px</b>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">HEIGHT</span>
                        <b className="text-white text-base">600 px</b>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">FPS</span>
                        <b className="text-cyan-400 text-base">60 FPS</b>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">AUDIO CONTROL</span>
                        <b className="text-emerald-400 text-base">Via OBS</b>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white font-['Chakra_Petch'] pt-2">
                    Step-by-Step OBS Setup
                  </h3>
                  <ol className="space-y-3 list-decimal list-inside text-xs text-slate-300 leading-relaxed">
                    <li>
                      Log into your <button onClick={() => onNavigate('dashboard')} className="text-cyan-400 underline font-bold">StreamBotKH Dashboard</button> and click <b>OBS Browser Source</b> in the top bar.
                    </li>
                    <li>
                      Copy your private unique overlay URL (keep this secret from viewers).
                    </li>
                    <li>
                      In OBS Studio, find the <b>Sources</b> panel, click the <b>+ (Add)</b> button and select <b>Browser</b>.
                    </li>
                    <li>
                      Name the source <code className="text-pink-400">StreamBotKH Alerts</code> and click OK.
                    </li>
                    <li>
                      Paste your overlay URL into the <b>URL</b> field. Set Width to <b>800</b> and Height to <b>600</b>.
                    </li>
                    <li>
                      Enable <b>"Shutdown source when not visible"</b> and <b>"Refresh browser when scene becomes active"</b>.
                    </li>
                    <li>
                      Return to your StreamBotKH Dashboard and click <b>"Send Test Alert"</b> to verify visual animations and audio playback!
                    </li>
                  </ol>
                </div>
              </Card>
            </div>

            {/* Quick Tips Sidebar */}
            <div className="space-y-6">
              <Card glow="cyan" className="p-6 space-y-4 border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-bold font-mono">
                  <Sparkles size={18} />
                  <span>PRO STREAMING TIPS</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><b>Hardware Acceleration:</b> Enable hardware acceleration in OBS browser settings for smooth 60fps animations during heavy gameplay.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><b>Zero Overlap:</b> StreamBotKH incorporates an automatic queue buffer so back-to-back tips never play audio over each other.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span><b>OBS Audio Monitoring:</b> Check "Control audio via OBS" if you wish to route tip audio to a separate Twitch VOD audio track.</span>
                  </li>
                </ul>
              </Card>

              <Card glow="purple" className="p-6 space-y-3 border-slate-800 bg-slate-900/60 text-center">
                <Volume2 size={32} className="mx-auto text-purple-400" />
                <h4 className="font-bold text-white text-sm">Need Help Setting Up?</h4>
                <p className="text-xs text-slate-400">
                  Our streamer community in Discord can assist with OBS canvas positioning and filter setups.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('discord')}
                  className="w-full mt-2"
                >
                  Join Discord Community
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* 2. ABA PayWay Gateway */}
        {activeTab === 'payway' && (
          <div className="space-y-6">
            <Card glow="cyan" className="p-6 sm:p-8 space-y-6 border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <CreditCard size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                    ABA Bank PayWay Integration & Webhook Listener
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    HMAC-SHA512 checksum validation and instant pushback
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-300">
                <p>
                  StreamBotKH provides out-of-the-box integration with ABA Bank PayWay API v1. Whenever a donor completes payment through ABA Mobile or card, PayWay issues an instant HTTP POST pushback webhook to your server.
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
                    <span>PUSHBACK WEBHOOK URL (Set this in ABA PayWay Merchant Portal)</span>
                    <button
                      onClick={() => copyToClipboard('http://localhost:5001/api/payway/webhook', 'webhook')}
                      className="flex items-center gap-1 text-[11px] hover:text-white"
                    >
                      {copiedKey === 'webhook' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedKey === 'webhook' ? 'Copied' : 'Copy URL'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto">
                    http://localhost:5001/api/payway/webhook
                  </pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-cyan-400" />
                      HMAC-SHA512 Hash Generation
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      PayWay requires concatenation of req_time, merchant_id, tran_id, amount, items, return_url, and continue_success_url hashed with your merchant API key.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-cyan-400" />
                      Instant WebSocket Relay
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      As soon as the pushback is acknowledged with status 0, the backend publishes the tip to the streamer room token via Socket.IO.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 3. Bakong KHQR Standards */}
        {activeTab === 'bakong' && (
          <div className="space-y-6">
            <Card glow="pink" className="p-6 sm:p-8 space-y-6 border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
                  <FileCode size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                    National Bank of Cambodia (NBC) Bakong KHQR
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    EMVCo Tag-Length-Value (TLV) specification & CRC16 checksum
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-300">
                <p>
                  Bakong KHQR enables any Cambodian banking app (ABA Mobile, Acleda toanChet, Canadia, Sathapana, Wing) to scan and pay exact tip amounts in USD ($) or Khmer Riel (៛).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">TAG 53 (CURRENCY)</span>
                    <div className="text-lg font-bold text-white font-mono">840 (USD) / 116 (KHR)</div>
                    <p className="text-xs text-slate-400">ISO 4217 numeric currency representation.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">TAG 54 (TRANSACTION AMOUNT)</span>
                    <div className="text-lg font-bold text-cyan-400 font-mono">Exact Total</div>
                    <p className="text-xs text-slate-400">Prevents viewers from entering the wrong tip amount.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">TAG 63 (CRC16 CHECKSUM)</span>
                    <div className="text-lg font-bold text-pink-400 font-mono">CCITT 16-Bit</div>
                    <p className="text-xs text-slate-400">Calculated over full payload ending with 6304.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 4. Telegram Alert Bot */}
        {activeTab === 'telegram' && (
          <div className="space-y-6">
            <Card glow="purple" className="p-6 sm:p-8 space-y-6 border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Send size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                    Telegram Donation Alert Bot Setup
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Bot: @StreamNeonAlertBot
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-300">
                <p>
                  Keep track of all earnings directly on your mobile device. When someone sends a donation, the bot sends an instant notification with donor name, amount, and message.
                </p>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="text-purple-400 font-bold uppercase tracking-wider">
                    Available Bot Commands
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <b className="text-cyan-400">/start &lt;PAIRING_CODE&gt;</b>
                      <p className="text-slate-400 text-[11px] mt-1">Links your Telegram chat ID with your streamer dashboard.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <b className="text-cyan-400">/balance</b>
                      <p className="text-slate-400 text-[11px] mt-1">Check today's revenue and total all-time tips received.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <b className="text-cyan-400">/recent</b>
                      <p className="text-slate-400 text-[11px] mt-1">View the last 5 donations with timestamps and notes.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <b className="text-cyan-400">/testalert</b>
                      <p className="text-slate-400 text-[11px] mt-1">Trigger a live test alert on your OBS screen from Telegram!</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 5. REST & Socket API */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <Card glow="cyan" className="p-6 sm:p-8 space-y-6 border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Terminal size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white font-['Chakra_Petch']">
                    REST API & Socket.IO Specification
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Real-time overlay events and donor endpoints
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-mono text-slate-300">
                <div className="space-y-2">
                  <span className="text-slate-400 uppercase">Core Endpoints</span>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                      <span className="text-white">/api/streamer/:username</span>
                      <span className="text-slate-500 ml-auto hidden sm:block">Public streamer profile</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">POST</span>
                      <span className="text-white">/api/donations/create</span>
                      <span className="text-slate-500 ml-auto hidden sm:block">Initiate donation & generate KHQR</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">POST</span>
                      <span className="text-white">/api/streamer/test-alert</span>
                      <span className="text-slate-500 ml-auto hidden sm:block">Trigger overlay test alert</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-slate-400 uppercase">Socket.IO Rooms & Events</span>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div>
                      <b className="text-cyan-400">join-overlay (token)</b> - OBS browser source joins streamer private room.
                    </div>
                    <div>
                      <b className="text-pink-400">donation-alert (payload)</b> - Dispatched by server when donation is verified.
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom CTA Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-2 border-cyan-500/30 text-center space-y-4">
        <h3 className="text-2xl font-bold text-white font-['Chakra_Petch']">
          Ready to Connect Your Stream?
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Start setting up your OBS Browser Source and test instant Bakong KHQR alerts now.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('dashboard')}
            icon={<ArrowRight size={16} />}
          >
            Go to Streamer Dashboard
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => onNavigate('pricing')}
          >
            View Pricing Plans
          </Button>
        </div>
      </div>
    </div>
  );
};
