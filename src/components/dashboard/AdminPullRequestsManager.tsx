'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  GitPullRequest,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Crown,
  Trash2,
  Search,
  Send
} from 'lucide-react';
import { request } from '../../services/api';
import { IssueReport } from '../../types/streamer';
import { useModal } from '../../context/ModalContext';

interface AdminPullRequestsManagerProps {
  isAdmin: boolean;
  onUserPlanUpdated?: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  bug: { label: 'Bug / Issue', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  plan_upgrade: { label: 'Plan Upgrade (31d)', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  payment: { label: 'Payment / KHQR', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  feature: { label: 'Feature Request', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  other: { label: 'General Support', color: 'bg-slate-800 text-slate-300 border-slate-700' }
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  resolved: { label: 'Resolved', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  closed: { label: 'Closed', color: 'bg-slate-800 text-slate-400 border-slate-700' }
};

export const AdminPullRequestsManager: React.FC<AdminPullRequestsManagerProps> = ({
  isAdmin,
  onUserPlanUpdated
}) => {
  const { showConfirm } = useModal();
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New Issue Report Form
  const [showCreateForm, setShowCreateForm] = useState(!isAdmin);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'bug' | 'plan_upgrade' | 'payment' | 'feature' | 'other'>('bug');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Admin Reply State
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await request<{
        issues: IssueReport[];
        summary: { total: number; open: number; inProgress: number; resolved: number; closed: number };
      }>('/issues');
      setIssues(data.issues || []);
      setSummary(data.summary || { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });

      const drafts: Record<string, string> = {};
      (data.issues || []).forEach((item) => {
        drafts[item.id] = item.adminNote || '';
      });
      setNoteDrafts(drafts);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load pull requests / issue reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await request('/issues', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          category,
          priority,
          description: description.trim()
        })
      });
      setTitle('');
      setDescription('');
      if (isAdmin) setShowCreateForm(false);
      setToastMsg('Issue report submitted to Pull Requests queue!');
      setTimeout(() => setToastMsg(null), 3500);
      await loadIssues();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit issue report');
    } finally {
      setSubmitting(false);
    }
  };

