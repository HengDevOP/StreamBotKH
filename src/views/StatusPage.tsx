'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  Heart,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Server,
  Cpu,
  HardDrive,
  RefreshCw,
  Plus,
  X,
  Radio,
  Trash2,
  Wrench,
  Check,
  Layers,
  Send,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Zap,
  Globe,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useModal } from '../context/ModalContext';

interface NodeMetrics {
  version: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  uptimeFormatted: string;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  systemMemoryFreeMb: number;
  systemMemoryTotalMb: number;
  activeSockets: number;
  timestamp: string;
}

interface ComponentItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'operational' | 'degraded_performance' | 'major_outage' | 'critical_outage';
  activeIncidentCount: number;
}

interface IncidentUpdate {
  id: string;
  status: 'investigating' | 'fixing' | 'resolved';
  message: string;
  authorEmail?: string;
  createdAt: string;
}

interface IncidentItem {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'investigating' | 'fixing' | 'resolved';
  affectedComponents: string[];
  updates: IncidentUpdate[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

interface DatabaseTelemetry {
  totalRegisteredStreamers: number;
  totalPaidDonations: number;
  totalVolumeUsd: number;
  totalVolumeKhr: number;
  activeOverlaySessions: number;
  mongoConnected: boolean;
  mongoPingMs: number;
  databaseEngine?: string;
  retentionPolicy: string;
}

interface StatusApiResponse {
  success: boolean;
  overallStatus: 'operational' | 'degraded' | 'major_outage';
  nodeMetrics: NodeMetrics;
  databaseTelemetry?: DatabaseTelemetry;
  components: ComponentItem[];
  incidents: IncidentItem[];
  serverTime: string;
}

export const StatusPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { showConfirm } = useModal();

  const [data, setData] = useState<StatusApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());

  // Incident Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State for New Incident
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState<'minor' | 'major' | 'critical'>('minor');
  const [newStatus, setNewStatus] = useState<'investigating' | 'fixing' | 'resolved'>('investigating');
  const [selectedComponents, setSelectedComponents] = useState<string[]>(['Core API Gateway']);

