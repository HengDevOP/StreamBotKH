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
  HelpCircle,
  Copy,
  Check,
  DollarSign,
  Send,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Users,
  Plus,
  Layers,
  LogOut,
  ChevronUp,
  ChevronDown,
  CheckCheck,
  Bot,
  Search
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';

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

const PRESET_GROUPS: AvailableDialog[] = [
  { id: '-1001179356180', title: 'បេឡាជាតិសន្តិសុខសង្គម_Chat', isGroup: true, isChannel: false },
  { id: '-1001107124782', title: 'Cam-Tool', isGroup: true, isChannel: false },
  { id: '-1001401897563', title: 'Tube2Post', isGroup: true, isChannel: false },
  { id: '-1001300121532', title: 'ក្រសួងព័ត៌មាន - Ministry of Information', isGroup: false, isChannel: true },
  { id: '-1001169491635', title: 'News - Cambodia Today', isGroup: false, isChannel: true },
  { id: '-1002069744653', title: 'រាប់ Roll Cage ប្រចាំថ្ងៃ មុនម៉ោង8:30P', isGroup: true, isChannel: false },
  { id: '-1001394225118', title: 'ឯកសារមន្ត្រីសាធារណៈ', isGroup: true, isChannel: false },
  { id: '-1003932499063', title: 'Mini Hayday Store 🔩🎊', isGroup: true, isChannel: false },
  { id: '-1001240199450', title: 'E-SCHOOL Community', isGroup: true, isChannel: false },
  { id: '-5105279786', title: 'ABA Transaction', isGroup: true, isChannel: false },
  { id: '-1001448514559', title: 'បេឡាជាតិសន្តិសុខសង្គម (ប.ស.ស.)', isGroup: true, isChannel: false },
  { id: '-1003929930892', title: 'KHMC Community', isGroup: true, isChannel: false },
  { id: '-1002669457223', title: 'Apsara Hosting | Discussion', isGroup: true, isChannel: false },
  { id: '-1001691523669', title: 'Axonify new team', isGroup: true, isChannel: false },
  { id: '-1002112069070', title: 'ThaNeverBroke Info', isGroup: false, isChannel: true },
  { id: '-1004475542750', title: 'mcserver', isGroup: true, isChannel: false },
  { id: '-1003656870008', title: 'Mini Hay Day Supermart', isGroup: true, isChannel: false },
  { id: '-1002617639698', title: 'Apsara Hosting', isGroup: true, isChannel: false },
  { id: '-1001508552871', title: 'Business CamPos', isGroup: true, isChannel: false },
  { id: '-429572356', title: '🌻ក្រុមពិភាក្សា🌻', isGroup: true, isChannel: false },
  { id: '-1001627391402', title: 'HayDay Cambodia 🇰🇭', isGroup: true, isChannel: false },
  { id: '-1004477067848', title: 'Jxncii Channel', isGroup: false, isChannel: true }
];

