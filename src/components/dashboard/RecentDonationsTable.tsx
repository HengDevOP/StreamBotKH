'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, MessageSquare, Trash2, Loader2, Radio } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

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
  limit?: number; // Capped at latest 10 records by default
  title?: string;
  subtitle?: string;
  onReplayAlert?: (donation: DonationRecord) => void;
  onDeleteDonation?: (donationId: string) => void;
  deletingId?: string | null;
}

export const RecentDonationsTable: React.FC<RecentDonationsTableProps> = ({
  donations = [],
  limit = 10,
  title = 'Recent Donations',
  subtitle = 'Live incoming tips from ABA Bank & Bakong KHQR (Paid Only)',
  onReplayAlert,
  onDeleteDonation,
  deletingId
}) => {
  // Filter strictly for PAID status only, sorted newest first, and sliced to exactly `limit` (latest 10)
  const paidDonations = useMemo(() => {
    const paidOnly = (donations || []).filter(
      (d) => (d.status || '').toUpperCase() === 'PAID'
    );

    const sorted = [...paidOnly].sort((a, b) => {
      const timeA = new Date(a.paid_at || a.created_at || 0).getTime();
      const timeB = new Date(b.paid_at || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return typeof limit === 'number' && limit > 0 ? sorted.slice(0, limit) : sorted;
  }, [donations, limit]);

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

  const getBankBadgeStyle = (bankingName?: string, paymentMethod?: string) => {
    const text = `${bankingName || ''} ${paymentMethod || ''}`.toLowerCase();
    if (text.includes('aba')) {
      return 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60';
    }
    if (text.includes('bakong') || text.includes('khqr')) {
      return 'bg-red-950/70 text-red-300 border-red-700/60';
    }
    if (text.includes('wing')) {
      return 'bg-lime-950/70 text-lime-300 border-lime-700/60';
    }
    if (text.includes('acleda')) {
      return 'bg-blue-950/70 text-blue-300 border-blue-700/60';
    }
    if (text.includes('canadia')) {
      return 'bg-orange-950/70 text-orange-300 border-orange-700/60';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700/80';
  };

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
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  return (
    <Card className="p-0 overflow-hidden border-slate-800/80 shadow-xl bg-slate-900/60 backdrop-blur-md">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-mono text-emerald-400 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Realtime</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-slate-800/80 text-xs font-mono text-cyan-400 border border-slate-700/80 shadow-sm">
            Latest {paidDonations.length} records {limit ? `(Max ${limit})` : ''}
          </div>
        </div>
      </div>

      {/* Mobile Card List View (< 640px) */}
      <div className="block sm:hidden divide-y divide-slate-800/60">
        {paidDonations.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 font-mono px-4 space-y-2">
            <div className="w-8 h-8 rounded-full bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
              <Radio size={14} className="animate-pulse text-emerald-400" />
            </div>
            <p>Waiting for incoming live tips from ABA Bank or Bakong KHQR...</p>
          </div>
        ) : (
          paidDonations.map((d) => {
            const isNew = newlyArrivedId === d.id;
            return (
              <div
                key={d.id}
                className={`p-3.5 space-y-2.5 transition-all duration-500 ${
                  isNew
                    ? 'bg-emerald-950/25 border-l-4 border-emerald-400'
                    : 'hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0 shadow-sm">
                      {d.donor_name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate block">
                          {d.donor_name}
                        </span>
                        {isNew && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatTime(d.paid_at, d.created_at)}
                        {formatDate(d.paid_at, d.created_at) ? ` • ${formatDate(d.paid_at, d.created_at)}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 font-mono font-black text-sm">
                    {d.currency === 'KHR' ? (
                      <span className="text-pink-400">{Number(d.amount).toLocaleString()} ៛</span>
                    ) : (
                      <span className="text-cyan-400">${Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>

                {d.donor_message && (
                  <div className="text-xs text-slate-300 italic bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex items-start gap-1.5">
                    <MessageSquare size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                    <span className="break-words line-clamp-3">"{d.donor_message}"</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${getBankBadgeStyle(d.banking_name, d.payment_method)}`}>
                      {formatBankName(d.banking_name, d.payment_method)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={10} /> PAID
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onReplayAlert && (
                      <button
                        type="button"
                        onClick={() => onReplayAlert(d)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Replay Alert on OBS"
                      >
                        <Play size={10} />
                        <span>Replay</span>
                      </button>
                    )}
                    {onDeleteDonation && (
                      <button
                        type="button"
                        onClick={() => onDeleteDonation(d.id)}
                        disabled={deletingId === d.id}
                        className="p-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Delete record"
                      >
                        {deletingId === d.id ? <Loader2 size={12} className="animate-spin text-red-400" /> : <Trash2 size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Table View (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
        <table className="w-full min-w-[620px] text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-5">Donor</th>
              <th className="py-3 px-5">Amount</th>
              <th className="py-3 px-5">Message</th>
              <th className="py-3 px-5">Method</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {paidDonations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Radio size={18} className="animate-pulse text-emerald-400" />
                    <p className="font-mono text-xs">Waiting for incoming live tips from ABA Bank or Bakong KHQR...</p>
                  </div>
                </td>
              </tr>
            ) : (
              paidDonations.map((d) => {
                const isNew = newlyArrivedId === d.id;
                return (
                  <tr
                    key={d.id}
                    className={`transition-all duration-500 group ${
                      isNew
                        ? 'bg-emerald-950/25 border-l-4 border-emerald-400'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3.5 px-5 font-semibold text-slate-100 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0 shadow-sm">
                        {d.donor_name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-100 truncate block text-sm">{d.donor_name}</span>
                          {isNew && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 font-normal">
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
                    <td className="py-3.5 px-5 font-mono font-bold text-white whitespace-nowrap">
                      {d.currency === 'KHR' ? (
                        <span className="text-pink-400 font-black">{Number(d.amount).toLocaleString()} ៛</span>
                      ) : (
                        <span className="text-cyan-400 font-black">${Number(d.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 max-w-xs truncate text-slate-300">
                      {d.donor_message ? (
                        <span className="flex items-center gap-1.5 text-xs italic text-slate-300" title={d.donor_message}>
                          <MessageSquare size={13} className="text-slate-500 flex-shrink-0" />
                          <span className="truncate">"{d.donor_message}"</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 italic">No message</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-mono whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${getBankBadgeStyle(d.banking_name, d.payment_method)}`}>
                        {formatBankName(d.banking_name, d.payment_method)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={12} /> PAID
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReplayAlert?.(d)}
                          icon={<Play size={12} />}
                          title="Replay Alert on OBS"
                        >
                          Replay
                        </Button>

                        {onDeleteDonation && (
                          <button
                            type="button"
                            onClick={() => onDeleteDonation(d.id)}
                            disabled={deletingId === d.id}
                            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete donation record"
                          >
                            {deletingId === d.id ? (
                              <Loader2 size={13} className="animate-spin text-red-400" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
