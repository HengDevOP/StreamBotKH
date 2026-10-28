'use client';

import React from 'react';
import { Play, CheckCircle2, Clock, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

interface RecentDonationsTableProps {
  donations?: Array<{
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
  }>;
  onReplayAlert?: (donation: any) => void;
  onDeleteDonation?: (donationId: string) => void;
  deletingId?: string | null;
}

export const RecentDonationsTable: React.FC<RecentDonationsTableProps> = ({
  donations = [],
  onReplayAlert,
  onDeleteDonation,
  deletingId
}) => {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Recent Donations
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Live incoming tips from ABA Bank & Bakong KHQR</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-xs font-mono text-cyan-400 border border-slate-700">
          {donations.length} records
        </div>
      </div>

      {/* Mobile Card List View (< 640px) */}
      <div className="block sm:hidden divide-y divide-slate-800/60">
        {donations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono px-4">
            No donations received yet. Share your stream link to start receiving tips!
          </div>
        ) : (
          donations.map((d) => (
            <div key={d.id} className="p-3.5 space-y-2 hover:bg-slate-900/40 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
                    {d.donor_name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">
                      {d.donor_name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {d.paid_at || d.created_at ? new Date(d.paid_at || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 font-mono font-black text-sm">
                  {d.currency === 'KHR' ? (
                    <span className="text-pink-400">{d.amount.toLocaleString()} ៛</span>
                  ) : (
                    <span className="text-cyan-400">${d.amount.toFixed(2)}</span>
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
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-cyan-300 text-[10px]">
                    {d.banking_name || (d.payment_method === 'ABA_PAYWAY' ? 'ABA PayWay' : 'Bakong KHQR')}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    d.status === 'PAID'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {d.status === 'PAID' ? <CheckCircle2 size={10} /> : <Clock size={10} />} {d.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {onReplayAlert && (
                    <button
                      type="button"
                      onClick={() => onReplayAlert(d)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Replay Alert"
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
                      className="p-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors disabled:opacity-50"
                      title="Delete record"
                    >
                      {deletingId === d.id ? <Loader2 size={12} className="animate-spin text-red-400" /> : <Trash2 size={12} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
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
            {donations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No donations received yet. Share your stream link to start receiving tips!
                </td>
              </tr>
            ) : (
              donations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-3.5 px-5 font-semibold text-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                      {d.donor_name.slice(0, 1)}
                    </div>
                    <span>{d.donor_name}</span>
                  </td>
                  <td className="py-3.5 px-5 font-mono font-bold text-white">
                    {d.currency === 'KHR' ? (
                      <span className="text-pink-400">{d.amount.toLocaleString()} ៛</span>
                    ) : (
                      <span className="text-cyan-400">${d.amount.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 max-w-xs truncate text-slate-300">
                    {d.donor_message ? (
                      <span className="flex items-center gap-1.5 text-xs italic text-slate-300">
                        <MessageSquare size={13} className="text-slate-500 flex-shrink-0" />
                        "{d.donor_message}"
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">No message</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-xs font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-cyan-300">
                      {d.banking_name || (d.payment_method === 'ABA_PAYWAY' ? 'ABA PayWay' : 'Bakong KHQR')}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    {d.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={12} /> PAID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock size={12} /> PENDING
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
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
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
