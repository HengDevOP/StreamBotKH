'use client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  donationService,
  PublicStreamerInfo
} from '../services/donationService';
import { CreateDonationResponse, Donation } from '../types/donation';
import { DonorForm, DonorFormData, extractYouTubeId } from '../components/donate/DonorForm';
import { BakongKHQRModal } from '../components/donate/BakongKHQRModal';
import { DonationSuccess } from '../components/donate/DonationSuccess';
import { useModal } from '../context/ModalContext';
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Heart,
  Sparkles,
  Youtube,
  XCircle,
  X,
  Bot
} from 'lucide-react';
import { Card } from '../components/common/Card';

interface DonatePageProps {
  username?: string;
  onNavigate?: (page: string, params?: any) => void;
}

export const DonatePage: React.FC<DonatePageProps> = ({ username = 'neonstreamer', onNavigate }) => {
  const { showAlert } = useModal();
  const cleanUsername = username.replace(/^@/, '').trim() || 'neonstreamer';

  const [streamer, setStreamer] = useState<PublicStreamerInfo | null>(null);
  const [recentSupporters, setRecentSupporters] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeDonation, setActiveDonation] = useState<CreateDonationResponse | null>(null);
  const [currentDonorName, setCurrentDonorName] = useState<string>('');
  const [currentBankingName, setCurrentBankingName] = useState<string>('Bakong KHQR');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  // Auto-dismiss cancel toast after 6 seconds
  useEffect(() => {
    if (!cancelMessage) return;
    const timer = setTimeout(() => {
      setCancelMessage(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [cancelMessage]);

  // Selected supporter video for instant playback preview modal
  const [previewingVideoUrl, setPreviewingVideoUrl] = useState<string | null>(null);

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

  const handleFormSubmit = async (formData: DonorFormData) => {
    if (!streamer) return;

    setCancelMessage(null);
    setSubmitting(true);
    try {
      const res = await donationService.createDonation({
        streamerId: streamer.id,
        donorName: formData.donorName,
        donorMessage: formData.donorMessage,
        amount: formData.amount || 0,
        currency: formData.currency || 'USD',
        bankingName: formData.bankingName || formData.donorName || 'Bakong KHQR',
        videoUrl: formData.videoUrl,
        videoTitle: formData.videoTitle,
        videoStartTime: formData.videoStartTime,
        videoEndTime: formData.videoEndTime
      });

      setCurrentDonorName(formData.donorName);
      setCurrentBankingName(formData.bankingName || formData.donorName || 'Bakong KHQR');
      setActiveDonation(res);
      setIsModalOpen(true);
    } catch (err: any) {
      const errMsg = err.message || '';
      showAlert({
        title: 'Checkout Error',
        message: errMsg.includes('KHQR') || errMsg.includes('streamer') ? errMsg : `Failed to generate Bakong KHQR: ${errMsg}`,
        type: 'danger'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paidDetails?: any) => {
    setIsModalOpen(false);
    setIsSuccess(true);
    if (paidDetails) {
      if (paidDetails.amount) {
        setActiveDonation((prev) =>
          prev
            ? { ...prev, amount: Number(paidDetails.amount), currency: paidDetails.currency || prev.currency }
            : prev
        );
      }
      if (paidDetails.donor_name) {
        setCurrentDonorName(paidDetails.donor_name);
      }
      if (paidDetails.banking_name) {
        setCurrentBankingName(paidDetails.banking_name);
      }
    }
    // Refresh supporters feed
    donationService.getStreamerRecentDonations(cleanUsername).then(setRecentSupporters).catch(() => {});
  };

  const handleReset = () => {
    setIsSuccess(false);
    setActiveDonation(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A12] flex flex-col items-center justify-center text-cyan-400 gap-3">
        <Loader2 className="animate-spin" size={36} />
        <span className="text-xs font-mono tracking-wider text-slate-400">LOADING DONATION PAGE...</span>
      </div>
    );
  }

  if (error || !streamer) {
    return (
      <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-4">
        <div className="text-center py-12 max-w-md mx-auto space-y-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <span className="font-mono text-xl font-bold">404</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Chakra_Petch']">
            Not Found
          </h1>
          <div className="pt-2">
            <button
              onClick={() => onNavigate?.('home')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-none bg-slate-900 border border-slate-800 text-xs text-white hover:border-cyan-400 hover:text-cyan-400 transition-colors font-mono uppercase tracking-wider"
            >
              <ArrowLeft size={14} />
              <span>Return to Homepage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col items-center justify-center py-4 xs:py-6 sm:py-12 px-2.5 xs:px-4 sm:px-6">
      {/* Cancellation Notice Toast (Device: Pop top / Desktop: Pop slide left top-right) */}
      {cancelMessage && !isSuccess && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed z-50 top-3 left-2 right-2 max-w-sm mx-auto md:top-6 md:right-6 md:left-auto md:w-96 md:max-w-none animate-cancel-toast pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-xl bg-[#0d0910]/95 backdrop-blur-md border border-red-500/40 p-3 sm:p-4 shadow-2xl shadow-red-950/70 flex items-start gap-2.5 sm:gap-3 text-slate-100">
            {/* Ambient Red Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

            <div className="mt-0.5 flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner shadow-red-500/20">
              <XCircle size={16} className="animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider font-semibold text-red-400 bg-red-950/70 px-1.5 py-0.5 rounded border border-red-800/50">
                  Cancelled
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                  Payment Voided
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-100 font-['Chakra_Petch'] leading-tight">
                {cancelMessage}
              </p>
            </div>

            <button
              onClick={() => setCancelMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Success Screen after Payment */}
      {isSuccess && activeDonation ? (
        <div className="w-full max-w-md mx-auto py-2 sm:py-4 animate-fadeIn">
          <DonationSuccess
            donorName={currentDonorName}
            bankingName={currentBankingName}
            amount={activeDonation.amount}
            currency={activeDonation.currency}
            streamerName={streamer.displayName}
            customThanksMessage={streamer.customThanksMessage}
            isVerified={streamer.isVerified}
            onReset={handleReset}
          />
        </div>
      ) : (
        /* Main Centered Container Div: not full width and not full height, side-by-side equal height on desktop */
        <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row md:items-stretch justify-center gap-4 sm:gap-6 animate-fadeIn">
          
          {/* First Div: For the Content (left side) */}
          <div className="w-full md:w-[460px] lg:w-[480px] flex-shrink-0 min-w-0 flex flex-col">
            <DonorForm
              streamer={streamer}
              onSubmit={handleFormSubmit}
              loading={submitting}
              isModalOpen={isModalOpen}
            />
          </div>

          {/* Second Div: For the Latest Support (right side, plain list) */}
          <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 min-w-0 flex flex-col">
            <Card className="p-4 sm:p-6 border border-slate-800 bg-[#0C101C] rounded-2xl shadow-2xl flex flex-col h-full w-full">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Heart size={15} className="text-pink-400 fill-pink-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-['Chakra_Petch']">
                    Latest Support
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {recentSupporters.length} recent
                </span>
              </div>

              {/* Supporters Plain List */}
              <div className="flex-1 min-h-[320px] overflow-y-auto divide-y divide-slate-800/60 pr-1">
                {recentSupporters.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
                    <p className="text-xs text-slate-400">No supporters yet.</p>
                    <p className="text-[11px] text-slate-600 mt-1">Be the first to send a cheer!</p>
                  </div>
                ) : (
                  recentSupporters.map((s, idx) => (
                    <div key={s.id || idx} className="py-2.5 first:pt-1.5 last:pb-1 flex items-center justify-between gap-3">
                      {/* Name & Amount */}
                      <span className="text-xs font-semibold text-white truncate">
                        {s.donor_name || 'Generous Supporter'}
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-400 flex-shrink-0">
                        {s.currency === 'KHR'
                          ? `${Number(s.amount || 0).toLocaleString()} ៛`
                          : `$${Number(s.amount || 0).toFixed(2)}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

        </div>
      )}

        {/* Video Clip Modal Preview for Supporters */}
        {previewingVideoUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0C101C] border border-slate-800 rounded-2xl p-5 max-w-lg w-full space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <Youtube size={14} className="text-red-500" />
                  <span>Supporter YouTube Clip</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setPreviewingVideoUrl(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${(previewingVideoUrl && extractYouTubeId(previewingVideoUrl)) || ''}?autoplay=1`}
                  title="Supporter YouTube Clip"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* Bakong KHQR Modal */}
        <BakongKHQRModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCancel={(msg) => setCancelMessage(msg || 'You have cancelled the donation')}
          donationData={activeDonation}
          donorName={currentDonorName}
          bankingName={currentBankingName}
          streamerId={streamer.id}
          streamerUsername={streamer.username}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* Website Branding Logo on Bottom Right (Only visible when streamer is on Free Plan) */}
        {(!streamer.plan || streamer.plan.toLowerCase() === 'free') && (
          <Link
            to="/"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('home');
              }
            }}
            title="Powered by streambotkh.com"
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0C101C]/95 hover:bg-[#111728] backdrop-blur-md border border-slate-800 hover:border-cyan-500/50 shadow-2xl shadow-black/60 transition-all duration-200 select-none"
          >
            <div className="w-7 h-7 flex items-center justify-center">
              <img
                src="/images/logo-64.png"
                alt="streambotkh.com logo"
                className="w-7 h-7 object-contain drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                Powered by
              </span>
              <div className="flex items-baseline mt-0.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white font-['Chakra_Petch']">
                  streambot<span className="text-cyan-400">kh</span>
                </span>
                <span className="text-[10px] font-mono font-semibold text-slate-400 ml-0.5">
                  .com
                </span>
              </div>
            </div>
          </Link>
        )}
    </div>
  );
};
