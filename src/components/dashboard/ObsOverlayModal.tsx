'use client';

import React, { useState } from 'react';
import { Copy, Check, Eye, EyeOff, RefreshCw, ExternalLink, MonitorPlay } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useModal } from '../../context/ModalContext';

interface ObsOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  overlayToken: string;
  onRegenerateToken: () => void | Promise<void>;
}

export const ObsOverlayModal: React.FC<ObsOverlayModalProps> = ({
  isOpen,
  onClose,
  overlayToken,
  onRegenerateToken
}) => {
  const { showConfirm } = useModal();
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const overlayUrl = `${window.location.origin}/overlay/${overlayToken}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    showConfirm({
      title: 'Regenerate Overlay URL?',
      message: 'Regenerating will invalidate your old overlay URL in OBS. You will need to update the browser source URL in OBS Studio. Continue?',
      type: 'danger',
      confirmText: 'Regenerate Token',
      onConfirm: async () => {
        setRegenerating(true);
        try {
          await onRegenerateToken();
        } finally {
          setRegenerating(false);
        }
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="OBS Live Alert Overlay Setup" maxWidth="lg">
      <div className="space-y-5">
        <p className="text-xs text-slate-300 leading-relaxed">
          Copy this private URL into <b>OBS Studio</b>, <b>Streamlabs</b>, or <b>vMix</b> as a Browser Source to display neon donation animations, sound effects, and TTS on stream.
        </p>

        {/* URL Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Browser Source URL (Keep Private)
            </span>
            <button
              onClick={() => setShowToken(!showToken)}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              {showToken ? 'Hide' : 'Reveal'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type={showToken ? 'text' : 'password'}
              readOnly
              value={overlayUrl}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 select-all"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Quick Launch Preview */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <MonitorPlay size={16} className="text-cyan-400 flex-shrink-0" />
            <span>Open preview in separate browser tab to test alerts</span>
          </div>
          <a
            href={overlayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
          >
            Open Overlay <ExternalLink size={12} />
          </a>
        </div>

        {/* OBS Configuration Guide */}
        <div className="space-y-2 text-xs text-slate-400">
          <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Recommended OBS Settings:</h4>
          <ol className="list-decimal list-inside space-y-1 pl-1">
            <li>In OBS, click <b className="text-slate-200">+ Sources</b> &rarr; Select <b className="text-slate-200">Browser</b></li>
            <li>Paste your StreamNeon URL above into the <b className="text-slate-200">URL</b> field</li>
            <li>Set <b>Width</b>: <code className="text-cyan-400">800</code>, <b>Height</b>: <code className="text-cyan-400">600</code></li>
            <li>Check <b className="text-slate-200">"Shutdown source when not visible"</b></li>
            <li>Check <b className="text-slate-200">"Refresh browser when scene becomes active"</b></li>
          </ol>
        </div>

        {/* Security Reset */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Accidentally shown your URL on stream?</span>
          <Button
            variant="danger"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerating}
            icon={<RefreshCw size={12} />}
          >
            Regenerate Token
          </Button>
        </div>
      </div>
    </Modal>
  );
};
