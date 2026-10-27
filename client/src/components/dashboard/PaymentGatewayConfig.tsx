import React, { useState } from 'react';
import { CreditCard, Copy, Check, ShieldCheck, QrCode, ExternalLink } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { PaymentSettings } from '../../types/streamer';

interface PaymentGatewayConfigProps {
  initialSettings?: PaymentSettings;
  onSave: (settings: Partial<PaymentSettings>) => Promise<void>;
}

export const PaymentGatewayConfig: React.FC<PaymentGatewayConfigProps> = ({
  initialSettings,
  onSave
}) => {
  const [abaMerchantId, setAbaMerchantId] = useState(initialSettings?.aba_merchant_id || 'ec439126');
  const [abaApiKey, setAbaApiKey] = useState(initialSettings?.aba_api_key || 'f60b06ca198c61e8601ff7a68393ceee47cb50cb');
  const [bakongAccountId, setBakongAccountId] = useState(initialSettings?.bakong_account_id || 'neonstreamer@abaa');
  const [bakongAccountName, setBakongAccountName] = useState(initialSettings?.bakong_account_name || 'NEON MASTER VIP');
  const [isSandbox, setIsSandbox] = useState((initialSettings?.is_sandbox ?? 1) === 1);

  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const webhookUrl = `${window.location.origin}/api/payway/webhook`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        aba_merchant_id: abaMerchantId,
        aba_api_key: abaApiKey,
        bakong_account_id: bakongAccountId,
        bakong_account_name: bakongAccountName,
        is_sandbox: isSandbox ? 1 : 0
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="text-pink-400" size={20} />
            ABA PayWay & Bakong KHQR Settings
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Accept instant tips via ABA Mobile and all Bakong member banking apps in Cambodia
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={saving}
          icon={savedSuccess ? <Check size={14} /> : undefined}
        >
          {savedSuccess ? 'Saved!' : 'Save Payment Config'}
        </Button>
      </div>

      {/* Sandbox Toggle Banner */}
      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Sandbox Test Mode
              {isSandbox && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  ACTIVE
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Allows you and viewers to test dynamic KHQR and trigger instant simulated payments without real bank charges.
            </p>
          </div>
        </div>
        <Switch
          checked={isSandbox}
          onChange={setIsSandbox}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Bakong Account Info */}
        <div className="space-y-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <QrCode size={18} />
            <span>Bakong KHQR Receiver Info</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Bakong Account ID / Phone
            </label>
            <input
              type="text"
              placeholder="streamer@abaa or 85512345678@abaa"
              value={bakongAccountId}
              onChange={(e) => setBakongAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">Found in your ABA Mobile or Bakong App profile</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Bakong Merchant Name
            </label>
            <input
              type="text"
              placeholder="STREAMER NAME"
              value={bakongAccountName}
              onChange={(e) => setBakongAccountName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 uppercase font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">Displayed to donor inside their banking app</p>
          </div>
        </div>

        {/* ABA PayWay Merchant Info */}
        <div className="space-y-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
            <CreditCard size={18} />
            <span>ABA PayWay Merchant API</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              PayWay Merchant ID
            </label>
            <input
              type="text"
              placeholder="e.g. ec439126"
              value={abaMerchantId}
              onChange={(e) => setAbaMerchantId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              PayWay API Key
            </label>
            <input
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={abaApiKey}
              onChange={(e) => setAbaApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Pushback Webhook Info */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          ABA PayWay Pushback / Webhook URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 select-all"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyWebhook}
            icon={copiedUrl ? <Check size={14} /> : <Copy size={14} />}
          >
            {copiedUrl ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Paste this URL into your ABA PayWay Merchant Portal under <b>Pushback Settings</b> to automatically verify incoming transactions.
        </p>
      </div>
    </Card>
  );
};
