import React, { useState } from 'react';
import {
  DollarSign,
  MessageSquare,
  User,
  Zap,
  Sparkles,
  Volume2,
  ShieldCheck,
  Landmark,
  Check,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PublicStreamerInfo } from '../../services/donationService';

interface DonorFormProps {
  streamer: PublicStreamerInfo;
  onSubmit: (data: {
    donorName: string;
    donorMessage: string;
    amount: number;
    currency: 'USD' | 'KHR';
    bankingName: string;
  }) => Promise<void>;
  loading?: boolean;
}

const POPULAR_BANKS = [
  { id: 'ABA Bank', name: 'ABA Bank', badge: 'ABA' },
  { id: 'Acleda Bank', name: 'ACLEDA Bank', badge: 'ACLEDA' },
  { id: 'Canadia Bank', name: 'Canadia Bank', badge: 'CNB' },
  { id: 'Wing Bank', name: 'Wing Bank', badge: 'WING' },
  { id: 'Bakong KHQR', name: 'Bakong App', badge: 'KHQR' },
  { id: 'Sathapana Bank', name: 'Sathapana Bank', badge: 'SPN' },
  { id: 'J Trust Royal', name: 'J Trust Royal', badge: 'JTR' },
  { id: 'CPBank', name: 'CPBank', badge: 'CPB' }
];

const EMOJI_PRESETS = ['🔥', '🚀', '👑', '🎮', '💥', '🇰🇭', '❤️', '👏'];

