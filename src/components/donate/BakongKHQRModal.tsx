'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { CreateDonationResponse } from '../../types/donation';
import { donationService, KhqrPresetItem } from '../../services/donationService';
import { useSocket } from '../../context/SocketContext';

interface BakongKHQRModalProps {
  isOpen: boolean;
  isGenerating?: boolean;
  onClose: () => void;
  onCancel?: (message: string) => void;
  donationData: CreateDonationResponse | null;
  donorName: string;
  bankingName?: string;
  streamerId?: string;
  streamerUsername?: string;
  streamerKhqrItems?: KhqrPresetItem[];
  onPaymentSuccess: (paidDetails?: any) => void;
  lang?: 'en' | 'kh';
}

const SESSION_DURATION_SECONDS = 180; // 3 minutes

export const BakongKHQRModal: React.FC<BakongKHQRModalProps> = ({
  isOpen,
  isGenerating = false,
  onClose,
  onCancel,
  donationData,
  streamerId,
  streamerUsername,
  streamerKhqrItems,
  onPaymentSuccess,
  lang: propLang
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_DURATION_SECONDS);
  const [paid, setPaid] = useState<boolean>(false);
  const [masterKhqrImage, setMasterKhqrImage] = useState<string | null>(null);
  const [configKhqrItems, setConfigKhqrItems] = useState<KhqrPresetItem[]>([]);
  const [showGeneratingAnim, setShowGeneratingAnim] = useState<boolean>(true);
  const isPaidRef = useRef<boolean>(false);
  const { socket } = useSocket();

  // Synchronized language state
  const [internalLang, setInternalLang] = useState<'en' | 'kh'>(() => {
    if (propLang === 'kh' || propLang === 'en') return propLang;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stream_lang');
      if (saved === 'kh' || saved === 'en') return saved;
    }
    return 'en';
  });

  useEffect(() => {
    if (propLang && (propLang === 'kh' || propLang === 'en')) {
      setInternalLang(propLang);
    }
  }, [propLang]);

  useEffect(() => {
    const onLangChange = (e: any) => {
      const l = e.detail || (typeof window !== 'undefined' ? localStorage.getItem('stream_lang') : null);
      if (l === 'kh' || l === 'en') {
        setInternalLang(l);
      }
    };
    window.addEventListener('stream_lang_change', onLangChange);
    return () => window.removeEventListener('stream_lang_change', onLangChange);
  }, []);

  const lang = propLang === 'kh' || propLang === 'en' ? propLang : internalLang;

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Brief "Generating KHQR" animation whenever modal opens or new donation starts generating
  useEffect(() => {
    if (!isOpen) {
      setShowGeneratingAnim(true);
      setPaid(false);
      isPaidRef.current = false;
      return;
    }

    if (isGenerating || !donationData) {
      setShowGeneratingAnim(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowGeneratingAnim(false);
    }, 650);

    return () => clearTimeout(timer);
  }, [isOpen, isGenerating, donationData?.donationId]);

  // Unified payment completion handler: switches modal to "Payment Completed" state (Image 2)
  const handleSuccess = (details?: any) => {
    if (isPaidRef.current) return;
    isPaidRef.current = true;
    setPaid(true);
    setShowGeneratingAnim(false);
    onPaymentSuccess(details);
  };

  // Auto-close the Payment Completed modal after 3.8s
  useEffect(() => {
    if (!isOpen || !paid) return;
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(autoCloseTimer);
  }, [isOpen, paid, onClose]);

  // Instant real-time listener via WebSocket
  useEffect(() => {
    if (!socket || !isOpen || !donationData || paid) return;

    const onPaidEvent = (payload: any) => {
      const targetId = payload?.donationId || payload?.id;
      if (targetId && targetId === donationData.donationId) {
        handleSuccess(payload);
      }
    };

    socket.on('donation:paid', onPaidEvent);
    return () => {
      socket.off('donation:paid', onPaidEvent);
    };
  }, [socket, isOpen, donationData, paid]);

  // Load streamer KHQR items & fallback master KHQR image
  useEffect(() => {
    if (!isOpen) return;

    if (Array.isArray(streamerKhqrItems) && streamerKhqrItems.length > 0) {
      setConfigKhqrItems(streamerKhqrItems);
    }

    if (donationData?.qrImage) {
      setMasterKhqrImage(donationData.qrImage);
    }

    const params = new URLSearchParams();
    if (streamerId) params.set('streamerId', streamerId);
    if (streamerUsername) params.set('username', streamerUsername);
    const query = params.toString() ? `?${params.toString()}` : '';

    fetch(`/api/payment-gateway/config${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          if (Array.isArray(data.config.khqrItems) && data.config.khqrItems.length > 0) {
            setConfigKhqrItems(data.config.khqrItems);
          }
          if (!donationData?.qrImage) {
            if (data.config.customKhqrImageUrl) {
              setMasterKhqrImage(data.config.customKhqrImageUrl);
            } else if (data.config.khqrImageUrl) {
              setMasterKhqrImage(data.config.khqrImageUrl);
            }
          }
        }
      })
      .catch(() => {});
  }, [isOpen, streamerId, streamerUsername, donationData?.qrImage, streamerKhqrItems]);

  // Clean up temporary database helper when user explicitly clicks the X button
  const cleanupTemporaryDonation = async (donationId?: string) => {
    if (!donationId) return;
    try {
      const res = await fetch('/api/donations/temporary/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId })
      });
      const data = await res.json().catch(() => ({}));
      return data?.message || (lang === 'kh' ? 'អ្នកបានបោះបង់ការឧបត្ថម្ភ' : 'You have cancelled the donation');
    } catch (e) {
      return lang === 'kh' ? 'អ្នកបានបោះបង់ការឧបត្ថម្ភ' : 'You have cancelled the donation';
    }
  };

  // 3-Minute Countdown Timer: after 3 minutes if payment is still not verified, reset back to 3 minutes
  useEffect(() => {
    if (!isOpen || !donationData || showGeneratingAnim || paid) return;
    setTimeLeft(SESSION_DURATION_SECONDS);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (isPaidRef.current) {
          return prev;
        }
        if (prev <= 1) {
          // Refresh temporary donation session on backend and reset timer back to 3 minutes (180s)
          fetch(`/api/donations/${donationData.donationId}/status?refresh=1`).catch(() => {});
          return SESSION_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, donationData?.donationId, showGeneratingAnim, paid]);

  // Live status poller (every 1s)
  useEffect(() => {
    if (!isOpen || !donationData || paid) return;

    let isSubscribed = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      try {
        const res = await donationService.getDonationStatus(donationData.donationId);
        if (res.status === 'PAID' && isSubscribed) {
          if (pollInterval) clearInterval(pollInterval);
          handleSuccess(res);
        } else if (res.status === 'CANCELLED' && isSubscribed) {
          if (pollInterval) clearInterval(pollInterval);
          if (onCancel) {
            onCancel(lang === 'kh' ? 'ការឧបត្ថម្ភត្រូវបានបោះបង់' : 'Donation cancelled');
          }
          onClose();
        }
      } catch (e) {}
    };

    checkStatus();
    pollInterval = setInterval(checkStatus, 1000);

    return () => {
      isSubscribed = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOpen, donationData, paid, onCancel, onClose, lang]);

  // Explicit close handler (only triggered by the X button next to the edge of the container modal)
  const handleClose = () => {
    if (!isPaidRef.current) {
      if (donationData?.donationId) {
        cleanupTemporaryDonation(donationData.donationId);
      }
      if (onCancel) {
        onCancel('Payment session has expired. Please try again later.');
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const activeCurrency = donationData?.currency === 'KHR' ? 'KHR' : 'USD';
  const activeAmount = Number(donationData?.amount || 0);

  // Resolve the exact KHQR image for the active currency and amount
  const resolvedQrImage = (() => {
    if (donationData?.qrImage) return donationData.qrImage;
    const allItems =
      Array.isArray(streamerKhqrItems) && streamerKhqrItems.length > 0
        ? streamerKhqrItems
        : configKhqrItems;
    if (allItems.length > 0) {
      const exactMatch = allItems.find(
        (i) => i.currency === activeCurrency && Math.abs(Number(i.amount) - activeAmount) < 0.001 && i.imageUrl
      );
      if (exactMatch?.imageUrl) return exactMatch.imageUrl;
      const currencyMatch = allItems.find((i) => i.currency === activeCurrency && i.imageUrl);
      if (currencyMatch?.imageUrl) return currencyMatch.imageUrl;
      if (allItems[0]?.imageUrl) return allItems[0].imageUrl;
    }
    return masterKhqrImage || '';
  })();

  const formattedAmount =
    activeCurrency === 'KHR'
      ? activeAmount.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        })
      : activeAmount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLoadingQr = isGenerating || showGeneratingAnim || !donationData;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn select-none"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        @keyframes khqrTimerSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes khqrPulseScale {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.06); opacity: 1; }
        }

        @keyframes khqrCompletedCirclePop {
          0% { transform: scale(0.35); opacity: 0; }
          65% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes khqrCompletedRipple {
          0% { transform: scale(0.85); opacity: 0.55; }
          100% { transform: scale(1.45); opacity: 0; }
        }

        @keyframes khqrCompletedCheckDraw {
          0% { stroke-dashoffset: 48; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>

      {/* Wrapper with X button positioned next to the edge of the container modal */}
      <div
        className={`relative w-full ${
          paid ? 'max-w-[355px] sm:max-w-[375px]' : 'max-w-[355px] sm:max-w-[375px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) Button Next to the Edge of the Container Modal (hidden when payment is completed) */}
        {!paid && (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close KHQR session"
            title="Close session"
            className="absolute -top-3.5 -right-3.5 sm:top-0 sm:-right-11 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/95 hover:bg-red-600 text-white border border-white/25 shadow-xl flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}

        {/* ============================================================== */}
        {/* STATE 3: PAYMENT COMPLETED (EXACT MATCH TO 2ND IMAGE)          */}
        {/* ============================================================== */}
        {paid ? (
          <div className="w-full min-h-[380px] sm:min-h-[420px] bg-white rounded-[20px] shadow-[0_25px_60px_rgba(0,0,0,0.55)] py-28 sm:py-32 px-8 flex flex-col items-center justify-center text-center animate-fadeIn">
            {/* Animated Turquoise Circle + White Checkmark Icon */}
            <div className="relative w-[72px] h-[72px] flex items-center justify-center">
              {/* Expanding Ripple Ring */}
              <div
                className="absolute inset-0 rounded-full bg-[#00C2D1]/30 pointer-events-none"
                style={{
                  animation: 'khqrCompletedRipple 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite'
                }}
              />

              {/* Solid Turquoise Circle */}
              <div
                className="relative w-[68px] h-[68px] rounded-full bg-[#00C2D1] flex items-center justify-center shadow-[0_8px_24px_rgba(0,194,209,0.35)]"
                style={{
                  animation: 'khqrCompletedCirclePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                }}
              >
                <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
                  <path
                    d="M10.5 18.5L15.8 23.8L26 13.5"
                    stroke="#FFFFFF"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      strokeDasharray: 48,
                      animation: 'khqrCompletedCheckDraw 0.42s cubic-bezier(0.65, 0, 0.45, 1) 0.22s both'
                    }}
                  />
                </svg>
              </div>
            </div>

            {/* Payment Completed Label */}
            <div className="mt-5 text-[17px] sm:text-[18px] font-[500] text-[#00C2D1] tracking-[-0.01em]">
              Payment Completed
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* STATE 1 & 2: GENERATING KHQR / ACTIVE ABA KHQR MODAL (IMAGE 1) */
          /* ============================================================== */
          <div className="w-full bg-white rounded-[20px] shadow-[0_25px_60px_rgba(0,0,0,0.65)] overflow-hidden text-[#0F1D33]">
            {/* Top Red KHQR Header Banner */}
            <div className="bg-[#E2232F] h-[56px] flex flex-col items-center justify-center relative">
              {/* Top White Accent Line above KHQR */}
              <div className="w-[42px] h-[2.5px] bg-white rounded-full mb-1.5" />

              {/* Official KHQR Logo Image */}
              <img
                src="/images/khqr-logo.webp"
                alt="KHQR"
                className="h-[19px] w-auto object-contain select-none pointer-events-none"
              />
            </div>

            {/* White Body with Signature Right-Side Red Diagonal Notch */}
            <div className="relative bg-white">
              {/* Right-Side Diagonal Red Triangle Fold */}
              <svg
                className="absolute top-0 right-0 w-[26px] h-[26px] pointer-events-none"
                viewBox="0 0 26 26"
                fill="none"
              >
                <polygon points="0,0 26,0 26,26" fill="#E2232F" />
              </svg>

              {isLoadingQr ? (
                /* ========================================================== */
                /* STATE 1: AWAITING "GENERATING KHQR" ANIMATION              */
                /* ========================================================== */
                <div className="py-20 px-8 flex flex-col items-center justify-center text-center">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    {/* Outer Rotating Ring */}
                    <svg
                      className="w-16 h-16"
                      viewBox="0 0 50 50"
                      style={{ animation: 'khqrTimerSpin 1.1s linear infinite' }}
                    >
                      <circle
                        cx="25"
                        cy="25"
                        r="21"
                        stroke="#E2E8F0"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="25"
                        cy="25"
                        r="21"
                        stroke="#00B4D8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="130"
                        strokeDashoffset="85"
                        fill="none"
                      />
                    </svg>
                    {/* Inner Pulsing KHQR Red Dot */}
                    <div
                      className="absolute w-6 h-6 rounded-md bg-[#E1232E] flex items-center justify-center text-white font-extrabold text-[9px] tracking-tighter shadow-sm"
                      style={{ animation: 'khqrPulseScale 1.2s ease-in-out infinite' }}
                    >
                      QR
                    </div>
                  </div>

                  <div className="mt-5 text-[16px] font-[600] text-[#0F1D33] tracking-[-0.01em]">
                    Generating KHQR...
                  </div>
                  <div className="mt-1 text-[12px] font-[400] text-[#64748B]">
                    Preparing secure payment code
                  </div>
                </div>
              ) : (
                /* ========================================================== */
                /* STATE 2: ACTIVE ABA KHQR CARD (EXACT MATCH TO 1ST IMAGE)   */
                /* ========================================================== */
                <>
                  {/* Row 1: ABA KHQR & Circular Spinner + 03:00 Timer */}
                  <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                    <span className="text-[20px] font-[400] text-[#1E293B] tracking-[-0.01em]">
                      ABA KHQR
                    </span>

                    <div className="flex items-center gap-2 pr-1">
                      {/* Circular Progress Ring */}
                      <svg
                        className="w-[22px] h-[22px]"
                        viewBox="0 0 24 24"
                        style={{ animation: 'khqrTimerSpin 1.4s linear infinite' }}
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="#E5E7EB"
                          strokeWidth="3"
                          fill="none"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="#00B4D8"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="56.5"
                          strokeDashoffset="38"
                          fill="none"
                        />
                      </svg>

                      <span className="text-[16px] font-[500] text-[#0F1D33] tabular-nums">
                        {formattedTime}
                      </span>
                    </div>
                  </div>

                  {/* Full-Width Dashed Divider */}
                  <div className="w-full border-t border-dashed border-[#CBD5E1]" />

                  {/* Row 3: Centered KHQR Code Image & "Scan to pay" */}
                  <div className="pt-6 pb-7 px-8 flex flex-col items-center justify-center">
                    <div className="w-[216px] h-[216px] sm:w-[224px] sm:h-[224px] bg-white flex items-center justify-center overflow-hidden">
                      {!resolvedQrImage ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                          <AlertCircle size={26} className="mb-2 text-amber-500" />
                          <span className="text-xs font-semibold text-slate-700">
                            No KHQR Image Found
                          </span>
                        </div>
                      ) : (
                        <img
                          src={resolvedQrImage}
                          alt={`KHQR ${formattedAmount} ${activeCurrency}`}
                          className="w-full h-full object-contain select-none"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.retried) {
                              target.dataset.retried = 'true';
                              target.src = `${target.src}?t=${Date.now()}`;
                            }
                          }}
                        />
                      )}
                    </div>

                    <div className="mt-5 text-[15px] sm:text-[16px] font-[700] text-[#0F1D33] tracking-[-0.01em]">
                      Scan to pay
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