export const PaymentGatewayAdmin: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
  const { user } = useAuth();
  const currentStreamerUsername = user?.username || 'neonstreamer';

  // Active Wizard Step: 1 = Connect (GramJS), 2 = Provide Master KHQR, 3 = Connect Group Listener
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // ================================================================
  // STEP 1 STATE: GramJS MTProto User Client Connection
  // ================================================================
  const [userPhone, setUserPhone] = useState('+855');
  const [userApiId, setUserApiId] = useState('');
  const [userApiHash, setUserApiHash] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [codeRequested, setCodeRequested] = useState(false);
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '']);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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
  const [connectingGroupId, setConnectingGroupId] = useState<string | null>(null);
  const [step3Msg, setStep3Msg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group directory search, filter & copy ID states
  const [groupSearch, setGroupSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all' | 'connected' | 'available'>('all');
  const [copiedChatId, setCopiedChatId] = useState<string | null>(null);

  // ----------------------------------------------------------------
  // Authenticated Fetch Helper (Per Client Account Session)
  // ----------------------------------------------------------------
  const authFetch = (url: string, init: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('streamneon_auth_token') : null;
    const headers = new Headers(init.headers || {});
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(url, { ...init, headers });
  };

  // ----------------------------------------------------------------
  // Initial Data Fetching
  // ----------------------------------------------------------------
  const fetchGatewayConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await authFetch('/api/payment-gateway/config');
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
      const res = await authFetch('/api/telegram/user/status');
      if (res.ok) {
        const data = await res.json();
        setUserClientStatus(data);
        if (data.isConnected && data.phoneNumber) {
          setUserPhone(data.phoneNumber);
        } else if (data.hasPendingCode) {
          setCodeRequested(true);
          if (data.pendingPhone) setUserPhone(data.pendingPhone);
          if (data.pendingHash) setPhoneCodeHash(data.pendingHash);
        } else {
          setTargetGroups([]);
          setAvailableDialogs([]);
        }
        return data;
      }
    } catch (e) {
      console.error('Error fetching user client status:', e);
    }
    return null;
  };

  const fetchTargetGroups = async () => {
    try {
      setLoadingGroups(true);
      const res = await authFetch('/api/telegram/groups');
      if (res.ok) {
        const data = await res.json();
        const serverGroups = data.groups || [];
        const apiDialogs: AvailableDialog[] = data.availableDialogs || [];

        // If backend returned no groups and no dialogs, verify connection status
        if (serverGroups.length === 0 && apiDialogs.length === 0) {
          const statusRes = await authFetch('/api/telegram/user/status').catch(() => null);
          const statusData = statusRes?.ok ? await statusRes.json() : null;
          if (statusData && !statusData.isConnected) {
            setTargetGroups([]);
            setAvailableDialogs([]);
            return;
          }
        }

        setTargetGroups(serverGroups);
        const combined = [...apiDialogs];
        for (const p of PRESET_GROUPS) {
          if (!combined.some((c) => c.id === p.id)) {
            combined.push(p);
          }
        }
        setAvailableDialogs(combined);
      } else {
        setTargetGroups([]);
        setAvailableDialogs([]);
      }
    } catch (e) {
      console.error('Error fetching target groups:', e);
      setTargetGroups([]);
      setAvailableDialogs([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchGatewayConfig();
    fetchUserClientStatus().then((status) => {
      if (status?.isConnected) {
        fetchTargetGroups();
      } else {
        setTargetGroups([]);
        setAvailableDialogs([]);
      }
    });
  }, []);

  // Sync groups state whenever GramJS connection state changes
  useEffect(() => {
    if (!userClientStatus.isConnected) {
      setTargetGroups([]);
      setAvailableDialogs([]);
    }
  }, [userClientStatus.isConnected]);

  // Step completion flags
  const isStep1Done = Boolean(userClientStatus.isConnected);
  const isStep2Done = Boolean(gatewayConfig?.khqrImageUrl);
  const isStep3Done = Boolean(userClientStatus.isConnected && targetGroups.length > 0);

  const completedStepsCount = (isStep1Done ? 1 : 0) + (isStep2Done ? 1 : 0) + (isStep3Done ? 1 : 0);

  // 2-minute (120s) cooldown timer for resending verification code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // ----------------------------------------------------------------
  // STEP 1 HANDLERS: GramJS Phone Authentication
  // ----------------------------------------------------------------
  const handleChangePhone = () => {
    setCodeRequested(false);
    setVerificationCode('');
    setCodeDigits(['', '', '', '', '']);
    setPhoneCodeHash('');
    setTwoFaPassword('');
    setNeedPassword(false);
    setStep1Msg(null);
    setDemoCodeHint(null);
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStep1Msg(null);
    setDemoCodeHint(null);

    const clean = userPhone.trim();
    if (!clean || clean === '+855') {
      setStep1Msg({ type: 'error', text: 'Please enter a valid Telegram phone number (e.g. +85512345678).' });
      return;
    }

    setSendingCode(true);
    try {
      const res = await authFetch('/api/telegram/user/send-code', {
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
        setCodeDigits(['', '', '', '', '']);
        setVerificationCode('');
        setResendCooldown(120);
        if (data.phoneCodeHash) setPhoneCodeHash(data.phoneCodeHash);
        if (data.phoneNumber) setUserPhone(data.phoneNumber);
        setStep1Msg({ type: 'success', text: data.message });
        if (data.simulationCode) {
          setDemoCodeHint(data.simulationCode);
          setVerificationCode(data.simulationCode);
          const digits = data.simulationCode.slice(0, 5).split('');
          setCodeDigits(digits);
        }
        setTimeout(() => {
          digitInputRefs.current[0]?.focus();
        }, 80);
      } else {
        setStep1Msg({ type: 'error', text: data.error || 'Failed to send verification code.' });
      }
    } catch (err: any) {
      setStep1Msg({ type: 'error', text: err.message || 'Network error requesting code.' });
    } finally {
      setSendingCode(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      const next = [...codeDigits];
      next[index] = '';
      setCodeDigits(next);
      setVerificationCode(next.join(''));
      return;
    }

    // If multiple digits pasted/typed into this box
    if (clean.length > 1) {
      handlePastedCode(clean);
      return;
    }

    const next = [...codeDigits];
    next[index] = clean;
    setCodeDigits(next);
    const fullCode = next.join('');
    setVerificationCode(fullCode);

    // Focus next digit box
    if (index < 4) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Auto-trigger Continue when all 5 digits entered
    if (fullCode.length === 5 && !next.some((d) => !d)) {
      handleVerifyCode(undefined, fullCode);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!codeDigits[index] && index > 0) {
        e.preventDefault();
        const next = [...codeDigits];
        next[index - 1] = '';
        setCodeDigits(next);
        setVerificationCode(next.join(''));
        digitInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 4) {
      e.preventDefault();
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedCode = (pasted: string) => {
    const digits = pasted.replace(/[^0-9]/g, '').slice(0, 5).split('');
    if (digits.length === 0) return;

    const next = ['', '', '', '', ''];
    digits.forEach((d, i) => {
      if (i < 5) next[i] = d;
    });
    setCodeDigits(next);
    const fullCode = next.join('');
    setVerificationCode(fullCode);

    const nextEmptyIndex = next.findIndex((d) => !d);
    if (nextEmptyIndex !== -1) {
      digitInputRefs.current[nextEmptyIndex]?.focus();
    } else {
      digitInputRefs.current[4]?.focus();
    }

    // Auto-trigger Continue if 5 digits are pasted
    if (fullCode.length === 5) {
      handleVerifyCode(undefined, fullCode);
    }
  };

  const handleVerifyCode = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    setStep1Msg(null);

    const codeToVerify = (customCode !== undefined ? customCode : verificationCode).trim();
    if (!codeToVerify) {
      setStep1Msg({ type: 'error', text: 'Please enter the 5-digit verification code.' });
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await authFetch('/api/telegram/user/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneCode: codeToVerify,
          phoneCodeHash: phoneCodeHash || undefined,
          phoneNumber: userPhone.trim() || undefined,
          password: twoFaPassword.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCodeRequested(false);
        setVerificationCode('');
        setCodeDigits(['', '', '', '', '']);
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
      message: 'Are you sure you want to disconnect this Telegram account? GramJS will stop listening to incoming bank transfers and all active group listeners will be cleared until reconnected.',
      type: 'danger',
      confirmText: 'Disconnect',
      onConfirm: async () => {
        try {
          const res = await authFetch('/api/telegram/user/disconnect', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            setStep1Msg({ type: 'success', text: 'Telegram account disconnected.' });
            setCodeRequested(false);
            setPhoneCodeHash('');
            setVerificationCode('');
            setUserClientStatus({ isConnected: false, monitoredChats: [] });
            setTargetGroups([]);
            setAvailableDialogs([]);
            await fetchUserClientStatus();
            await fetchTargetGroups();
            showAlert({
              title: 'Account Disconnected',
              message: 'Your Telegram session has been disconnected and monitored groups have been cleared.',
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
      const res = await authFetch('/api/payment-gateway/upload-khqr', {
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
          const res = await authFetch('/api/payment-gateway/upload-khqr', { method: 'DELETE' });
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
  // STEP 3 HANDLERS: Manage Telegram Target Groups & Listener Cards
  // ----------------------------------------------------------------
  const handleDeleteTargetGroup = (group: TargetGroup) => {
    showConfirm({
      title: 'Remove Monitored Group?',
      message: `Are you sure you want to remove "${group.title}" (${group.chat_id})? GramJS will stop listening for messages from this group.`,
      type: 'danger',
      confirmText: 'Remove Group',
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/telegram/groups?id=${encodeURIComponent(group.id)}`, {
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


  const handleDirectToggleGroup = async (dialog: AvailableDialog) => {
    const existing = targetGroups.find((g) => g.chat_id === dialog.id);
    if (existing) {
      handleDeleteTargetGroup(existing);
      return;
    }

    setConnectingGroupId(dialog.id);
    setStep3Msg(null);
    try {
      const res = await authFetch('/api/telegram/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: dialog.id,
          title: dialog.title,
          username: dialog.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep3Msg({ type: 'success', text: `Connected "${dialog.title}" to GramJS listener!` });
        await fetchTargetGroups();
      } else {
        setStep3Msg({ type: 'error', text: data.error || 'Failed to connect group.' });
      }
    } catch (err: any) {
      setStep3Msg({ type: 'error', text: err.message || 'Error connecting group.' });
    } finally {
      setConnectingGroupId(null);
    }
  };

  const handleCopyChatId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedChatId(id);
    setTimeout(() => setCopiedChatId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 3-STEP ANIMATED LINE PROGRESS TASK BAR                         */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090D18] border border-slate-800/90 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Background Gradient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-28 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-96 h-28 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

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
      {/* STEP 1 CONTENT: "Connect" (GramJS Client Connection)           */}
      {/* ============================================================== */}
      {activeStep === 1 && (
        <Card glow="cyan" className="space-y-6 animate-fadeIn">
          {step1Msg && step1Msg.type === 'error' && (
            <div className="p-3.5 rounded-xl border text-xs flex items-center gap-2 bg-red-950/40 border-red-500/30 text-red-300">
              <AlertCircle size={16} />
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

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDisconnectUserClient}
                    className="px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-bold text-red-400 flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <LogOut size={13} />
                    <span>Disconnect</span>
                  </button>

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
                <form onSubmit={handleSendCode} className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-4">
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
                        Request Code
                      </Button>
                    </div>

                    <p className="text-[11px] text-slate-500 font-mono">
                      Enter your Telegram phone number. Telegram will send an official 5-digit verification code to your Telegram app.
                    </p>
                  </div>
                </form>
              ) : (
                /* Verification Code Form: 5-Digit Block Boxes with Auto-Submit */
                <form
                  onSubmit={(e) => handleVerifyCode(e, codeDigits.join(''))}
                  className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/40 space-y-4 animate-fadeIn shadow-2xl"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <KeyRound size={14} className="text-cyan-400" />
                      <span>Enter Your OTP Code</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Enter the 5-digit verification code sent to your Telegram app for{' '}
                      <span className="text-cyan-400 font-semibold">{userPhone}</span>.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* 5-Digit Block Boxes */}
                    <div className="flex items-center gap-2.5 sm:gap-3 justify-center w-full sm:w-auto">
                      {codeDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (digitInputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                          onPaste={(e) => {
                            e.preventDefault();
                            handlePastedCode(e.clipboardData.getData('text'));
                          }}
                          className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-xl bg-slate-950 border transition-all ${
                            digit
                              ? 'border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/30'
                              : 'border-slate-800 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20'
                          } focus:outline-none`}
                        />
                      ))}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={verifyingCode}
                      className="font-bold py-3.5 px-8 w-full sm:w-auto whitespace-nowrap justify-center shadow-lg shadow-cyan-400/20"
                    >
                      Continue
                    </Button>
                  </div>

                  {needPassword && (
                    <div className="space-y-1 pt-2 animate-fadeIn font-mono">
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

                  {/* Actions: Change Phone Number & Request A New Code (2-minute cooldown) */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <button
                      type="button"
                      onClick={handleChangePhone}
                      className="text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>&larr; Change Phone Number</span>
                    </button>

                    <button
                      type="button"
                      disabled={resendCooldown > 0 || sendingCode}
                      onClick={() => handleSendCode()}
                      className={`flex items-center gap-1.5 transition-colors font-semibold ${
                        resendCooldown > 0 || sendingCode
                          ? 'text-slate-600 cursor-not-allowed'
                          : 'text-cyan-400 hover:text-cyan-300 cursor-pointer'
                      }`}
                    >
                      <RefreshCw size={12} className={sendingCode ? 'animate-spin' : ''} />
                      <span>
                        {resendCooldown > 0
                          ? `Request A New Code (${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60) < 10 ? '0' : ''}${resendCooldown % 60})`
                          : 'Request A New Code'}
                      </span>
                    </button>
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
                      ACTIVE ON YOUR DONATION PAGE (@{currentStreamerUsername})
                    </div>
                    <div className="text-sm font-bold text-white">
                      {gatewayConfig.khqrFilename || 'master-khqr.png'}
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      File Size: {formatFileSize(gatewayConfig.khqrFileSize)} • Scoped to Your Client Account
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={`/@${currentStreamerUsername}`}
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
                No custom Master KHQR image uploaded for your account yet. Your donation page currently generates dynamic Bakong QR codes as a fallback.
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
                <Users size={22} className={isStep3Done ? 'text-cyan-400' : 'text-slate-400'} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-['Chakra_Petch']">
                  STEP 3: Connect Telegram Group for Listener
                  {isStep3Done ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {targetGroups.length} GROUPS ACTIVE
                    </span>
                  ) : !userClientStatus.isConnected ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-500/30 font-mono">
                      DISCONNECTED
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      NO GROUPS YET
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select and connect your Telegram bank notification groups or channels below. GramJS will monitor incoming messages in real-time and trigger OBS alerts.
                </p>
              </div>
            </div>

            {userClientStatus.isConnected && (
              <button
                type="button"
                onClick={fetchTargetGroups}
                disabled={loadingGroups}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-mono flex items-center gap-1.5"
              >
                <RefreshCw size={13} className={loadingGroups ? 'animate-spin text-cyan-400' : ''} />
                <span>Refresh Groups</span>
              </button>
            )}
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

          {!userClientStatus.isConnected ? (
            <div className="py-12 px-6 text-center space-y-5 rounded-2xl bg-[#090D18] border border-amber-500/30">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <AlertCircle size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-lg font-bold text-white font-['Chakra_Petch']">
                  GramJS Client Disconnected
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  Telegram bank notification groups cannot be loaded or monitored while GramJS is disconnected. Please connect your Telegram account in Step 1 first.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setActiveStep(1)}
                  className="font-bold shadow-lg shadow-cyan-400/20"
                >
                  <ArrowRight size={14} className="mr-2" />
                  Go to Step 1: Connect GramJS
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ============================================================== */}
              {/* TELEGRAM GROUPS DIRECTORY: LISTED AS INTERACTIVE CARDS         */}
              {/* ============================================================== */}
              <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-['Chakra_Petch'] flex items-center gap-2">
                  <Layers size={16} className="text-cyan-400" />
                  <span>Telegram Groups Directory</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                    {availableDialogs.length} Groups
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click <strong className="text-cyan-300">&ldquo;Connect Listener&rdquo;</strong> on any card to begin auto-detecting bank notifications.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setGroupFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                    groupFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({availableDialogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupFilter('connected')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                    groupFilter === 'connected'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active ({targetGroups.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGroupFilter('available')}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-semibold ${
                    groupFilter === 'available'
                      ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Available ({Math.max(0, availableDialogs.length - targetGroups.length)})
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Search size={15} />
              </div>
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search groups by name or chat ID (e.g. ABA, Hayday, បេឡា, -100...)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
              />
              {groupSearch && (
                <button
                  type="button"
                  onClick={() => setGroupSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Groups Grid Rendered as High-Craft Cards (Active Groups Sorted First) */}
            {(() => {
              if (loadingGroups && availableDialogs.length === 0) {
                return (
                  <div className="py-12 px-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3 font-mono">
                    <RefreshCw size={24} className="animate-spin text-cyan-400 mx-auto" />
                    <div className="text-white text-xs font-bold">Scanning Telegram account groups & channels...</div>
                    <p className="text-[11px] text-slate-500">Fetching dialogs from your connected GramJS session</p>
                  </div>
                );
              }

              const filtered = availableDialogs.filter((d) => {
                const matchesSearch =
                  !groupSearch.trim() ||
                  d.title.toLowerCase().includes(groupSearch.toLowerCase()) ||
                  d.id.includes(groupSearch);

                const isAdded = targetGroups.some((g) => g.chat_id === d.id);
                if (groupFilter === 'connected') return matchesSearch && isAdded;
                if (groupFilter === 'available') return matchesSearch && !isAdded;
                return matchesSearch;
              });

              // Sort active listening groups to the top
              const sorted = [...filtered].sort((a, b) => {
                const aActive = targetGroups.some((g) => g.chat_id === a.id);
                const bActive = targetGroups.some((g) => g.chat_id === b.id);
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                return 0;
              });

              if (sorted.length === 0) {
                return (
                  <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1 font-mono">
                    <p className="text-white font-bold">No groups match your search or filter.</p>
                    <p className="text-slate-500">Try clearing the search input or switching filter tabs.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {sorted.map((dialog) => {
                    const isMonitored = targetGroups.some((g) => g.chat_id === dialog.id);
                    const isConnecting = connectingGroupId === dialog.id;
                    const isCopied = copiedChatId === dialog.id;

                    const titleLower = dialog.title.toLowerCase();
                    const isBankRelated =
                      titleLower.includes('aba') ||
                      titleLower.includes('bank') ||
                      titleLower.includes('transaction') ||
                      titleLower.includes('cam-tool') ||
                      titleLower.includes('khmc') ||
                      titleLower.includes('acleda') ||
                      titleLower.includes('wing') ||
                      titleLower.includes('canadia') ||
                      titleLower.includes('bakong') ||
                      titleLower.includes('alert') ||
                      titleLower.includes('pay');

                    return (
                      <div
                        key={dialog.id}
                        className={`rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between gap-3 relative group overflow-hidden ${
                          isMonitored
                            ? 'bg-[#0B1422] border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                            : 'bg-[#090D18] border-slate-800/90 hover:border-cyan-500/40 hover:bg-[#0c1220]'
                        }`}
                      >
                        {/* Top Accent Line */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-0.5 ${
                            isMonitored
                              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                              : isBankRelated
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 opacity-60'
                              : 'bg-transparent'
                          }`}
                        />

                        {/* Card Header & Title */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono transition-colors ${
                                  isMonitored
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : isBankRelated
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                                }`}
                              >
                                {isBankRelated ? (
                                  <DollarSign size={16} />
                                ) : dialog.isChannel ? (
                                  <Radio size={15} />
                                ) : (
                                  <Users size={15} />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h5
                                  className="text-xs sm:text-sm font-bold text-white line-clamp-2 font-sans tracking-tight leading-snug"
                                  title={dialog.title}
                                >
                                  {dialog.title}
                                </h5>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                  <span>{dialog.isChannel ? 'Telegram Channel' : 'Telegram Group'}</span>
                                  {isBankRelated && (
                                    <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40">
                                      BANK
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Chat ID & Copy Pill */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div
                              onClick={(e) => handleCopyChatId(dialog.id, e)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800/90 text-cyan-400 font-mono text-[11px] font-semibold cursor-pointer transition-colors max-w-full"
                              title="Click to copy Chat ID"
                            >
                              <span className="truncate">{dialog.id}</span>
                              {isCopied ? (
                                <Check size={11} className="text-emerald-400 flex-shrink-0" />
                              ) : (
                                <Copy size={11} className="text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
                              )}
                            </div>

                            {isCopied && (
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                Copied!
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Status & Action Button */}
                        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          {isMonitored ? (
                            <>
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                <span>LISTENING ACTIVE</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDirectToggleGroup(dialog)}
                                className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-800 hover:border-red-500/30 text-xs font-mono font-semibold transition-colors"
                              >
                                Disconnect
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-mono text-slate-500">
                                Ready to connect
                              </span>

                              <button
                                type="button"
                                disabled={isConnecting}
                                onClick={() => handleDirectToggleGroup(dialog)}
                                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm hover:shadow-cyan-500/20 cursor-pointer"
                              >
                                {isConnecting ? (
                                  <>
                                    <RefreshCw size={12} className="animate-spin text-cyan-400" />
                                    <span>Connecting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} />
                                    <span>Connect Listener</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      )}

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

            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold shadow-md">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Step 3 Configured • Listener Active</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
