'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Radio,
  Zap,
  Phone,
  KeyRound,
  Shield,
  HelpCircle,
  Copy,
  Check,
  DollarSign,
  Send,
  Sparkles,
  Play
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { TelegramBotCard } from './TelegramBotCard';
import { useModal } from '../../context/ModalContext';

interface GatewayConfig {
  _id: string;
  khqrImageUrl: string;
  khqrFilename: string;
  khqrFileSize: number;
  khqrMimeType: string;
  bankAccountName?: string;
  bakongAccountId?: string;
  updatedAt?: string;
}

export const PaymentGatewayAdmin: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
  const [activeSubTab, setActiveSubTab] = useState<'khqr' | 'telegram' | 'simulator'>('khqr');

  // KHQR Upload State
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [uploadingKhqr, setUploadingKhqr] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test Payment State
  const [testStreamer, setTestStreamer] = useState('neonstreamer');
  const [testDonor, setTestDonor] = useState('SOKHA CHHIM');
  const [testAmount, setTestAmount] = useState('10.00');
  const [testCurrency, setTestCurrency] = useState<'USD' | 'KHR'>('USD');
  const [testBank, setTestBank] = useState('ABA Bank');
  const [testMessage, setTestMessage] = useState('Great stream! Keep it up 🔥');
  const [triggeringPayment, setTriggeringPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  const fetchGatewayConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/payment-gateway/config');
      const data = await res.json();
      if (res.ok && data.success) {
        setGatewayConfig(data.config);
      }
    } catch (e) {
      console.error('Error fetching gateway config:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchGatewayConfig();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleKhqrFile = async (file: File) => {
    setStatusMsg(null);

    // 1. Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setStatusMsg({
        type: 'error',
        text: `File exceeds 5MB limit (${sizeMb} MB). Please choose a PNG or JPG under 5MB.`
      });
      return;
    }

    // 2. Validate format
    const mime = file.type.toLowerCase();
    const isImage = ALLOWED_TYPES.includes(mime) || /\.(png|jpe?g)$/i.test(file.name);
    if (!isImage) {
      setStatusMsg({
        type: 'error',
        text: 'Unsupported format. Please upload PNG or JPG only.'
      });
      return;
    }

    // 3. Upload to server & save to database
    setUploadingKhqr(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/payment-gateway/upload-khqr', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          type: 'success',
          text: 'Official KHQR payment image uploaded successfully and activated on all client donation pages!'
        });
        await fetchGatewayConfig();
      } else {
        setStatusMsg({
          type: 'error',
          text: data.error || 'Failed to upload KHQR image.'
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Network error during upload.'
      });
    } finally {
      setUploadingKhqr(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteKhqr = () => {
    showConfirm({
      title: 'Remove Master KHQR Payment Image?',
      message: 'Are you sure you want to remove the custom KHQR payment image? All streamers donation portals will revert to the default template until a new KHQR image is uploaded.',
      type: 'danger',
      confirmText: 'Remove Image',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/payment-gateway/upload-khqr', { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            setStatusMsg({ type: 'success', text: data.message });
            await fetchGatewayConfig();
            showAlert({
              title: 'Image Removed',
              message: 'Master KHQR payment image has been removed.',
              type: 'success'
            });
          } else {
            showAlert({
              title: 'Remove Failed',
              message: data.error || 'Failed to remove image',
              type: 'danger'
            });
          }
        } catch (e: any) {
          showAlert({
            title: 'Error',
            message: 'Error removing image',
            type: 'danger'
          });
        }
      }
    });
  };

  const handleTriggerTestPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggeringPayment(true);
    setPaymentResult(null);

    try {
      const res = await fetch('/api/payment-gateway/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamerUsername: testStreamer.trim(),
          donorName: testDonor.trim(),
          amount: parseFloat(testAmount) || 1.0,
          currency: testCurrency,
          bankingName: testBank,
          donorMessage: testMessage.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentResult(data);
      } else {
        showAlert({
          title: 'Simulation Failed',
          message: data.error || 'Failed to trigger test payment',
          type: 'danger'
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Simulation Error',
        message: 'Error triggering payment: ' + err.message,
        type: 'danger'
      });
    } finally {
      setTriggeringPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-amber-300 font-mono">
          <Shield size={18} className="text-amber-400 flex-shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block">Admin Management Terminal</span>
            <span className="text-slate-400 text-[11px]">
              Configure master KHQR payment codes, live Telegram MTProto bank listeners, and real-time revenue triggers.
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[10px] font-bold whitespace-nowrap">
          ADMIN ACCESS ONLY
        </span>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono font-medium flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab('khqr')}
          className={`flex-1 min-w-[170px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
            activeSubTab === 'khqr'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <QrCode size={15} />
          <span>Master KHQR Image</span>
          {gatewayConfig?.khqrImageUrl && (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('telegram')}
          className={`flex-1 min-w-[170px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
            activeSubTab === 'telegram'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Radio size={15} />
          <span>Telegram Bank Listener</span>
        </button>

        <button
          onClick={() => setActiveSubTab('simulator')}
          className={`flex-1 min-w-[170px] py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
            activeSubTab === 'simulator'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Zap size={15} />
          <span>Test Payment & Revenue Trigger</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: MASTER KHQR PAYMENT IMAGE (MAX 5MB)                     */}
      {/* ============================================================== */}
      {activeSubTab === 'khqr' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode size={20} className="text-cyan-400" />
                Master KHQR Payment QR Code
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload your official Bakong / ABA KHQR payment image. This exact QR image is displayed on all client donation portals (/@streamer) for viewers to scan and pay.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
                Max Size: 5MB
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
                PNG / JPG
              </span>
            </div>
          </div>

          {/* Feedback Message */}
          {statusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusMsg.text}</span>
              </div>
              <button
                onClick={() => setStatusMsg(null)}
                className="text-slate-400 hover:text-white px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          {/* Active KHQR Status Card */}
          {gatewayConfig?.khqrImageUrl ? (
            <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-white p-1 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={gatewayConfig.khqrImageUrl}
                      alt="Active Master KHQR"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ACTIVE ON ALL CLIENT DONATION PAGES
                    </div>
                    <div className="text-sm font-bold text-white">
                      {gatewayConfig.khqrFilename || 'khqr-payment.png'}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      File Size: {formatFileSize(gatewayConfig.khqrFileSize)} • Stored in Database & Disk
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href="/@neonstreamer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-800 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={13} />
                    <span>View Donate Page</span>
                  </a>

                  <button
                    onClick={handleDeleteKhqr}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove custom image"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
              <span>
                No custom KHQR image uploaded yet. The donation page currently generates dynamic Bakong QR codes as a fallback.
              </span>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleKhqrFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-3 ${
              dragActive
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleKhqrFile(e.target.files[0]);
                }
              }}
              disabled={uploadingKhqr}
            />

            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-cyan-400">
              {uploadingKhqr ? (
                <RefreshCw size={22} className="animate-spin text-cyan-400" />
              ) : (
                <UploadCloud size={24} />
              )}
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                {uploadingKhqr ? 'Saving KHQR image to database...' : 'Upload or Replace Master KHQR Image'}
              </div>
              <p className="text-xs text-slate-400">
                Supports <strong className="text-slate-300">PNG</strong> or <strong className="text-slate-300">JPG</strong> up to <strong className="text-cyan-400">5MB</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TELEGRAM LIVE BANK SMS LISTENER                         */}
      {/* ============================================================== */}
      {activeSubTab === 'telegram' && (
        <TelegramBotCard />
      )}

      {/* ============================================================== */}
      {/* TAB 3: TEST PAYMENT & REVENUE TRIGGER                          */}
      {/* ============================================================== */}
      {activeSubTab === 'simulator' && (
        <form onSubmit={handleTriggerTestPayment} className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5">
          <div className="space-y-1 pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Zap size={18} className="text-cyan-400" />
              Simulate Instant KHQR Payment & Alert Trigger
            </h3>
            <p className="text-xs text-slate-400">
              Test the end-to-end flow: simulate an incoming scan payment, verify that the streamer&apos;s revenue updates in the database, and trigger the live alert on the streamer&apos;s OBS Studio overlay.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Target Streamer Username</label>
              <input
                type="text"
                required
                value={testStreamer}
                onChange={(e) => setTestStreamer(e.target.value)}
                placeholder="neonstreamer"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Donor Name</label>
              <input
                type="text"
                required
                value={testDonor}
                onChange={(e) => setTestDonor(e.target.value)}
                placeholder="SOKHA CHHIM"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Amount</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                />
                <select
                  value={testCurrency}
                  onChange={(e) => setTestCurrency(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="USD">USD ($)</option>
                  <option value="KHR">KHR (៛)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">Banking Provider</label>
              <select
                value={testBank}
                onChange={(e) => setTestBank(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              >
                <option value="ABA Bank">ABA Bank (PayWay / KHQR)</option>
                <option value="Bakong KHQR">Bakong KHQR</option>
                <option value="Acleda Bank">Acleda Bank</option>
                <option value="Wing Bank">Wing Bank</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 text-xs font-mono">
            <label className="text-slate-300 font-bold block">Tip Message</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Awesome gameplay! Keep it up"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              Updates SQLite & MongoDB database, emits socket alert to overlay.
            </span>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={triggeringPayment}
              className="font-bold px-6"
            >
              <Play size={14} className="mr-1" />
              Simulate Payment & Fire Alert
            </Button>
          </div>

          {paymentResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono space-y-2 animate-fadeIn">
              <div className="text-emerald-300 font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{paymentResult.message}</span>
              </div>
              <div className="text-slate-400 text-[11px] grid grid-cols-2 gap-2 pt-1 border-t border-emerald-500/20">
                <div>Donation ID: <code className="text-white">{paymentResult.donationId.slice(0, 12)}...</code></div>
                <div>Streamer: <strong className="text-white">{paymentResult.streamer?.displayName}</strong></div>
                <div>Total Revenue (USD): <strong className="text-cyan-400">${paymentResult.updatedRevenue?.usd?.toFixed(2)}</strong></div>
                <div>Total Revenue (KHR): <strong className="text-cyan-400">{paymentResult.updatedRevenue?.khr?.toLocaleString()} ៛</strong></div>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
