'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Copy,
  Check,
  ExternalLink,
  Bot,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Sparkles,
  Zap,
  Radio,
  Phone,
  KeyRound,
  Shield,
  HelpCircle,
  LogOut,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Users,
  Plus,
  Trash2,
  Layers
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useModal } from '../../context/ModalContext';

const isChatIdMatch = (id1?: string, id2?: string) => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  const clean1 = s1.replace(/^-100/, '').replace(/^-/, '');
  const clean2 = s2.replace(/^-100/, '').replace(/^-/, '');
  return Boolean(clean1 && clean1 === clean2);
};

const isGroupMatch = (dialog: { id: string; title?: string; username?: string }, group: { id?: string; chat_id: string; title?: string; username?: string }) => {
  if (group.chat_id && isChatIdMatch(group.chat_id, dialog.id)) return true;
  if (group.id && isChatIdMatch(group.id, dialog.id)) return true;
  if (group.username && dialog.username) {
    const u1 = group.username.replace(/^@/, '').trim().toLowerCase();
    const u2 = dialog.username.replace(/^@/, '').trim().toLowerCase();
    if (u1 && u1 === u2) return true;
  }
  if (group.title && dialog.title && group.title.trim().toLowerCase() === dialog.title.trim().toLowerCase()) return true;
  return false;
};

interface TelegramBotCardProps {
  pairingCode?: string;
  isLinked?: boolean;
  botUsername?: string;
}

