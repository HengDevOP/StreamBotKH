'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  Globe,
  User,
  Clock,
  Terminal,
  Trash2,
  Ban,
  Unlock,
  Plus,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { request } from '../../services/api';
import { useModal } from '../../context/ModalContext';

export interface SessionLogItem {
  id: string;
  eventType: 'LOGIN' | 'REGISTER' | 'API_REQUEST' | 'SECURITY_BLOCK' | 'RATE_WARNING' | string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  userId?: string | null;
  username?: string | null;
  userEmail?: string | null;
  requestsPerSecond: number;
  isHighRateWarning: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  durationMs?: number;
  details?: string | null;
  createdAt: string;
}

export interface IpClientProfile {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  plan?: string;
}

export interface IpDirectoryItem {
  ip: string;
  isBlocked: boolean;
  blockReason?: string | null;
  blockCreatedAt?: number | null;
  blockExpiresAt?: number | null;
  totalRequests: number;
  currentRps: number;
  peakRps: number;
  isHighRateWarning: boolean;
  warningCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastPath: string;
  lastMethod: string;
  userAgent: string;
  clients: IpClientProfile[];
}

interface SessionLogsSummary {
  dateKey?: string;
  totalLogs: number;
  highRateWarnings: number;
  loginRegisterEvents: number;
  totalTrackedIps: number;
  blockedIpsCount: number;
}

export interface AdminSessionLogsManagerProps {
  mode?: 'logs' | 'ips';
}

