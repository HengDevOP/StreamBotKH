'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CheckCircle2, MessageSquare, Trash2, Loader2, Radio, Receipt, X, Copy, Check } from 'lucide-react';
import type { TimeframeOption } from './OverviewStats';

export interface DonationRecord {
  id: string;
  donor_name: string;
  donor_message?: string;
  amount: number;
  currency: 'USD' | 'KHR';
  banking_name?: string;
  payment_method: string;
  status: string;
  created_at: string;
  paid_at?: string;
}

interface RecentDonationsTableProps {
  donations?: DonationRecord[];
  limit?: number;
  title?: string;
  subtitle?: string;
  timeframe?: TimeframeOption;
  customRange?: { startDate: string; endDate: string };
  onReplayAlert?: (donation: DonationRecord) => void;
  onDeleteDonation?: (donationId: string) => void;
  deletingId?: string | null;
}

const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '1d': 'Yesterday',
  '3d': '3d',
  this_week: 'Last Week',
  last_week: 'Last Week',
  this_month: 'Last Month',
  last_month: 'Last Month',
  '3_months': '3 Months',
  '6_months': '6 Months',
  lifetime: 'Lifetime',
  custom: 'Custom'
};

export const RecentDonationsTable: React.FC<RecentDonationsTableProps> = ({
  donations = [],
  limit = 10,
  title = 'Recent Donations',
  subtitle,
  timeframe,
  customRange,
  onDeleteDonation,
  deletingId
}) => {
  // Modal preview state for full receipt view
  const [selectedReceipt, setSelectedReceipt] = useState<DonationRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedReceipt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedReceipt(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedReceipt]);

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(id).catch(() => {});
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Filter strictly for PAID status and active timeframe filter, sorted newest first, and sliced to `limit`
  const paidDonations = useMemo(() => {
    const nowDate = new Date();
    const now = nowDate.getTime();
    const todayStr = nowDate.toISOString().slice(0, 10);
    const todayLocalDate = nowDate.toDateString();

    const yesterdayDate = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
    const yesterdayLocalDate = yesterdayDate.toDateString();

    const startOfWeek = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const dayOfWeek = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekTime = startOfWeek.getTime();

    const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0, 0);
    const startOfMonthTime = startOfMonth.getTime();

    const ms1d = 24 * 60 * 60 * 1000;
    const ms90d = 90 * ms1d;
    const ms180d = 180 * ms1d;

    const paidOnly = (donations || []).filter((d) => {
      if ((d.status || '').toUpperCase() !== 'PAID') return false;
      if (!timeframe || timeframe === 'lifetime') return true;

      const dt = new Date(d.paid_at || d.created_at || now);
      const t = dt.getTime();
      const age = now - t;

      switch (timeframe) {
        case 'today':
          return dt.toISOString().slice(0, 10) === todayStr || dt.toDateString() === todayLocalDate;
        case 'yesterday':
        case '1d':
          return dt.toISOString().slice(0, 10) === yesterdayStr || dt.toDateString() === yesterdayLocalDate;
        case 'this_week':
          return t >= startOfWeekTime && t <= now;
        case 'last_week':
          return age <= 7 * ms1d;
        case 'this_month':
          return t >= startOfMonthTime && t <= now;
        case 'last_month':
          return age <= 30 * ms1d;
        case '3_months':
          return age <= ms90d;
        case '6_months':
          return age <= ms180d;
        case '3d':
          return age <= 3 * ms1d;
        case 'custom': {
          if (!customRange?.startDate || !customRange?.endDate) return true;
          const startT = new Date(`${customRange.startDate}T00:00:00`).getTime();
          const endT = new Date(`${customRange.endDate}T23:59:59.999`).getTime();
          return t >= startT && t <= endT;
        }
        default:
          return true;
      }
    });

    const sorted = [...paidOnly].sort((a, b) => {
      const timeA = new Date(a.paid_at || a.created_at || 0).getTime();
      const timeB = new Date(b.paid_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return typeof limit === 'number' && limit > 0 ? sorted.slice(0, limit) : sorted;
  }, [donations, limit, timeframe, customRange]);

  // Visual pulse / highlight for newly arrived realtime donation
  const [newlyArrivedId, setNewlyArrivedId] = useState<string | null>(null);
  const prevFirstIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (paidDonations.length > 0) {
      const currentFirstId = paidDonations[0].id;
      if (prevFirstIdRef.current && prevFirstIdRef.current !== currentFirstId) {
        setNewlyArrivedId(currentFirstId);
        const timer = setTimeout(() => {
          setNewlyArrivedId(null);
        }, 4500);
        return () => clearTimeout(timer);
      }
      prevFirstIdRef.current = currentFirstId;
    }
  }, [paidDonations]);

  const formatBankName = (bankingName?: string, paymentMethod?: string) => {
    if (bankingName) return bankingName;
    if (paymentMethod === 'ABA_PAYWAY') return 'ABA PayWay';
    if (paymentMethod === 'BAKONG_KHQR') return 'Bakong KHQR';
    return paymentMethod || 'ABA Bank';
  };

  const formatTime = (paidAt?: string, createdAt?: string) => {
    const target = paidAt || createdAt;
    if (!target) return 'Just now';
    try {
      const date = new Date(target);
      if (isNaN(date.getTime())) return 'Just now';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  const formatDate = (paidAt?: string, createdAt?: string) => {
    const target = paidAt || createdAt;
    if (!target) return '';
    try {
      const date = new Date(target);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatFullDateTime = (target?: string) => {
    if (!target) return 'N/A';
    try {
      const d = new Date(target);
      if (isNaN(d.getTime())) return target;
      return d.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return target;
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-800 shadow-sm bg-[#090D18]">
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white font-['Chakra_Petch']">
            {title}{timeframe ? ` (${TIMEFRAME_LABELS[timeframe]})` : ''}
          </h3>
          {subtitle ? <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p> : null}
        </div>
      </div>

      {/* Mobile Card List View (< 640px) */}
      <div className="block sm:hidden divide-y divide-slate-800/60 flex-1">
        {paidDonations.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 font-mono px-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
              <Radio size={14} className="animate-pulse text-slate-400" />
            </div>
            <p>No Data</p>
          </div>
        ) : (
          paidDonations.map((d) => {
            const isNew = newlyArrivedId === d.id;
            return (
              <div
                key={d.id}
                onClick={() => setSelectedReceipt(d)}
                className={`p-3.5 space-y-2 transition-colors cursor-pointer select-none ${
                  isNew
                    ? 'bg-emerald-950/20 border-l-2 border-emerald-400'
                    : 'hover:bg-slate-800/30 active:bg-slate-800/50'
                }`}
              >
                {/* Row 1: Donor Name & Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-100 truncate block">
                        {d.donor_name}
                      </span>
                      {isNew && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          LIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      {formatTime(d.paid_at, d.created_at)}
                      {formatDate(d.paid_at, d.created_at) ? ` • ${formatDate(d.paid_at, d.created_at)}` : ''}
                    </span>
                  </div>

                  <div className="text-right flex-shrink-0 font-mono font-bold text-xs sm:text-sm text-white">
                    {d.currency === 'KHR'
                      ? `${Number(d.amount).toLocaleString()} ៛`
                      : `$${Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </div>
                </div>

                {/* Row 2: Message preview (if any) */}
                {d.donor_message && (
                  <div className="text-[11px] text-slate-300 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 flex items-start gap-1.5">
                    <MessageSquare size={11} className="text-slate-500 mt-0.5 flex-shrink-0" />
                    <span className="break-words line-clamp-2">"{d.donor_message}"</span>
                  </div>
                )}

                {/* Row 3: Method Badge & Status */}
                <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/70">
                      {formatBankName(d.banking_name, d.payment_method)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-slate-400 bg-slate-800/60">
                      <CheckCircle2 size={10} className="text-emerald-400" /> PAID
                    </span>
                  </div>

                  {onDeleteDonation && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDonation(d.id);
                      }}
                      disabled={deletingId === d.id}
                      className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Delete record"
                    >
                      {deletingId === d.id ? <Loader2 size={12} className="animate-spin text-red-400" /> : <Trash2 size={12} />}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Table View (>= 640px) */}
      <div className="hidden sm:flex sm:flex-col flex-1 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
        <table className="w-full min-w-[580px] table-fixed text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-semibold tracking-wider text-slate-400">
              <th className="py-2.5 px-4 w-[28%]">Donor</th>
              <th className="py-2.5 px-4 w-[18%]">Amount</th>
              <th className="py-2.5 px-4 w-[30%]">Message</th>
              <th className="py-2.5 px-4 w-[14%]">Method</th>
              <th className="py-2.5 px-4 w-[10%]">Status</th>
              {onDeleteDonation && <th className="py-2.5 px-3 w-[40px] text-right"></th>}
            </tr>
          </thead>
          {paidDonations.length > 0 && (
            <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
              {paidDonations.map((d) => {
                const isNew = newlyArrivedId === d.id;
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedReceipt(d)}
                    title="Click to view receipt"
                    className={`transition-colors cursor-pointer group ${
                      isNew
                        ? 'bg-emerald-950/20 border-l-2 border-emerald-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Donor Column (No logo, only donor name) */}
                    <td className="py-3 px-4 text-slate-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-100 truncate block text-xs sm:text-sm">
                            {d.donor_name}
                          </span>
                          {isNew && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-slate-400 font-normal mt-0.5">
                          <span>{formatTime(d.paid_at, d.created_at)}</span>
                          {formatDate(d.paid_at, d.created_at) && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span>{formatDate(d.paid_at, d.created_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount Column (Clean, simple text) */}
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap text-xs sm:text-sm">
                      {d.currency === 'KHR'
                        ? `${Number(d.amount).toLocaleString()} ៛`
                        : `$${Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </td>

                    {/* Message Column */}
                    <td className="py-3 px-4 truncate text-slate-300">
                      {d.donor_message ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-300 truncate" title={d.donor_message}>
                          <MessageSquare size={12} className="text-slate-500 flex-shrink-0" />
                          <span className="truncate italic">"{d.donor_message}"</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 italic">No message</span>
                      )}
                    </td>

                    {/* Method Column */}
                    <td className="py-3 px-4 text-xs font-mono whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">
                        {formatBankName(d.banking_name, d.payment_method)}
                      </span>
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-slate-800/80 border border-slate-700/60">
                        <CheckCircle2 size={10} className="text-emerald-400" /> PAID
                      </span>
                    </td>

                    {/* Optional Delete Column */}
                    {onDeleteDonation && (
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDonation(d.id);
                          }}
                          disabled={deletingId === d.id}
                          className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                          title="Delete donation record"
                        >
                          {deletingId === d.id ? (
                            <Loader2 size={12} className="animate-spin text-red-400" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>

        {paidDonations.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-slate-500 gap-2 min-h-[140px]">
            <Radio size={16} className="animate-pulse text-slate-500" />
            <p className="font-mono text-xs">No Data</p>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* SIMPLE, DEFAULT RECEIPT MODAL (NO COLOR / AI EFFECTS)           */}
      {/* ============================================================== */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm sm:max-w-md bg-[#0F1422] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-slate-300">
                <Receipt size={16} className="text-slate-400" />
                <h4 className="text-sm font-semibold font-['Chakra_Petch'] tracking-wide">
                  Donation Receipt
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label="Close receipt"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Amount Centerpiece */}
              <div className="text-center py-2 space-y-1.5">
                <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">
                  {selectedReceipt.currency === 'KHR'
                    ? `${Number(selectedReceipt.amount).toLocaleString()} ៛`
                    : `$${Number(selectedReceipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700/80">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>PAID</span>
                </div>
              </div>

              {/* Dashed Receipt Line */}
              <div className="border-t border-dashed border-slate-800" />

              {/* Key-Value Details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Donor Name</span>
                  <span className="font-semibold text-slate-200 text-right truncate">
                    {selectedReceipt.donor_name}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Payment Method</span>
                  <span className="font-mono text-slate-300 text-right">
                    {formatBankName(selectedReceipt.banking_name, selectedReceipt.payment_method)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Date & Time</span>
                  <span className="font-mono text-slate-300 text-right">
                    {formatFullDateTime(selectedReceipt.paid_at || selectedReceipt.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Currency</span>
                  <span className="font-mono text-slate-300">
                    {selectedReceipt.currency}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Transaction ID</span>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    <span>{selectedReceipt.id.slice(0, 18)}...</span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(selectedReceipt.id, e)}
                      className="p-1 rounded hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                      title="Copy Transaction ID"
                    >
                      {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Donor Message (if present) */}
              {selectedReceipt.donor_message && (
                <>
                  <div className="border-t border-dashed border-slate-800" />
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-slate-500">Donor Message</span>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 italic break-words leading-relaxed">
                      "{selectedReceipt.donor_message}"
                    </div>
                  </div>
                </>
              )}

              {/* Dashed Receipt Line */}
              <div className="border-t border-dashed border-slate-800" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