  // Form State for Incident Note
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateTargetStatus, setUpdateTargetStatus] = useState<'investigating' | 'fixing' | 'resolved'>('fixing');

  const isAdmin = Boolean(user?.isAdmin);

  // Fetch live system status
  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      const latency = Math.round(performance.now() - start);
      setApiLatency(latency);

      if (res.ok) {
        const json: StatusApiResponse = await res.json();
        if (json.success) {
          setData(json);
          setLastCheckTime(new Date());
        }
      }
    } catch (err) {
      console.error('[Status] Failed to fetch system status:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load & 15s polling heartbeat
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Realtime Socket.IO listener for instant incident broadcast
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = () => {
      fetchStatus();
    };
    socket.on('status:update', handleStatusUpdate);
    return () => {
      socket.off('status:update', handleStatusUpdate);
    };
  }, [socket, fetchStatus]);

  // Admin: Create Incident
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('streamneon_auth_token');
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'create',
          title: newTitle.trim(),
          description: newDescription.trim(),
          severity: newSeverity,
          status: newStatus,
          affectedComponents: selectedComponents
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewSeverity('minor');
        setNewStatus('investigating');
        fetchStatus();
      }
    } catch (err) {
      console.error('[Status] Failed to create incident:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Mark as Fixing
  const handleMarkFixing = async (incident: IncidentItem) => {
    showConfirm({
      title: 'Mark Incident as Fixing?',
      message: `Update status for "${incident.title}" to "Fixing (In Progress)". Streamers will see active repair in progress.`,
      confirmText: 'Mark as Fixing',
      confirmButtonClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
      onConfirm: async () => {
        const token = localStorage.getItem('streamneon_auth_token');
        await fetch('/api/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            action: 'mark_fixing',
            incidentId: incident.id,
            note: 'Engineering team is actively implementing a fix.'
          })
        });
        fetchStatus();
      }
    });
  };

  // Admin: Mark as Resolved
  const handleMarkResolved = async (incident: IncidentItem) => {
    showConfirm({
      title: 'Mark Incident as Resolved?',
      message: `Resolve "${incident.title}"? This will mark all affected components back to fully operational.`,
      confirmText: 'Mark as Resolved',
      confirmButtonClass: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold',
      onConfirm: async () => {
        const token = localStorage.getItem('streamneon_auth_token');
        await fetch('/api/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            action: 'mark_resolved',
            incidentId: incident.id,
            note: 'Service restored to nominal operating state. All systems operational.'
          })
        });
        fetchStatus();
      }
    });
  };

  // Admin: Post Update Note
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !updateMessage.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('streamneon_auth_token');
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'add_update',
          incidentId: selectedIncident.id,
          message: updateMessage.trim(),
          status: updateTargetStatus
        })
      });

      if (res.ok) {
        setIsUpdateModalOpen(false);
        setUpdateMessage('');
        fetchStatus();
      }
    } catch (err) {
      console.error('[Status] Failed to add note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: Delete Incident
  const handleDeleteIncident = async (incident: IncidentItem) => {
    showConfirm({
      title: 'Delete Incident Record?',
      message: `Permanently delete "${incident.title}" from status history?`,
      confirmText: 'Delete Incident',
      type: 'danger',
      onConfirm: async () => {
        const token = localStorage.getItem('streamneon_auth_token');
        await fetch('/api/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            action: 'delete',
            incidentId: incident.id
          })
        });
        fetchStatus();
      }
    });
  };

  const incidents = data?.incidents || [];
  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  const overall = data?.overallStatus || 'operational';

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans pb-16">
      {/* 1. Hero EKG Heartbeat Header */}
      <section className="relative border-b border-slate-800/80 bg-gradient-to-b from-[#0B101E] via-[#080C16] to-[#070A12] pt-8 sm:pt-12 pb-10 sm:pb-14 px-4 overflow-hidden">
        {/* Glow Accent */}
        <div
          className={`absolute top-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ${
            overall === 'operational'
              ? 'bg-emerald-500/10'
              : overall === 'degraded'
              ? 'bg-amber-500/15'
              : 'bg-rose-500/20'
          }`}
        />

        <div className="max-w-6xl mx-auto space-y-6 relative z-10">
          {/* Top Pill & Realtime Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE SYSTEM HEARTBEAT</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400">WebSocket Connected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                title="Refresh live status metrics"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
                <span>{refreshing ? 'Checking...' : 'Refresh'}</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Plus size={14} />
                  <span>Report Incident</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Status Badge with Animated Heart EKG Line */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
              overall === 'operational'
                ? 'bg-emerald-950/20 border-emerald-500/40 shadow-2xl shadow-emerald-500/10'
                : overall === 'degraded'
                ? 'bg-amber-950/20 border-amber-500/50 shadow-2xl shadow-amber-500/15'
                : 'bg-rose-950/25 border-rose-500/60 shadow-2xl shadow-rose-500/20'
            }`}
          >
            {/* Ambient Top Light */}
            <div
              className="absolute top-0 inset-x-0 h-1 pointer-events-none"
              style={{
                background:
                  overall === 'operational'
                    ? 'linear-gradient(90deg, transparent, #10B981, transparent)'
                    : overall === 'degraded'
                    ? 'linear-gradient(90deg, transparent, #F59E0B, transparent)'
                    : 'linear-gradient(90deg, transparent, #EF4444, transparent)'
              }}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
                      overall === 'operational'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : overall === 'degraded'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    <Heart size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight font-['Chakra_Petch'] flex items-center gap-2">
                      <span>
                        {overall === 'operational'
                          ? 'All Systems Operational'
                          : overall === 'degraded'
                          ? 'Degraded System Performance'
                          : 'Active Incident in Progress'}
                      </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Zero-latency tip alerts, ABA PayWay webhooks, OBS overlays, and audio engines are monitored 24/7.
                    </p>
                  </div>
                </div>
              </div>

              {/* Heartbeat EKG Animated Graphic */}
              <div className="w-full md:w-72 h-14 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-2 flex items-center relative overflow-hidden flex-shrink-0">
                <svg
                  viewBox="0 0 300 50"
                  className="w-full h-full text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M 0 25 L 50 25 L 65 10 L 80 40 L 95 18 L 110 32 L 125 25 L 180 25 L 195 5 L 210 45 L 225 15 L 240 35 L 255 25 L 300 25"
                    className="opacity-90 animate-pulse"
                    style={{
                      stroke:
                        overall === 'operational'
                          ? '#10B981'
                          : overall === 'degraded'
                          ? '#F59E0B'
                          : '#EF4444'
                    }}
                  />
                </svg>
                <div className="absolute right-3 top-2 flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400">
                  <Activity size={12} className="text-emerald-400 animate-spin" />
                  <span>HEARTBEAT 60BPM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Telemetry & Metrics (Node, Uptime, Database, WebSocket) */}
      <section className="max-w-6xl mx-auto w-full px-4 -mt-6 sm:-mt-8 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Node & Host Environment */}
          <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800/90 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Server size={15} className="text-cyan-400" />
                <span>Node.js Runtime</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-[10px] font-bold">
                {data?.nodeMetrics?.version || 'v20.x'}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Platform:</span>
                <span className="font-bold text-white">{data?.nodeMetrics?.platform} ({data?.nodeMetrics?.arch})</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Memory (RSS):</span>
                <span className="font-bold text-emerald-400">{data?.nodeMetrics?.rssMb || 0} MB</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Heap Used:</span>
                <span>{data?.nodeMetrics?.heapUsedMb || 0} / {data?.nodeMetrics?.heapTotalMb || 0} MB</span>
              </div>
            </div>
          </div>

          {/* Card 2: Server Uptime & Availability */}
          <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800/90 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Clock size={15} className="text-emerald-400" />
                <span>System Uptime</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-[10px] font-bold">
                99.98% Live
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Continuous:</span>
                <span className="font-bold text-white">{data?.nodeMetrics?.uptimeFormatted || 'Active'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Reliability:</span>
                <span className="font-bold text-emerald-400">High Availability</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Last Synced:</span>
                <span className="text-slate-400">{lastCheckTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Real Database & Storage Telemetry */}
          <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800/90 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <HardDrive size={15} className="text-purple-400" />
                <span>Database Engine</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/50 text-purple-300 text-[10px] font-bold">
                {data?.databaseTelemetry?.mongoPingMs ? `${data.databaseTelemetry.mongoPingMs}ms Ping` : 'Atlas Synced'}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Registered Creators:</span>
                <span className="font-bold text-cyan-400">{data?.databaseTelemetry?.totalRegisteredStreamers ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Paid Donations:</span>
                <span className="font-bold text-emerald-400">{data?.databaseTelemetry?.totalPaidDonations ?? 0} tips</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Retention Window:</span>
                <span className="text-amber-400 font-bold">30 Days Auto-Purge</span>
              </div>
            </div>
          </div>

          {/* Card 4: Core API Gateway & Latency */}
          <div className="p-5 rounded-2xl bg-[#090D18] border border-slate-800/90 shadow-xl space-y-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <Zap size={15} className="text-amber-400" />
                <span>API &amp; Sockets</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300 text-[10px] font-bold">
                {apiLatency !== null ? `${apiLatency}ms Response` : 'Online'}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">API Status:</span>
                <span className="font-bold text-emerald-400">200 OK • Live</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Active WebSockets:</span>
                <span className="font-bold text-cyan-400">{data?.nodeMetrics?.activeSockets || 0} active</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Bank Webhook:</span>
                <span className="text-emerald-400">Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Subsystems Health Grid */}
      <section className="max-w-6xl mx-auto w-full px-4 mt-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-white tracking-wide font-['Chakra_Petch'] uppercase flex items-center gap-2">
            <ShieldCheck size={18} className="text-cyan-400" />
            <span>Subsystems &amp; Services Heartbeat</span>
          </h2>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            6 Core Modules Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {(data?.components || []).map((comp) => {
            const isOk = comp.status === 'operational';
            return (
              <div
                key={comp.id}
                className="p-4 rounded-2xl bg-[#090D18] border border-slate-800/80 hover:border-slate-700 transition-colors space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono uppercase text-slate-500 font-bold">{comp.category}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isOk
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : comp.status === 'degraded_performance'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span>{isOk ? 'Operational' : comp.status.replace('_', ' ')}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white font-sans mt-1">{comp.name}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{comp.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>99.98% 30d</span>
                  <span className="text-emerald-400 font-bold">Normal</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Live Incidents Section (Active/Fixing Sorted to the Top!) */}
      <section className="max-w-6xl mx-auto w-full px-4 mt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-wide font-['Chakra_Petch'] flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-400" />
              <span>Incident Tracker &amp; Maintenance Logs</span>
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
              <span>Active incidents and ongoing fixes are automatically sorted to the top.</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono">
                📅 30-Day Auto Retention Window
              </span>
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} />
              <span>Create Incident</span>
            </button>
          )}
        </div>

        {/* Section 4A: Active Incidents (Fixing & Investigating) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-mono font-bold text-amber-300 uppercase tracking-wider">
              Active Incidents &amp; In-Progress Fixes ({activeIncidents.length})
            </h3>
          </div>

          {activeIncidents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#090D18] border border-slate-800/80 text-center space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
              <div className="text-sm font-bold text-white">No Active Incidents or Outages</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                All platform APIs, overlays, donation alerts, and realtime soundboards are operating normally.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`p-5 sm:p-6 rounded-2xl border transition-all ${
                    inc.status === 'fixing'
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-xl shadow-amber-500/10'
                      : 'bg-rose-950/20 border-rose-500/50 shadow-xl shadow-rose-500/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-black uppercase ${
                            inc.status === 'fixing'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                          }`}
                        >
                          {inc.status === 'fixing' ? (
                            <>
                              <Wrench size={13} className="animate-spin text-amber-400" />
                              <span>FIXING (IN PROGRESS)</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={13} className="text-rose-400" />
                              <span>INVESTIGATING</span>
                            </>
                          )}
                        </span>

                        {/* Severity Badge */}
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono uppercase text-slate-400 font-bold">
                          {inc.severity} SEVERITY
                        </span>

                        {/* Timestamp */}
                        <span className="text-[11px] font-mono text-slate-500">
                          Opened {new Date(inc.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="text-base sm:text-lg font-bold text-white font-sans">{inc.title}</h4>
                      {inc.description && (
                        <p className="text-xs text-slate-300 leading-relaxed">{inc.description}</p>
                      )}

                      {/* Affected Components */}
                      {inc.affectedComponents.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-mono text-slate-500">Affected:</span>
                          {inc.affectedComponents.map((c) => (
                            <span
                              key={c}
                              className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-cyan-300 text-[10px] font-mono"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Admin Action Deck */}
                    {isAdmin && (
                      <div className="flex flex-wrap sm:flex-col items-end gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                        {inc.status !== 'fixing' && (
                          <button
                            type="button"
                            onClick={() => handleMarkFixing(inc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <Wrench size={13} />
                            <span>Mark as Fixing</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMarkResolved(inc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Check size={13} />
                          <span>Mark as Resolved</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIncident(inc);
                            setIsUpdateModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-all cursor-pointer"
                        >
                          <MessageSquare size={13} />
                          <span>+ Add Note</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteIncident(inc)}
                          title="Delete incident"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Incident Updates Timeline */}
                  {inc.updates.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 font-bold uppercase">Update Timeline:</div>
                      <div className="space-y-2">
                        {inc.updates.map((up) => (
                          <div key={up.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-900 text-xs">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                              <span className="uppercase text-amber-400 font-bold">[{up.status}]</span>
                              <span>{new Date(up.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-slate-200">{up.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4B: Past Resolved Incidents */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider">
              Past Resolved Incidents ({resolvedIncidents.length})
            </h3>
          </div>

          {resolvedIncidents.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#090D18] border border-slate-800/80 text-center text-xs font-mono text-slate-500">
              No historical incidents logged.
            </div>
          ) : (
            <div className="space-y-3">
              {resolvedIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#090D18] border border-slate-800/80 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase">
                        <Check size={11} />
                        <span>RESOLVED</span>
                      </span>
                      <h4 className="text-sm font-bold text-white font-sans">{inc.title}</h4>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      {inc.resolvedAt ? `Resolved on ${new Date(inc.resolvedAt).toLocaleDateString()}` : 'Resolved'}
                    </div>
                  </div>

                  {inc.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">{inc.description}</p>
                  )}

                  {/* Updates */}
                  {inc.updates.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                      <span className="font-mono text-emerald-400 text-[11px] font-bold">Latest Resolution Note: </span>
                      <span>{inc.updates[0].message}</span>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteIncident(inc)}
                        className="text-[11px] font-mono text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 size={11} />
                        <span>Delete Log</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Modal: Create New Incident (Admin Only) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0B101E] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-400" />
                <h3 className="text-base font-bold text-white font-sans">Report System Incident</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Incident Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. ABA PayWay Webhook Delay, Core Gateway Latency..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none"
                  >
                    <option value="minor">Minor (Performance)</option>
                    <option value="major">Major (Partial Outage)</option>
                    <option value="critical">Critical (Service Down)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Initial Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="fixing">Fixing (In Progress)</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Affected Components */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Affected Subsystems</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-900">
                  {[
                    'Core API Gateway',
                    'Realtime WebSocket Engine',
                    'Database Engine',
                    'ABA PayWay & Bakong KHQR Webhook',
                    'OBS Stream Overlays Delivery CDN',
                    'Neural TTS & Voice Engine'
                  ].map((c) => {
                    const checked = selectedComponents.includes(c);
                    return (
                      <label
                        key={c}
                        className={`p-2 rounded-lg border text-[11px] cursor-pointer flex items-center gap-2 transition-colors ${
                          checked
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedComponents([...selectedComponents, c]);
                            } else {
                              setSelectedComponents(selectedComponents.filter((x) => x !== c));
                            }
                          }}
                          className="w-3.5 h-3.5 accent-cyan-400"
                        />
                        <span className="truncate">{c}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Description &amp; Action Plan</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the issue symptoms, affected streamers, and engineering investigation..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Post Timeline Update Note */}
      {isUpdateModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0B101E] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-sans truncate">
                  Post Update: {selectedIncident.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePostUpdate} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Status Transition</label>
                <select
                  value={updateTargetStatus}
                  onChange={(e) => setUpdateTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white outline-none"
                >
                  <option value="investigating">Investigating</option>
                  <option value="fixing">Fixing (In Progress)</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Progress Message</label>
                <textarea
                  rows={3}
                  required
                  value={updateMessage}
                  onChange={(e) => setUpdateMessage(e.target.value)}
                  placeholder="e.g. Patch deployed to node-01, verifying payment webhooks..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
