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
  Zap,
  Phone,
  KeyRound,
  HelpCircle,
  Check,
  Send,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Plus,
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

const TelegramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.536-.195 1.006.128.832.942z" />
  </svg>
);

const isChatIdMatch = (id1?: string, id2?: string) => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  const clean1 = s1.replace(/^-100/, '').replace(/^-/, '');
  const clean2 = s2.replace(/^-100/, '').replace(/^-/, '');
  return Boolean(clean1 && clean1 === clean2);
};

export const PaymentGatewayAdmin: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
  const { user } = useAuth();
  const currentStreamerUsername = user?.username || 'neonstreamer';

  // Active Wizard Step: 1 = Connect (GramJS), 2 = Provide Master KHQR, 3 = Connect Group Listener
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');

  const goToStep = (nextStep: 1 | 2 | 3) => {
    if (nextStep === activeStep) return;
    setStepDirection(nextStep > activeStep ? 'forward' : 'backward');
    setActiveStep(nextStep);
  };

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

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  // ================================================================
  // STEP 3 STATE: Target Telegram Groups & Group Link Listener
  // ================================================================
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [availableDialogs, setAvailableDialogs] = useState<AvailableDialog[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [connectingGroupId, setConnectingGroupId] = useState<string | null>(null);
  const [step3Msg, setStep3Msg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group directory search state
  const [groupSearch, setGroupSearch] = useState('');

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

        // Ensure all connected groups in DB are present in availableDialogs list
        for (const g of serverGroups) {
          if (g.chat_id && !combined.some((c) => isChatIdMatch(c.id, g.chat_id))) {
            combined.unshift({
              id: g.chat_id,
              title: g.title,
              username: g.username,
              isGroup: true,
              isChannel: false
            });
          }
        }

        for (const p of PRESET_GROUPS) {
          if (!combined.some((c) => isChatIdMatch(c.id, p.id))) {
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
        goToStep(2);
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
            goToStep(1);
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
        text: `File exceeds 2MB limit (${sizeMb} MB). Please choose a PNG or JPG under 2MB.`
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
        goToStep(3); // Automate the client into step 3!
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
  const handlePromptDisconnectGroup = (dialog: AvailableDialog) => {
    const existing = targetGroups.find((g) => isChatIdMatch(g.chat_id, dialog.id));
    if (!existing) return;

    showConfirm({
      title: 'Disconnect Monitored Group?',
      message: (
        <div className="space-y-2.5">
          <p className="text-xs sm:text-sm text-slate-300">
            Are you sure you want to disconnect <strong className="text-white font-bold">{dialog.title}</strong>?
          </p>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Chat ID:</span>
              <span className="text-red-400 font-bold">{dialog.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Type:</span>
              <span className="text-white">{dialog.isChannel ? 'Telegram Channel' : 'Telegram Group'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            GramJS will stop listening for messages from this group. Incoming bank transfers will no longer trigger donation alerts.
          </p>
        </div>
      ),
      type: 'danger',
      confirmText: 'Disconnect',
      cancelText: 'Keep Connected',
      onConfirm: async () => {
        try {
          const res = await authFetch(`/api/telegram/groups?id=${encodeURIComponent(existing.id)}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setStep3Msg({ type: 'success', text: `Disconnected "${dialog.title}" from listener.` });
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

  const handlePromptConnectGroup = (dialog: AvailableDialog) => {
    showConfirm({
      title: 'Connect Telegram Group?',
      message: (
        <div className="space-y-2.5">
          <p className="text-xs sm:text-sm text-slate-300">
            Do you want to connect <strong className="text-white font-bold">{dialog.title}</strong> to GramJS listener?
          </p>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Chat ID:</span>
              <span className="text-cyan-400 font-bold">{dialog.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Type:</span>
              <span className="text-white">{dialog.isChannel ? 'Telegram Channel' : 'Telegram Group'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            GramJS will monitor incoming messages in real-time and trigger OBS donation alerts for your stream.
          </p>
        </div>
      ),
      type: 'info',
      confirmText: 'Connect Group',
      cancelText: 'Cancel',
      onConfirm: async () => {
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
      }
    });
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
            onClick={() => goToStep(1)}
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

            <div className="mt-2.5">
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
            </div>
          </button>

          {/* STEP 2: KHQR Node */}
          <button
            type="button"
            onClick={() => goToStep(2)}
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

            <div className="mt-2.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 2
                    ? 'text-cyan-400'
                    : isStep2Done
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                KHQR
              </span>
            </div>
          </button>

          {/* STEP 3: GROUP Node */}
          <button
            type="button"
            onClick={() => goToStep(3)}
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

            <div className="mt-2.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 3
                    ? 'text-cyan-400'
                    : isStep3Done
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                GROUP
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DIRECTIONAL STEP TRANSITION SWIPE WRAPPER                      */}
      {/* ============================================================== */}
      <div
        key={activeStep}
        className={`overflow-hidden transition-all ${
          stepDirection === 'forward' ? 'animate-slide-left' : 'animate-slide-right'
        }`}
      >
        {/* ============================================================== */}
        {/* STEP 1 CONTENT: "Connect" (GramJS Client Connection)           */}
        {/* ============================================================== */}
        {activeStep === 1 && (
          <Card glow="cyan" className="space-y-6">
          {step1Msg && step1Msg.type === 'error' && (
            <div className="p-3.5 rounded-xl border text-xs flex items-center gap-2 bg-red-950/40 border-red-500/30 text-red-300">
              <AlertCircle size={16} />
              <span>{step1Msg.text}</span>
            </div>
          )}

          {/* Connected State View */}
          {userClientStatus.isConnected ? (
            <div className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/30 space-y-6 shadow-lg shadow-cyan-500/5">
              {/* Centered Telegram Logo & Username */}
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-white shadow-[0_0_15px_rgba(0,136,204,0.4)] ring-2 ring-[#0088cc]/30">
                  <TelegramIcon className="w-10 h-10 text-[#0088cc] flex-shrink-0" />
                </div>
                <div className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch']">
                  {userClientStatus.userName || 'Connected Streamer'}
                </div>
              </div>

              {/* Bottom Actions: Disconnect (left) & Continue (right) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleDisconnectUserClient}
                  className="px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-bold text-red-400 flex items-center gap-1.5 transition-colors whitespace-nowrap font-mono cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Disconnect</span>
                </button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => goToStep(2)}
                  className="font-bold shadow-lg shadow-cyan-400/20 whitespace-nowrap"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight size={15} className="ml-1" />
                </Button>
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
                  className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/40 space-y-5 animate-fadeIn shadow-2xl"
                >
                  {/* Centered Code Input Label Section */}
                  <div className="space-y-1.5 text-center flex flex-col items-center">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-center gap-2">
                      <KeyRound size={14} className="text-cyan-400" />
                      <span>Enter Your OTP Code</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-mono text-center">
                      Enter the 5-digit verification code sent to your Telegram app for{' '}
                      <span className="text-cyan-400 font-semibold">{userPhone}</span>.
                    </p>
                  </div>

                  {/* Centered 5-Digit Block Boxes */}
                  <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-1">
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

                  {verifyingCode && (
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-400 animate-pulse">
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Verifying code...</span>
                    </div>
                  )}

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
          <Card glow="cyan" className="space-y-6">
          {step2Msg && step2Msg.type === 'error' && (
            <div className="p-3.5 rounded-xl border text-xs flex items-center gap-2 bg-red-950/40 border-red-500/30 text-red-300">
              <AlertCircle size={16} />
              <span>{step2Msg.text}</span>
            </div>
          )}

          {gatewayConfig?.khqrImageUrl ? (
            /* Active KHQR View - Clean Centered Preview */
            <div className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/30 space-y-6 shadow-lg shadow-cyan-500/5">
              <div className="flex flex-col items-center justify-center text-center gap-3 py-2">
                {uploadingKhqr ? (
                  <div className="w-36 h-36 rounded-2xl bg-cyan-950/30 border-2 border-cyan-400/40 flex flex-col items-center justify-center gap-2 p-2 shadow-[0_0_25px_rgba(0,240,255,0.25)]">
                    <RefreshCw size={24} className="animate-spin text-cyan-400" />
                    <span className="text-[11px] font-bold text-cyan-300 font-mono animate-pulse text-center">
                      Uploading Into Cloud...
                    </span>
                  </div>
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-white p-2.5 border-2 border-cyan-400/40 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(0,240,255,0.25)]">
                    <img
                      src={gatewayConfig.khqrImageUrl}
                      alt="Active Master KHQR"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch']">
                    Master KHQR Active
                  </div>
                  <div className="text-xs font-mono text-emerald-400 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live on @{currentStreamerUsername} donation page</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UploadCloud size={13} />
                    <span>Replace Image</span>
                  </button>
                  <span className="text-slate-700">•</span>
                  <button
                    type="button"
                    onClick={handleDeleteKhqr}
                    className="text-xs font-mono text-slate-500 hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {/* Hidden file input for replacing */}
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

              {/* Bottom Actions Row: Back to Step 1 (left) & Continue to Step 3 (right) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => goToStep(1)}
                  className="font-bold cursor-pointer"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  <span>Back to Step 1</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => goToStep(3)}
                  className="font-bold shadow-lg shadow-cyan-400/20 whitespace-nowrap cursor-pointer"
                >
                  <span>Continue to Step 3</span>
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone - Clean Centered Box */
            <div className="p-6 sm:p-8 rounded-2xl bg-[#090D18] border border-cyan-500/30 space-y-6 shadow-lg shadow-cyan-500/5">
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
                onClick={() => !uploadingKhqr && fileInputRef.current?.click()}
                className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-4 cursor-pointer ${
                  dragActive
                    ? 'border-cyan-400 bg-cyan-950/25 scale-[1.01]'
                    : 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                {uploadingKhqr ? (
                  /* Animated Uploading State */
                  <div className="py-6 flex flex-col items-center justify-center space-y-3">
                    <div className="relative w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
                      <RefreshCw size={26} className="animate-spin text-cyan-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-base font-bold text-cyan-300 font-['Chakra_Petch'] tracking-wide animate-pulse">
                        Uploading Into Cloud...
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        Validating KHQR and activating payment listener
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Normal Upload State */
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                      <QrCode size={28} />
                    </div>

                    <div className="space-y-2 max-w-md">
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="font-bold py-2.5 px-6 shadow-lg shadow-cyan-400/20 whitespace-nowrap cursor-pointer mx-auto"
                      >
                        <UploadCloud size={16} className="mr-1.5" />
                        <span>Click To Upload</span>
                      </Button>

                      <p className="text-xs text-slate-400 font-mono pt-1">
                        or drag and drop your official Bakong KHQR image here
                      </p>
                    </div>

                    {/* Guidelines and Recommended Scale / Size Box */}
                    <div className="pt-3 border-t border-slate-800/80 w-full max-w-md grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-left">
                        <span className="text-slate-500 block uppercase font-bold text-[9px]">RECOMMENDED SCALE</span>
                        <span className="text-cyan-400 font-semibold">1024 × 1024 (1:1)</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-left">
                        <span className="text-slate-500 block uppercase font-bold text-[9px]">MAX FILE SIZE</span>
                        <span className="text-cyan-400 font-semibold">2 MB (PNG / JPG)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Actions Row: Back to Step 1 (left) & Continue to Step 3 (right) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => goToStep(1)}
                  className="font-bold cursor-pointer"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  <span>Back to Step 1</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => goToStep(3)}
                  className="font-bold shadow-lg shadow-cyan-400/20 whitespace-nowrap cursor-pointer"
                >
                  <span>Continue to Step 3</span>
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

        {/* ============================================================== */}
        {/* STEP 3 CONTENT: "Connect to Group via Link Telegram"           */}
        {/* ============================================================== */}
        {activeStep === 3 && (
          <Card glow="cyan" className="space-y-6">
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
                  className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
                >
                  ✕
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
                    onClick={() => goToStep(1)}
                    className="font-bold shadow-lg shadow-cyan-400/20"
                  >
                    <ArrowRight size={14} className="mr-2" />
                    Go to Step 1: Connect GramJS
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-5 sm:p-7 rounded-2xl bg-[#090D18] border border-cyan-500/30 space-y-4 shadow-lg shadow-cyan-500/5">
                {/* Top Row: Prominent Search Bar & Top-Right Refresh Icon Button */}
                <div className="flex items-center gap-2.5">
                  <div className="relative flex-1 group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 pointer-events-none transition-colors">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Search groups by name or chat ID (e.g. ABA, Bakong, Hayday, Transaction)..."
                      className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                    />
                    {groupSearch && (
                      <button
                        type="button"
                        onClick={() => setGroupSearch('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Refresh Button with Icon Only at Top Right */}
                  <button
                    type="button"
                    onClick={fetchTargetGroups}
                    disabled={loadingGroups}
                    title="Refresh Groups"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center cursor-pointer flex-shrink-0 shadow-sm"
                  >
                    <RefreshCw size={15} className={loadingGroups ? 'animate-spin text-cyan-400' : ''} />
                  </button>
                </div>

                {/* 1 GRID ONLY: CLEAN LIST OF TELEGRAM GROUPS */}
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
                    if (!groupSearch.trim()) return true;
                    const q = groupSearch.toLowerCase().trim();
                    return (
                      d.title.toLowerCase().includes(q) ||
                      d.id.includes(q) ||
                      (d.username && d.username.toLowerCase().includes(q))
                    );
                  });

                  // Sort active connected groups strictly to the top
                  const sorted = [...filtered].sort((a, b) => {
                    const aActive = targetGroups.some((g) => isChatIdMatch(g.chat_id, a.id));
                    const bActive = targetGroups.some((g) => isChatIdMatch(g.chat_id, b.id));
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    return 0;
                  });

                  if (sorted.length === 0) {
                    return (
                      <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1 font-mono">
                        <p className="text-white font-bold">No groups match your search.</p>
                        <p className="text-slate-500">Try typing a different name or clearing the search input.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 gap-2.5">
                      {sorted.map((dialog) => {
                        const isMonitored = targetGroups.some((g) => isChatIdMatch(g.chat_id, dialog.id));
                        const isConnecting = connectingGroupId === dialog.id;

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
                            onClick={() =>
                              isMonitored
                                ? handlePromptDisconnectGroup(dialog)
                                : handlePromptConnectGroup(dialog)
                            }
                            className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 sm:gap-4 relative group cursor-pointer ${
                              isMonitored
                                ? 'bg-[#0B1524] border-emerald-500/40 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/60'
                                : 'bg-slate-950/60 border-slate-800/90 hover:border-cyan-500/40 hover:bg-[#0c1220]'
                            }`}
                          >
                            {/* Left Accent indicator for active monitored group */}
                            {isMonitored && (
                              <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-r" />
                            )}

                            {/* Left Side: Telegram Logo Avatar & Group Title */}
                            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                              {/* Telegram Logo Icon as Avatar */}
                              <div
                                className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors shadow-sm ${
                                  isMonitored
                                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                    : 'bg-[#0088cc]/10 border border-[#0088cc]/30 text-[#0088cc]'
                                }`}
                              >
                                <TelegramIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                {isMonitored && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#090D18] flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                                  </span>
                                )}
                              </div>

                              {/* Title & Bank Badge only (Cleaned of description & chat ID) */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5
                                    className="text-xs sm:text-sm font-bold text-white truncate max-w-[280px] sm:max-w-md md:max-w-xl font-sans tracking-tight"
                                    title={dialog.title}
                                  >
                                    {dialog.title}
                                  </h5>
                                  {isBankRelated && (
                                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-800/40 uppercase tracking-wider font-mono">
                                      BANK
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Action Button */}
                            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              {isMonitored ? (
                                <button
                                  type="button"
                                  onClick={() => handlePromptDisconnectGroup(dialog)}
                                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                                  title="Connected to listener (Click to disconnect)"
                                >
                                  <Check size={14} className="stroke-[3]" />
                                  <span>Connected</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isConnecting}
                                  onClick={() => handlePromptConnectGroup(dialog)}
                                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm hover:shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
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
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => goToStep(2)}
                className="font-bold cursor-pointer"
              >
                <ChevronLeft size={16} className="mr-1" />
                <span>Back to Step 2</span>
              </Button>

              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold shadow-md">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>
                  {targetGroups.length > 0
                    ? `Step 3 Configured • ${targetGroups.length} Active`
                    : 'Step 3: Connect Group'}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