export const AdminSessionLogsManager: React.FC<AdminSessionLogsManagerProps> = ({ mode = 'logs' }) => {
  const { showConfirm } = useModal();

  const activeView = mode;
  const [logs, setLogs] = useState<SessionLogItem[]>([]);
  const [ipAddresses, setIpAddresses] = useState<IpDirectoryItem[]>([]);
  const [summary, setSummary] = useState<SessionLogsSummary>({
    totalLogs: 0,
    highRateWarnings: 0,
    loginRegisterEvents: 0,
    totalTrackedIps: 0,
    blockedIpsCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Filters for Session Logs
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [onlyWarnings, setOnlyWarnings] = useState(false);

  // Filters & Manual Block for IP Address Directory
  const [ipSearchQuery, setIpSearchQuery] = useState('');
  const [ipStatusFilter, setIpStatusFilter] = useState<'ALL' | 'BLOCKED' | 'WARNING' | 'CLIENTS'>('ALL');
  const [manualBlockIp, setManualBlockIp] = useState('');
  const [manualBlockReason, setManualBlockReason] = useState('');

  // Action loading states
  const [processingIp, setProcessingIp] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSessionLogsData = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '200');
        if (eventFilter !== 'ALL') params.set('eventType', eventFilter);
        if (onlyWarnings) params.set('warnings', '1');
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await request<{
          success: boolean;
          summary: SessionLogsSummary;
          logs: SessionLogItem[];
          ipAddresses: IpDirectoryItem[];
        }>(`/admin/session-logs?${params.toString()}`);

        if (res && res.success) {
          setLogs(res.logs || []);
          setIpAddresses(res.ipAddresses || []);
          if (res.summary) {
            setSummary(res.summary);
          }
        }
      } catch (err: any) {
        if (!silent) {
          setStatusMessage({
            type: 'error',
            text: err.message || 'Failed to load session logs'
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventFilter, onlyWarnings, searchQuery]
  );

  useEffect(() => {
    fetchSessionLogsData(false);
  }, [fetchSessionLogsData]);

  // Live Auto-Refresh every 4 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchSessionLogsData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchSessionLogsData]);

  const handleToggleBlockIp = async (
    ip: string,
    currentlyBlocked: boolean,
    context?: {
      reason?: string;
      userId?: string | null;
      username?: string | null;
      email?: string | null;
    }
  ) => {
    if (!ip) return;

    if (!currentlyBlocked) {
      const confirmed = await showConfirm({
        title: `Block IP Address (${ip})`,
        message: `Are you sure you want to block IP address ${ip}? Once blocked, this IP will be immediately disconnected and cannot make any actions or open the website anymore.`,
        confirmText: 'Block IP Now',
        cancelText: 'Cancel',
        variant: 'danger'
      });
      if (!confirmed) return;
    }

    setProcessingIp(ip);
    setStatusMessage(null);

    try {
      const action = currentlyBlocked ? 'unblock' : 'block';
      const res = await request<{ success: boolean; message: string }>('/admin/session-logs', {
        method: 'POST',
        body: JSON.stringify({
          action,
          ip,
          reason:
            context?.reason ||
            (currentlyBlocked ? undefined : 'Blocked by Admin from Session Logs'),
          userId: context?.userId || null,
          username: context?.username || null,
          email: context?.email || null
        })
      });

      // Optimistically update both logs and ipAddresses
      setLogs((prev) =>
        prev.map((l) => (l.ip === ip ? { ...l, isBlocked: !currentlyBlocked } : l))
      );
      setIpAddresses((prev) =>
        prev.map((item) =>
          item.ip === ip
            ? {
                ...item,
                isBlocked: !currentlyBlocked,
                blockReason: !currentlyBlocked
                  ? context?.reason || 'Blocked by Admin'
                  : null
              }
            : item
        )
      );

      setStatusMessage({
        type: 'success',
        text: res.message || `IP ${ip} ${currentlyBlocked ? 'unblocked' : 'blocked'} successfully.`
      });

      fetchSessionLogsData(true);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || `Failed to ${currentlyBlocked ? 'unblock' : 'block'} IP ${ip}`
      });
    } finally {
      setProcessingIp(null);
    }
  };

  const handleManualBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetIp = manualBlockIp.trim();
    if (!targetIp) return;

    setProcessingIp(targetIp);
    setStatusMessage(null);
    try {
      const res = await request<{ success: boolean; message: string }>('/admin/session-logs', {
        method: 'POST',
        body: JSON.stringify({
          action: 'block',
          ip: targetIp,
          reason: manualBlockReason.trim() || 'Manual IP Block by Admin'
        })
      });
      setManualBlockIp('');
      setManualBlockReason('');
      setStatusMessage({
        type: 'success',
        text: res.message || `IP ${targetIp} has been blocked.`
      });
      fetchSessionLogsData(false);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to block IP address'
      });
    } finally {
      setProcessingIp(null);
    }
  };

  const handleClearLogs = async () => {
    const confirmed = await showConfirm({
      title: 'Clear Session Logs',
      message: 'Are you sure you want to clear all recorded session logs? Active IP blocks will remain intact.',
      confirmText: 'Clear All Logs',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    setRefreshing(true);
    try {
      await request('/admin/session-logs', {
        method: 'POST',
        body: JSON.stringify({ action: 'clear_logs' })
      });
      setLogs([]);
      fetchSessionLogsData(false);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to clear logs'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filteredIpAddresses = ipAddresses.filter((item) => {
    if (ipStatusFilter === 'BLOCKED' && !item.isBlocked) return false;
    if (ipStatusFilter === 'WARNING' && !item.isHighRateWarning) return false;
    if (ipStatusFilter === 'CLIENTS' && item.clients.length === 0) return false;

    if (!ipSearchQuery.trim()) return true;
    const q = ipSearchQuery.trim().toLowerCase();
    const matchIp = item.ip.toLowerCase().includes(q);
    const matchPath = item.lastPath?.toLowerCase().includes(q);
    const matchClient = item.clients.some(
      (c) =>
        c.username?.toLowerCase().includes(q) ||
        c.displayName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
    return matchIp || matchPath || matchClient;
  });

  const renderEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'LOGIN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            LOGIN
          </span>
        );
      case 'REGISTER':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            NEW REGISTER
          </span>
        );
      case 'RATE_WARNING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            RATE WARNING
          </span>
        );
      case 'SECURITY_BLOCK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            BLOCKED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            API REQUEST
          </span>
        );
    }
  };

  const renderMethodBadge = (method: string) => {
    const m = (method || 'GET').toUpperCase();
    const colorClass =
      m === 'GET'
        ? 'text-sky-400 bg-sky-500/10 border-sky-500/20'
        : m === 'POST'
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : m === 'PUT' || m === 'PATCH'
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : m === 'DELETE' || m === 'BLOCK'
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : 'text-slate-300 bg-slate-800 border-slate-700';

    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${colorClass}`}>
        {m}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {activeView === 'ips' ? (
              <Globe size={18} className="text-slate-200" />
            ) : (
              <Terminal size={18} className="text-slate-200" />
            )}
            <h2 className="text-base sm:text-lg font-bold text-white">
              {activeView === 'ips' ? 'IP Address Directory & Security' : 'Session Logs'}
            </h2>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${autoRefresh ? 'animate-pulse' : ''}`} />
              <span>{autoRefresh ? 'LIVE MONITOR' : 'PAUSED'}</span>
            </span>
            {summary.dateKey && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono">
                DAILY LOGS: {summary.dateKey}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {activeView === 'ips'
              ? 'View all client and visitor IP addresses, traffic rates, and block or unblock IP access.'
              : 'Only sessions exceeding 20 req/sec are logged and stored here. Monitor high-rate traffic warnings and block abusive IPs.'}
          </p>
        </div>

        {/* Refresh & Auto-Poll Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              autoRefresh
                ? 'bg-slate-900 border-slate-700 text-slate-200'
                : 'bg-[#090D16] border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle 4-second live stream polling"
          >
            <Clock size={13} />
            <span>{autoRefresh ? 'Auto: ON' : 'Auto: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchSessionLogsData(false)}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Session Events</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{summary.totalLogs}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
            <Activity size={17} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Logins &amp; Registers</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
              {summary.loginRegisterEvents}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <User size={17} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">&gt;20 Req/s Warnings</div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
              {summary.highRateWarnings}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle size={17} />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Blocked IPs</div>
            <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">
              {summary.blockedIpsCount}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldBan size={17} />
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0" />
            ) : (
              <ShieldAlert size={15} className="shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* VIEW 1: SESSION LOGS STREAM                                        */}
      {/* ================================================================== */}
      {activeView === 'logs' && (
        <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-800/80 bg-[#090D16] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'All Logs' },
                { id: 'LOGIN', label: 'Logins' },
                { id: 'REGISTER', label: 'New Registers' },
                { id: 'API_REQUEST', label: 'Incoming API' },
                { id: 'RATE_WARNING', label: '>20 req/s Warnings' },
                { id: 'SECURITY_BLOCK', label: 'Blocked Hits' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEventFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    eventFilter === tab.id
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white bg-transparent border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyWarnings((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  onlyWarnings
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle size={13} />
                <span>Only &gt;20 req/s</span>
              </button>

              <div className="relative flex-1 sm:w-64">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search IP, @client, email, API path..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/30 text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Clear session logs"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Session Logs Table */}
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400 font-mono">
              Loading real-time session logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Terminal size={28} className="mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-white">No session logs matching filter</div>
              <p className="text-xs text-slate-400">
                Incoming API requests, client logins, and new registrations will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-[#090D16]/60 text-[10px] font-mono uppercase text-slate-400">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Event / Action</th>
                    <th className="py-3 px-4">Endpoint</th>
                    <th className="py-3 px-4">Client / User</th>
                    <th className="py-3 px-4">IP Address &amp; Rate</th>
                    <th className="py-3 px-4 text-right">IP Action Listener</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {logs.map((log) => {
                    const isWarning = log.isHighRateWarning || log.requestsPerSecond > 20;
                    const isBusy = processingIp === log.ip;

                    return (
                      <tr
                        key={log.id}
                        className={`transition-colors ${
                          log.isBlocked
                            ? 'bg-rose-950/15 hover:bg-rose-950/25'
                            : isWarning
                            ? 'bg-amber-950/15 hover:bg-amber-950/25'
                            : 'hover:bg-slate-900/50'
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                          <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Event & Action */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {renderEventBadge(log.eventType)}
                            {isWarning && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[10px] font-mono font-bold inline-flex items-center gap-1">
                                <AlertTriangle size={11} />
                                <span>WARNING: {log.requestsPerSecond} req/s (&gt;20/s)</span>
                              </span>
                            )}
                            {log.isBlocked && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold">
                                IP BLOCKED
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-white">{log.action}</div>
                          {log.details && (
                            <div className="text-[11px] text-slate-400 mt-0.5">{log.details}</div>
                          )}
                        </td>

                        {/* Endpoint & Status */}
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {renderMethodBadge(log.method)}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                log.statusCode >= 400
                                  ? 'bg-rose-500/15 text-rose-300'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              {log.statusCode}
                            </span>
                            {log.durationMs ? (
                              <span className="text-[10px] text-slate-500">{log.durationMs}ms</span>
                            ) : null}
                          </div>
                          <div
                            className="text-slate-300 truncate max-w-[240px] mt-1"
                            title={log.path}
                          >
                            {log.path}
                          </div>
                        </td>

                        {/* Client / User */}
                        <td className="py-3 px-4">
                          {log.username || log.userEmail ? (
                            <div>
                              <div className="font-semibold text-white">
                                {log.username ? `@${log.username}` : 'Authenticated Client'}
                              </div>
                              {log.userEmail && (
                                <div className="text-[11px] font-mono text-slate-400">
                                  {log.userEmail}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">
                              Guest / Public Visitor
                            </span>
                          )}
                        </td>

                        {/* IP Address & Rate */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-white flex items-center gap-1.5">
                            <Globe size={12} className="text-slate-400" />
                            <span>{log.ip}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                isWarning
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400'
                              }`}
                            >
                              {log.requestsPerSecond} req/sec
                            </span>
                          </div>
                        </td>

                        {/* Block / Unblock Action Button Listener */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleToggleBlockIp(log.ip, log.isBlocked, {
                                reason: isWarning
                                  ? `High rate warning (${log.requestsPerSecond} req/s) on ${log.path}`
                                  : `Blocked from session log (${log.action})`,
                                userId: log.userId,
                                username: log.username,
                                email: log.userEmail
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                              log.isBlocked
                                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {log.isBlocked ? (
                              <>
                                <Unlock size={12} />
                                <span>{isBusy ? 'Updating...' : 'Unblock IP'}</span>
                              </>
                            ) : (
                              <>
                                <Ban size={12} />
                                <span>{isBusy ? 'Blocking...' : 'Block IP'}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* VIEW 2: IP ADDRESS DIRECTORY & CLIENT IP BLOCKER                   */}
      {/* ================================================================== */}
      {activeView === 'ips' && (
        <div className="space-y-4">
          {/* Manual Block IP Bar */}
          <form
            onSubmit={handleManualBlockSubmit}
            className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-white shrink-0 mr-1">
              <ShieldBan size={15} className="text-rose-400" />
              <span>Block IP Address:</span>
            </div>
            <input
              type="text"
              value={manualBlockIp}
              onChange={(e) => setManualBlockIp(e.target.value)}
              placeholder="Enter IP address (e.g. 203.0.113.50)"
              className="sm:w-56 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs font-mono text-white placeholder-slate-500 outline-none"
            />
            <input
              type="text"
              value={manualBlockReason}
              onChange={(e) => setManualBlockReason(e.target.value)}
              placeholder="Reason for blocking (optional)"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              type="submit"
              disabled={!manualBlockIp.trim() || Boolean(processingIp)}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Ban size={13} />
              <span>Block IP</span>
            </button>
          </form>

          {/* IP Address Directory Table */}
          <div className="rounded-xl bg-[#0B0F19] border border-slate-800/80 overflow-hidden">
            <div className="p-4 border-b border-slate-800/80 bg-[#090D16] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `All IPs (${ipAddresses.length})` },
                    {
                      id: 'CLIENTS',
                      label: `Registered Clients (${ipAddresses.filter((i) => i.clients.length > 0).length})`
                    },
                    {
                      id: 'WARNING',
                      label: `>20 req/s Warnings (${ipAddresses.filter((i) => i.isHighRateWarning).length})`
                    },
                    {
                      id: 'BLOCKED',
                      label: `Blocked IPs (${ipAddresses.filter((i) => i.isBlocked).length})`
                    }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setIpStatusFilter(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      ipStatusFilter === tab.id
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative sm:w-64">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={ipSearchQuery}
                  onChange={(e) => setIpSearchQuery(e.target.value)}
                  placeholder="Filter IP, client @username, email..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-slate-600 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            {filteredIpAddresses.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Globe size={28} className="mx-auto text-slate-600" />
                <div className="text-sm font-semibold text-white">No IP addresses found</div>
                <p className="text-xs text-slate-400">
                  Client IP addresses and visitor connections will be listed here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-[#090D16]/60 text-[10px] font-mono uppercase text-slate-400">
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Associated Clients</th>
                      <th className="py-3 px-4">Traffic &amp; Peak RPS</th>
                      <th className="py-3 px-4">Last Activity &amp; Endpoint</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Block / Unblock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {filteredIpAddresses.map((item) => {
                      const isBusy = processingIp === item.ip;
                      const primaryClient = item.clients[0];

                      return (
                        <tr
                          key={item.ip}
                          className={`transition-colors ${
                            item.isBlocked
                              ? 'bg-rose-950/15 hover:bg-rose-950/25'
                              : item.isHighRateWarning
                              ? 'bg-amber-950/15 hover:bg-amber-950/25'
                              : 'hover:bg-slate-900/50'
                          }`}
                        >
                          {/* IP Address */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-white flex items-center gap-2">
                              <Globe size={13} className="text-slate-400" />
                              <span>{item.ip}</span>
                            </div>
                            <div
                              className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5"
                              title={item.userAgent}
                            >
                              {item.userAgent}
                            </div>
                          </td>

                          {/* Associated Clients */}
                          <td className="py-3.5 px-4">
                            {item.clients.length > 0 ? (
                              <div className="space-y-1.5">
                                {item.clients.map((client, idx) => (
                                  <div
                                    key={`${client.userId || client.email}-${idx}`}
                                    className="flex items-center gap-2"
                                  >
                                    {client.avatarUrl ? (
                                      <img
                                        src={client.avatarUrl}
                                        alt={client.username}
                                        className="w-5 h-5 rounded-full object-cover border border-slate-700"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                        {(client.username || 'U').slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-semibold text-white leading-tight">
                                        @{client.username}{' '}
                                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 ml-1">
                                          {client.plan || 'free'}
                                        </span>
                                      </div>
                                      {client.email && (
                                        <div className="text-[10px] font-mono text-slate-400">
                                          {client.email}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] font-mono text-slate-500">
                                Unauthenticated / Public IP
                              </span>
                            )}
                          </td>

                          {/* Traffic & Peak RPS */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono text-white font-semibold">
                              {item.totalRequests.toLocaleString()} requests
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  item.peakRps > 20 || item.currentRps > 20
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                }`}
                              >
                                Peak: {item.peakRps} req/s
                              </span>
                              {item.warningCount > 0 && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  {item.warningCount} warnings
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Last Activity */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {renderMethodBadge(item.lastMethod || 'GET')}
                              <span
                                className="font-mono text-[11px] text-slate-300 truncate max-w-[180px]"
                                title={item.lastPath}
                              >
                                {item.lastPath || '/'}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1">
                              Last seen: {new Date(item.lastSeenAt).toLocaleString()}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.isBlocked ? (
                              <div>
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold inline-flex items-center gap-1">
                                  <ShieldBan size={11} />
                                  <span>BLOCKED</span>
                                </span>
                                {item.blockReason && (
                                  <div
                                    className="text-[10px] text-rose-300/80 max-w-[160px] truncate mt-1"
                                    title={item.blockReason}
                                  >
                                    {item.blockReason}
                                  </div>
                                )}
                              </div>
                            ) : item.isHighRateWarning ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold inline-flex items-center gap-1">
                                <AlertTriangle size={11} />
                                <span>&gt;20 REQ/S WARNING</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold inline-flex items-center gap-1">
                                <ShieldCheck size={11} />
                                <span>ACTIVE</span>
                              </span>
                            )}
                          </td>

                          {/* Block / Unblock Button */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleToggleBlockIp(item.ip, item.isBlocked, {
                                  reason: 'Blocked by Admin from IP Address Directory',
                                  userId: primaryClient?.userId,
                                  username: primaryClient?.username,
                                  email: primaryClient?.email
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                                item.isBlocked
                                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {item.isBlocked ? (
                                <>
                                  <Unlock size={12} />
                                  <span>{isBusy ? 'Unblocking...' : 'Unblock'}</span>
                                </>
                              ) : (
                                <>
                                  <Ban size={12} />
                                  <span>{isBusy ? 'Blocking...' : 'Block IP'}</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSessionLogsManager;