export const DonorForm: React.FC<DonorFormProps> = ({ streamer, onSubmit, loading }) => {
  const [currency, setCurrency] = useState<'USD' | 'KHR'>('USD');
  const [amount, setAmount] = useState<number>(5);
  const [bankingName, setBankingName] = useState<string>('ABA Bank');
  const [donorName, setDonorName] = useState<string>('');
  const [donorMessage, setDonorMessage] = useState<string>('');

  const usdPresets = [1, 2, 5, 10, 25, 50];
  const khrPresets = [4000, 10000, 20000, 40000, 100000, 200000];
  const presets = currency === 'USD' ? usdPresets : khrPresets;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim() || !bankingName.trim() || amount <= 0) return;

    await onSubmit({
      donorName: donorName.trim(),
      donorMessage: donorMessage.trim(),
      amount,
      currency,
      bankingName: bankingName.trim()
    });
  };

  const isEligibleTTS = amount >= (streamer.ttsMinAmount || 2);

  const addEmoji = (emoji: string) => {
    if (donorMessage.length + emoji.length <= 200) {
      setDonorMessage((prev) => (prev ? `${prev} ${emoji}` : emoji));
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-6 sm:p-8 space-y-7 border border-slate-800 bg-[#0C101C] rounded-2xl">
        {/* Streamer Profile Header */}
        <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-800/80">
          <div className="relative">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl p-0.5 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500">
              <img
                src={streamer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamer.username}`}
                alt={streamer.displayName}
                className="w-full h-full rounded-2xl bg-slate-900 object-cover"
              />
            </div>
            <div className="absolute -bottom-2 inset-x-0 flex justify-center">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/90 border border-red-500/40 text-white font-mono font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-2xl font-bold text-white font-['Chakra_Petch'] tracking-wide">
                {streamer.displayName}
              </h2>
              <span title="Verified Streamer" className="text-cyan-400">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <p className="text-xs text-cyan-400 font-mono">@{streamer.username}</p>
            {streamer.bio && (
              <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto line-clamp-2 leading-relaxed">
                {streamer.bio}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Verified KHQR Merchant</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Volume2 size={12} className="text-cyan-400" />
                <span>TTS &gt; ${streamer.ttsMinAmount.toFixed(0)}</span>
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Currency Switcher */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
              1. Select Currency
            </label>
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCurrency('USD');
                  setAmount(5);
                }}
                className={`px-4 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors ${
                  currency === 'USD'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrency('KHR');
                  setAmount(20000);
                }}
                className={`px-4 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors ${
                  currency === 'KHR'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                KHR (៛)
              </button>
            </div>
          </div>

          {/* Amount Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
              2. Choose Tip Amount
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {presets.map((p) => {
                const isSelected = amount === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`py-2.5 px-2 rounded-xl font-mono text-sm font-bold border transition-colors ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 font-extrabold'
                        : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {currency === 'USD' ? `$${p}` : `${(p / 1000).toFixed(0)}k ៛`}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input */}
            <div className="relative pt-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {currency === 'USD' ? <DollarSign size={16} /> : <span className="font-bold text-sm">៛</span>}
              </div>
              <input
                type="number"
                step={currency === 'USD' ? '0.5' : '1000'}
                min={currency === 'USD' ? '0.5' : '1000'}
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="Or enter custom amount..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-base font-bold focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          {/* Banking Name Input (Required) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex items-center gap-1.5">
                <Landmark size={14} className="text-cyan-400" />
                <span>3. Your Banking Name / Sender Bank *</span>
              </label>
              <span className="text-[11px] font-mono text-cyan-400">Selected: {bankingName || 'None'}</span>
            </div>

            {/* Quick Pick Popular Bank Chips */}
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_BANKS.map((b) => {
                const isSelected = bankingName === b.name;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBankingName(b.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300 font-semibold'
                        : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{b.name}</span>
                    {isSelected && <Check size={12} className="text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Banking Name Input Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Landmark size={16} />
              </div>
              <input
                type="text"
                required
                placeholder="e.g. ABA Bank, Acleda, Wing, or Account Name (SOKHA HENG)"
                value={bankingName}
                onChange={(e) => setBankingName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enter the bank or account name you are paying from so the streamer can match your transaction in their ledger.
            </p>
          </div>

          {/* Donor Gamer Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex items-center gap-1.5">
              <User size={14} className="text-cyan-400" />
              <span>4. Your Display Name / Gamer Tag *</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                placeholder="e.g. CyberSamurai, SopheakGamer"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-medium focus:outline-none focus:border-cyan-400 transition-colors placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Donor Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch'] flex items-center gap-1.5">
                <MessageSquare size={14} className="text-cyan-400" />
                <span>5. Stream Screen Message (Optional)</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">{donorMessage.length}/200</span>
            </div>

            <textarea
              rows={3}
              maxLength={200}
              placeholder="Drop a cheer or ask a question! Displayed live on stream screen..."
              value={donorMessage}
              onChange={(e) => setDonorMessage(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors resize-none placeholder:text-slate-500 leading-relaxed"
            />

            {/* Quick Emoji Reaction Chips */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
              <span className="text-[11px] font-mono text-slate-400">Quick reaction:</span>
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-sm hover:border-slate-700 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Text-To-Speech Eligibility Banner */}
          {isEligibleTTS ? (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2.5 text-xs text-cyan-300">
              <Sparkles size={16} className="text-cyan-400 flex-shrink-0 animate-pulse" />
              <span>
                <b>TTS Voice Alert Active!</b> Your message will be read out aloud on the live stream.
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <Volume2 size={15} className="text-slate-400 flex-shrink-0" />
              <span>Tips of ${streamer.ttsMinAmount.toFixed(2)} or more trigger Text-To-Speech voice alert on broadcast.</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!donorName.trim() || !bankingName.trim() || amount <= 0}
            className="w-full py-3.5 text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl"
            icon={<Zap size={18} className="fill-slate-950" />}
          >
            Generate Bakong KHQR ({currency === 'USD' ? `$${amount}` : `${amount.toLocaleString()} ៛`})
          </Button>

          {/* Security & Bank Notice */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400 text-center">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Supported by 30+ Cambodian Banks via National Bank of Cambodia Bakong KHQR</span>
          </div>
        </form>
      </Card>
    </div>
  );
};
