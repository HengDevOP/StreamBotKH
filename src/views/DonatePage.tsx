'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [subscriptionMeta, setSubscriptionMeta] = useState<{ isSubscription: boolean; tierId?: string; tierName?: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [cancelToastExiting, setCancelToastExiting] = useState<boolean>(false);
  const [setupToastVisible, setSetupToastVisible] = useState<boolean>(false);
  const [setupToastActive, setSetupToastActive] = useState<boolean>(false);
  const setupToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const setupToastExitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cancelToastExitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissCancelToast = () => {
    if (cancelToastExitTimerRef.current) clearTimeout(cancelToastExitTimerRef.current);
    setCancelToastExiting(true);
    cancelToastExitTimerRef.current = setTimeout(() => {
      setCancelMessage(null);
      setCancelToastExiting(false);
    }, 350);
  };

  // Auto-dismiss cancel toast after 5 seconds with slide-out to right
  useEffect(() => {
    if (!cancelMessage) return;
    setCancelToastExiting(false);
    const timer = setTimeout(() => {
      dismissCancelToast();
    }, 5000);
    return () => clearTimeout(timer);
  }, [cancelMessage]);

  const dismissSetupToast = () => {
    if (setupToastTimerRef.current) clearTimeout(setupToastTimerRef.current);
    if (setupToastExitTimerRef.current) clearTimeout(setupToastExitTimerRef.current);
    setSetupToastActive(false);
    setupToastExitTimerRef.current = setTimeout(() => {
      setSetupToastVisible(false);
    }, 350);
  };

  const handleSetupRequired = () => {
    setCancelMessage(null);
    if (setupToastTimerRef.current) clearTimeout(setupToastTimerRef.current);
    if (setupToastExitTimerRef.current) clearTimeout(setupToastExitTimerRef.current);

    setSetupToastActive(true);
    setSetupToastVisible(true);

    // Auto-dismiss after 4.5 seconds (toast slides back out to the right)
    setupToastTimerRef.current = setTimeout(() => {
      dismissSetupToast();
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (setupToastTimerRef.current) clearTimeout(setupToastTimerRef.current);
      if (setupToastExitTimerRef.current) clearTimeout(setupToastExitTimerRef.current);
      if (cancelToastExitTimerRef.current) clearTimeout(cancelToastExitTimerRef.current);
    };
  }, []);

  // Selected supporter video for instant playback preview modal
  const [previewingVideoUrl, setPreviewingVideoUrl] = useState<string | null>(null);

  // Synchronized language state
  const [lang, setLang] = useState<'en' | 'kh'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stream_lang');
      if (saved === 'kh' || saved === 'en') return saved;
    }
    return 'en';
  });

  useEffect(() => {
    const onLangChange = (e: any) => {
      const l = e.detail || localStorage.getItem('stream_lang');
      if (l === 'kh' || l === 'en') {
        setLang(l);
      }
    };
    window.addEventListener('stream_lang_change', onLangChange);
    return () => window.removeEventListener('stream_lang_change', onLangChange);
  }, []);

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

  // Dynamically update site title and logo (favicon) to streamer profile when visiting /@{username}
  useEffect(() => {
    if (!streamer) return;

    // Save previous document title and icon references to restore on cleanup
    const previousTitle = document.title;
    const existingIcons = Array.from(
      document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='apple-touch-icon']")
    );
    const originalHrefs = existingIcons.map((el) => ({ el, href: el.href, type: el.type }));

    // 1. Title format: "{displayname} - {description}" (streamer profile description)
    const desc = streamer.bio?.trim();
    if (desc) {
      document.title = `${streamer.displayName} - ${desc}`;
    } else {
      document.title = `${streamer.displayName} - Streamer Profile`;
    }

    // 2. Site logo / favicon changed to streamer profile logo
    const streamerLogoUrl =
      streamer.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${streamer.username}`;

    if (existingIcons.length > 0) {
      existingIcons.forEach((iconLink) => {
        iconLink.href = streamerLogoUrl;
        iconLink.removeAttribute('type');
      });
    } else {
      const newIcon = document.createElement('link');
      newIcon.rel = 'icon';
      newIcon.href = streamerLogoUrl;
      document.head.appendChild(newIcon);
    }

    // Restore original site title and site logo upon navigating away
    return () => {
      document.title = previousTitle;
      originalHrefs.forEach(({ el, href, type }) => {
        el.href = href;
        if (type) el.type = type;
      });
    };
  }, [streamer]);

  const handleFormSubmit = async (formData: DonorFormData) => {
    if (!streamer) return;

    if (streamer.isTipConfigured === false) {
      handleSetupRequired();
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      return;
    }

    setCancelMessage(null);
    dismissSetupToast();
    setSubmitting(true);
    setCurrentDonorName(formData.donorName);
    setCurrentBankingName(formData.bankingName || formData.donorName || 'Bakong KHQR');
    setActiveDonation(null);
    setIsModalOpen(true);
    try {
      if (formData.isSubscription) {
        setSubscriptionMeta({
          isSubscription: true,
          tierId: formData.tierId,
          tierName: formData.tierName
        });
      } else {
        setSubscriptionMeta(null);
      }

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
        videoEndTime: formData.videoEndTime,
        isSubscription: formData.isSubscription,
        tierId: formData.tierId,
        tierName: formData.tierName,
        badgeText: formData.badgeText,
        badgeColor: formData.badgeColor,
        badgeBg: formData.badgeBg,
        badgeBorder: formData.badgeBorder,
        badgeIcon: formData.badgeIcon,
        badgeGifUrl: formData.badgeGifUrl,
        badgeImage: formData.badgeImage,
        isWheelSpin: formData.isWheelSpin,
        donationType: formData.donationType,
        qrImage: formData.qrImage,
        isCustom: formData.isCustom,
        selectedKhqrId: formData.selectedKhqrId
      });

      setActiveDonation(res);
    } catch (err: any) {
      setIsModalOpen(false);
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
    if (paidDetails) {
      if (paidDetails.amount) {
        setActiveDonation((prev) =>
          prev
            ? { ...prev, amount: Number(paidDetails.amount), currency: paidDetails.currency || prev.currency }
            : prev
        );
      }
      if (paidDetails.donor_name && !currentDonorName) {
        setCurrentDonorName(paidDetails.donor_name);
      }
      if (paidDetails.banking_name) {
        setCurrentBankingName(paidDetails.banking_name);
      }
    }

    // If viewer subscribed, register membership in database & emit real-time event
    if (subscriptionMeta?.isSubscription && streamer) {
      const finalSubscriberName = (currentDonorName || paidDetails?.donor_name || 'Supporter').trim();
      const finalBankingName = (paidDetails?.banking_name || currentBankingName || finalSubscriberName).trim();

      fetch('/api/widgets/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_subscription',
          streamerUsername: streamer.username,
          streamerToken: (streamer as any).overlayToken || streamer.id,
          subscriberName: finalSubscriberName,
          bankingName: finalBankingName,
          tierId: subscriptionMeta.tierId,
          donorMessage: (activeDonation as any)?.donor_message || '',
          paymentMethod: 'Bakong KHQR',
          transactionId: paidDetails?.hash || paidDetails?.md5 || (activeDonation as any)?.md5 || ('khqr_' + Date.now())
        })
      }).catch((err) => {
        console.error('Failed to create subscription record:', err);
      });
    }

    // Refresh supporters feed
    donationService.getStreamerRecentDonations(cleanUsername).then(setRecentSupporters).catch(() => {});
  };

  const handleReset = () => {
    setIsSuccess(false);
    setActiveDonation(null);
    setSubscriptionMeta(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col items-center justify-center py-6 sm:py-12 px-3 sm:px-6 select-none">
        <div className="w-full max-w-4xl space-y-5 animate-pulse">
          {/* Streamer Header Card Skeleton */}
          <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-slate-800 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-44 bg-slate-800 rounded" />
              <div className="h-3 w-72 bg-slate-800/60 rounded" />
            </div>
          </div>

          {/* Main Form + Sidebar Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-xl bg-[#0B0F19] border border-slate-800/80 p-5 space-y-4">
              <div className="flex gap-2">
                <div className="h-9 flex-1 rounded-lg bg-slate-900 border border-slate-800" />
                <div className="h-9 flex-1 rounded-lg bg-slate-900 border border-slate-800" />
              </div>
              <div className="h-10 w-full rounded-lg bg-slate-950 border border-slate-800" />
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-900 border border-slate-800" />
                ))}
              </div>
              <div className="h-24 w-full rounded-lg bg-slate-950 border border-slate-800" />
              <div className="h-11 w-full rounded-lg bg-slate-800" />
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-4 space-y-3">
                <div className="h-4 w-36 bg-slate-800 rounded" />
                {[1, 2, 3].map((r) => (
                  <div key={r} className="h-11 rounded-lg bg-slate-900 border border-slate-800" />
                ))}
              </div>
              <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 p-4 space-y-3">
                <div className="h-4 w-32 bg-slate-800 rounded" />
                <div className="h-8 rounded-lg bg-slate-900 border border-slate-800" />
              </div>
            </div>
          </div>
        </div>
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
    <div className="relative min-h-screen bg-[#070A12] text-slate-100 flex flex-col items-center justify-center py-4 xs:py-6 sm:py-12 px-2.5 xs:px-4 sm:px-6 overflow-x-hidden">
      {/* Streamer Custom Banner Background Wallpaper */}
      {streamer?.bannerUrl && (
        <div
          className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{
            backgroundImage: `url("${streamer.bannerUrl}")`
          }}
        >
          {/* Deep dark gradient overlay so forms, cards, and text maintain high contrast */}
          <div className="absolute inset-0 bg-[#070A12]/85 backdrop-blur-[6px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070A12] via-[#070A12]/80 to-transparent" />
        </div>
      )}

      {/* Simple Session Expired / Cancelled Toast (Slides in from right side on all screens) */}
      {cancelMessage && !isSuccess && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed z-50 top-3 right-3 sm:top-6 sm:right-6 max-w-[calc(100vw-1.5rem)] sm:max-w-md pointer-events-auto ${
            cancelToastExiting ? 'animate-cancel-toast-exit' : 'animate-cancel-toast'
          }`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0d0910]/95 backdrop-blur-md border border-red-500/40 shadow-2xl shadow-red-950/70 text-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <XCircle size={17} className="shrink-0 text-red-400" />
              <p className="text-xs sm:text-sm font-medium text-white leading-snug">
                Payment session has expired. Please try again later.
              </p>
            </div>

            <button
              onClick={dismissCancelToast}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Payment Setup Required Toast (Slides in from right side on all screens) */}
      {setupToastVisible && !isSuccess && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed z-50 top-3 right-3 sm:top-6 sm:right-6 max-w-[calc(100vw-1.5rem)] sm:max-w-md pointer-events-auto ${
            setupToastActive ? 'animate-cancel-toast' : 'animate-cancel-toast-exit'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-red-600 text-white shadow-xl border border-red-500/80">
            <XCircle size={18} className="shrink-0 text-white" />
            <span className="text-xs sm:text-sm font-bold font-['Chakra_Petch'] tracking-wide select-none">
              Payment setup required!
            </span>
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
            isSubscription={Boolean(subscriptionMeta?.isSubscription)}
            tierName={subscriptionMeta?.tierName}
            onReset={handleReset}
          />
        </div>
      ) : (
        /* Main Centered Container Div: not full width and not full height, side-by-side equal height on desktop */
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col md:flex-row md:items-stretch justify-center gap-4 sm:gap-6 animate-fadeIn">
          
          {/* First Div: For the Content (left side) */}
          <div className="w-full md:w-[460px] lg:w-[480px] flex-shrink-0 min-w-0 flex flex-col">
            <DonorForm
              streamer={streamer}
              onSubmit={handleFormSubmit}
              onSetupRequired={handleSetupRequired}
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
                    {lang === 'kh' ? 'ការគាំទ្រចុងក្រោយ' : 'Latest Support'}
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {recentSupporters.length} {lang === 'kh' ? 'ថ្មីៗ' : 'recent'}
                </span>
              </div>

              {/* Supporters Plain List */}
              <div className="flex-1 min-h-[320px] overflow-y-auto divide-y divide-slate-800/60 pr-1">
                {recentSupporters.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
                    <p className="text-xs text-slate-400">
                      {lang === 'kh' ? 'មិនទាន់មានអ្នកឧបត្ថម្ភទេ' : 'No supporters yet.'}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {lang === 'kh' ? 'ក្លាយជាអ្នកដំបូងដែលផ្ញើការលើកទឹកចិត្ត!' : 'Be the first to send a cheer!'}
                    </p>
                  </div>
                ) : (
                  recentSupporters.map((s, idx) => (
                    <div key={s.id || idx} className="py-2.5 first:pt-1.5 last:pb-1 flex items-center justify-between gap-3">
                      {/* Name & Amount */}
                      <span className="text-xs font-semibold text-white truncate">
                        {s.donor_name || (lang === 'kh' ? 'អ្នកគាំទ្រដ៏សប្បុរស' : 'Generous Supporter')}
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
          isGenerating={submitting}
          onClose={() => setIsModalOpen(false)}
          onCancel={() =>
            setCancelMessage('Payment session has expired. Please try again later.')
          }
          donationData={activeDonation}
          donorName={currentDonorName}
          bankingName={currentBankingName}
          streamerId={streamer.id}
          streamerUsername={streamer.username}
          streamerKhqrItems={streamer.khqrItems}
          onPaymentSuccess={handlePaymentSuccess}
          lang={lang}
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
            title="Powered by StreamWidgets"
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0C101C]/95 hover:bg-[#111728] backdrop-blur-md border border-slate-800 hover:border-cyan-500/50 shadow-2xl shadow-black/60 transition-all duration-200 select-none"
          >
            <div className="w-7 h-7 flex items-center justify-center">
              <img
                src="/images/logo-64.png"
                alt="StreamWidgets logo"
                className="w-7 h-7 object-contain drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">
                Powered by
              </span>
              <div className="flex items-baseline mt-0.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white font-['Chakra_Petch']">
                  Stream<span className="text-cyan-400">Widgets</span>
                </span>
              </div>
            </div>
          </Link>
        )}
    </div>
  );
};
