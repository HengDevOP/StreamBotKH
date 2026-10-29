'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Calendar,
  DollarSign,
  Sparkles,
  Check,
  Loader2,
  Clock,
  AlertCircle,
  RefreshCw,
  Percent,
  Eye
} from 'lucide-react';
import { request } from '../../services/api';
import { Button } from '../common/Button';

export interface PromotionConfig {
  id: string;
  isEnabled: boolean;
  isActive: boolean;
  status: 'active' | 'scheduled' | 'expired' | 'disabled';
  promoTitle: string;
  promoPriceUsd: number;
  promoPriceKhr: number;
  originalPriceUsd: number;
  originalPriceKhr: number;
  discountPercent: number;
  annualDiscountPercent?: number;
  startDate: string | null;
  endDate: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AdminPromotionManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [promo, setPromo] = useState<PromotionConfig | null>(null);

  // Form states
  const [isEnabled, setIsEnabled] = useState(false);
  const [promoTitle, setPromoTitle] = useState('SPECIAL PROMOTION');
  const [promoPriceUsd, setPromoPriceUsd] = useState('2.99');
  const [promoPriceKhr, setPromoPriceKhr] = useState('12000');
  const [originalPriceUsd, setOriginalPriceUsd] = useState('4.99');
  const [originalPriceKhr, setOriginalPriceKhr] = useState('20000');
  const [annualDiscountPercent, setAnnualDiscountPercent] = useState('10');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [previewCurrency, setPreviewCurrency] = useState<'USD' | 'KHR'>('USD');

