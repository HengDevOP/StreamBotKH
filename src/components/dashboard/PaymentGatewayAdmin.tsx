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
  Play,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Users,
  Link as LinkIcon,
  Plus,
  Layers,
  LogOut,
  ChevronUp,
  ChevronDown,
  CheckCheck,
  Bot
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
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

interface TargetGroup {
  id: string;
  streamer_id: string;
  chat_id: string;
  title: string;
  username?: string;
  created_at: string;
}

interface AvailableDialog {
  id: string;
  title: string;
  username?: string;
  isGroup: boolean;
  isChannel: boolean;
}

export const PaymentGatewayAdmin: React.FC = () => {
  const { showConfirm, showAlert } = useModal();

  // Active Wizard Step: 1 = Connect (GramJS), 2 = Provide Master KHQR, 3 = Connect Group Listener
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Simulation Drawer / Modal Open State
  const [showSimulator, setShowSimulator] = useState(false);

  // ================================================================
  // STEP 1 STATE: GramJS MTProto User Client Connection
  // ================================================================
  const [userPhone, setUserPhone] = useState('+855');
  const [userApiId, setUserApiId] = useState('');
  const [userApiHash, setUserApiHash] = useState('');
  const [showApiCreds, setShowApiCreds] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [codeRequested, setCodeRequested] = useState(false);
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  const [userClientStatus, setUserClientStatus] = useState<{
    isConnected: boolean;
    phoneNumber?: string;
    userName?: string;
    monitoredChats: string[];
    isSimulation?: boolean;
    hasPendingCode?: boolean;
  }>({ isConnected: false, monitoredChats: [] });

  const [step1Msg, setStep1Msg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ================================================================
  // STEP 2 STATE: Master KHQR Image Upload (Max 5MB)
  // ================================================================
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [uploadingKhqr, setUploadingKhqr] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [step2Msg, setStep2Msg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  // ================================================================
  // STEP 3 STATE: Target Telegram Groups & Group Link Listener
  // ================================================================
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [availableDialogs, setAvailableDialogs] = useState<AvailableDialog[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [step3Msg, setStep3Msg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group Link input form
  const [groupLinkInput, setGroupLinkInput] = useState('');
  const [groupTitleInput, setGroupTitleInput] = useState('');

  // ================================================================
  // SIMULATOR STATE: Test Scan Payment & Real-Time Alert
  // ================================================================
  const [testStreamer, setTestStreamer] = useState('neonstreamer');
  const [testDonor, setTestDonor] = useState('SOKHA CHHIM');
  const [testAmount, setTestAmount] = useState('5.00');
  const [testCurrency, setTestCurrency] = useState<'USD' | 'KHR'>('USD');
  const [testBank, setTestBank] = useState('ABA Bank');
  const [testMessage, setTestMessage] = useState('Awesome gameplay! Keep it up 🔥');
  const [triggeringPayment, setTriggeringPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // ----------------------------------------------------------------
  // Initial Data Fetching
  // ----------------------------------------------------------------
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

  const fetchUserClientStatus = async () => {
    try {
      const res = await fetch('/api/telegram/user/status');
      if (res.ok) {
        const data = await res.json();
        setUserClientStatus(data);
        if (data.isConnected && data.phoneNumber) {
          setUserPhone(data.phoneNumber);
        } else if (data.hasPendingCode) {
          setCodeRequested(true);
          if (data.pendingPhone) setUserPhone(data.pendingPhone);
          if (data.pendingHash) setPhoneCodeHash(data.pendingHash);
        }
      }
    } catch (e) {
      console.error('Error fetching user client status:', e);
    }
  };

  const fetchTargetGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await fetch('/api/telegram/groups');
      if (res.ok) {
        const data = await res.json();
        setTargetGroups(data.groups || []);
        setAvailableDialogs(data.availableDialogs || []);
      }
    } catch (e) {
      console.error('Error fetching target groups:', e);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGatewayConfig();
    fetchUserClientStatus();
    fetchTargetGroups();
  }, []);

  // Step completion flags
  const isStep1Done = Boolean(userClientStatus.isConnected);
  const isStep2Done = Boolean(gatewayConfig?.khqrImageUrl);
  const isStep3Done = Boolean(targetGroups.length > 0);

  const completedStepsCount = (isStep1Done ? 1 : 0) + (isStep2Done ? 1 : 0) + (isStep3Done ? 1 : 0);

  // ----------------------------------------------------------------
  // STEP 1 HANDLERS: GramJS Phone Authentication
  // ----------------------------------------------------------------
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Msg(null);
    setDemoCodeHint(null);

    const clean = userPhone.trim();
    if (!clean || clean === '+855') {
      setStep1Msg({ type: 'error', text: 'Please enter a valid Telegram phone number (e.g. +85512345678).' });
      return;
    }

    setSendingCode(true);
    try {
      const res = await fetch('/api/telegram/user/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: clean,
          apiId: userApiId.trim() || undefined,
          apiHash: userApiHash.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCodeRequested(true);
        if (data.phoneCodeHash) setPhoneCodeHash(data.phoneCodeHash);
        if (data.phoneNumber) setUserPhone(data.phoneNumber);
        setStep1Msg({ type: 'success', text: data.message });
        if (data.simulationCode) {
          setDemoCodeHint(data.simulationCode);
          setVerificationCode(data.simulationCode);
        }
      } else {
        setStep1Msg({ type: 'error', text: data.error || 'Failed to send verification code.' });
      }
    } catch (err: any) {
      setStep1Msg({ type: 'error', text: err.message || 'Network error requesting code.' });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Msg(null);

    if (!verificationCode.trim()) {
      setStep1Msg({ type: 'error', text: 'Please enter the 5-digit verification code.' });
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await fetch('/api/telegram/user/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneCode: verificationCode.trim(),
          phoneCodeHash: phoneCodeHash || undefined,
          phoneNumber: userPhone.trim() || undefined,
          password: twoFaPassword.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCodeRequested(false);
        setVerificationCode('');
        setPhoneCodeHash('');
        setTwoFaPassword('');
        setNeedPassword(false);
        setStep1Msg({ type: 'success', text: data.message || 'GramJS connected successfully!' });
        await fetchUserClientStatus();
        await fetchTargetGroups();
      } else if (data.needPassword) {
        setNeedPassword(true);
        setStep1Msg({ type: 'error', text: data.message });
      } else {
        setStep1Msg({ type: 'error', text: data.error || 'Verification failed.' });
      }
    } catch (err: any) {
      setStep1Msg({ type: 'error', text: err.message || 'Verification error.' });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleDisconnectUserClient = () => {
    showConfirm({
      title: 'Disconnect Telegram Account?',
      message: 'Are you sure you want to disconnect this Telegram account? GramJS will stop listening to incoming bank transfers until reconnected.',
      type: 'danger',
      confirmText: 'Disconnect',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/telegram/user/disconnect', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            setStep1Msg({ type: 'success', text: 'Telegram account disconnected.' });
            setCodeRequested(false);
            setPhoneCodeHash('');
            setVerificationCode('');
            await fetchUserClientStatus();
            showAlert({
              title: 'Account Disconnected',
              message: 'Your Telegram session has been disconnected.',
              type: 'info'
            });
          }
        } catch (e) {
          setStep1Msg({ type: 'error', text: 'Failed to disconnect.' });
        }
      }
    });
  };

  // ----------------------------------------------------------------
  // STEP 2 HANDLERS: Master KHQR Image Upload
  // ----------------------------------------------------------------
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleKhqrFile = async (file: File) => {
    setStep2Msg(null);

    if (file.size > MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setStep2Msg({
        type: 'error',
        text: `File exceeds 5MB limit (${sizeMb} MB). Please choose a PNG or JPG under 5MB.`
      });
      return;
    }

    const mime = file.type.toLowerCase();
    const isImage = ALLOWED_TYPES.includes(mime) || /\.(png|jpe?g)$/i.test(file.name);
    if (!isImage) {
      setStep2Msg({
        type: 'error',
        text: 'Unsupported format. Please upload PNG or JPG only.'
      });
      return;
    }

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
        setStep2Msg({
          type: 'success',
          text: 'Official Master KHQR payment image uploaded successfully and activated!'
        });
        await fetchGatewayConfig();
      } else {
        setStep2Msg({
          type: 'error',
          text: data.error || 'Failed to upload KHQR image.'
        });
      }
    } catch (err: any) {
      setStep2Msg({
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
      message: 'Are you sure you want to remove the custom KHQR payment image? Client donation pages will revert to the default template until a new image is provided.',
      type: 'danger',
      confirmText: 'Remove Image',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/payment-gateway/upload-khqr', { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            setStep2Msg({ type: 'success', text: data.message });
            await fetchGatewayConfig();
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

  // ----------------------------------------------------------------
  // STEP 3 HANDLERS: Connect Telegram Group via Link / ID
  // ----------------------------------------------------------------
  const handleConnectGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStep3Msg(null);

    const link = groupLinkInput.trim();
    if (!link) {
      setStep3Msg({ type: 'error', text: 'Please enter a Telegram group link (e.g. https://t.me/yourgroup) or Chat ID.' });
      return;
    }

    setAddingGroup(true);
    try {
      const res = await fetch('/api/telegram/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupLink: link,
          chatId: link,
          title: groupTitleInput.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep3Msg({ type: 'success', text: data.message });
        setGroupLinkInput('');
        setGroupTitleInput('');
        await fetchTargetGroups();
      } else {
        setStep3Msg({ type: 'error', text: data.error || 'Failed to connect Telegram group.' });
      }
    } catch (err: any) {
      setStep3Msg({ type: 'error', text: err.message || 'Network error connecting group.' });
    } finally {
      setAddingGroup(false);
    }
  };

  const handleDeleteTargetGroup = (group: TargetGroup) => {
    showConfirm({
      title: 'Remove Monitored Group?',
      message: `Are you sure you want to remove "${group.title}" (${group.chat_id})? GramJS will stop listening for messages from this group.`,
      type: 'danger',
      confirmText: 'Remove Group',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/telegram/groups?id=${encodeURIComponent(group.id)}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setStep3Msg({ type: 'success', text: `Removed "${group.title}" from listener.` });
            await fetchTargetGroups();
          } else {
            setStep3Msg({ type: 'error', text: data.error || 'Failed to remove group.' });
          }
        } catch (e: any) {
          setStep3Msg({ type: 'error', text: e.message || 'Error removing group.' });
        }
      }
    });
  };

  const handleQuickAddDialog = (d: AvailableDialog) => {
    setGroupLinkInput(d.username ? `https://t.me/${d.username.replace(/^@/, '')}` : d.id);
    setGroupTitleInput(d.title);
  };

  // ----------------------------------------------------------------
  // SIMULATOR HANDLER: Test Scan Payment & Alert Dispatch
  // ----------------------------------------------------------------
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
      {/* ============================================================== */}
      {/* TOP HEADER: GATEWAY TITLE & REAL-TIME TEST SIMULATOR ACTION    */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-xl font-extrabold text-white font-['Chakra_Petch'] tracking-wide flex items-center gap-2.5">
            <Radio className="text-cyan-400 animate-pulse" size={22} />
            <span>PAYMENT GATEWAY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step setup for GramJS MTProto client, official Bakong Master KHQR code, and live Telegram bank listener.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md ${
              showSimulator
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/20'
                : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:border-amber-400/40'
            }`}
          >
            <Zap size={14} />
            <span>{showSimulator ? 'Close Simulator' : 'Test Alert Simulation'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3-STEP ANIMATED LINE PROGRESS TASK BAR                         */}
      {/* ============================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#090D18] border border-slate-800/90 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Background Gradient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-28 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-96 h-28 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

        {/* Progress Header & Completion Metric */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-400" />
            <span className="text-xs font-mono uppercase font-bold text-slate-200 tracking-wider">
              Setup Progress Tasks
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono px-3 py-1 rounded-full font-bold border transition-colors ${
                completedStepsCount === 3
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}
            >
              {completedStepsCount === 3
                ? 'All 3 Tasks Completed (100% Ready)'
                : `${completedStepsCount} of 3 Tasks Done (${Math.round((completedStepsCount / 3) * 100)}%)`}
            </span>
          </div>
        </div>

        {/* Stepper with Connecting Animated Line */}
        <div className="relative flex items-center justify-between px-2 sm:px-8">
          {/* Connector Line 1 -> 2 */}
          <div className="absolute left-[16%] right-[50%] top-5 -translate-y-1/2 h-1 bg-slate-800 -z-0 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(0,240,255,0.8)]"
              style={{
                width: isStep1Done || activeStep >= 2 ? '100%' : '0%'
              }}
            />
          </div>

          {/* Connector Line 2 -> 3 */}
          <div className="absolute left-[50%] right-[16%] top-5 -translate-y-1/2 h-1 bg-slate-800 -z-0 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              style={{
                width: isStep2Done || activeStep >= 3 ? '100%' : '0%'
              }}
            />
          </div>

          {/* STEP 1: Connect Node */}
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className="group relative z-10 flex flex-col items-center text-center cursor-pointer focus:outline-none"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                isStep1Done
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20'
                  : activeStep === 1
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.6)] ring-4 ring-cyan-400/30 scale-105'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {isStep1Done ? <Check size={18} className="stroke-[3]" /> : '1'}
            </div>

            <div className="mt-2.5 space-y-0.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 1
                    ? 'text-cyan-400'
                    : isStep1Done
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                Connect
              </span>
              <span className="text-[10px] font-mono text-slate-500 hidden sm:block">
                {isStep1Done ? 'GramJS Active' : 'Connect GramJS'}
              </span>
            </div>
          </button>

          {/* STEP 2: Provide Master KHQR Node */}
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className="group relative z-10 flex flex-col items-center text-center cursor-pointer focus:outline-none"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                isStep2Done
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20'
                  : activeStep === 2
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.6)] ring-4 ring-cyan-400/30 scale-105'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {isStep2Done ? <Check size={18} className="stroke-[3]" /> : '2'}
            </div>

            <div className="mt-2.5 space-y-0.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 2
                    ? 'text-cyan-400'
                    : isStep2Done
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                Provide Master KHQR
              </span>
              <span className="text-[10px] font-mono text-slate-500 hidden sm:block">
                {isStep2Done ? 'KHQR Uploaded' : 'Upload QR Image'}
              </span>
            </div>
          </button>

          {/* STEP 3: Connect Group Listener Node */}
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className="group relative z-10 flex flex-col items-center text-center cursor-pointer focus:outline-none"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                isStep3Done
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20'
                  : activeStep === 3
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.6)] ring-4 ring-cyan-400/30 scale-105'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {isStep3Done ? <Check size={18} className="stroke-[3]" /> : '3'}
            </div>

            <div className="mt-2.5 space-y-0.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 3
                    ? 'text-cyan-400'
                    : isStep3Done
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                Connect Group Listener
              </span>
              <span className="text-[10px] font-mono text-slate-500 hidden sm:block">
                {isStep3Done ? `${targetGroups.length} Groups Active` : 'Link Telegram Group'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SIMULATOR SLIDE-DOWN DRAWER (When Toggled)                     */}
      {/* ============================================================== */}
      {showSimulator && (
        <form
          onSubmit={handleTriggerTestPayment}
          className="p-6 rounded-2xl bg-[#090D18] border-2 border-amber-500/40 space-y-4 animate-fadeIn shadow-2xl relative"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Zap size={16} className="text-amber-400 animate-bounce" />
              <span>Simulate Instant Scan Payment & Real-Time Alert</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowSimulator(false)}
              className="text-xs text-slate-400 hover:text-white font-mono"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-slate-400 block">Streamer Username</label>
              <input
                type="text"
                required
                value={testStreamer}
                onChange={(e) => setTestStreamer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block">Donor Name</label>
              <input
                type="text"
                required
                value={testDonor}
                onChange={(e) => setTestDonor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block">Amount</label>
              <div className="flex items-center gap-1.5">
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
                  className="px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="USD">USD</option>
                  <option value="KHR">KHR</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 block">Banking Provider</label>
              <select
                value={testBank}
                onChange={(e) => setTestBank(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
              >
                <option value="ABA Bank">ABA Bank</option>
                <option value="Bakong KHQR">Bakong KHQR</option>
                <option value="Acleda Bank">Acleda Bank</option>
                <option value="Wing Bank">Wing Bank</option>
              </select>
            </div>
          </div>

          <div className="space-y-1 text-xs font-mono">
            <label className="text-slate-400 block">Donor Message</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-mono">
              Fires live alert into OBS Studio overlay and updates streamer revenue immediately.
            </span>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={triggeringPayment}
              className="font-bold shadow-md shadow-cyan-400/20"
            >
              <Play size={13} className="mr-1" />
              Simulate & Fire Alert
            </Button>
          </div>

          {paymentResult && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono text-emerald-300 animate-fadeIn">
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                {paymentResult.message}
              </span>
            </div>
          )}
        </form>
      )}

      {/* ============================================================== */}
      {/* STEP 1 CONTENT: "Connect" (GramJS Client Connection)           */}
      {/* ============================================================== */}
      {activeStep === 1 && (
        <Card glow="cyan" className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Phone size={22} className={userClientStatus.isConnected ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-['Chakra_Petch']">
                  STEP 1: Connect GramJS Client
                  {userClientStatus.isConnected ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      CONNECTED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      PENDING LOGIN
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect your Telegram account to allow GramJS MTProto to listen for bank SMS notifications and trigger instant donation alerts.
                </p>
              </div>
            </div>

            {userClientStatus.isConnected && (
              <button
                type="button"
                onClick={handleDisconnectUserClient}
                className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-bold text-red-400 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <LogOut size={13} />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          {step1Msg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                step1Msg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              {step1Msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{step1Msg.text}</span>
            </div>
          )}

          {/* Connected State View */}
          {userClientStatus.isConnected ? (
            <div className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/30 space-y-5 shadow-lg shadow-cyan-500/5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-black text-2xl">
                    🇰🇭
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-base font-bold text-white font-['Chakra_Petch']">
                      {userClientStatus.userName || 'Connected Streamer'}
                    </div>
                    <div className="text-xs font-mono text-cyan-400 font-bold">
                      {userClientStatus.phoneNumber}
                    </div>
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      GramJS MTProto Session Active &amp; Ready
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setActiveStep(2)}
                  className="font-bold shadow-lg shadow-cyan-400/20 whitespace-nowrap"
                >
                  <span>Continue to Step 2: Master KHQR</span>
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-800/80 text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block font-bold uppercase">CLIENT ENGINE</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                    <CheckCheck size={14} /> TelegramJS MTProto Background Worker
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 text-[10px] block font-bold uppercase">NEXT ACTION</span>
                  <span className="text-cyan-300 font-bold mt-0.5 block">
                    Upload official Bakong KHQR image for viewer checkout
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Login Form */
            <div className="space-y-5">
              {!codeRequested ? (
                <form onSubmit={handleSendCode} className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Phone size={14} className="text-cyan-400" />
                      <span>Telegram Phone Number (Cambodia +855 / International)</span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                          <span className="text-base">🇰🇭</span>
                        </div>
                        <input
                          type="tel"
                          required
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          placeholder="+85512345678"
                          className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={sendingCode}
                        className="font-bold py-3 px-6 whitespace-nowrap justify-center shadow-lg shadow-cyan-400/20"
                      >
                        Connect &amp; Request Code
                      </Button>
                    </div>

                    <p className="text-[11px] text-slate-500 font-mono">
                      Enter your Telegram phone number. Telegram will send an official 5-digit verification code to your Telegram app.
                    </p>
                  </div>

                  {/* Credentials Badge */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-emerald-400" />
                      <span className="text-slate-300 font-bold">App API:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                        #32427800 (Live MTProto)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowApiCreds(!showApiCreds)}
                      className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                    >
                      <KeyRound size={12} />
                      <span>{showApiCreds ? 'Hide API' : 'Custom App API'}</span>
                    </button>
                  </div>

                  {showApiCreds && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs font-mono animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 block mb-1">Telegram App API ID</label>
                          <input
                            type="number"
                            placeholder="32427800"
                            value={userApiId}
                            onChange={(e) => setUserApiId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Telegram App API Hash</label>
                          <input
                            type="text"
                            placeholder="8f8e70605256a4e08a81bd5e45481ceb"
                            value={userApiHash}
                            onChange={(e) => setUserApiHash(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                /* Verification Code Form */
                <form onSubmit={handleVerifyCode} className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/40 space-y-5 animate-fadeIn shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-cyan-400" />
                      <span className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                        Enter Telegram Verification Code
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCodeRequested(false);
                        setPhoneCodeHash('');
                        setVerificationCode('');
                      }}
                      className="text-xs text-slate-400 hover:text-white transition-colors font-mono"
                    >
                      Change Phone
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
                    <p className="text-xs text-slate-300">
                      Telegram sent an official verification code to your Telegram app for <strong className="text-cyan-400 font-mono">{userPhone}</strong>. Please check your Telegram Service Notifications chat.
                    </p>
                  </div>

                  <div className="space-y-3 font-mono">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
                        5-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={8}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="12345"
                        className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 px-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 focus:outline-none focus:border-cyan-400 transition-colors"
                        autoFocus
                      />
                    </div>

                    {needPassword && (
                      <div className="space-y-1 pt-2 animate-fadeIn">
                        <label className="text-xs text-amber-400 block font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <KeyRound size={13} />
                          <span>Two-Step Verification (2FA) Password</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={twoFaPassword}
                          onChange={(e) => setTwoFaPassword(e.target.value)}
                          placeholder="Enter your 2FA password"
                          className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode}
                      className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 font-mono transition-colors"
                    >
                      <RefreshCw size={13} className={sendingCode ? 'animate-spin' : ''} />
                      <span>Resend Verification Code</span>
                    </button>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={verifyingCode}
                      className="font-bold whitespace-nowrap justify-center shadow-lg shadow-cyan-400/20"
                    >
                      Verify &amp; Connect GramJS
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ============================================================== */}
      {/* STEP 2 CONTENT: "Provide Master KHQR Image"                    */}
      {/* ============================================================== */}
      {activeStep === 2 && (
        <Card glow="cyan" className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <QrCode size={22} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-['Chakra_Petch']">
                  STEP 2: Provide Master KHQR Payment QR Code
                  {isStep2Done ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      IMAGE NEEDED
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Upload your official Bakong / ABA KHQR image. Viewers scan this code on all streamer donation pages (/@streamer) to pay.
                </p>
              </div>
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

          {step2Msg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
                step2Msg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {step2Msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{step2Msg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep2Msg(null)}
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
                  <div className="w-24 h-24 rounded-xl bg-white p-1.5 border border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                    <img
                      src={gatewayConfig.khqrImageUrl}
                      alt="Active Master KHQR"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      ACTIVE ON ALL STREAMER DONATION PAGES
                    </div>
                    <div className="text-sm font-bold text-white">
                      {gatewayConfig.khqrFilename || 'master-khqr.png'}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      File Size: {formatFileSize(gatewayConfig.khqrFileSize)} • Stored in Database &amp; Disk
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
                    type="button"
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
                No custom Master KHQR image uploaded yet. The donation page currently generates dynamic Bakong QR codes as a fallback.
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

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveStep(1)}
              className="font-bold"
            >
              <ChevronLeft size={16} className="mr-1" />
              <span>Back to Step 1</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setActiveStep(3)}
              className="font-bold shadow-lg shadow-cyan-400/20"
            >
              <span>Continue to Step 3: Group Listener</span>
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* ============================================================== */}
      {/* STEP 3 CONTENT: "Connect to Group via Link Telegram"           */}
      {/* ============================================================== */}
      {activeStep === 3 && (
        <Card glow="cyan" className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Users size={22} className={targetGroups.length > 0 ? 'text-cyan-400' : 'text-slate-400'} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-['Chakra_Petch']">
                  STEP 3: Connect Telegram Group for Listener
                  {isStep3Done ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {targetGroups.length} GROUPS ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      NO GROUPS YET
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paste the Telegram link or Chat ID of your bank notifications group. GramJS will listen strictly to messages inside these groups and fire overlay alerts!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchTargetGroups}
              disabled={loadingGroups}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-mono flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loadingGroups ? 'animate-spin text-cyan-400' : ''} />
              <span>Refresh Groups</span>
            </button>
          </div>

          {step3Msg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
                step3Msg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {step3Msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{step3Msg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep3Msg(null)}
                className="text-xs opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          )}

          {!userClientStatus.isConnected && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Telegram Phone Account Not Connected Yet</strong>
                <span>
                  Please complete <button type="button" onClick={() => setActiveStep(1)} className="underline font-bold hover:text-white">Step 1: Connect</button> first. GramJS requires the active session to listen to group messages.
                </span>
              </div>
            </div>
          )}

          {/* Quick Connect Form via Telegram Link */}
          <form onSubmit={handleConnectGroup} className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/40 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <LinkIcon size={16} className="text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Connect New Telegram Group via Link
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-300 font-bold block">
                  Telegram Group Link or Chat ID <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none">
                    <LinkIcon size={14} />
                  </div>
                  <input
                    type="text"
                    required
                    value={groupLinkInput}
                    onChange={(e) => setGroupLinkInput(e.target.value)}
                    placeholder="https://t.me/your_bank_alerts, @your_bank_alerts, or -10012345678"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Accepts full group links (e.g. <code className="text-slate-400">https://t.me/stream_alerts</code>), usernames (<code className="text-slate-400">@stream_alerts</code>), or numeric Chat IDs (<code className="text-slate-400">-100198822334</code>).
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-slate-300 font-bold block">
                  Group Label / Title (Optional)
                </label>
                <input
                  type="text"
                  value={groupTitleInput}
                  onChange={(e) => setGroupTitleInput(e.target.value)}
                  placeholder="e.g. ABA Bank SMS Push Notifications"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={addingGroup}
                className="font-bold shadow-lg shadow-cyan-400/20"
              >
                <Plus size={15} className="mr-1" />
                <span>Connect Group to Listener</span>
              </Button>
            </div>
          </form>

          {/* Quick-Add from Account Dialogs if available */}
          {availableDialogs.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles size={13} className="text-cyan-400" />
                  Quick-Add From Your Telegram Account ({availableDialogs.length} detected)
                </span>
                <span className="text-[11px] text-slate-500">Click a group to pre-fill</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {availableDialogs.map((d) => {
                  const isAlreadyAdded = targetGroups.some((g) => g.chat_id === d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={isAlreadyAdded}
                      onClick={() => handleQuickAddDialog(d)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-mono flex items-center gap-1.5 transition-all ${
                        isAlreadyAdded
                          ? 'bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-900 border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400'
                      }`}
                    >
                      <span>{d.title}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">({d.id})</span>
                      {isAlreadyAdded && <Check size={11} className="text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Target Groups List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-400" />
                Active Monitored Telegram Groups ({targetGroups.length})
              </span>
              <span className="text-slate-500 text-[11px]">
                {targetGroups.length > 0 ? 'GramJS triggers strictly for these chats' : 'No chats monitored'}
              </span>
            </div>

            {targetGroups.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/80 border border-dashed border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                  <Users size={24} />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white font-['Chakra_Petch']">
                    No Target Groups Connected Yet
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Paste your bank notification group link or chat ID above so GramJS can capture transactions in real time.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                {targetGroups.map((group) => (
                  <div
                    key={group.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-cyan-500/30 transition-all space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                          <Radio size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate font-sans">
                            {group.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                            <span className="text-cyan-400 font-mono font-semibold">
                              {group.chat_id}
                            </span>
                            {group.username && (
                              <span className="text-slate-500">
                                {group.username}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTargetGroup(group)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        title="Remove group"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>LISTENING ACTIVE</span>
                      </div>
                      <div className="text-slate-500 flex items-center gap-1">
                        <Radio size={11} className="text-cyan-400" />
                        <span>OBS Live Overlay Connected</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveStep(2)}
              className="font-bold"
            >
              <ChevronLeft size={16} className="mr-1" />
              <span>Back to Step 2</span>
            </Button>

            <button
              type="button"
              onClick={() => setShowSimulator(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Zap size={14} />
              <span>Complete Setup &amp; Test Live Alert</span>
            </button>
          </div>
        </Card>
      )}
    </div>
  );
};
