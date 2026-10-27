import React from 'react';
import { Play, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
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
}

export const RecentDonationsTable: React.FC<RecentDonationsTableProps> = ({
  donations = [],
  onReplayAlert
}) => {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Recent Donations
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Live incoming tips from ABA Bank & Bakong KHQR</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-xs font-mono text-cyan-400 border border-slate-700">
          {donations.length} records
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReplayAlert?.(d)}
                      icon={<Play size={12} />}
                      title="Replay Alert on OBS"
                    >
                      Replay
                    </Button>
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