  const executeAdminUpdate = async (
    id: string,
    newStatus: string,
    upgradeUserPlan = false
  ) => {
    try {
      setUpdatingId(id);
      setErrorMsg(null);
      await request('/issues', {
        method: 'PUT',
        body: JSON.stringify({
          id,
          status: newStatus,
          adminNote: noteDrafts[id] ?? '',
          upgradeUserPlan,
          durationDays: 31
        })
      });
      setToastMsg(
        upgradeUserPlan
          ? 'Pull request resolved & user upgraded to Pro Plan (31 days)!'
          : `Pull request #${id} updated!`
      );
      setTimeout(() => setToastMsg(null), 3500);
      await loadIssues();
      if (upgradeUserPlan && onUserPlanUpdated) {
        onUserPlanUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update pull request');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAdminUpdate = (
    id: string,
    newStatus: string,
    upgradeUserPlan = false
  ) => {
    if (upgradeUserPlan) {
      const targetIssue = issues.find((item) => item.id === id);
      const targetUserLabel = targetIssue?.streamerUsername
        ? `@${targetIssue.streamerUsername}`
        : targetIssue?.streamerEmail || 'this user';

      showConfirm({
        title: `Upgrade ${targetUserLabel} to Pro Plan (31 Days)?`,
        message: `Are you sure you want to resolve this pull request and upgrade ${targetUserLabel} to the Pro Plan (100MB storage, removed watermark) for 31 days?`,
        type: 'info',
        confirmText: 'Confirm Pro (31d)',
        cancelText: 'Cancel',
        onConfirm: async () => {
          await executeAdminUpdate(id, newStatus, true);
        }
      });
      return;
    }

    executeAdminUpdate(id, newStatus, false);
  };

  const handleDeleteIssue = async (id: string) => {
    try {
      setUpdatingId(id);
      await request(`/issues?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      await loadIssues();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete issue report');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.streamerUsername && item.streamerUsername.toLowerCase().includes(q)) ||
        (item.streamerEmail && item.streamerEmail.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [issues, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
              {isAdmin ? 'Pull Requests • Client Issue Reports' : 'Report Issue & Pull Requests'}
            </h2>
            {isAdmin && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
                Admin Queue
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Review all incoming client issue reports, bug tickets, and Pro plan upgrade requests.'
              : 'Submit an issue report, bug ticket, or plan request directly to the StreamBotKH Admin team.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 text-xs font-extrabold transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>{showCreateForm ? 'Hide Form' : 'New Issue Report'}</span>
          </button>

          <button
            onClick={loadIssues}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Submit Issue Report Form */}
      {showCreateForm && (
        <form
          onSubmit={handleSubmitIssue}
          className="p-6 rounded-2xl bg-[#090D18] border border-cyan-500/30 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
              <GitPullRequest size={16} className="text-cyan-400" />
              <span>Submit Client Issue Report / Request</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="bug">Bug / Technical Issue</option>
                <option value="plan_upgrade">Pro Plan Upgrade Request (31d)</option>
                <option value="payment">Payment / KHQR Issue</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other Support</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                Issue Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Request Pro Plan 31d / Alert sound issue"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
              Detailed Description
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or request in detail..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#090D18] border border-slate-800">
          <div className="text-[10px] font-mono uppercase text-slate-400">Total Pull Requests</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{summary.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#090D18] border border-emerald-500/30">
          <div className="text-[10px] font-mono uppercase text-emerald-300">Open Issues</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{summary.open}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#090D18] border border-amber-500/30">
          <div className="text-[10px] font-mono uppercase text-amber-300">In Progress</div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{summary.inProgress}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#090D18] border border-purple-500/30">
          <div className="text-[10px] font-mono uppercase text-purple-300">Resolved</div>
          <div className="text-2xl font-extrabold text-purple-400 font-mono mt-1">{summary.resolved}</div>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#090D18] p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues by ID, title, @username, or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'open', 'in_progress', 'resolved', 'closed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 rounded-2xl bg-[#090D18] border border-slate-800 text-center text-xs font-mono text-slate-400">
            Loading client pull requests...
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#090D18] border border-slate-800 text-center space-y-2">
            <GitPullRequest size={28} className="text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">No Pull Requests Found</div>
            <p className="text-xs text-slate-400">
              Client issue reports and support requests will appear here.
            </p>
          </div>
        ) : (
          filteredIssues.map((item) => {
            const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;
            const st = STATUS_LABELS[item.status] || STATUS_LABELS.open;
            const isUpdating = updatingId === item.id;

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-[#090D18] border border-slate-800 hover:border-slate-700/80 transition-colors space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-cyan-400">#{item.id}</span>
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold uppercase ${st.color}`}>
                      {st.label}
                    </span>
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                      Priority: {item.priority}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                    {item.description}
                  </p>
                </div>

                {/* Reporter Profile */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={
                        item.streamerAvatar ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${item.streamerUsername || 'user'}`
                      }
                      alt={item.streamerDisplayName}
                      className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 object-cover"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-200">{item.streamerDisplayName}</span>
                      <span className="font-mono text-cyan-400 ml-1.5">@{item.streamerUsername}</span>
                      {item.streamerEmail && (
                        <span className="font-mono text-slate-400 ml-2">({item.streamerEmail})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Response & Controls */}
                {isAdmin ? (
                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={noteDrafts[item.id] ?? ''}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Add an admin note / resolution comment..."
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleAdminUpdate(item.id, 'in_progress', false)}
                          disabled={isUpdating}
                          className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold cursor-pointer disabled:opacity-50"
                        >
                          In Progress
                        </button>

                        <button
                          onClick={() => handleAdminUpdate(item.id, 'resolved', false)}
                          disabled={isUpdating}
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold cursor-pointer disabled:opacity-50"
                        >
                          Mark Resolved
                        </button>

                        <button
                          onClick={() => handleAdminUpdate(item.id, 'resolved', true)}
                          disabled={isUpdating}
                          title="Resolve request and grant 31-day Pro Plan to this user"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 hover:from-purple-400 hover:to-cyan-300 text-slate-950 text-[11px] font-mono font-extrabold cursor-pointer disabled:opacity-50"
                        >
                          <Crown size={12} />
                          <span>Approve Pro (31d)</span>
                        </button>

                        <button
                          onClick={() => handleDeleteIssue(item.id)}
                          disabled={isUpdating}
                          title="Delete Request"
                          className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/50 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  item.adminNote && (
                    <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-1">
                      <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold flex items-center gap-1.5">
                        <MessageSquare size={12} />
                        <span>Admin Response</span>
                      </div>
                      <div className="text-slate-200">{item.adminNote}</div>
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
