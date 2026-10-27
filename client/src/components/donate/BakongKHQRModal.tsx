import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, ExternalLink, Zap, CheckCircle2, Landmark } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CreateDonationResponse } from '../../types/donation';
import { donationService } from '../../services/donationService';

interface BakongKHQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  donationData: CreateDonationResponse | null;
  donorName: string;
  bankingName?: string;
  onPaymentSuccess: () => void;
}

export const BakongKHQRModal: React.FC<BakongKHQRModalProps> = ({
  isOpen,
  onClose,
  donationData,
  donorName,
  bankingName,
  onPaymentSuccess
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [paid, setPaid] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !donationData) return;
    setTimeLeft(300);
    setPaid(false);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, donationData]);

  // Status poller
  useEffect(() => {
    if (!isOpen || !donationData || paid) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await donationService.getDonationStatus(donationData.donationId);
        if (res.status === 'PAID') {
          setPaid(true);
          clearInterval(pollInterval);
          setTimeout(() => {
            onPaymentSuccess();
          }, 1200);
        }
      } catch (e) {}
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isOpen, donationData, paid, onPaymentSuccess]);

  if (!donationData) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const formattedAmount = donationData.currency === 'KHR'
    ? `${donationData.amount.toLocaleString()} ៛`
    : `$${donationData.amount.toFixed(2)}`;

  const effectiveBank = bankingName || donationData.bankingName || 'Bakong KHQR';

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      await donationService.simulatePayment(donationData.donationId);
      setPaid(true);
      setTimeout(() => {
        onPaymentSuccess();
      }, 1000);
    } catch (err: any) {
      alert('Simulation error: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bakong KHQR Payment Terminal" maxWidth="md">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Total Amount & Donor Header Card */}
        <div className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="text-left space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Donor & Bank</span>
            <div className="text-xs text-white font-bold">{donorName}</div>
            <div className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400">
              <Landmark size={11} />
              <span>{effectiveBank}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Amount</span>
            <span className="text-2xl font-black font-mono text-cyan-400">
              {formattedAmount}
            </span>
          </div>
        </div>

        {/* Clean Official QR Code Canvas */}
        <div className="relative p-4 rounded-2xl bg-white border-2 border-slate-700 overflow-hidden">
          {paid ? (
            <div className="w-60 h-60 flex flex-col items-center justify-center text-emerald-600 space-y-2">
              <CheckCircle2 size={64} className="animate-bounce" />
              <span className="text-lg font-bold text-slate-950 font-['Chakra_Petch']">PAYMENT CONFIRMED!</span>
              <span className="text-xs text-slate-600 font-mono">Broadcasting alert on stream...</span>
            </div>
          ) : (
            <img
              src={donationData.qrImage}
              alt="Bakong KHQR"
              className="w-60 h-60 object-contain rounded-lg select-none"
            />
          )}

          {/* Bakong Official KHQR Tag */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white font-black text-[9px] tracking-wider uppercase">
            KHQR
          </div>
        </div>

        {/* Countdown Timer with Status */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono">
          <Clock size={13} className="text-amber-400" />
          <span className="text-slate-400">Session Expires:</span>
          <span className="font-bold text-white font-mono">{formattedTime}</span>
        </div>

        <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
          Open <b>{effectiveBank}</b>, <b>ABA Mobile</b>, or any Bakong-enabled app in Cambodia to scan and confirm.
        </p>

        {/* Direct Mobile Deep Links */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <a
            href={donationData.abaDeepLink}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-bold border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <span>ABA Mobile</span>
            <ExternalLink size={12} className="text-cyan-400" />
          </a>
          <a
            href={donationData.bakongDeepLink}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-100 text-xs font-bold border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <span>Bakong App</span>
            <ExternalLink size={12} className="text-cyan-400" />
          </a>
        </div>

        {/* Instant Sandbox Payment Simulator Button */}
        <div className="w-full pt-3 border-t border-slate-800/80 space-y-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleSimulatePayment}
            loading={simulating}
            className="w-full border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 font-mono text-xs font-bold"
            icon={<Zap size={14} className="text-cyan-400 fill-cyan-400" />}
          >
            ⚡ Test Instant Payment (Sandbox Demo)
          </Button>
          <span className="text-[11px] text-slate-500 block">
            Simulate an instant {effectiveBank} transaction to trigger the live alert!
          </span>
        </div>
      </div>
    </Modal>
  );
};
