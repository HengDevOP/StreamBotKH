'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Target,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Trophy,
  Sliders,
  Monitor,
  Flame,
  Calendar,
  DollarSign,
  X,
  Play,
  RotateCcw,
  Palette,
  Layers,
  Crown
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import {
  DateTimeCalendarPicker,
  toLocalDateTimeValue,
  formatGoalEndDate
} from '../common/DateTimeCalendarPicker';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
import { GOAL_TEMPLATES, GoalTemplateRenderer, GoalTemplateMeta } from '../overlay/goalTemplates';

export interface StreamGoal {
  id: string;
  token: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  initialAmount?: number;
  accentColor: string;
  templateStyle?: string;
  showBalance?: boolean;
  showBackground?: boolean;
  showAnimation?: boolean;
  endDate?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface GoalWidgetManagerProps {
  streamerToken?: string;
  totalRaised?: number;
}

export const GoalWidgetManager: React.FC<GoalWidgetManagerProps> = ({
  streamerToken,
  totalRaised = 0
}) => {
  const { socket } = useSocket();
  const { showConfirm } = useModal();

  const [goals, setGoals] = useState<StreamGoal[]>([]);
  const [activeGoal, setActiveGoal] = useState<StreamGoal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // Template browser category filter & Modal State
  const [templateFilter, setTemplateFilter] = useState<'All' | 'Cyber' | 'Gaming' | 'Aesthetic' | 'Retro' | 'Minimal' | 'Special'>('All');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateModalTarget, setTemplateModalTarget] = useState<'active' | 'form'>('active');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formTargetInput, setFormTargetInput] = useState<string>('150');
  const [formCurrentInput, setFormCurrentInput] = useState<string>('0');
  const [formColor, setFormColor] = useState<string>('#10B981');
  const [formTemplateStyle, setFormTemplateStyle] = useState<string>('cyber-neon');
  const [formShowBalance, setFormShowBalance] = useState<boolean>(true);
  const [formShowBackground, setFormShowBackground] = useState<boolean>(true);
  const [formShowAnimation, setFormShowAnimation] = useState<boolean>(true);
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedFormTarget = Math.max(1, parseFloat(formTargetInput) || 1);
  const parsedFormCurrent = Math.max(0, parseFloat(formCurrentInput) || 0);

  // Copy & Test status
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGoalId, setCopiedGoalId] = useState<string | null>(null);
  const [isTestingGoal, setIsTestingGoal] = useState(false);

  const obsUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/overlay/goal/${streamerToken || 'streamer-token'}`;

  // 1. Fetch Goals from API
  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/widgets/goals?token=${streamerToken || 'demo-token'}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.goals)) {
        setGoals(data.goals);
        setActiveGoal(data.activeGoal || data.goals[0] || null);
      }
    } catch (e) {
      console.error('[GoalWidgetManager] Error fetching goals:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [streamerToken]);

  // 2. Listen to real-time socket updates
  useEffect(() => {
    if (!socket) return;

    const handleGoalUpdate = (payload: any) => {
      if (!payload || !payload.id || payload.isTest) return;
      setGoals((prev) => {
        const exists = prev.some((g) => g.id === payload.id);
        if (!exists) {
          const base = payload.isActive ? prev.map((g) => ({ ...g, isActive: false })) : prev;
          return [payload as StreamGoal, ...base];
        }
        return prev.map((g) => {
          if (g.id === payload.id) {
            return {
              ...g,
              title: payload.title !== undefined ? payload.title : g.title,
              targetAmount: payload.targetAmount !== undefined ? payload.targetAmount : g.targetAmount,
              currentAmount: payload.currentAmount !== undefined ? payload.currentAmount : g.currentAmount,
              accentColor: payload.accentColor || g.accentColor,
              templateStyle: payload.templateStyle || g.templateStyle,
              showBalance: payload.showBalance !== undefined ? payload.showBalance : g.showBalance,
              showBackground: payload.showBackground !== undefined ? payload.showBackground : g.showBackground,
              showAnimation: payload.showAnimation !== undefined ? payload.showAnimation : g.showAnimation,
              endDate: payload.endDate !== undefined ? payload.endDate : g.endDate,
              isActive: payload.isActive !== undefined ? payload.isActive : g.isActive
            };
          }
          if (payload.isActive) {
            return { ...g, isActive: false };
          }
          return g;
        });
      });

      if (payload.isActive) {
        setActiveGoal(payload as StreamGoal);
      } else if (activeGoal && activeGoal.id === payload.id) {
        setActiveGoal((prev) => (prev ? { ...prev, ...payload } : payload));
      }
    };

    socket.on('goal:update', handleGoalUpdate);
    return () => {
      socket.off('goal:update', handleGoalUpdate);
    };
  }, [socket, activeGoal]);

  const copyObsUrl = () => {
    navigator.clipboard.writeText(obsUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copySpecificGoalUrl = (goalId: string) => {
    const specificUrl = `${obsUrl}?goalId=${goalId}`;
    navigator.clipboard.writeText(specificUrl);
    setCopiedGoalId(goalId);
    setTimeout(() => setCopiedGoalId(null), 2000);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormError(null);
    setFormTitle('');
    setFormTargetInput('150');
    setFormCurrentInput('0');
    setFormColor('#10B981');
    setFormTemplateStyle('cyber-neon');
    setFormShowBalance(true);
    setFormShowBackground(true);
    setFormShowAnimation(true);
    const defaultEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    defaultEnd.setHours(23, 59, 0, 0);
    setFormEndDate(toLocalDateTimeValue(defaultEnd));
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (goal: StreamGoal) => {
    setModalMode('edit');
    setEditingId(goal.id);
    setFormError(null);
    setFormTitle(goal.title);
    setFormTargetInput(String(goal.targetAmount ?? 150));
    setFormCurrentInput(String(goal.currentAmount ?? 0));
    setFormColor(goal.accentColor || '#10B981');
    setFormTemplateStyle(goal.templateStyle || 'cyber-neon');
    setFormShowBalance(goal.showBalance !== false);
    setFormShowBackground(goal.showBackground !== false);
    setFormShowAnimation(goal.showAnimation !== false);
    setFormEndDate(goal.endDate || '');
    setFormIsActive(goal.isActive);
    setIsModalOpen(true);
  };

  // Save Goal (Create or Edit)
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formTitle.trim();
    if (!cleanTitle) {
      setFormError('Please enter a goal title.');
      return;
    }

    const targetNum = Math.max(1, parseFloat(formTargetInput) || 1);
    const currentNum = Math.max(0, parseFloat(formCurrentInput) || 0);

    try {
      setIsSubmitting(true);
      setFormError(null);
      if (modalMode === 'create') {
        const res = await fetch('/api/widgets/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: streamerToken || 'demo-token',
            title: cleanTitle,
            targetAmount: targetNum,
            currentAmount: currentNum,
            accentColor: formColor,
            templateStyle: formTemplateStyle,
            showBalance: formShowBalance,
            showBackground: formShowBackground,
            showAnimation: formShowAnimation,
            endDate: formEndDate || null,
            isActive: formIsActive
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.goal) {
          setFormError(data?.error || 'Failed to create goal. Please try again.');
          return;
        }
        setGoals((prev) => {
          const filtered = prev.filter((g) => g.id !== data.goal.id);
          return formIsActive
            ? [data.goal, ...filtered.map((g) => ({ ...g, isActive: false }))]
            : [data.goal, ...filtered];
        });
        if (formIsActive || !activeGoal) {
          setActiveGoal(data.goal);
        }
        if (!formIsActive && filterStatus === 'active') {
          setFilterStatus('all');
        }
      } else if (modalMode === 'edit' && editingId) {
        const res = await fetch('/api/widgets/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            token: streamerToken || 'demo-token',
            title: cleanTitle,
            targetAmount: targetNum,
            currentAmount: currentNum,
            accentColor: formColor,
            templateStyle: formTemplateStyle,
            showBalance: formShowBalance,
            showBackground: formShowBackground,
            showAnimation: formShowAnimation,
            endDate: formEndDate || null,
            isActive: formIsActive
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.goal) {
          setFormError(data?.error || 'Failed to update goal. Please try again.');
          return;
        }
        setGoals((prev) =>
          prev.map((g) => {
            if (g.id === editingId) return data.goal;
            if (formIsActive) return { ...g, isActive: false };
            return g;
          })
        );
        if (formIsActive || (activeGoal && activeGoal.id === editingId)) {
          setActiveGoal(data.goal);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('[GoalWidgetManager] Error saving goal:', err);
      setFormError('Network error while saving goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Show Balance for Active Goal
  const handleToggleShowBalance = async () => {
    if (!activeGoal) return;
    const newShowBalance = !(activeGoal.showBalance !== false);
    try {
      const res = await fetch('/api/widgets/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeGoal.id,
          token: streamerToken || 'demo-token',
          showBalance: newShowBalance
        })
      });
      const data = await res.json();
      if (data.success && data.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === activeGoal.id ? { ...g, showBalance: newShowBalance } : g))
        );
        setActiveGoal((prev) => (prev ? { ...prev, showBalance: newShowBalance } : null));
      }
    } catch (err) {
      console.error('[GoalWidgetManager] Error toggling balance:', err);
    }
  };

  // Quick Toggle Show Background for Active Goal
  const handleToggleShowBackground = async () => {
    if (!activeGoal) return;
    const newShowBackground = !(activeGoal.showBackground !== false);
    try {
      const res = await fetch('/api/widgets/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeGoal.id,
          token: streamerToken || 'demo-token',
          showBackground: newShowBackground
        })
      });
      const data = await res.json();
      if (data.success && data.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === activeGoal.id ? { ...g, showBackground: newShowBackground } : g))
        );
        setActiveGoal((prev) => (prev ? { ...prev, showBackground: newShowBackground } : null));
      }
    } catch (err) {
      console.error('[GoalWidgetManager] Error toggling background:', err);
    }
  };

  // Quick Toggle Show Animation for Active Goal
  const handleToggleShowAnimation = async () => {
    if (!activeGoal) return;
    const newShowAnimation = !(activeGoal.showAnimation !== false);
    try {
      const res = await fetch('/api/widgets/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeGoal.id,
          token: streamerToken || 'demo-token',
          showAnimation: newShowAnimation
        })
      });
      const data = await res.json();
      if (data.success && data.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === activeGoal.id ? { ...g, showAnimation: newShowAnimation } : g))
        );
        setActiveGoal((prev) => (prev ? { ...prev, showAnimation: newShowAnimation } : null));
      }
    } catch (err) {
      console.error('[GoalWidgetManager] Error toggling animation:', err);
    }
  };

  // Select template from Preview Modal (handles both active goal or form mode)
  const handleSelectTemplateFromModal = async (templateId: string, previewColor: string) => {
    if (templateModalTarget === 'form') {
      setFormTemplateStyle(templateId);
      setFormColor(previewColor);
      setIsTemplateModalOpen(false);
    } else {
      await handleQuickSwitchTemplate(templateId);
      setIsTemplateModalOpen(false);
    }
  };

  // Quick Switch Template for Active Goal
  const handleQuickSwitchTemplate = async (templateId: string) => {
    if (!activeGoal) return;
    try {
      const templateObj = GOAL_TEMPLATES.find((t) => t.id === templateId);
      const newColor = templateObj?.previewColor || activeGoal.accentColor;

      const res = await fetch('/api/widgets/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeGoal.id,
          token: streamerToken || 'demo-token',
          templateStyle: templateId,
          accentColor: newColor
        })
      });
      const data = await res.json();
      if (data.success && data.goal) {
        setGoals((prev) =>
          prev.map((g) => (g.id === activeGoal.id ? { ...g, templateStyle: templateId, accentColor: newColor } : g))
        );
        setActiveGoal((prev) => (prev ? { ...prev, templateStyle: templateId, accentColor: newColor } : null));
      }
    } catch (err) {
      console.error('[GoalWidgetManager] Error switching template:', err);
    }
  };

  // Activate Goal
  const handleSetActive = async (goal: StreamGoal) => {
    try {
      const res = await fetch('/api/widgets/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goal.id,
          token: streamerToken || 'demo-token',
          isActive: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setGoals((prev) =>
          prev.map((g) => ({
            ...g,
            isActive: g.id === goal.id
          }))
        );
        setActiveGoal({ ...goal, isActive: true });
      }
    } catch (err) {
      console.error('[GoalWidgetManager] Error activating goal:', err);
    }
  };

  // Delete Goal with Confirmation Modal
  const handleDeleteGoal = (goal: StreamGoal) => {
    showConfirm({
      title: 'Delete Goal?',
      message: `Are you sure you want to delete "${goal.title}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete Goal',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/widgets/goals?id=${goal.id}&token=${streamerToken || 'demo-token'}`, {
            method: 'DELETE'
          });
          const data = await res.json();
          if (data.success) {
            setGoals((prev) => {
              const remaining = prev.filter((g) => g.id !== goal.id);
              if (goal.isActive && remaining.length > 0) {
                return remaining.map((g, idx) => (idx === 0 ? { ...g, isActive: true } : g));
              }
              return remaining;
            });
            if (activeGoal && activeGoal.id === goal.id) {
              const remaining = goals.filter((g) => g.id !== goal.id);
              setActiveGoal(remaining[0] ? { ...remaining[0], isActive: true } : null);
            }
          }
        } catch (err) {
          console.error('[GoalWidgetManager] Error deleting goal:', err);
        }
      }
    });
  };

  // Trigger Live Test Preview & OBS Overlay Simulation
  const handleTestGoal = async () => {
    if (!activeGoal || isTestingGoal) return;
    setIsTestingGoal(true);
    try {
      await fetch('/api/widgets/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeGoal.id,
          token: streamerToken || 'demo-token',
          simulateTest: true,
          testAmount: 10
        })
      });
    } catch (err) {
      console.error('[GoalWidgetManager] Error testing goal:', err);
    }
    setTimeout(() => {
      setIsTestingGoal(false);
    }, 3500);
  };

  // Reset Active Goal to 0
  const handleResetGoal = () => {
    if (!activeGoal) return;
    const targetGoal = activeGoal;
    showConfirm({
      title: 'Reset Goal Progress?',
      message: `Reset current progress of "${targetGoal.title}" back to $0.00?`,
      type: 'warning',
      confirmText: 'Reset Progress',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/widgets/goals', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: targetGoal.id,
              token: streamerToken || 'demo-token',
              currentAmount: 0
            })
          });
          const data = await res.json();
          if (data.success && data.goal) {
            setGoals((prev) =>
              prev.map((g) => (g.id === targetGoal.id ? { ...g, currentAmount: 0 } : g))
            );
            setActiveGoal((prev) => (prev && prev.id === targetGoal.id ? { ...prev, currentAmount: 0 } : prev));
          }
        } catch (err) {
          console.error('[GoalWidgetManager] Error resetting goal:', err);
        }
      }
    });
  };

  // Filtered list
  const filteredGoals = goals.filter((g) => {
    if (filterStatus === 'active') return g.isActive;
    if (filterStatus === 'completed') return g.currentAmount >= g.targetAmount;
    return true;
  });

  const filteredTemplates = GOAL_TEMPLATES.filter((t) => {
    if (templateFilter === 'All') return true;
    return t.category === templateFilter;
  });

  const currentTemplate = GOAL_TEMPLATES.find((t) => t.id === (activeGoal?.templateStyle || 'cyber-neon')) || GOAL_TEMPLATES[0];

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. ACTIVE GOAL LIVE OBS PREVIEW & 20-TEMPLATE SWITCHER         */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {activeGoal && (
        <Card className="p-5 sm:p-6 bg-[#090D18] border border-slate-800 space-y-5">
          {/* Checkerboard Preview Area */}
          <div className="w-full rounded-2xl bg-[#040711] border border-slate-800/80 px-5 sm:px-8 pt-14 pb-7 sm:py-10 flex items-center justify-center relative overflow-hidden min-h-[210px]">
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
              }}
            />

            {/* Top-Right Simple Test Button */}
            <button
              type="button"
              onClick={handleTestGoal}
              disabled={isTestingGoal}
              className={`absolute top-3 right-3 z-20 px-3.5 py-1.5 rounded-xl font-['Chakra_Petch'] font-bold text-xs tracking-wide flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isTestingGoal
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
              }`}
            >
              <Play
                size={12}
                className={
                  isTestingGoal
                    ? 'text-emerald-300 fill-emerald-300 animate-pulse'
                    : 'text-slate-950 fill-slate-950'
                }
              />
              <span>{isTestingGoal ? 'Testing...' : 'Test'}</span>
            </button>

            {/* Rendered Template */}
            <div className="relative z-10 w-full flex justify-center">
              <GoalTemplateRenderer
                title={activeGoal.title}
                targetAmount={activeGoal.targetAmount}
                currentAmount={isTestingGoal ? activeGoal.currentAmount + 10 : activeGoal.currentAmount}
                accentColor={activeGoal.accentColor || '#10B981'}
                templateStyle={activeGoal.templateStyle || 'cyber-neon'}
                showBalance={activeGoal.showBalance !== false}
                showBackground={activeGoal.showBackground !== false}
                showAnimation={activeGoal.showAnimation !== false}
                endDate={activeGoal.endDate}
                recentDonor={isTestingGoal ? 'Test Supporter' : null}
                addedAmount={isTestingGoal ? 10 : null}
              />
            </div>
          </div>

          {/* Template Info & Modal Trigger Bar (Clean modal preview instead of raw buttons) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10"
                style={{ backgroundColor: `${currentTemplate.previewColor}25`, color: currentTemplate.previewColor }}
              >
                <Palette size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                    Current Style: {currentTemplate.name}
                  </span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
                    {currentTemplate.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{currentTemplate.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTemplateModalTarget('active');
                setIsTemplateModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-white font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] flex-shrink-0"
            >
              <Palette size={14} className="text-cyan-400" />
              <span>Browse 20 Templates (Previews Modal)</span>
            </button>
          </div>
        </Card>
      )}

      {/* ============================================================== */}
      {/* 3. GOALS LIST & MANAGEMENT CONTROLS                             */}
      {/* ============================================================== */}
      <div className="space-y-4">
        {/* List Header & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
              <span>Goal Milestones</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {goals.length}
              </span>
            </h3>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 ml-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${
                  filterStatus === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${
                  filterStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-2.5 py-0.5 rounded-lg transition-colors ${
                  filterStatus === 'completed' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Create Goal Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 self-start sm:self-auto"
            icon={<Plus size={15} />}
          >
            Create Goal
          </Button>
        </div>

        {/* Goals Grid Cards */}
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            Loading goals...
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#090D18] border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Target size={22} />
            </div>
            <h4 className="text-base font-bold text-white font-['Chakra_Petch']">No Goals Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't created any goals in this category yet. Click Create Goal to start tracking a new milestone for your stream!
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold mt-2"
            >
              Create First Goal
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentAmount / (goal.targetAmount || 1)) * 100));
              const isDone = goal.currentAmount >= goal.targetAmount;
              const tpl = GOAL_TEMPLATES.find((t) => t.id === (goal.templateStyle || 'cyber-neon')) || GOAL_TEMPLATES[0];

              return (
                <div
                  key={goal.id}
                  className={`p-5 rounded-2xl bg-[#090D18] border transition-all space-y-3 relative overflow-hidden ${
                    goal.isActive
                      ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Card Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {goal.isActive ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            ACTIVE ON OBS
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                            Inactive
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 font-bold">
                          {tpl.name}
                        </span>
                        {isDone && (
                          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                            <Trophy size={10} />
                            Completed
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white font-['Chakra_Petch'] truncate">
                        {goal.title}
                      </h4>
                    </div>

                    {/* Progress percentage */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-base font-mono font-extrabold text-white">
                        {pct}%
                      </span>
                      <div className="text-[10px] font-mono text-slate-400">
                        ${goal.currentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${goal.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800/80 p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(4, pct)}%`,
                        backgroundColor: goal.accentColor || tpl.previewColor || '#10B981',
                        boxShadow: `0 0 10px ${goal.accentColor || tpl.previewColor || '#10B981'}80`
                      }}
                    />
                  </div>

                  {/* Metadata and Action Buttons */}
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 min-w-0">
                      <Calendar size={12} className="text-slate-500 flex-shrink-0" />
                      <span className="truncate">
                        {goal.endDate ? `Ends: ${formatGoalEndDate(goal.endDate)}` : 'No end date'}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {!goal.isActive && (
                        <button
                          type="button"
                          onClick={() => handleSetActive(goal)}
                          title="Set as Active Goal for OBS"
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copySpecificGoalUrl(goal.id)}
                        title="Copy specific OBS link"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        {copiedGoalId === goal.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(goal)}
                        title="Edit goal & template"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal)}
                        title="Delete goal"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. CREATE / EDIT GOAL MODAL (PORTALED WEB APPLICATION MODAL)   */}
      {/* ============================================================== */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9990] flex items-stretch md:items-center justify-center p-0 md:p-4 bg-[#090D18] md:bg-black/80 md:backdrop-blur-md overscroll-none animate-fade-in"
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full h-full max-h-full md:h-auto md:max-h-[90dvh] md:max-w-2xl rounded-none md:rounded-3xl bg-[#090D18] border-0 md:border border-emerald-500/40 shadow-none md:shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative text-slate-100 antialiased"
            >
              {/* 1. Pinned Modal Header */}
              <div className="px-4 md:px-6 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 md:py-4 border-b border-slate-800/90 bg-[#0B101E] flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Target size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white font-['Chakra_Petch'] truncate leading-tight">
                      {modalMode === 'create' ? 'Create New Goal' : 'Edit Goal & Template'}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate">
                      Real-time OBS milestone bar with custom styling & animation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close modal"
                  className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 2. Form Wrapper (Scrollable Body + Pinned Footer) */}
              <form onSubmit={handleSaveGoal} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4">
                  {/* Inline Error Feedback */}
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300">
                      {formError}
                    </div>
                  )}

                  {/* Live Real-Time OBS Goal Preview Strip */}
                  <div className="rounded-2xl bg-[#040711] border border-slate-800/90 p-3.5 sm:p-5 flex items-center justify-center relative overflow-hidden min-h-[104px] sm:min-h-[120px]">
                    <div
                      className="absolute inset-0 opacity-15 pointer-events-none"
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                        backgroundSize: '18px 18px',
                        backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px'
                      }}
                    />
                    <span className="absolute top-2 left-3 text-[9px] font-mono uppercase tracking-wider text-slate-500 select-none">
                      Live Preview
                    </span>
                    <div className="relative z-10 w-full flex justify-center pt-2 sm:pt-0 transform scale-[0.92] sm:scale-100 origin-center">
                      <GoalTemplateRenderer
                        title={formTitle.trim() || 'New Streaming Setup'}
                        targetAmount={parsedFormTarget}
                        currentAmount={parsedFormCurrent}
                        accentColor={formColor || '#10B981'}
                        templateStyle={formTemplateStyle || 'cyber-neon'}
                        showBalance={formShowBalance}
                        showBackground={formShowBackground}
                        showAnimation={formShowAnimation}
                        endDate={formEndDate || null}
                      />
                    </div>
                  </div>

                  {/* Row 1: Goal Title & End Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-300 block">
                        Goal Title / Milestone *
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus={modalMode === 'create'}
                        placeholder="e.g. New Streaming Setup"
                        value={formTitle}
                        onChange={(e) => {
                          setFormTitle(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-400 transition-colors"
                      />
                    </div>

                    <div className="sm:col-span-6 space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-300 block">
                        End Date
                      </label>
                      <DateTimeCalendarPicker
                        value={formEndDate}
                        onChange={setFormEndDate}
                        placeholder="Select end date & time"
                      />
                    </div>
                  </div>

                  {/* Row 2: Target Goal ($) & Starting Amount ($) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-300 block">
                        Target Goal ($) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-400 select-none">
                          $
                        </span>
                        <input
                          type="number"
                          required
                          min="1"
                          step="any"
                          inputMode="decimal"
                          value={formTargetInput}
                          onChange={(e) => setFormTargetInput(e.target.value)}
                          onBlur={() => {
                            const clamped = Math.max(1, parseFloat(formTargetInput) || 1);
                            setFormTargetInput(String(clamped));
                          }}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-400 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono font-bold text-slate-300 block">
                        Starting Amount ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 select-none">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          value={formCurrentInput}
                          onChange={(e) => setFormCurrentInput(e.target.value)}
                          onBlur={() => {
                            const clamped = Math.max(0, parseFloat(formCurrentInput) || 0);
                            setFormCurrentInput(String(clamped));
                          }}
                          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-400 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Styling Template Selector (20 Designs) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                        <Palette size={13} className="text-emerald-400" />
                        <span>Styling Template (20 Designs)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateModalTarget('form');
                          setIsTemplateModalOpen(true);
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Browse All Previews</span>
                        <ExternalLink size={11} />
                      </button>
                    </div>

                    {(() => {
                      const sel = GOAL_TEMPLATES.find((t) => t.id === formTemplateStyle) || GOAL_TEMPLATES[0];
                      return (
                        <div
                          onClick={() => {
                            setTemplateModalTarget('form');
                            setIsTemplateModalOpen(true);
                          }}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: sel.previewColor }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white font-['Chakra_Petch'] truncate">
                                {sel.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{sel.description}</div>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold group-hover:bg-cyan-500/20 transition-colors flex-shrink-0">
                            Change
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Row 4: Responsive Accent / Glow Color Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-slate-300 block">
                      Custom Accent / Glow Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {['#10B981', '#00F0FF', '#A855F7', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6', '#FBBF24'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormColor(c)}
                          aria-label={`Select color ${c}`}
                          className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                            formColor.toUpperCase() === c ? 'scale-110 border-white shadow-md' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(formColor) ? formColor : '#10B981'}
                          onChange={(e) => setFormColor(e.target.value.toUpperCase())}
                          className="w-7 h-7 rounded-lg bg-transparent border border-slate-700 cursor-pointer p-0 overflow-hidden"
                          title="Pick custom color"
                        />
                        <input
                          type="text"
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          maxLength={9}
                          className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono text-center focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Responsive 2x2 Display & OBS Settings Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setFormShowBalance((v) => !v)}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-slate-200 font-bold block truncate">
                          Show Balance ($ / $)
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Display dollar progress next to title
                        </span>
                      </div>
                      <span
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center flex-shrink-0 ${
                          formShowBalance ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormShowBackground((v) => !v)}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-slate-200 font-bold block truncate">
                          Container Background
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Off = 100% transparent floating bar
                        </span>
                      </div>
                      <span
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center flex-shrink-0 ${
                          formShowBackground ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormShowAnimation((v) => !v)}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1.5 truncate">
                          <Sparkles size={12} className="text-amber-400 flex-shrink-0" />
                          <span className="truncate">Bar Animation</span>
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Dynamic shimmer, scanline & glow
                        </span>
                      </div>
                      <span
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center flex-shrink-0 ${
                          formShowAnimation ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormIsActive((v) => !v)}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        formIsActive
                          ? 'bg-emerald-950/25 border-emerald-500/40'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-mono text-slate-200 font-bold block truncate">
                          Active on OBS Studio
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Display immediately on live overlay
                        </span>
                      </div>
                      <span
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center flex-shrink-0 ${
                          formIsActive ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Pinned Modal Action Footer */}
                <div className="px-4 md:px-6 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:py-3.5 border-t border-slate-800/90 bg-[#0B101E] flex items-center flex-shrink-0">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isSubmitting}
                    disabled={isSubmitting || !formTitle.trim()}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                  >
                    {isSubmitting ? 'Saving...' : modalMode === 'create' ? 'Create Goal' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ============================================================== */}
      {/* 5. TEMPLATE PREVIEWS MODAL (PORTALED ABOVE CREATE GOAL MODAL)  */}
      {/* ============================================================== */}
      {isTemplateModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9995] flex items-stretch md:items-center justify-center p-0 md:p-6 bg-[#080C16] md:bg-black/85 md:backdrop-blur-md overscroll-none animate-fade-in"
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full h-full max-h-full md:h-auto md:max-h-[92dvh] md:max-w-5xl rounded-none md:rounded-3xl bg-[#080C16] border-0 md:border border-cyan-500/30 shadow-none md:shadow-2xl flex flex-col overflow-hidden text-slate-100 antialiased"
            >
              {/* Modal Header */}
              <div className="px-4 md:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-3.5 md:py-5 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/70 flex-shrink-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                      <Palette size={18} />
                    </div>
                    <h3 className="text-base sm:text-xl font-bold text-white font-['Chakra_Petch'] truncate">
                      Goal Styling Templates (20 Designs)
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2">
                    Click any template to apply it. Each template includes custom typography, frames, glowing accents, and progress bar animations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  aria-label="Close templates modal"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
                {(['All', 'Cyber', 'Gaming', 'Aesthetic', 'Retro', 'Minimal', 'Special'] as const).map((cat) => {
                  const count = cat === 'All' ? GOAL_TEMPLATES.length : GOAL_TEMPLATES.filter((t) => t.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTemplateFilter(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                        templateFilter === cat
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                          : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Template Preview Cards Grid */}
              <div className="p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain space-y-4 flex-1 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
                  {filteredTemplates.map((tpl) => {
                    const isCurrentSelected =
                      templateModalTarget === 'form'
                        ? formTemplateStyle === tpl.id
                        : (activeGoal?.templateStyle || 'cyber-neon') === tpl.id;

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectTemplateFromModal(tpl.id, tpl.previewColor)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative group ${
                          isCurrentSelected
                            ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                            : 'bg-[#090D18] border-slate-800/90 hover:border-slate-700 hover:bg-[#0C1222]'
                        }`}
                      >
                        {/* Top Header Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: tpl.previewColor }}
                            />
                            <h4 className="text-sm font-bold text-white font-['Chakra_Petch'] truncate">
                              {tpl.name}
                            </h4>
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 flex-shrink-0">
                              {tpl.category}
                            </span>
                          </div>

                          {isCurrentSelected ? (
                            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold flex-shrink-0">
                              <Check size={11} />
                              Selected
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              Click to apply
                            </span>
                          )}
                        </div>

                        {/* Live Rendered Template Preview */}
                        <div className="w-full rounded-xl bg-[#040711] border border-slate-800/70 p-3 sm:p-4 flex items-center justify-center relative overflow-hidden pointer-events-none">
                          <div
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{
                              backgroundImage:
                                'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                              backgroundSize: '16px 16px',
                              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
                            }}
                          />
                          <div className="w-full max-w-sm relative z-10 transform scale-95 sm:scale-100 origin-center">
                            <GoalTemplateRenderer
                              title={
                                templateModalTarget === 'form' && formTitle.trim()
                                  ? formTitle.trim()
                                  : activeGoal
                                  ? activeGoal.title
                                  : tpl.name
                              }
                              targetAmount={100}
                              currentAmount={68}
                              accentColor={tpl.previewColor}
                              templateStyle={tpl.id}
                              showBalance={true}
                              showBackground={true}
                              showAnimation={true}
                            />
                          </div>
                        </div>

                        {/* Description & Action Button */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <p className="text-[11px] text-slate-400 line-clamp-1">{tpl.description}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplateFromModal(tpl.id, tpl.previewColor);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                              isCurrentSelected
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                            }`}
                          >
                            {isCurrentSelected ? (
                              <>
                                <Check size={13} />
                                <span>Active</span>
                              </>
                            ) : (
                              <span>Use Template</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