export const TelegramBotCard: React.FC<TelegramBotCardProps> = ({
  pairingCode = 'NEON-8899',
  botUsername = 'StreamNeonAlertBot'
}) => {
  const { showConfirm, showAlert } = useModal();
  // Navigation active sub-tab: 'phone' (GramJS Login), 'groups' (Target Group Filter), 'simulator' (Testing)
  const [activeMode, setActiveMode] = useState<'phone' | 'groups' | 'simulator'>('phone');

  // ==========================================
  // 1. TelegramJS User Client State (Phone Login)
  // ==========================================
  const [userPhone, setUserPhone] = useState('+855');
  const [userApiId, setUserApiId] = useState('');
  const [userApiHash, setUserApiHash] = useState('');
  const [showApiCreds, setShowApiCreds] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(true);

  // Verification Code Step
  const [codeRequested, setCodeRequested] = useState(false);
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  // Connected User Client Info
  const [userClientStatus, setUserClientStatus] = useState<{
    isConnected: boolean;
    phoneNumber?: string;
    userName?: string;
    monitoredChats: string[];
    isSimulation?: boolean;
  }>({ isConnected: false, monitoredChats: [] });

  const [userStatusMsg, setUserStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ==========================================
  // 2. Target Telegram Groups State (GramJS Target Group Filter)
  // ==========================================
  const [targetGroups, setTargetGroups] = useState<Array<{
    id: string;
    streamer_id: string;
    chat_id: string;
    title: string;
    username?: string;
    created_at: string;
  }>>([]);
  const [availableDialogs, setAvailableDialogs] = useState<Array<{
    id: string;
    title: string;
    username?: string;
    isGroup: boolean;
    isChannel: boolean;
  }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupStatusMsg, setGroupStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dormant bot state for backward compatibility
  const [botToken, setBotToken] = useState('');
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [botMonitoredGroups, setBotMonitoredGroups] = useState<string[]>([]);
  const [connectingBot, setConnectingBot] = useState(false);
  const [botStatusMsg, setBotStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ==========================================
  // 3. Phrase Catcher Simulation State
  // ==========================================
  const samplePresets = [
    {
      label: 'ABA Bank $5.00 SMS Notification',
      text: 'Received $5.00 from SOKHA CHHIM (ABA Bank) on 26-Oct-2026. Ref: 987654. Message: Keep streaming bro! 🔥'
    },
    {
      label: 'Bakong KHQR $25.00 Push Notification',
      text: 'Bakong KHQR Transfer: Received $25.00 from VANDY RATH. Message: Great stream! Ace that round!'
    },
    {
      label: 'ACLEDA Bank $15.00 SMS Notification',
      text: 'ACLEDA Bank: Received $15.00 from SOMNANG. Ref: AC-554433. Note: Pro gamer play!'
    },
    {
      label: 'Wing Bank 40,000 ៛ Notification',
      text: 'Wing Bank: You received 40,000 KHR from CHANTHY. Message: ចាក់សាំងជូនមេ 🇰🇭'
    },
    {
      label: 'Telegram Group Command: /tip $10',
      text: '/tip $10 from David: Awesome gameplay'
    }
  ];

  const [testPhraseText, setTestPhraseText] = useState(samplePresets[0].text);
  const [testingPhrase, setTestingPhrase] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // ------------------------------------------
  // Fetch Target Groups
  // ------------------------------------------
  const fetchTargetGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/telegram/groups');
      if (res.ok) {
        const data = await res.json();
        setTargetGroups(data.groups || []);
        setAvailableDialogs(data.availableDialogs || []);
      }
    } catch (e) {
      console.error('Failed to fetch target groups:', e);
    } finally {
      setLoadingGroups(false);
    }
  };

  // ------------------------------------------
  // Delete Target Group
  // ------------------------------------------
  const handleDeleteTargetGroup = (group: { id?: string; title: string; chat_id: string }) => {
    showConfirm({
      title: 'Remove Target Group?',
      message: `Are you sure you want to remove "${group.title}" (${group.chat_id})? GramJS will stop listening to messages from this group.`,
      type: 'danger',
      confirmText: 'Remove Group',
      onConfirm: async () => {
        try {
          const targetId = group.id || '';
          const targetChatId = group.chat_id || '';
          const res = await fetch(`/api/telegram/groups?id=${encodeURIComponent(targetId)}&chatId=${encodeURIComponent(targetChatId)}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setGroupStatusMsg({ type: 'success', text: `Removed "${group.title}" from target listening.` });
            await fetchTargetGroups();
            await fetchAllStatus();
          } else {
            setGroupStatusMsg({ type: 'error', text: data.error || 'Failed to remove group.' });
          }
        } catch (e: any) {
          setGroupStatusMsg({ type: 'error', text: e.message || 'Error removing group.' });
        }
      }
    });
  };

  const handleQuickAddDialog = async (d: { id: string; title: string; username?: string }) => {
    setGroupStatusMsg(null);
    setAddingGroup(true);
    try {
      const res = await fetch('/api/telegram/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: d.id, title: d.title, username: d.username || undefined })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGroupStatusMsg({ type: 'success', text: `Connected "${d.title}" to listener!` });
        await fetchTargetGroups();
        await fetchAllStatus();
      } else {
        setGroupStatusMsg({ type: 'error', text: data.error || 'Failed to add target group.' });
      }
    } catch (err: any) {
      setGroupStatusMsg({ type: 'error', text: err.message || 'Network error adding group.' });
    } finally {
      setAddingGroup(false);
    }
  };

  // ------------------------------------------
  // Fetch Statuses on Mount
  // ------------------------------------------
  const fetchAllStatus = async () => {
    // 1. Target Groups & Telegram Dialogs
    fetchTargetGroups();

    // 2. User Client Status
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
    } catch (e) {}

    // 3. Bot Status
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setIsBotRunning(data.isRunning);
        setBotInfo(data.bot);
        setBotMonitoredGroups(data.monitoredGroups || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAllStatus();
  }, []);

  // ------------------------------------------
  // TelegramJS: Send Verification Code
  // ------------------------------------------
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserStatusMsg(null);
    setDemoCodeHint(null);

    const clean = userPhone.trim();
    if (!clean || clean === '+855') {
      setUserStatusMsg({ type: 'error', text: 'Please enter a valid Telegram phone number (e.g. +85512345678).' });
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
        if (data.phoneCodeHash) {
          setPhoneCodeHash(data.phoneCodeHash);
        }
        if (data.phoneNumber) {
          setUserPhone(data.phoneNumber);
        }
        setUserStatusMsg({ type: 'success', text: data.message });
        if (data.simulationCode) {
          setDemoCodeHint(data.simulationCode);
          setVerificationCode(data.simulationCode);
        }
      } else {
        setUserStatusMsg({ type: 'error', text: data.error || 'Failed to send verification code.' });
      }
    } catch (err: any) {
      setUserStatusMsg({ type: 'error', text: err.message || 'Network error requesting code.' });
    } finally {
      setSendingCode(false);
    }
  };

  // ------------------------------------------
  // TelegramJS: Verify Code & Connect
  // ------------------------------------------
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserStatusMsg(null);

    if (!verificationCode.trim()) {
      setUserStatusMsg({ type: 'error', text: 'Please enter the 5-digit verification code.' });
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
        setUserStatusMsg({ type: 'success', text: data.message });
        await fetchAllStatus();
      } else if (data.needPassword) {
        setNeedPassword(true);
        setUserStatusMsg({ type: 'error', text: data.message });
      } else {
        setUserStatusMsg({ type: 'error', text: data.error || 'Verification failed.' });
      }
    } catch (err: any) {
      setUserStatusMsg({ type: 'error', text: err.message || 'Verification error.' });
    } finally {
      setVerifyingCode(false);
    }
  };

  // ------------------------------------------
  // TelegramJS: Disconnect
  // ------------------------------------------
  const handleDisconnectUserClient = () => {
    showConfirm({
      title: 'Disconnect Telegram Account?',
      message: 'Are you sure you want to disconnect this Telegram account? You will stop receiving automatic transaction alerts from ABA Bank and other channels until you reconnect.',
      type: 'danger',
      confirmText: 'Disconnect',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/telegram/user/disconnect', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            setUserStatusMsg({ type: 'success', text: 'Telegram account disconnected.' });
            setCodeRequested(false);
            setPhoneCodeHash('');
            setVerificationCode('');
            setUserClientStatus({ isConnected: false, monitoredChats: [] });
            setTargetGroups([]);
            setAvailableDialogs([]);
            await fetchAllStatus();
            showAlert({
              title: 'Account Disconnected',
              message: 'Your Telegram session has been disconnected.',
              type: 'info'
            });
          }
        } catch (e) {
          setUserStatusMsg({ type: 'error', text: 'Failed to disconnect.' });
        }
      }
    });
  };

  // ------------------------------------------
  // Bot Token: Start & Stop
  // ------------------------------------------
  const handleStartBot = async () => {
    setConnectingBot(true);
    setBotStatusMsg(null);
    try {
      const res = await fetch('/api/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: botToken.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setIsBotRunning(true);
        setBotInfo(data.bot);
        setBotStatusMsg({ type: 'success', text: data.message });
        await fetchAllStatus();
      } else {
        setBotStatusMsg({ type: 'error', text: data.message || 'Failed to start listener.' });
      }
    } catch (err: any) {
      setBotStatusMsg({ type: 'error', text: err.message || 'Network error' });
    } finally {
      setConnectingBot(false);
    }
  };

  const handleStopBot = async () => {
    try {
      const res = await fetch('/api/telegram/stop', { method: 'POST' });
      const data = await res.json();
      setIsBotRunning(false);
      setBotStatusMsg({ type: 'success', text: data.message });
      await fetchAllStatus();
    } catch (err: any) {
      setBotStatusMsg({ type: 'error', text: 'Failed to stop listener.' });
    }
  };

  // ------------------------------------------
  // Phrase Catcher Simulator Trigger
  // ------------------------------------------
  const handleTestPhrase = async () => {
    setTestingPhrase(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram/test-phrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testPhraseText })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      showAlert({
        title: 'Simulation Error',
        message: 'Failed to simulate test phrase: ' + err.message,
        type: 'danger'
      });
    } finally {
      setTestingPhrase(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Navigation Tabs */}
      <div className="flex rounded-2xl bg-slate-950 p-1.5 border border-slate-800 text-xs font-mono font-bold flex-wrap sm:flex-nowrap gap-1">
        <button
          onClick={() => setActiveMode('phone')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMode === 'phone'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Phone size={13} />
          <span>Phone Login</span>
          {userClientStatus.isConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
          )}
        </button>

        <button
          onClick={() => setActiveMode('groups')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMode === 'groups'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users size={13} />
          <span>Groups</span>
          {targetGroups.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold flex-shrink-0 ${
              activeMode === 'groups' ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            }`}>
              {targetGroups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMode('simulator')}
          className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeMode === 'simulator'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Zap size={13} />
          <span>Simulator</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: TELEGRAMJS DIRECT PHONE LOGIN (+855...)                 */}
      {/* ============================================================== */}
      {activeMode === 'phone' && (
        <Card glow="cyan" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Radio size={22} className={userClientStatus.isConnected ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  TelegramJS MTProto User Client
                  {userClientStatus.isConnected ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      CONNECTED & LISTENING
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      READY TO CONNECT
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Connect your personal or streamer Telegram phone number to automatically detect bank transfer SMS and KHQR notifications across all your group chats.
                </p>
              </div>
            </div>

            {userClientStatus.isConnected && (
              <button
                onClick={handleDisconnectUserClient}
                className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-xs font-bold text-red-400 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <LogOut size={13} />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          {/* Feedback Messages */}
          {userStatusMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                userStatusMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              {userStatusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{userStatusMsg.text}</span>
            </div>
          )}

          {/* Connected Live Status View */}
          {userClientStatus.isConnected ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#090D18] border border-cyan-500/30 space-y-4 shadow-lg shadow-cyan-500/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-black text-lg">
                      🇰🇭
                    </div>
                    <div>
                      <div className="text-base font-bold text-white font-['Chakra_Petch']">
                        {userClientStatus.userName || 'Connected Streamer'}
                      </div>
                      <div className="text-xs font-mono text-cyan-400">
                        {userClientStatus.phoneNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTestPhrase}
                      className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      <Zap size={14} />
                      <span>Test Live Overlay Trigger ($5 ABA)</span>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-bold uppercase">LISTENER ENGINE</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Active TelegramJS MTProto Background Worker
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px] block font-bold uppercase">TARGET GROUPS</span>
                      <button
                        type="button"
                        onClick={() => setActiveMode('groups')}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
                      >
                        Manage Groups &rarr;
                      </button>
                    </div>
                    <span className="text-slate-200 font-bold mt-0.5 block truncate">
                      {targetGroups.length > 0
                        ? targetGroups.map(g => g.title).join(', ')
                        : 'No target groups configured (Click to Add)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Connection Flow: Phone Number Input & Verification */
            <div className="space-y-6">
              {/* How It Works Guide Toggle */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className="w-full p-3.5 flex items-center justify-between text-slate-300 hover:text-white font-semibold font-mono"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={15} className="text-cyan-400" />
                    <span>How to connect your Telegram with TelegramJS (+855...)</span>
                  </div>
                  {showHowItWorks ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showHowItWorks && (
                  <div className="px-4 pb-4 pt-1 space-y-2.5 text-slate-400 border-t border-slate-900 font-sans leading-relaxed">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="text-cyan-400 font-mono font-bold">1. Enter Phone</div>
                        <p className="text-[11px]">Enter your Telegram number with Cambodia code <strong className="text-white">+855</strong>.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="text-cyan-400 font-mono font-bold">2. Handshake & Code</div>
                        <p className="text-[11px]">TelegramJS connects to MTProto and sends an official 5-digit code to your Telegram app.</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="text-cyan-400 font-mono font-bold">3. Auto Bank Alerts</div>
                        <p className="text-[11px]">Once verified, the listener detects incoming ABA/Bakong messages and triggers OBS alerts!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 1: Enter Phone Number */}
              {!codeRequested ? (
                <form onSubmit={handleSendCode} className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5">
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
                        Connect & Request Code
                      </Button>
                    </div>

                    <p className="text-[11px] text-slate-500 font-mono">
                      Example format: <strong className="text-slate-400">+85512345678</strong>, <strong className="text-slate-400">+855 96 888 999</strong>, or <strong className="text-slate-400">012345678</strong> (auto-prefixed with +855).
                    </p>
                  </div>

                  {/* Active Telegram Developer API Credentials Badge */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-emerald-400" />
                        <span className="text-slate-300 font-bold">Official Telegram API App ID:</span>
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
                        <span>{showApiCreds ? 'Hide Credentials' : 'Edit Credentials'}</span>
                        {showApiCreds ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {showApiCreds && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn text-xs font-mono">
                        <div className="text-[11px] text-slate-400">
                          Active in <code className="text-cyan-400">.env</code>. You can customize or override your App API credentials below:
                        </div>
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
                  </div>
                </form>
              ) : (
                /* STEP 2: Enter Verification Code */
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
                      Change Phone Number
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
                    <div className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Sparkles size={14} className="text-cyan-400" />
                      <span>Official Telegram MTProto Handshake Live</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Telegram just sent an official verification code to your Telegram app for <strong className="text-cyan-400 font-mono">{userPhone}</strong>. Open Telegram on your phone or desktop and check the official <strong>Telegram Service Notifications</strong> chat.
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
                          <span>Two-Step Verification (2FA) Cloud Password</span>
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
                      Verify & Connect to Stream
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 2: TELEGRAM TARGET GROUPS (GramJS Listens ONLY to These)  */}
      {/* ============================================================== */}
      {activeMode === 'groups' && (
        <Card glow="cyan" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Users size={22} className={userClientStatus.isConnected && targetGroups.length > 0 ? 'text-cyan-400' : 'text-slate-400'} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Target Telegram Groups
                  {userClientStatus.isConnected ? (
                    targetGroups.length > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        GRAMJS LISTENING ({targetGroups.length})
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                        STANDBY (NO GROUPS)
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      OFFLINE (PHONE DISCONNECTED)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  GramJS will exclusively listen and trigger alerts from messages inside these target groups. Messages from any other chat or group are strictly ignored.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={fetchTargetGroups}
                disabled={loadingGroups}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-mono flex items-center gap-1.5"
                title="Refresh target groups"
              >
                <RefreshCw size={13} className={loadingGroups ? 'animate-spin text-cyan-400' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Status Message Toast */}
          {groupStatusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                groupStatusMsg.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {groupStatusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{groupStatusMsg.text}</span>
              </div>
              <button
                onClick={() => setGroupStatusMsg(null)}
                className="text-xs opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </div>
          )}

          {/* Warning banner if phone client is disconnected */}
          {!userClientStatus.isConnected && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-300">
              <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Telegram Phone Account Not Connected</strong>
                <span>
                  Please switch to the <button onClick={() => setActiveMode('phone')} className="underline font-bold hover:text-white">TelegramJS Phone Login</button> tab to connect your account. Once connected, GramJS will automatically begin listening to messages inside these groups.
                </span>
              </div>
            </div>
          )}

          {/* Quick Select from User's joined Telegram chats */}
          {availableDialogs.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles size={13} className="text-cyan-400" />
                  Your Telegram Account Dialogs ({availableDialogs.length} detected)
                </span>
                <span className="text-[11px] text-slate-500">Click a group to connect or disconnect</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {availableDialogs.map((d) => {
                  const existing = targetGroups.find((g) => isGroupMatch(d, g));
                  const isAlreadyAdded = Boolean(existing);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={addingGroup}
                      onClick={() => {
                        if (existing) {
                          handleDeleteTargetGroup({
                            id: existing.id,
                            title: existing.title || d.title,
                            chat_id: existing.chat_id || d.id
                          });
                        } else {
                          handleQuickAddDialog(d);
                        }
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-mono flex items-center gap-1.5 transition-all ${
                        isAlreadyAdded
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:border-red-500/40 hover:text-red-300'
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

          {/* Group List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-400" />
                Active Monitored Groups ({targetGroups.length})
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
                    No Target Groups Configured
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    GramJS requires at least one target group so it knows where to listen for donation and payment notifications. Add your bank notifications group or stream community chat.
                  </p>
                </div>
                <button
                  onClick={() => fetchTargetGroups()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-500/20"
                >
                  <RefreshCw size={14} className={loadingGroups ? 'animate-spin' : ''} />
                  <span>Refresh Target Groups</span>
                </button>
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
                          <MessageSquare size={17} />
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
                                @{group.username.replace(/^@/, '')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTargetGroup(group)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                        title="Remove target group"
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
        </Card>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PHRASE CATCHER SIMULATOR DECK                           */}
      {/* ============================================================== */}
      {activeMode === 'simulator' && (
        <Card glow="cyan" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap size={18} className="text-cyan-400" />
                Telegram Phrase Catcher Simulator
              </h3>
              <p className="text-xs text-slate-400">
                Test how the backend engine parses Cambodian banking messages and fires real-time OBS overlay alerts.
              </p>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  const preset = samplePresets.find((p) => p.label === e.target.value);
                  if (preset) setTestPhraseText(preset.text);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
              >
                <option value="">Choose Sample Banking Message...</option>
                {samplePresets.map((p, idx) => (
                  <option key={idx} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              rows={3}
              value={testPhraseText}
              onChange={(e) => setTestPhraseText(e.target.value)}
              placeholder="Paste any bank SMS or Telegram message e.g. Received $5.00 from SOKHA (ABA Bank)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 transition-colors"
            />

            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono text-slate-500">
                Simulates real-time Socket.IO alert directly into your OBS Overlay and Screen Simulator.
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleTestPhrase}
                loading={testingPhrase}
                icon={<Zap size={14} />}
                className="font-bold shadow-lg shadow-cyan-400/20"
              >
                Simulate Catch & Alert
              </Button>
            </div>
          </div>

          {/* Test Result Card */}
          {testResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fadeIn text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400 uppercase">Detection Result</span>
                {testResult.parsed?.matched ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> MATCH CONFIRMED (100%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 font-bold">
                    NO MATCH
                  </span>
                )}
              </div>

              {testResult.parsed?.matched && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">DONOR</span>
                    <b className="text-white">{testResult.parsed.donorName}</b>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">AMOUNT</span>
                    <b className="text-cyan-400">
                      {testResult.parsed.currency === 'KHR'
                        ? `${testResult.parsed.amount.toLocaleString()} ៛`
                        : `$${testResult.parsed.amount.toFixed(2)}`}
                    </b>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">BANK</span>
                    <b className="text-purple-400">{testResult.parsed.bankingName}</b>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">OBS BROADCAST</span>
                    <b className="text-emerald-400">Dispatched</b>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
