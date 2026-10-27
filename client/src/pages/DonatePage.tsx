import React, { useState, useEffect } from 'react';
import {
  donationService,
  PublicStreamerInfo
} from '../services/donationService';
import { CreateDonationResponse, Donation } from '../types/donation';
import { DonorForm } from '../components/donate/DonorForm';
import { BakongKHQRModal } from '../components/donate/BakongKHQRModal';
import { DonationSuccess } from '../components/donate/DonationSuccess';
import {
  Loader2,
  Share2,
  Check,
  Landmark,
  ShieldCheck,
  Heart,
  MessageSquare,
  Sparkles,
  Zap,
  ArrowLeft
} from 'lucide-react';

interface DonatePageProps {
  username?: string;
  onNavigate?: (page: string) => void;
}

export const DonatePage: React.FC<DonatePageProps> = ({ username = 'neonstreamer', onNavigate }) => {
  const cleanUsername = username.replace(/^@/, '').trim() || 'neonstreamer';

  const [streamer, setStreamer] = useState<PublicStreamerInfo | null>(null);
  const [recentSupporters, setRecentSupporters] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [activeDonation, setActiveDonation] = useState<CreateDonationResponse | null>(null);
  const [currentDonorName, setCurrentDonorName] = useState<string>('');
  const [currentBankingName, setCurrentBankingName] = useState<string>('ABA Bank');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchStreamerAndSupporters = async () => {
      try {
        setLoading(true);
        setError(null);
        const [streamerData, supportersData] = await Promise.all([
          donationService.getPublicStreamer(cleanUsername),
          donationService.getStreamerRecentDonations(cleanUsername).catch(() => [])
        ]);
        setStreamer(streamerData);
        setRecentSupporters(supportersData);
      } catch (err: any) {
        setError(err.message || 'Streamer not found');
      } finally {
        setLoading(false);
      }
    };

    fetchStreamerAndSupporters();
  }, [cleanUsername]);

  const handleFormSubmit = async (formData: {
    donorName: string;
    donorMessage: string;
    amount: number;
    currency: 'USD' | 'KHR';
    bankingName: string;
  }) => {
    if (!streamer) return;

    setSubmitting(true);
    try {
      const res = await donationService.createDonation({
        streamerId: streamer.id,
        donorName: formData.donorName,
        donorMessage: formData.donorMessage,
        amount: formData.amount,
        currency: formData.currency,
        bankingName: formData.bankingName
      });

      setCurrentDonorName(formData.donorName);
      setCurrentBankingName(formData.bankingName);
      setActiveDonation(res);
      setIsModalOpen(true);
    } catch (err: any) {
      alert('Failed to generate Bakong KHQR: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setIsModalOpen(false);
    setIsSuccess(true);
    // Refresh supporters feed
    donationService.getStreamerRecentDonations(cleanUsername).then(setRecentSupporters).catch(() => {});
  };

  const handleReset = () => {
    setIsSuccess(false);
    setActiveDonation(null);
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/@${cleanUsername}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-cyan-400 gap-3">
        <Loader2 className="animate-spin" size={32} />
        <span className="text-xs font-mono tracking-wider text-slate-400">LOADING STREAMER TIP PAGE...</span>
      </div>
    );
  }

  if (error || !streamer) {
    return (
      <div className="text-center py-28 max-w-md mx-auto space-y-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white">Streamer Not Found</h2>
        <p className="text-sm text-slate-400">
          The channel <code className="text-cyan-400 font-mono">@{cleanUsername}</code> is not registered on streambotkh.com or has not completed setup.
        </p>
        <button
          onClick={() => onNavigate?.('home')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white hover:border-slate-700 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Return to Homepage</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Share Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <button
            onClick={() => onNavigate?.('home')}
            className="hover:text-cyan-400 transition-colors"
          >
            streambotkh.com
          </button>
          <span>/</span>
          <span className="text-white font-bold">@{streamer.username}</span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px]">
            DONATION PORTAL
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyLink}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400 font-mono">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 size={13} className="text-cyan-400" />
                <span>Share Link (/@{streamer.username})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Donation Form / Success Screen */}
        <div className="lg:col-span-7">
          {isSuccess && activeDonation ? (
            <DonationSuccess
              donorName={currentDonorName}
              bankingName={currentBankingName}
              amount={activeDonation.amount}
              currency={activeDonation.currency}
              streamerName={streamer.displayName}
              onReset={handleReset}
            />
          ) : (
            <DonorForm
              streamer={streamer}
              onSubmit={handleFormSubmit}
              loading={submitting}
            />
          )}
        </div>

        {/* Right Column: Streamer Info & Recent Supporters Feed */}
        <div className="lg:col-span-5 space-y-6">
          {/* Streamer Live Info Card */}
          <div className="p-5 rounded-2xl bg-[#0C101C] border border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 p-0.5 overflow-hidden">
                <img
                  src={streamer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamer.username}`}
                  alt={streamer.displayName}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-1.5">
                  <span>{streamer.displayName}</span>
                  <span className="text-xs text-cyan-400">🇰🇭</span>
                </h3>
                <span className="text-xs font-mono text-cyan-400">@{streamer.username}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {streamer.bio || 'Broadcasting live gaming, esports, and tech content. Support the stream to trigger instant alerts!'}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase block">Min Alert</span>
                <span className="text-white font-bold">${streamer.minAmountAlert.toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 uppercase block">TTS Voice</span>
                <span className="text-cyan-400 font-bold">${streamer.ttsMinAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Supported Banking Apps Card */}
          <div className="p-5 rounded-2xl bg-[#0C101C] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
              <Landmark size={14} className="text-cyan-400" />
              <span>Accepted Banking & Mobile Wallets</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Donors can scan using ABA Mobile, Acleda toanChet, Wing Bank, Canadia, Sathapana, or any Bakong-compatible app in Cambodia.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['ABA Mobile', 'ACLEDA', 'Canadia', 'Wing Bank', 'Bakong', 'Sathapana', 'J Trust Royal', 'CPBank'].map((b) => (
                <span
                  key={b}
                  className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Recent Stream Supporters Feed */}
          <div className="p-5 rounded-2xl bg-[#0C101C] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-pink-400 fill-pink-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['Chakra_Petch']">
                  Recent Supporters
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {recentSupporters.length} recent
              </span>
            </div>

            {recentSupporters.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Be the first to drop a tip and cheer on @{streamer.username}!
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSupporters.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{s.donor_name}</span>
                        {s.banking_name && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-400">
                            {s.banking_name}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-cyan-400">
                        {s.currency === 'KHR'
                          ? `${s.amount.toLocaleString()} ៛`
                          : `$${s.amount.toFixed(2)}`}
                      </span>
                    </div>
                    {s.donor_message && (
                      <p className="text-xs text-slate-300 italic line-clamp-2">
                        "{s.donor_message}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bakong KHQR Modal */}
      <BakongKHQRModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        donationData={activeDonation}
        donorName={currentDonorName}
        bankingName={currentBankingName}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