  const fetchPromotion = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<PromotionConfig>('/promotions');
      setPromo(data);
      setIsEnabled(data.isEnabled);
      setPromoTitle(data.promoTitle || 'SPECIAL PROMOTION');
      setPromoPriceUsd(String(data.promoPriceUsd ?? 2.99));
      setPromoPriceKhr(String(data.promoPriceKhr ?? 12000));
      setOriginalPriceUsd(String(data.originalPriceUsd ?? 4.99));
      setOriginalPriceKhr(String(data.originalPriceKhr ?? 20000));
      setAnnualDiscountPercent(String(data.annualDiscountPercent ?? 10));
      setStartDateInput(toDatetimeLocalValue(data.startDate));
      setEndDateInput(toDatetimeLocalValue(data.endDate));
    } catch (err: any) {
      setError(err.message || 'Failed to load promotion settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotion();
  }, []);

  const handleToggleInstant = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    setToggling(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await request<{ success: boolean; promotion: PromotionConfig }>('/promotions', {
        method: 'PUT',
        body: JSON.stringify({
          isEnabled: nextState,
          promoTitle,
          promoPriceUsd: parseFloat(promoPriceUsd) || 2.99,
          promoPriceKhr: parseInt(promoPriceKhr, 10) || 12000,
          originalPriceUsd: parseFloat(originalPriceUsd) || 4.99,
          originalPriceKhr: parseInt(originalPriceKhr, 10) || 20000,
          annualDiscountPercent: Math.max(0, Math.min(100, parseInt(annualDiscountPercent, 10) || 10)),
          startDate: startDateInput ? new Date(startDateInput).toISOString() : null,
          endDate: endDateInput ? new Date(endDateInput).toISOString() : null
        })
      });
      setPromo(res.promotion);
      setSuccessMsg(
        nextState
          ? 'Promotion enabled! Pricing Page is now displaying the promotional price.'
          : 'Promotion disabled! Pricing Page has reverted to standard pricing.'
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsEnabled(!nextState);
      setError(err.message || 'Failed to toggle promotion');
    } finally {
      setToggling(false);
    }
  };

  const handleApplyPresetDays = (days: number) => {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    setStartDateInput(toDatetimeLocalValue(now.toISOString()));
    setEndDateInput(toDatetimeLocalValue(end.toISOString()));
  };

  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await request<{ success: boolean; promotion: PromotionConfig }>('/promotions', {
        method: 'PUT',
        body: JSON.stringify({
          isEnabled,
          promoTitle: promoTitle.trim() || 'SPECIAL PROMOTION',
          promoPriceUsd: parseFloat(promoPriceUsd) || 2.99,
          promoPriceKhr: parseInt(promoPriceKhr, 10) || 12000,
          originalPriceUsd: parseFloat(originalPriceUsd) || 4.99,
          originalPriceKhr: parseInt(originalPriceKhr, 10) || 20000,
          annualDiscountPercent: Math.max(0, Math.min(100, parseInt(annualDiscountPercent, 10) || 10)),
          startDate: startDateInput ? new Date(startDateInput).toISOString() : null,
          endDate: endDateInput ? new Date(endDateInput).toISOString() : null
        })
      });
      setPromo(res.promotion);
      setSuccessMsg('Promotion settings saved and synced to the Pricing Page!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save promotion settings');
    } finally {
      setSaving(false);
    }
  };

  const numPromoUsd = parseFloat(promoPriceUsd) || 0;
  const numOrigUsd = parseFloat(originalPriceUsd) || 4.99;
  const numPromoKhr = parseInt(promoPriceKhr, 10) || 0;
  const numOrigKhr = parseInt(originalPriceKhr, 10) || 20000;
  const previewDiscount =
    numOrigUsd > 0 && numPromoUsd < numOrigUsd
      ? Math.round(((numOrigUsd - numPromoUsd) / numOrigUsd) * 100)
      : 0;

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={28} className="animate-spin text-cyan-400" />
        <span className="text-xs font-mono">Loading Promotion Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-['Chakra_Petch']">
              Pro Plan Promotion Manager
            </h2>
            {promo?.status === 'active' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                ● LIVE ON PRICING PAGE
              </span>
            )}
            {promo?.status === 'scheduled' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                ⏳ SCHEDULED
              </span>
            )}
            {promo?.status === 'expired' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
                EXPIRED
              </span>
            )}
            {promo?.status === 'disabled' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                DISABLED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Toggle Pro Plan promotional pricing and configure the start and end period. Changes immediately update the public Pricing Page and Dashboard Billing tab.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPromotion}
          className="self-start sm:self-auto px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Feedback Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5 font-mono">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 font-mono">
          <Check size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Master Toggle Banner Card */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isEnabled
            ? 'bg-gradient-to-r from-purple-950/50 via-[#120E22] to-cyan-950/30 border-purple-500/50 shadow-lg shadow-purple-500/10'
            : 'bg-[#090D18] border-slate-800'
        }`}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              isEnabled
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            <Tag size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-white font-['Chakra_Petch']">
                Toggle Pro Plan Promotion
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  isEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEnabled
                ? `Active promotion sets Pro Plan to $${numPromoUsd.toFixed(2)} (${numPromoKhr.toLocaleString()} ៛) during the configured start and end period.`
                : 'Currently off. Visitors see the regular Pro Plan price ($4.99 / 20,000 ៛ per month).'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={toggling}
          onClick={handleToggleInstant}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer flex-shrink-0 ${
            isEnabled
              ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
              : 'bg-gradient-to-r from-purple-500 to-cyan-400 text-slate-950 shadow-lg shadow-purple-500/20 hover:opacity-95'
          }`}
        >
          {toggling ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{isEnabled ? 'Disable Promotion' : 'Enable Promotion Now'}</span>
        </button>
      </div>

      {/* Main Grid: Configuration Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Promotion Configuration Form */}
        <form
          onSubmit={handleSavePromotion}
          className="lg:col-span-7 p-6 rounded-2xl bg-[#090D18] border border-slate-800 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-cyan-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-['Chakra_Petch']">
                Promotion Pricing & Schedule
              </h3>
            </div>
            {previewDiscount > 0 && (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Percent size={11} />
                {previewDiscount}% Discount
              </span>
            )}
          </div>

          {/* Promotion Title / Badge */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase text-slate-400">
              Promotion Title / Badge Text
            </label>
            <input
              type="text"
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value)}
              placeholder="SPECIAL PROMOTION"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          {/* Promotional Price Row (USD & KHR) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-emerald-400 font-semibold">
                Promotion Price (USD / month)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-emerald-400 font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={promoPriceUsd}
                  onChange={(e) => setPromoPriceUsd(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-emerald-400 font-semibold">
                Promotion Price (KHR ៛ / month)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={promoPriceKhr}
                  onChange={(e) => setPromoPriceKhr(e.target.value)}
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-emerald-400 font-bold">
                  ៛
                </span>
              </div>
            </div>
          </div>

          {/* Original Price Row (USD & KHR) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-slate-400">
                Original Regular Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={originalPriceUsd}
                  onChange={(e) => setOriginalPriceUsd(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase text-slate-400">
                Original Regular Price (KHR ៛)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="500"
                  min="100"
                  value={originalPriceKhr}
                  onChange={(e) => setOriginalPriceKhr(e.target.value)}
                  className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-slate-600"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                  ៛
                </span>
              </div>
            </div>
          </div>

          {/* Annual Billing Discount */}
          <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase text-cyan-400 font-semibold flex items-center gap-1.5">
                <Percent size={14} />
                <span>Annual Billing Discount (%)</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                Shown as &quot;Save {annualDiscountPercent}%&quot; on Pricing Page
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={annualDiscountPercent}
                onChange={(e) => setAnnualDiscountPercent(e.target.value)}
                placeholder="10"
                className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-cyan-400 font-bold">
                %
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              When streamers switch to Annual billing, this discount percentage will be automatically deducted from both regular and promotional prices.
            </p>
          </div>

          {/* Start & End Period */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-mono uppercase text-cyan-400 font-semibold flex items-center gap-1.5">
                <Calendar size={14} />
                <span>Promotion Start & End Period</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '+3 Days', days: 3 },
                  { label: '+7 Days', days: 7 },
                  { label: '+14 Days', days: 14 },
                  { label: '+31 Days (1M)', days: 31 }
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handleApplyPresetDays(preset.days)}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-[10px] font-mono text-cyan-300 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-slate-400">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startDateInput}
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono text-slate-400">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endDateInput}
                  onChange={(e) => setEndDateInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              className="font-bold px-6"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check size={15} />
                  Save Promotion Settings
                </span>
              )}
            </Button>
          </div>
        </form>

        {/* Right 5 Cols: Live Pricing Page Card Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Eye size={14} className="text-purple-400" />
              <span>Pricing Page Live Preview</span>
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setPreviewCurrency('USD')}
                className={`px-2 py-0.5 rounded ${
                  previewCurrency === 'USD' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                }`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setPreviewCurrency('KHR')}
                className={`px-2 py-0.5 rounded ${
                  previewCurrency === 'KHR' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                }`}
              >
                KHR
              </button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-purple-500/80 bg-[#120E22] p-6 relative shadow-2xl shadow-purple-500/10 space-y-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 text-slate-950 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-lg whitespace-nowrap">
              {isEnabled ? `${promoTitle || 'SPECIAL PROMOTION'} • ${previewDiscount}% OFF` : 'RECOMMENDED'}
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
                  PRO PLAN
                </span>
                {isEnabled && previewDiscount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                    SAVE {previewDiscount}%
                  </span>
                )}
              </div>

              {isEnabled ? (
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl font-extrabold text-white font-mono">
                    {previewCurrency === 'KHR'
                      ? `${numPromoKhr.toLocaleString()} ៛`
                      : `$${numPromoUsd.toFixed(2)}`}
                  </span>
                  <span className="text-sm font-mono text-slate-500 line-through">
                    {previewCurrency === 'KHR'
                      ? `${numOrigKhr.toLocaleString()} ៛`
                      : `$${numOrigUsd.toFixed(2)}`}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
              ) : (
                <div className="text-3xl font-extrabold text-white font-mono">
                  {previewCurrency === 'KHR'
                    ? `${numOrigKhr.toLocaleString()} ៛`
                    : `$${numOrigUsd.toFixed(2)}`}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ month</span>
                </div>
              )}

              {isEnabled && (startDateInput || endDateInput) && (
                <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-[11px] font-mono text-purple-200 flex items-center gap-2">
                  <Clock size={13} className="text-cyan-400 flex-shrink-0" />
                  <span>
                    Promo period:{' '}
                    {startDateInput
                      ? new Date(startDateInput).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'Now'}{' '}
                    &rarr;{' '}
                    {endDateInput
                      ? new Date(endDateInput).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Ongoing'}
                  </span>
                </div>
              )}
            </div>

            <div className="h-px bg-purple-500/20" />

            <ul className="space-y-2 text-xs text-slate-200">
              <li className="flex items-center gap-2 text-purple-300 font-semibold">
                <Check size={14} className="text-purple-400" />
                <span>100MB Media Cloud Storage (MP4, GIF, MP3, WAV)</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Check size={14} className="text-emerald-400" />
                <span>Removed Watermark (Clean Donation Page)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
