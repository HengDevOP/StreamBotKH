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
  Search,
  X,
  Edit2,
  Image as ImageIcon,
  DollarSign
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { QRCodeSVG } from 'qrcode.react';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import { mediaService, MediaItem } from '../../services/mediaService';
import { isImageAsset } from './MediaLibraryManager';
import { MediaPickerModal } from './MediaPickerModal';

export interface KhqrItem {
  id: string;
  amount: number;
  currency: 'USD' | 'KHR';
  imageUrl: string;
  filename?: string;
  createdAt?: string;
}

interface GatewayConfig {
  _id: string;
  khqrImageUrl: string;
  khqrFilename: string;
  khqrFileSize: number;
  khqrMimeType: string;
  customKhqrImageUrl?: string;
  customKhqrFilename?: string;
  customKhqrFileSize?: number;
  customKhqrMimeType?: string;
  khqrItems?: KhqrItem[];
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

const isGroupConnected = (dialog: AvailableDialog, groups: TargetGroup[]) => {
  if (!groups || groups.length === 0) return false;
  return groups.some((g) => {
    // 1. Match by Chat ID (direct or stripped numeric id)
    if (g.chat_id && isChatIdMatch(g.chat_id, dialog.id)) {
      return true;
    }
    // 2. Match by exact Group Title (trimmed, case-insensitive)
    if (g.title && dialog.title && g.title.trim().toLowerCase() === dialog.title.trim().toLowerCase()) {
      return true;
    }
    // 3. Match by Telegram Username
    if (g.username && dialog.username) {
      const u1 = g.username.replace(/^@/, '').trim().toLowerCase();
      const u2 = dialog.username.replace(/^@/, '').trim().toLowerCase();
      if (u1 && u1 === u2) return true;
    }
    return false;
  });
};

export const PaymentGatewaySkeleton: React.FC = () => {
  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* ============================================================== */}
      {/* 3-STEP PROGRESS TASK BAR SKELETON                              */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#141414] border border-[#262626]">
        <div className="relative flex items-center justify-between px-4 sm:px-12">
          {/* Connector Line 1 -> 2 */}
          <div className="absolute left-[18%] right-[50%] top-5 -translate-y-1/2 h-0.5 bg-[#262626]" />

          {/* Connector Line 2 -> 3 */}
          <div className="absolute left-[50%] right-[18%] top-5 -translate-y-1/2 h-0.5 bg-[#262626]" />

          {/* STEP 1: Connect Node */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#1e1e1e] border border-[#262626] animate-pulse flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#333333]" />
            </div>
            <div className="w-14 h-3 rounded bg-[#262626] animate-pulse mt-2.5" />
          </div>

          {/* STEP 2: KHQR Node */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#1e1e1e] border border-[#262626] animate-pulse flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#333333]" />
            </div>
            <div className="w-12 h-3 rounded bg-[#262626] animate-pulse mt-2.5" />
          </div>

          {/* STEP 3: GROUP Node */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#1e1e1e] border border-[#262626] animate-pulse flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#333333]" />
            </div>
            <div className="w-14 h-3 rounded bg-[#262626] animate-pulse mt-2.5" />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MAIN CARD WORKBENCH SKELETON                                   */}
      {/* ============================================================== */}
      <div className="rounded-xl bg-[#141414] border border-[#262626] p-5 sm:p-7 space-y-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#262626] gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-20 h-5 rounded bg-[#262626] animate-pulse" />
              <div className="w-44 h-5 rounded bg-[#262626] animate-pulse" />
            </div>
            <div className="w-64 sm:w-80 h-3 rounded bg-[#1e1e1e] animate-pulse" />
          </div>
          <div className="w-24 h-8 rounded-lg bg-[#262626] animate-pulse" />
        </div>

        {/* Content Skeletons */}
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <div className="w-28 h-3 rounded bg-[#1e1e1e] animate-pulse" />
            <div className="w-full h-11 rounded-lg bg-[#1a1a1a] border border-[#262626] animate-pulse flex items-center px-4">
              <div className="w-10 h-4 rounded bg-[#262626]" />
              <div className="w-px h-5 bg-[#262626] mx-3" />
              <div className="w-36 h-3 rounded bg-[#262626]" />
            </div>
          </div>

          {/* Info Box Skeleton */}
          <div className="p-4 rounded-lg bg-[#181818] border border-[#262626] animate-pulse flex items-start gap-3">
            <div className="w-4 h-4 rounded-full bg-[#262626] shrink-0 mt-0.5" />
            <div className="space-y-2 w-full">
              <div className="w-40 h-3 rounded bg-[#262626]" />
              <div className="w-full max-w-sm h-2.5 rounded bg-[#1e1e1e]" />
            </div>
          </div>

          {/* Action Row Skeleton */}
          <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
            <div className="w-24 h-9 rounded-lg bg-[#1e1e1e] border border-[#262626] animate-pulse" />
            <div className="w-36 h-9 rounded-lg bg-[#262626] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export interface PaymentGatewayAdminProps {
  onStatusChange?: (isIncomplete: boolean) => void;
}

export const PaymentGatewayAdmin: React.FC<PaymentGatewayAdminProps> = ({ onStatusChange }) => {
  const { showConfirm, showAlert } = useModal();
  const { user } = useAuth();
  const currentStreamerUsername = user?.username || 'neonstreamer';

  // Active Wizard Step: 1 = Connect (GramJS), 2 = Provide Master KHQR, 3 = Connect Group Listener
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  const goToStep = (nextStep: 1 | 2 | 3) => {
    if (nextStep === activeStep) return;
    setStepDirection(nextStep > activeStep ? 'forward' : 'backward');
    setActiveStep(nextStep);
  };

  // ================================================================
  // STEP 1 STATE: GramJS MTProto User Client Connection (Phone & QR)
  // ================================================================
  const [loginMethod, setLoginMethod] = useState<'qr' | 'phone'>('qr');
  const [userPhone, setUserPhone] = useState('+855');
  const [userApiId, setUserApiId] = useState('');
  const [userApiHash, setUserApiHash] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // GramJS QR Code Login State
  const [qrUrl, setQrUrl] = useState<string>('');
  const [qrExpiresAt, setQrExpiresAt] = useState<number>(0);
  const [qrCountdown, setQrCountdown] = useState<number>(0);
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [qrNeedPassword, setQrNeedPassword] = useState<boolean>(false);
  const [qrTwoFaPassword, setQrTwoFaPassword] = useState<string>('');
  const [qrSubmittingPassword, setQrSubmittingPassword] = useState<boolean>(false);

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
  // STEP 2 STATE: Create KHQR Data (Multiple Currency & Media Picker)
  // ================================================================
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(null);
  const [khqrItems, setKhqrItems] = useState<KhqrItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingKhqrItem, setSavingKhqrItem] = useState(false);
  const [step2Msg, setStep2Msg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ''
  });

  // Create / Edit KHQR Modal State
  const [isKhqrModalOpen, setIsKhqrModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [editingKhqrItem, setEditingKhqrItem] = useState<KhqrItem | null>(null);
  const [modalCurrency, setModalCurrency] = useState<'USD' | 'KHR'>('USD');
  const [modalAmount, setModalAmount] = useState<string>('1');
  const [modalSelectedImageUrl, setModalSelectedImageUrl] = useState<string>('');
  const [modalSelectedFilename, setModalSelectedFilename] = useState<string>('');
  const [uploadedMediaImages, setUploadedMediaImages] = useState<MediaItem[]>([]);
  const [loadingMediaImages, setLoadingMediaImages] = useState(false);
  const [uploadingNewMedia, setUploadingNewMedia] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const mediaUploadInputRef = useRef<HTMLInputElement>(null);

  const USD_PRESET_AMOUNTS = [1, 2, 5, 10, 20, 50];
  const KHR_PRESET_AMOUNTS = [2000, 4000, 8000, 10000, 20000, 40000];

  // Custom KHQR Upload State (Strictly 1 image allowed per client account)
  const [customKhqrImageUrl, setCustomKhqrImageUrl] = useState<string>('');
  const [customKhqrFilename, setCustomKhqrFilename] = useState<string>('');
  const [customKhqrFileSize, setCustomKhqrFileSize] = useState<number>(0);
  const [isUploadingCustomKhqr, setIsUploadingCustomKhqr] = useState<boolean>(false);
  const [isCustomKhqrMediaPickerOpen, setIsCustomKhqrMediaPickerOpen] = useState<boolean>(false);
  const [customKhqrError, setCustomKhqrError] = useState<string | null>(null);
  const [customKhqrSuccess, setCustomKhqrSuccess] = useState<string | null>(null);
  const customKhqrFileInputRef = useRef<HTMLInputElement>(null);
  const [isCustomKhqrDragOver, setIsCustomKhqrDragOver] = useState<boolean>(false);

  // ================================================================
  // STEP 3 STATE: Target Telegram Groups & Group Link Listener
  // ================================================================
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [availableDialogs, setAvailableDialogs] = useState<AvailableDialog[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [connectingGroupId, setConnectingGroupId] = useState<string | null>(null);
  const [step3Msg, setStep3Msg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group directory search state & 5-item progressive scroll pagination
  const [groupSearchInput, setGroupSearchInput] = useState('');
  const [activeGroupSearch, setActiveGroupSearch] = useState('');
  const [visibleGroupCount, setVisibleGroupCount] = useState(5);

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
  // Initial Data Fetching
  // ----------------------------------------------------------------
  const fetchGatewayConfig = async (): Promise<GatewayConfig | null> => {
    try {
      setLoadingConfig(true);
      const res = await authFetch('/api/payment-gateway/config');
      const data = await res.json();
      if (res.ok && data.success) {
        setGatewayConfig(data.config);
        setKhqrItems(Array.isArray(data.config?.khqrItems) ? data.config.khqrItems : []);
        if (data.config?.customKhqrImageUrl) {
          setCustomKhqrImageUrl(data.config.customKhqrImageUrl);
          setCustomKhqrFilename(data.config.customKhqrFilename || '');
          setCustomKhqrFileSize(data.config.customKhqrFileSize || 0);
        } else {
          setCustomKhqrImageUrl('');
          setCustomKhqrFilename('');
          setCustomKhqrFileSize(0);
        }
        return data.config as GatewayConfig;
      }
    } catch (e) {
      console.error('Error fetching gateway config:', e);
    } finally {
      setLoadingConfig(false);
    }
    return null;
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

  const fetchTargetGroups = async (): Promise<TargetGroup[]> => {
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
            return [];
          }
        }

        setTargetGroups(serverGroups);
        const combined = [...apiDialogs];

        // Ensure all connected groups in DB are present in availableDialogs list without duplicates
        for (const g of serverGroups) {
          if (g.chat_id && !combined.some((c) => isGroupConnected(c, [g]))) {
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
          if (!combined.some((c) => isGroupConnected(c, [{ id: p.id, streamer_id: '', chat_id: p.id, title: p.title, username: p.username, created_at: '' }]))) {
            combined.push(p);
          }
        }
        setAvailableDialogs(combined);
        return serverGroups;
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
    return [];
  };

  useEffect(() => {
    let isMounted = true;

    const initializeGateway = async () => {
      try {
        const [config, status] = await Promise.all([
          fetchGatewayConfig(),
          fetchUserClientStatus()
        ]);

        if (!isMounted) return;

        let groups: TargetGroup[] = [];
        if (status?.isConnected) {
          groups = await fetchTargetGroups();
          if (!isMounted) return;
        }

        // Direct smart step selection based on verified backend status
        const hasKhqrData = Boolean(
          (Array.isArray(config?.khqrItems) && config.khqrItems.length > 0) ||
          Boolean(config?.customKhqrImageUrl)
        );
        if (!status?.isConnected) {
          setActiveStep(1);
        } else if (!hasKhqrData) {
          setActiveStep(2);
        } else {
          setActiveStep(3);
        }
      } catch (err) {
        console.error('Error during payment gateway initial verification:', err);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    initializeGateway();

    // 15s fallback timer so UI never freezes indefinitely only in case of network drop
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsInitialLoading(false);
    }, 15000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
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
  const isStep2Done = Boolean((Array.isArray(khqrItems) && khqrItems.length > 0) || Boolean(customKhqrImageUrl));
  const isStep3Done = Boolean(userClientStatus.isConnected && targetGroups.length > 0);

  const completedStepsCount = (isStep1Done ? 1 : 0) + (isStep2Done ? 1 : 0) + (isStep3Done ? 1 : 0);
  const isPaymentGatewayIncomplete = !isStep1Done || !isStep2Done || !isStep3Done;

  // Propagate incomplete status upwards to Dashboard navigation and global events
  useEffect(() => {
    // CRITICAL: Await initial loading before firing any status change to avoid false alerts or premature flashes
    if (isInitialLoading) return;

    if (onStatusChange) {
      onStatusChange(isPaymentGatewayIncomplete);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('payment-gateway-status', {
          detail: {
            isIncomplete: isPaymentGatewayIncomplete,
            isComplete: !isPaymentGatewayIncomplete,
            completedStepsCount,
            steps: {
              gramjs: isStep1Done,
              khqr: isStep2Done,
              group: isStep3Done
            }
          }
        })
      );
    }
  }, [isInitialLoading, isPaymentGatewayIncomplete, isStep1Done, isStep2Done, isStep3Done, completedStepsCount, onStatusChange]);

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

  // ----------------------------------------------------------------
  // STEP 1 QR HANDLERS: GramJS QR Code Generation & Scan Polling
  // ----------------------------------------------------------------
  const startQrCodeSession = async (forceRefresh = false) => {
    setStep1Msg(null);
    setQrLoading(true);
    try {
      const res = await authFetch('/api/telegram/user/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiId: userApiId.trim() || undefined,
          apiHash: userApiHash.trim() || undefined,
          forceRefresh
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStep1Msg({ type: 'error', text: data.error || 'Failed to generate Telegram QR code.' });
        return;
      }

      if (data.status === 'authenticated') {
        setQrUrl('');
        setQrNeedPassword(false);
        setQrTwoFaPassword('');
        setStep1Msg({ type: 'success', text: data.message || 'Connected via Telegram QR!' });
        goToStep(2);
        await fetchUserClientStatus();
        await fetchTargetGroups();
        return;
      }

      if (data.status === 'need_password') {
        setQrNeedPassword(true);
        return;
      }

      if (data.qrUrl) {
        setQrUrl(data.qrUrl);
        setQrExpiresAt(data.expiresAt || Date.now() + 30000);
        setQrNeedPassword(false);
      }
    } catch (err: any) {
      setStep1Msg({ type: 'error', text: err.message || 'Network error generating QR code.' });
    } finally {
      setQrLoading(false);
    }
  };

  const handleSwitchLoginMethod = (method: 'phone' | 'qr') => {
    if (method === loginMethod) return;
    setStep1Msg(null);
    setLoginMethod(method);
    if (method === 'phone') {
      setQrUrl('');
      setQrNeedPassword(false);
      setQrTwoFaPassword('');
      authFetch('/api/telegram/user/qr-login', { method: 'DELETE' }).catch(() => {});
    }
  };

  const handleSubmitQrPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrTwoFaPassword.trim()) {
      setStep1Msg({ type: 'error', text: 'Please enter your Telegram 2FA password.' });
      return;
    }
    setStep1Msg(null);
    setQrSubmittingPassword(true);
    try {
      const res = await authFetch('/api/telegram/user/qr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'password',
          password: qrTwoFaPassword.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.status === 'authenticated') {
        setQrUrl('');
        setQrNeedPassword(false);
        setQrTwoFaPassword('');
        setStep1Msg({ type: 'success', text: data.message || 'Connected via Telegram QR!' });
        goToStep(2);
        await fetchUserClientStatus();
        await fetchTargetGroups();
      } else {
        setStep1Msg({ type: 'error', text: data.error || 'Failed to verify 2FA password.' });
      }
    } catch (err: any) {
      setStep1Msg({ type: 'error', text: err.message || 'Error verifying 2FA password.' });
    } finally {
      setQrSubmittingPassword(false);
    }
  };

  // Auto-generate QR code & poll scan status while QR tab is active on Step 1
  useEffect(() => {
    if (activeStep !== 1 || loginMethod !== 'qr' || userClientStatus.isConnected) {
      return;
    }

    let cancelled = false;
    if (!qrUrl && !qrNeedPassword) {
      startQrCodeSession(false);
    }

    const pollInterval = setInterval(async () => {
      if (cancelled || qrNeedPassword || qrSubmittingPassword) return;
      try {
        const res = await authFetch('/api/telegram/user/qr-login');
        if (!res.ok || cancelled) return;
        const data = await res.json();

        if (data.status === 'authenticated' || data.isConnected) {
          if (cancelled) return;
          setQrUrl('');
          setQrNeedPassword(false);
          setQrTwoFaPassword('');
          setStep1Msg({ type: 'success', text: data.message || 'Connected via Telegram QR!' });
          goToStep(2);
          await fetchUserClientStatus();
          await fetchTargetGroups();
        } else if (data.status === 'need_password') {
          if (!cancelled) setQrNeedPassword(true);
        } else if (data.status === 'waiting' && data.qrUrl) {
          if (!cancelled) {
            setQrUrl(data.qrUrl);
            if (data.expiresAt) setQrExpiresAt(data.expiresAt);
          }
        } else if (data.status === 'idle' && !qrLoading) {
          if (!cancelled) startQrCodeSession(false);
        }
      } catch (_) {}
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, [activeStep, loginMethod, userClientStatus.isConnected, qrNeedPassword, qrSubmittingPassword]);

  // Live 1-second QR token expiry countdown
  useEffect(() => {
    if (!qrExpiresAt || loginMethod !== 'qr' || userClientStatus.isConnected) {
      setQrCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((qrExpiresAt - Date.now()) / 1000));
      setQrCountdown(remaining);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [qrExpiresAt, loginMethod, userClientStatus.isConnected]);

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
  // STEP 2 HANDLERS: Create / Edit / Delete KHQR Items & Media Picker
  // ----------------------------------------------------------------
  const loadUploadedMediaImages = async (force = false) => {
    setLoadingMediaImages(true);
    try {
      const data = await mediaService.fetchMedia({ force });
      const allMedia = data.media || [];
      const imagesOnly = allMedia.filter((m) => isImageAsset(m));
      setUploadedMediaImages(imagesOnly);
    } catch (e) {
      console.error('Error loading uploaded media images:', e);
    } finally {
      setLoadingMediaImages(false);
    }
  };

  const handleOpenCreateKhqrModal = (defaultCurrency: 'USD' | 'KHR' = 'USD', itemToEdit?: KhqrItem) => {
    setModalError(null);
    if (itemToEdit) {
      setEditingKhqrItem(itemToEdit);
      setModalCurrency(itemToEdit.currency);
      setModalAmount(String(itemToEdit.amount));
      setModalSelectedImageUrl(itemToEdit.imageUrl);
      setModalSelectedFilename(itemToEdit.filename || '');
    } else {
      setEditingKhqrItem(null);
      setModalCurrency(defaultCurrency);
      setModalAmount(defaultCurrency === 'USD' ? '1' : '4000');
      setModalSelectedImageUrl('');
      setModalSelectedFilename('');
    }
    setIsKhqrModalOpen(true);
    loadUploadedMediaImages(false);
  };

  const handleModalCurrencyChange = (nextCurr: 'USD' | 'KHR') => {
    if (nextCurr === modalCurrency) return;
    setModalCurrency(nextCurr);
    if (!editingKhqrItem) {
      setModalAmount(nextCurr === 'USD' ? '1' : '4000');
    }
  };

  const handleUploadNewMediaInModal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModalError(null);
    setUploadingNewMedia(true);
    try {
      const result = await mediaService.uploadMedia(file);
      await loadUploadedMediaImages(true);
      if (result.media?.url) {
        setModalSelectedImageUrl(result.media.url);
        setModalSelectedFilename(result.media.filename || file.name);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to upload image to Media Library');
    } finally {
      setUploadingNewMedia(false);
      if (mediaUploadInputRef.current) {
        mediaUploadInputRef.current.value = '';
      }
    }
  };

  const handleSaveKhqrModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setStep2Msg(null);

    const parsedAmount = parseFloat(modalAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setModalError('Please enter or tick a valid amount greater than 0.');
      return;
    }

    if (!modalSelectedImageUrl.trim()) {
      setModalError('Please select a KHQR image from your uploaded media.');
      return;
    }

    setSavingKhqrItem(true);
    try {
      const itemPayload: KhqrItem = {
        id: editingKhqrItem ? editingKhqrItem.id : `khqr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: parsedAmount,
        currency: modalCurrency,
        imageUrl: modalSelectedImageUrl.trim(),
        filename: modalSelectedFilename || undefined,
        createdAt: editingKhqrItem?.createdAt || new Date().toISOString()
      };

      const res = await authFetch('/api/payment-gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          item: itemPayload
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updatedList: KhqrItem[] = Array.isArray(data.khqrItems) ? data.khqrItems : [];
        setKhqrItems(updatedList);
        if (data.config) {
          setGatewayConfig(data.config);
        }
        setIsKhqrModalOpen(false);
        const formattedLabel =
          modalCurrency === 'KHR'
            ? `${parsedAmount.toLocaleString()} ៛`
            : `$${parsedAmount.toFixed(2)}`;
        setUploadSuccessToast({
          show: true,
          message: `${editingKhqrItem ? 'Updated' : 'Added'} ${formattedLabel} KHQR successfully.`
        });
        setTimeout(() => {
          setUploadSuccessToast((prev) => ({ ...prev, show: false }));
        }, 4000);
      } else {
        setModalError(data.error || 'Failed to save KHQR item.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Network error saving KHQR item.');
    } finally {
      setSavingKhqrItem(false);
    }
  };

  const handleDeleteKhqrItem = (item: KhqrItem) => {
    const formattedAmount =
      item.currency === 'KHR'
        ? `${Number(item.amount).toLocaleString()} ៛ (KHR)`
        : `$${Number(item.amount).toFixed(2)} (USD)`;

    showConfirm({
      title: 'Delete KHQR Amount?',
      message: `Are you sure you want to remove the ${formattedAmount} KHQR option from your donation page?`,
      type: 'danger',
      confirmText: 'Remove KHQR',
      onConfirm: async () => {
        try {
          const res = await authFetch('/api/payment-gateway/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              itemId: item.id
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setKhqrItems(Array.isArray(data.khqrItems) ? data.khqrItems : []);
            if (data.config) setGatewayConfig(data.config);
          }
        } catch (err) {
          console.error('Failed to delete KHQR item:', err);
        }
      }
    });
  };

  // ----------------------------------------------------------------
  // CUSTOM KHQR HANDLERS (Strictly 1 Image Allowed for "Custom" Tip)
  // ----------------------------------------------------------------
  const handleCustomKhqrFileUpload = async (file: File) => {
    if (!file) return;
    setCustomKhqrError(null);
    setCustomKhqrSuccess(null);

    // 1. Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setCustomKhqrError(`File size exceeds 2MB limit (your file is ${sizeMb} MB). Please choose a file under 2MB.`);
      return;
    }

    // 2. Validate MIME type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const ext = file.name.toLowerCase();
    if (!validTypes.includes(file.type.toLowerCase()) && !ext.endsWith('.png') && !ext.endsWith('.jpg') && !ext.endsWith('.jpeg')) {
      setCustomKhqrError('Unsupported format. Please upload PNG or JPG image only.');
      return;
    }

    try {
      setIsUploadingCustomKhqr(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'custom');
      formData.append('isCustom', 'true');

      const res = await authFetch('/api/payment-gateway/upload-khqr?type=custom', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload Custom KHQR image');
      }

      const uploadedUrl = data.customKhqrImageUrl || data.imageUrl;
      setCustomKhqrImageUrl(uploadedUrl);
      setCustomKhqrFilename(data.filename || file.name);
      setCustomKhqrFileSize(data.fileSize || file.size);
      setCustomKhqrSuccess('Custom KHQR image uploaded! It is now visible on your donation page for "Custom" amounts.');
      setUploadSuccessToast({
        show: true,
        message: 'Custom KHQR image uploaded and activated for "Custom" amount!'
      });
      setTimeout(() => {
        setCustomKhqrSuccess(null);
        setUploadSuccessToast((prev) => ({ ...prev, show: false }));
      }, 4500);
      await fetchGatewayConfig();
    } catch (err: any) {
      setCustomKhqrError(err.message || 'Failed to upload Custom KHQR image.');
    } finally {
      setIsUploadingCustomKhqr(false);
      if (customKhqrFileInputRef.current) {
        customKhqrFileInputRef.current.value = '';
      }
    }
  };

  const handleSelectCustomKhqrFromMedia = async (selectedUrl: string, item?: MediaItem) => {
    if (!selectedUrl) return;
    setCustomKhqrError(null);
    setCustomKhqrSuccess(null);
    try {
      setIsUploadingCustomKhqr(true);
      const filename = item?.filename || selectedUrl.split('/').pop() || 'custom-khqr.png';
      const fileSize = item?.fileSize || 0;

      const res = await authFetch('/api/payment-gateway/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_custom_khqr',
          imageUrl: selectedUrl,
          filename,
          fileSize
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to set Custom KHQR image');
      }

      setCustomKhqrImageUrl(selectedUrl);
      setCustomKhqrFilename(filename);
      setCustomKhqrFileSize(fileSize);
      setIsCustomKhqrMediaPickerOpen(false);
      setCustomKhqrSuccess('Custom KHQR image selected! It is now visible on your donation page for "Custom" amounts.');
      setUploadSuccessToast({
        show: true,
        message: 'Custom KHQR image selected for "Custom" amount!'
      });
      setTimeout(() => {
        setCustomKhqrSuccess(null);
        setUploadSuccessToast((prev) => ({ ...prev, show: false }));
      }, 4500);
      await fetchGatewayConfig();
    } catch (err: any) {
      setCustomKhqrError(err.message || 'Failed to select Custom KHQR image from Media Library.');
    } finally {
      setIsUploadingCustomKhqr(false);
    }
  };

  const handleRemoveCustomKhqr = () => {
    showConfirm({
      title: 'Remove Custom KHQR Image?',
      message: 'Are you sure you want to remove your Custom KHQR image? The "Custom" amount option will be hidden on your donation page until you upload a new image.',
      type: 'danger',
      confirmText: 'Remove Image',
      onConfirm: async () => {
        try {
          setIsUploadingCustomKhqr(true);
          setCustomKhqrError(null);
          const res = await authFetch('/api/payment-gateway/upload-khqr?type=custom', {
            method: 'DELETE'
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to remove Custom KHQR image');
          }
          setCustomKhqrImageUrl('');
          setCustomKhqrFilename('');
          setCustomKhqrFileSize(0);
          setCustomKhqrSuccess('Custom KHQR image removed from your account.');
          setTimeout(() => setCustomKhqrSuccess(null), 4000);
          await fetchGatewayConfig();
        } catch (err: any) {
          setCustomKhqrError(err.message || 'Failed to remove Custom KHQR image.');
        } finally {
          setIsUploadingCustomKhqr(false);
        }
      }
    });
  };

  // ----------------------------------------------------------------
  // STEP 3 HANDLERS: Manage Telegram Target Groups & Listener Cards
  // ----------------------------------------------------------------
  const handlePromptDisconnectGroup = (dialog: AvailableDialog) => {
    const existing = targetGroups.find((g) => isGroupConnected(dialog, [g]));
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
          const targetId = existing.id || '';
          const targetChatId = existing.chat_id || dialog.id || '';
          const res = await authFetch(`/api/telegram/groups?id=${encodeURIComponent(targetId)}&chatId=${encodeURIComponent(targetChatId)}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setStep3Msg({ type: 'success', text: `Disconnected "${dialog.title}" from listener.` });
            setTargetGroups((prev) => prev.filter((g) => g.id !== existing.id && !isGroupConnected(dialog, [g])));
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
            const newGroup: TargetGroup = data.group || {
              id: dialog.id,
              streamer_id: '',
              chat_id: dialog.id,
              title: dialog.title,
              username: dialog.username,
              created_at: new Date().toISOString()
            };
            setTargetGroups((prev) => [newGroup, ...prev.filter((g) => !isGroupConnected(dialog, [g]))]);
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

  if (isInitialLoading) {
    return <PaymentGatewaySkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* ACTION REQUIRED BANNER (SIMPLE, NO ANIMATION)                  */}
      {/* ============================================================== */}
      {isPaymentGatewayIncomplete && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-rose-400 min-w-0">
            <AlertCircle size={18} className="text-rose-500 flex-shrink-0 stroke-[2.5]" />
            <span className="text-sm font-bold font-['Chakra_Petch'] tracking-wide uppercase text-rose-400">
              Action Required
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isStep1Done ? (
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-['Chakra_Petch']"
              >
                <span>Connect</span>
              </button>
            ) : !isStep2Done ? (
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-['Chakra_Petch']"
              >
                <span>Create KHQR</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-['Chakra_Petch']"
              >
                <span>Connect Group</span>
              </button>
            )}
          </div>
        </div>
      )}

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
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative ${
                isStep1Done
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20'
                  : activeStep === 1
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.6)] ring-4 ring-cyan-400/30 scale-105'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {isStep1Done ? <Check size={18} className="stroke-[3]" /> : '1'}
              {!isStep1Done && (
                <span
                  title="Action Required: GramJS client disconnected"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center ring-2 ring-[#090D18]"
                >
                  <AlertCircle size={10} className="stroke-[3]" />
                </span>
              )}
            </div>

            <div className="mt-2.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 1
                    ? 'text-cyan-400'
                    : isStep1Done
                    ? 'text-emerald-400'
                    : 'text-rose-400'
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
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative ${
                isStep2Done
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20'
                  : activeStep === 2
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.6)] ring-4 ring-cyan-400/30 scale-105'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {isStep2Done ? <Check size={18} className="stroke-[3]" /> : '2'}
              {!isStep2Done && (
                <span
                  title="Action Required: KHQR data missing"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center ring-2 ring-[#090D18]"
                >
                  <AlertCircle size={10} className="stroke-[3]" />
                </span>
              )}
            </div>

            <div className="mt-2.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 2
                    ? 'text-cyan-400'
                    : isStep2Done
                    ? 'text-emerald-400'
                    : 'text-rose-400'
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
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative ${
                isStep3Done
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-4 ring-emerald-500/20'
                  : activeStep === 3
                  ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.6)] ring-4 ring-cyan-400/30 scale-105'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {isStep3Done ? <Check size={18} className="stroke-[3]" /> : '3'}
              {!isStep3Done && (
                <span
                  title="Action Required: Telegram bank group not connected"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center ring-2 ring-[#090D18]"
                >
                  <AlertCircle size={10} className="stroke-[3]" />
                </span>
              )}
            </div>

            <div className="mt-2.5">
              <span
                className={`text-xs font-bold font-['Chakra_Petch'] tracking-wide block uppercase ${
                  activeStep === 3
                    ? 'text-cyan-400'
                    : isStep3Done
                    ? 'text-emerald-400'
                    : 'text-rose-400'
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
                  className="font-bold shadow-lg shadow-cyan-400/20 whitespace-nowrap cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            /* Login Form: Phone Number (OTP) OR GramJS QR Code */
            <div className="space-y-4">
              {/* Connection Method Segmented Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#070A13] border border-slate-800/90">
                <button
                  type="button"
                  onClick={() => handleSwitchLoginMethod('qr')}
                  className={`py-2.5 px-3 rounded-xl font-['Chakra_Petch'] font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loginMethod === 'qr'
                      ? 'bg-cyan-400 text-slate-950 shadow-[0_0_16px_rgba(0,240,255,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/70'
                  }`}
                >
                  <QrCode size={14} />
                  <span>QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchLoginMethod('phone')}
                  className={`py-2.5 px-3 rounded-xl font-['Chakra_Petch'] font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    loginMethod === 'phone'
                      ? 'bg-cyan-400 text-slate-950 shadow-[0_0_16px_rgba(0,240,255,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/70'
                  }`}
                >
                  <Phone size={14} />
                  <span>Phone</span>
                </button>
              </div>

              {loginMethod === 'qr' ? (
                /* GramJS Live QR Code Login Card */
                qrNeedPassword ? (
                  <form
                    onSubmit={handleSubmitQrPassword}
                    className="p-6 rounded-2xl bg-[#090D18] border border-amber-500/40 space-y-5 animate-fadeIn shadow-2xl"
                  >
                    <div className="space-y-1.5 text-center flex flex-col items-center">
                      <label className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center justify-center gap-2">
                        <KeyRound size={14} />
                        <span>Two-Step Verification (2FA)</span>
                      </label>
                      <p className="text-[11px] text-slate-400 font-mono text-center max-w-sm">
                        QR scan succeeded! Your Telegram account has a Cloud Password enabled — enter it below to finish connecting.
                      </p>
                    </div>

                    <input
                      type="password"
                      required
                      autoFocus
                      value={qrTwoFaPassword}
                      onChange={(e) => setQrTwoFaPassword(e.target.value)}
                      placeholder="Enter your Telegram 2FA password"
                      className="w-full py-3 px-4 rounded-xl bg-slate-950 border border-amber-500/40 text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setQrNeedPassword(false);
                          setQrTwoFaPassword('');
                          startQrCodeSession(true);
                        }}
                        className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        &larr; Back to QR Code
                      </button>

                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        loading={qrSubmittingPassword}
                        className="font-bold px-6 shadow-lg shadow-cyan-400/20"
                      >
                        Verify &amp; Connect
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5 animate-fadeIn">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-8">
                      {/* QR Code Frame */}
                      <div className="flex flex-col items-center gap-2.5 flex-shrink-0">
                        <div className="relative w-52 h-52 rounded-2xl bg-white p-3.5 border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(0,240,255,0.2)] flex items-center justify-center">
                          {qrLoading && !qrUrl ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-slate-700">
                              <RefreshCw size={26} className="animate-spin text-cyan-600" />
                              <span className="text-[11px] font-mono font-bold text-slate-600">
                                Generating QR...
                              </span>
                            </div>
                          ) : qrUrl ? (
                            <>
                              <QRCodeSVG
                                value={qrUrl}
                                size={180}
                                level="M"
                                includeMargin={false}
                              />
                              {/* Centered Telegram Logo Badge */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md flex items-center justify-center">
                                  <TelegramIcon className="w-8 h-8 text-[#0088cc]" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startQrCodeSession(true)}
                              className="flex flex-col items-center gap-2 text-slate-700 hover:text-cyan-600 transition-colors cursor-pointer"
                            >
                              <RefreshCw size={24} />
                              <span className="text-xs font-mono font-bold">Generate QR</span>
                            </button>
                          )}
                        </div>

                        {/* Live Expiry & Manual Refresh Row */}
                        <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-400">
                          {qrUrl && (
                            <span>
                              Auto-refreshes in{' '}
                              <span className="text-cyan-400 font-bold">{qrCountdown}s</span>
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={qrLoading}
                            onClick={() => startQrCodeSession(true)}
                            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold disabled:opacity-50 cursor-pointer"
                          >
                            <RefreshCw size={11} className={qrLoading ? 'animate-spin' : ''} />
                            <span>Refresh</span>
                          </button>
                        </div>
                      </div>

                      {/* Simple Scan Steps 1, 2, 3 */}
                      <div className="flex flex-col gap-2 max-w-sm w-full">
                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                            1
                          </span>
                          <span className="text-slate-300">
                            Open <strong className="text-white">Telegram</strong> on your phone
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                            2
                          </span>
                          <span className="text-slate-300">
                            Go to <strong className="text-white">Settings</strong> &gt; <strong className="text-white">Devices</strong> &gt; <strong className="text-cyan-400">Link Desktop Device</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs font-mono">
                          <span className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                            3
                          </span>
                          <span className="text-slate-300">
                            Scan this QR code to connect
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : !codeRequested ? (
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
                        ref={(el) => {
                          digitInputRefs.current[idx] = el;
                        }}
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
        {/* STEP 2 CONTENT: "Create KHQR Data (Multiple Currency Sections)"*/}
        {/* ============================================================== */}
        {activeStep === 2 && (() => {
          const usdKhqrItems = khqrItems
            .filter((item) => item.currency === 'USD')
            .sort((a, b) => Number(a.amount) - Number(b.amount));
          const khrKhqrItems = khqrItems
            .filter((item) => item.currency === 'KHR')
            .sort((a, b) => Number(a.amount) - Number(b.amount));

          return (
            <div className="rounded-2xl bg-[#090D18] border border-cyan-500/30 p-5 sm:p-7 space-y-6 shadow-lg shadow-cyan-500/5">
              {step2Msg && step2Msg.type === 'error' && (
                <div className="p-3.5 rounded-xl border text-xs flex items-center gap-2 bg-red-950/40 border-red-500/30 text-red-300">
                  <AlertCircle size={16} />
                  <span>{step2Msg.text}</span>
                </div>
              )}

              {/* Top Header Bar: Title & Create KHQR Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <QrCode size={17} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] tracking-wide">
                      KHQR Payment Amounts
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      {khqrItems.length + (customKhqrImageUrl ? 1 : 0)} Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-sans">
                    Manage your USD ($), KHR (៛), and Custom KHQR payment codes from your Media Library.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                  {(khqrItems.length > 0 || Boolean(customKhqrImageUrl)) && (
                    <button
                      type="button"
                      onClick={() => window.open(`/@${currentStreamerUsername}`, '_blank', 'noopener,noreferrer')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      <span>View Tip Page</span>
                      <ExternalLink size={13} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenCreateKhqrModal('USD')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm font-mono shadow-md shadow-cyan-500/15 transition-all cursor-pointer shrink-0"
                  >
                    <Plus size={15} />
                    <span>Create KHQR</span>
                  </button>
                </div>
              </div>

              {/* Currency & Custom KHQR List Sections */}
              <div className="space-y-6">
                {/* ============================================================ */}
                {/* SECTION 1: USD ($) CURRENCY KHQR SECTION                     */}
                {/* ============================================================ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
                        $
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                            USD ($) KHQR List
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                            {usdKhqrItems.length} {usdKhqrItems.length === 1 ? 'Item' : 'Items'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          US Dollar payment QR codes displayed when donor selects USD ($)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCreateKhqrModal('USD')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={13} />
                      <span>Add USD ($)</span>
                    </button>
                  </div>

                  {usdKhqrItems.length === 0 ? (
                    <div className="py-5 px-4 rounded-xl bg-slate-950/50 text-center space-y-1.5 border border-dashed border-slate-800">
                      <p className="text-xs text-slate-400 font-mono">No USD ($) KHQR amounts created yet.</p>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateKhqrModal('USD')}
                        className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Create first USD ($) KHQR</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {usdKhqrItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 sm:px-4 sm:py-3 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 sm:gap-4 relative group"
                        >
                          <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-gradient-to-b from-cyan-400 to-emerald-400 rounded-r" />

                          {/* Left: Small KHQR Thumbnail + Amount & Filename */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pl-1">
                            <div
                              onClick={() => handleOpenCreateKhqrModal('USD', item)}
                              className="w-11 h-11 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer border border-slate-700/60 shadow-sm"
                            >
                              <img
                                src={item.imageUrl}
                                alt={`$${item.amount} USD KHQR`}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold font-mono text-white">
                                  ${Number(item.amount).toFixed(2)}{' '}
                                  <span className="text-xs text-cyan-400">USD</span>
                                </span>

                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                                  <Check size={10} className="stroke-[3]" />
                                  <span>Active</span>
                                </span>
                              </div>

                              <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                {item.filename || 'Media Library KHQR'}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateKhqrModal('USD', item)}
                              title="Edit KHQR"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500/15 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit2 size={12} />
                              <span className="hidden xs:inline">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKhqrItem(item)}
                              title="Delete KHQR"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ============================================================ */}
                {/* SECTION 2: KHR (៛) CURRENCY KHQR SECTION                     */}
                {/* ============================================================ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
                        ៛
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                            KHR (៛) KHQR List
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            {khrKhqrItems.length} {khrKhqrItems.length === 1 ? 'Item' : 'Items'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Khmer Riel payment QR codes displayed when donor selects KHR (៛)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCreateKhqrModal('KHR')}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={13} />
                      <span>Add KHR (៛)</span>
                    </button>
                  </div>

                  {khrKhqrItems.length === 0 ? (
                    <div className="py-5 px-4 rounded-xl bg-slate-950/50 text-center space-y-1.5 border border-dashed border-slate-800">
                      <p className="text-xs text-slate-400 font-mono">No KHR (៛) KHQR amounts created yet.</p>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateKhqrModal('KHR')}
                        className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Create first KHR (៛) KHQR</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {khrKhqrItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 sm:px-4 sm:py-3 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 sm:gap-4 relative group"
                        >
                          <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-r" />

                          {/* Left: Small KHQR Thumbnail + Amount & Filename */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1 pl-1">
                            <div
                              onClick={() => handleOpenCreateKhqrModal('KHR', item)}
                              className="w-11 h-11 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer border border-slate-700/60 shadow-sm"
                            >
                              <img
                                src={item.imageUrl}
                                alt={`${item.amount} KHR KHQR`}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold font-mono text-white">
                                  {Number(item.amount).toLocaleString()} ៛{' '}
                                  <span className="text-xs text-emerald-400">KHR</span>
                                </span>

                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                                  <Check size={10} className="stroke-[3]" />
                                  <span>Active</span>
                                </span>
                              </div>

                              <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                {item.filename || 'Media Library KHQR'}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateKhqrModal('KHR', item)}
                              title="Edit KHQR"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500/15 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Edit2 size={12} />
                              <span className="hidden xs:inline">Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKhqrItem(item)}
                              title="Delete KHQR"
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ============================================================ */}
                {/* SECTION 3: CUSTOM KHQR SECTION                               */}
                {/* ============================================================ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono font-black text-sm flex items-center justify-center shrink-0">
                        <QrCode size={15} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">
                            Custom KHQR
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 border border-purple-500/30 text-purple-400">
                            {customKhqrImageUrl ? '1 Item' : '0 Items'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Payment QR code displayed when donor selects Custom
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isUploadingCustomKhqr}
                      onClick={() => setIsCustomKhqrMediaPickerOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {customKhqrImageUrl ? <Edit2 size={13} /> : <Plus size={13} />}
                      <span>{customKhqrImageUrl ? 'Change Custom' : 'Select Custom'}</span>
                    </button>
                  </div>

                  {customKhqrError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 font-mono">
                      <AlertCircle size={15} className="shrink-0 text-red-400" />
                      <span>{customKhqrError}</span>
                    </div>
                  )}

                  {!customKhqrImageUrl ? (
                    <div className="py-5 px-4 rounded-xl bg-slate-950/50 text-center space-y-1.5 border border-dashed border-slate-800">
                      <p className="text-xs text-slate-400 font-mono">No Custom KHQR selected yet.</p>
                      <button
                        type="button"
                        onClick={() => setIsCustomKhqrMediaPickerOpen(true)}
                        className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Choose Custom KHQR from Media Library</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 sm:px-4 sm:py-3 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 sm:gap-4 relative group">
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-r" />

                        {/* Left: Small KHQR Thumbnail + Custom Badge & Filename */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pl-1">
                          <div
                            onClick={() => setIsCustomKhqrMediaPickerOpen(true)}
                            className="w-11 h-11 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer border border-slate-700/60 shadow-sm"
                          >
                            <img
                              src={customKhqrImageUrl}
                              alt="Custom KHQR"
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold font-mono text-white">
                                Custom Amount{' '}
                                <span className="text-xs text-purple-400">KHQR</span>
                              </span>

                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                                <Check size={10} className="stroke-[3]" />
                                <span>Active</span>
                              </span>
                            </div>

                            <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                              {customKhqrFilename || 'Media Library KHQR'}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsCustomKhqrMediaPickerOpen(true)}
                            title="Choose from Media Library"
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500/15 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit2 size={12} />
                            <span className="hidden xs:inline">Change</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveCustomKhqr}
                            title="Delete KHQR"
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                  <span>Continue</span>
                  <ArrowRight size={15} className="ml-1" />
                </Button>
              </div>
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* STEP 3 CONTENT: "Connect to Group via Link Telegram"           */}
        {/* ============================================================== */}
        {activeStep === 3 && (
          <div className="rounded-2xl bg-[#090D18] border border-cyan-500/30 p-5 sm:p-7 space-y-4 shadow-lg shadow-cyan-500/5">
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
              <div className="py-12 px-6 text-center space-y-5 rounded-2xl bg-[#070A14] border border-amber-500/30">
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
              <div className="space-y-4">
                {/* Search Bar (Search strictly by Group Name upon pressing Enter) & Refresh Button */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setActiveGroupSearch(groupSearchInput.trim());
                    setVisibleGroupCount(5);
                  }}
                  className="flex items-center gap-2.5"
                >
                  <div className="relative flex-1 group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 pointer-events-none transition-colors">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      value={groupSearchInput}
                      onChange={(e) => setGroupSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setActiveGroupSearch(groupSearchInput.trim());
                          setVisibleGroupCount(5);
                        }
                      }}
                      placeholder="Type group name and press Enter to search..."
                      className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl bg-slate-950/90 hover:bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                    />
                    {groupSearchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setGroupSearchInput('');
                          setActiveGroupSearch('');
                          setVisibleGroupCount(5);
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    title="Search"
                    className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                  >
                    Search
                  </button>

                  {/* Refresh Button with Icon Only at Top Right */}
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleGroupCount(5);
                      fetchTargetGroups();
                    }}
                    disabled={loadingGroups}
                    title="Refresh Groups"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center cursor-pointer flex-shrink-0 shadow-sm"
                  >
                    <RefreshCw size={15} className={loadingGroups ? 'animate-spin text-cyan-400' : ''} />
                  </button>
                </form>

                {/* 1 GRID ONLY: CLEAN LIST OF TELEGRAM GROUPS WITH 5 PER SCROLL CACHE */}
                {(() => {
                  if (loadingGroups && availableDialogs.length === 0) {
                    return (
                      <div className="space-y-2.5 animate-fadeIn">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3 animate-pulse"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800/80 flex-shrink-0" />
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="w-48 sm:w-64 h-4 rounded bg-slate-800/80" />
                                <div className="w-24 h-2.5 rounded bg-slate-800/50" />
                              </div>
                            </div>
                            <div className="w-24 sm:w-28 h-8 rounded-xl bg-slate-800/70 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Search strictly by group title/name
                  const filtered = availableDialogs.filter((d) => {
                    if (!activeGroupSearch) return true;
                    const q = activeGroupSearch.toLowerCase();
                    return d.title.toLowerCase().includes(q);
                  });

                  // Sort active connected groups strictly to the top
                  const sorted = [...filtered].sort((a, b) => {
                    const aActive = isGroupConnected(a, targetGroups);
                    const bActive = isGroupConnected(b, targetGroups);
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    return 0;
                  });

                  if (sorted.length === 0) {
                    return (
                      <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1 font-mono">
                        <p className="text-white font-bold">No groups match &quot;{activeGroupSearch}&quot;.</p>
                        <p className="text-slate-500">Check the spelling or clear the search input and press Enter.</p>
                      </div>
                    );
                  }

                  const displayedGroups = sorted.slice(0, visibleGroupCount);
                  const hasMoreGroups = sorted.length > visibleGroupCount;

                  return (
                    <div className="space-y-3">
                      <div
                        onScroll={(e) => {
                          const target = e.currentTarget;
                          const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 60;
                          if (atBottom && hasMoreGroups) {
                            setVisibleGroupCount((prev) => Math.min(prev + 5, sorted.length));
                          }
                        }}
                        className="max-h-[520px] overflow-y-auto overscroll-contain pr-1 space-y-2.5 custom-scrollbar"
                      >
                        {displayedGroups.map((dialog) => {
                          const isMonitored = isGroupConnected(dialog, targetGroups);
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

                      {/* Cache pagination footer: loads 5 per scroll/click */}
                      {hasMoreGroups && (
                        <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>
                            Showing {displayedGroups.length} of {sorted.length} groups
                          </span>
                          <button
                            type="button"
                            onClick={() => setVisibleGroupCount((prev) => Math.min(prev + 5, sorted.length))}
                            className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                          >
                            + Load 5 more groups
                          </button>
                        </div>
                      )}
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
            </div>
          </div>
        )}
      </div>

      {/* Simple Side Animation Success Toast (Clean & Minimalist) */}
      <div
        role="alert"
        aria-live="polite"
        className={`fixed z-50 top-4 right-4 sm:top-6 sm:right-6 max-w-[calc(100vw-2rem)] sm:max-w-md transition-all duration-300 ease-out transform pointer-events-auto ${
          uploadSuccessToast.show
            ? 'translate-x-0 opacity-100 shadow-xl shadow-black/50'
            : 'translate-x-[125%] opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0C101C]/95 backdrop-blur-md border border-slate-700/80 text-slate-100 shadow-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />
            <p className="text-xs sm:text-sm font-medium text-white leading-snug">
              {uploadSuccessToast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setUploadSuccessToast((prev) => ({ ...prev, show: false }))}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CREATE / EDIT KHQR AMOUNT MODAL                                 */}
      {/* ============================================================== */}
      <Modal
        isOpen={isKhqrModalOpen}
        onClose={() => !savingKhqrItem && !isMediaPickerOpen && setIsKhqrModalOpen(false)}
        title={editingKhqrItem ? 'Edit KHQR Payment Amount' : 'Create KHQR Payment Amount'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveKhqrModal} className="space-y-5">
          {modalError && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span>{modalError}</span>
            </div>
          )}

          {/* 1. CURRENCY TICK SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between">
              <span>1. Currency Tick</span>
              <span className="text-[10px] font-mono text-slate-400">Select KHQR currency</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* USD ($) Tick Card */}
              <button
                type="button"
                onClick={() => handleModalCurrencyChange('USD')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                  modalCurrency === 'USD'
                    ? 'bg-cyan-500/10 border-cyan-400 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg font-mono font-black text-sm flex items-center justify-center shrink-0 ${
                      modalCurrency === 'USD'
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    $
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch']">
                      USD ($)
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      US Dollar
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    modalCurrency === 'USD'
                      ? 'bg-cyan-400 border-cyan-400 text-slate-950 shadow-sm'
                      : 'border-slate-700'
                  }`}
                >
                  {modalCurrency === 'USD' && <Check size={12} className="stroke-[3]" />}
                </div>
              </button>

              {/* KHR (៛) Tick Card */}
              <button
                type="button"
                onClick={() => handleModalCurrencyChange('KHR')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                  modalCurrency === 'KHR'
                    ? 'bg-emerald-500/10 border-emerald-400 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg font-mono font-black text-sm flex items-center justify-center shrink-0 ${
                      modalCurrency === 'KHR'
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    ៛
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch']">
                      KHR (៛)
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      Khmer Riel
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    modalCurrency === 'KHR'
                      ? 'bg-emerald-400 border-emerald-400 text-slate-950 shadow-sm'
                      : 'border-slate-700'
                  }`}
                >
                  {modalCurrency === 'KHR' && <Check size={12} className="stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* 2. AMOUNT TICK & CUSTOM AMOUNT INPUT */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center justify-between">
              <span>2. Amount Tick ({modalCurrency === 'USD' ? 'USD $' : 'KHR ៛'})</span>
              <span className="text-[10px] font-mono text-slate-400">Tick a preset or type custom amount</span>
            </label>

            {/* Quick-Tick Preset Amount Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(modalCurrency === 'USD' ? USD_PRESET_AMOUNTS : KHR_PRESET_AMOUNTS).map((preset) => {
                const isSelected = Math.abs((parseFloat(modalAmount) || 0) - preset) < 0.001;
                const label = modalCurrency === 'USD' ? `$${preset}` : `${preset.toLocaleString()} ៛`;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setModalAmount(String(preset))}
                    className={`py-2 px-2.5 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-400 border-cyan-400 text-slate-950 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/40'
                    }`}
                  >
                    {isSelected && <Check size={11} className="stroke-[3] shrink-0" />}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input Field */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-cyan-400">
                {modalCurrency === 'USD' ? '$' : '៛'}
              </span>
              <input
                type="number"
                step={modalCurrency === 'USD' ? '0.01' : '100'}
                min={modalCurrency === 'USD' ? '0.01' : '100'}
                required
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                placeholder={modalCurrency === 'USD' ? 'Enter amount (e.g. 1.00)' : 'Enter amount (e.g. 4000)'}
                className="w-full pl-9 pr-24 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-400 text-sm font-mono font-bold text-white focus:outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-slate-400">
                {modalCurrency}
              </span>
            </div>
          </div>

          {/* 3. CHOOSE KHQR IMAGE FROM MEDIA LIBRARY */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-white font-['Chakra_Petch'] flex items-center gap-1.5">
                <ImageIcon size={14} className="text-cyan-400" />
                <span>3. Choose KHQR Image from Media Library</span>
              </label>

              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ImageIcon size={12} />
                <span>{modalSelectedImageUrl ? 'Change Image' : 'Choose from Media Library'}</span>
              </button>
            </div>

            {modalSelectedImageUrl ? (
              <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden border border-slate-700/60 shadow-sm">
                    <img
                      src={modalSelectedImageUrl}
                      alt={modalSelectedFilename || 'Selected KHQR'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                      <Check size={10} className="stroke-[3]" />
                      <span>KHQR Image Selected</span>
                    </div>
                    <p className="text-xs font-mono text-white font-bold truncate">
                      {modalSelectedFilename || modalSelectedImageUrl.split('/').pop() || 'KHQR Image'}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      {modalCurrency === 'KHR'
                        ? `${(parseFloat(modalAmount) || 0).toLocaleString()} ៛ (KHR)`
                        : `$${(parseFloat(modalAmount) || 0).toFixed(2)} (USD)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMediaPickerOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImageIcon size={12} />
                    <span>Change</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalSelectedImageUrl('');
                      setModalSelectedFilename('');
                    }}
                    title="Clear selected image"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(true)}
                className="w-full p-5 rounded-xl bg-slate-950/60 hover:bg-slate-900/80 border border-dashed border-slate-700 hover:border-cyan-500/50 transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <ImageIcon size={18} />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch']">
                    Choose KHQR Image from Media Library
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Select your uploaded Bakong KHQR image from your Media Library
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Live Summary Bar & Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-400 truncate">
              {modalSelectedImageUrl ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Check size={13} className="stroke-[3]" />
                  <span>
                    Selected:{' '}
                    {modalCurrency === 'KHR'
                      ? `${(parseFloat(modalAmount) || 0).toLocaleString()} ៛ KHR`
                      : `$${(parseFloat(modalAmount) || 0).toFixed(2)} USD`}
                  </span>
                </span>
              ) : (
                <span>Choose a KHQR image from Media Library above</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsKhqrModalOpen(false)}
                disabled={savingKhqrItem}
              >
                Cancel
              </Button>
              <button
                type="submit"
                disabled={savingKhqrItem}
                className="px-5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm font-mono shadow-md shadow-cyan-500/15 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check size={14} className="stroke-[2.5]" />
                <span>{editingKhqrItem ? 'Update KHQR' : 'Create KHQR'}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Media Library Picker Modal for KHQR Image Selection */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        currentUrl={modalSelectedImageUrl}
        initialSection="uploads"
        filterMode="image"
        currentPlan={user?.plan}
        isTrialActive={Boolean((user as any)?.isTrialActive)}
        isAdmin={user?.role === 'admin'}
        title="Choose KHQR Image from Media Library"
        subtitle="Select your uploaded Bakong KHQR image from your Media Library."
        onSelect={(selectedUrl, item) => {
          setModalSelectedImageUrl(selectedUrl);
          setModalSelectedFilename(item?.filename || selectedUrl.split('/').pop() || '');
          setModalError(null);
          setIsMediaPickerOpen(false);
        }}
      />

      {/* Media Library Picker Modal for Custom KHQR Image Selection */}
      <MediaPickerModal
        isOpen={isCustomKhqrMediaPickerOpen}
        onClose={() => setIsCustomKhqrMediaPickerOpen(false)}
        currentUrl={customKhqrImageUrl}
        initialSection="uploads"
        filterMode="image"
        currentPlan={user?.plan}
        isTrialActive={Boolean((user as any)?.isTrialActive)}
        isAdmin={user?.role === 'admin'}
        title="Choose Custom KHQR Image from Media Library"
        subtitle="Select 1 Bakong KHQR image to display on your donation page for the 'Custom' amount option."
        onSelect={(selectedUrl, item) => {
          handleSelectCustomKhqrFromMedia(selectedUrl, item);
        }}
      />
    </div>
  );
};
