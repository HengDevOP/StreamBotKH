import React, { useState } from 'react';
import { Send, Copy, Check, ExternalLink, Bot, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

interface TelegramBotCardProps {
  pairingCode?: string;
  isLinked?: boolean;
  botUsername?: string;
}

export const TelegramBotCard: React.FC<TelegramBotCardProps> = ({
  pairingCode = 'NEON-8899',
  isLinked = false,
  botUsername = 'StreamNeonAlertBot'
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const telegramLink = `https://t.me/${botUsername}?start=${pairingCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`/start ${pairingCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Card glow="purple" className="space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Telegram Alert Bot
              {isLinked ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={10} /> CONNECTED
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  READY TO PAIR
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Receive instant push notifications on your phone for every Bakong & ABA tip</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pairing Code Box */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Your Streamer Pairing Code
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black font-mono tracking-widest text-cyan-400 neon-text-cyan">
              {pairingCode}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              icon={copiedCode ? <Check size={14} /> : <Copy size={14} />}
            >
              {copiedCode ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Send <code>/start {pairingCode}</code> to <span className="text-purple-400 font-mono">@{botUsername}</span>
          </p>
        </div>

        {/* Quick Launch */}
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Quick 1-Click Connect</h4>
            <p className="text-xs text-slate-400">
              Open Telegram app and activate your bot alerts immediately.
            </p>
          </div>
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs tracking-wider transition-colors text-center"
          >
            <Send size={14} />
            Open in Telegram
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Available Telegram Commands */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5 font-mono">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block font-sans">
          Supported Bot Commands:
        </span>
        <div className="grid grid-cols-2 gap-2 text-slate-300">
          <div><code className="text-cyan-400">/balance</code> - Today & all-time earnings</div>
          <div><code className="text-cyan-400">/recent</code> - Last 5 donations received</div>
          <div><code className="text-cyan-400">/testalert</code> - Trigger test alert on OBS</div>
          <div><code className="text-pink-400">/unlink</code> - Disconnect Telegram bot</div>
        </div>
      </div>
    </Card>
  );
};
