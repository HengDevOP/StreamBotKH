'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CreateDonationResponse } from '../../types/donation';
import { donationService } from '../../services/donationService';
import { useSocket } from '../../context/SocketContext';

interface BakongKHQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: (message: string) => void;
  donationData: CreateDonationResponse | null;
  donorName: string;
  bankingName?: string;
  streamerId?: string;
  streamerUsername?: string;
  onPaymentSuccess: (paidDetails?: any) => void;
}

export const BakongKHQRModal: React.FC<BakongKHQRModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  donationData,
  onPaymentSuccess
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [paid, setPaid] = useState<boolean>(false);
  const [masterKhqrImage, setMasterKhqrImage] = useState<string | null>(null);
  const isPaidRef = useRef<boolean>(false);
  const { socket } = useSocket();

  // Unified payment completion handler: runs celebration and closes KHQR modal
  const handleSuccess = (details?: any) => {
    if (isPaidRef.current) return;
    isPaidRef.current = true;
    setPaid(true);

    setTimeout(() => {
      onPaymentSuccess(details);
      onClose();
    }, 700);
  };

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

  // Load custom master KHQR if configured for this streamer
  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams();
      if (streamerId) params.set('streamerId', streamerId);
      if (streamerUsername) params.set('username', streamerUsername);
      const query = params.toString() ? `?${params.toString()}` : '';

      fetch(`/api/payment-gateway/config${query}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.config?.khqrImageUrl) {
            setMasterKhqrImage(data.config.khqrImageUrl);
          } else {
            setMasterKhqrImage(null);
          }
        })
        .catch(() => {
          setMasterKhqrImage(null);
        });
    }
  }, [isOpen, streamerId, streamerUsername]);

  // Clean up temporary database helper
  const cleanupTemporaryDonation = async (donationId?: string) => {
    if (!donationId) return;
    try {
      const res = await fetch('/api/donations/temporary/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId })
      });
      const data = await res.json().catch(() => ({}));
      return data?.message || 'You have cancelled the donation';
    } catch (e) {
      return 'You have cancelled the donation';
    }
  };

  // Countdown Timer: closes modal and cleans up temporary DB if timed out
  useEffect(() => {
    if (!isOpen || !donationData) return;
    setTimeLeft(300);
    setPaid(false);
    isPaidRef.current = false;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!isPaidRef.current) {
            cleanupTemporaryDonation(donationData.donationId);
            if (onCancel) {
              onCancel('Donation session expired');
            }
            onClose();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, donationData, onClose, onCancel]);

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
        } else if ((res.status === 'EXPIRED' || res.status === 'CANCELLED') && isSubscribed) {
          if (pollInterval) clearInterval(pollInterval);
          if (onCancel) onCancel(res.status === 'EXPIRED' ? 'Donation session expired' : 'Donation cancelled');
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
  }, [isOpen, donationData, paid]);

  const handleClose = () => {
    if (!isPaidRef.current && donationData?.donationId) {
      cleanupTemporaryDonation(donationData.donationId);
      if (onCancel) {
        onCancel('You have cancelled the donation');
      }
    }
    onClose();
  };

  if (!donationData) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan To Pay" maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        {/* Official Bakong KHQR Canvas (Show only the pure QR code) */}
        <div className="p-3 bg-white border-2 border-slate-700 shadow-2xl">
          {paid ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center text-emerald-600 space-y-2">
              <CheckCircle2 size={56} className="animate-bounce" />
              <span className="text-base font-bold text-slate-950 font-['Chakra_Petch']">PAYMENT CONFIRMED!</span>
              <span className="text-xs text-slate-600 font-mono">Broadcasting alert on stream...</span>
            </div>
          ) : (
            <img
              src={donationData.qrImage || masterKhqrImage || '/uploads/payment/khqr-1793011590730-7bad271c.jpg'}
              alt="Scan To Pay"
              className="w-64 h-64 object-contain select-none"
            />
          )}
        </div>

        {/* Temporary Duration Countdown for the Alerts */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-xs font-mono">
          <Clock size={13} className="text-amber-400" />
          <span className="text-slate-400">Session Expires:</span>
          <span className="font-bold text-white font-mono">{formattedTime}</span>
        </div>
      </div>
    </Modal>
  );
};
