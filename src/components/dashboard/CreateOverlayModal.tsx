'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Tv,
  X,
  ArrowRight,
  Maximize2,
  Smartphone,
  Monitor,
  Sparkles,
  Layers,
  Check
} from 'lucide-react';
import { Button } from '../common/Button';

interface CreateOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (overlay: any) => void;
  initialName?: string;
  initialMediaUrl?: string;
}

interface ResolutionPreset {
  id: string;
  label: string;
  sublabel: string;
  width: number;
  height: number;
  ratio: string;
  icon: React.ReactNode;
}

const PRESETS: ResolutionPreset[] = [
  {
    id: '1080x720',
    label: '1080 × 720',
    sublabel: 'Default • Optimal Alert Box (3:2)',
    width: 1080,
    height: 720,
    ratio: '3:2',
    icon: <Monitor size={16} className="text-cyan-400" />
  },
  {
    id: '1920x1080',
    label: '1920 × 1080',
    sublabel: 'Full HD • Full Screen (16:9)',
    width: 1920,
    height: 1080,
    ratio: '16:9',
    icon: <Maximize2 size={16} className="text-purple-400" />
  },
  {
    id: '1280x720',
    label: '1280 × 720',
    sublabel: 'HD Standard (16:9)',
    width: 1280,
    height: 720,
    ratio: '16:9',
    icon: <Monitor size={16} className="text-emerald-400" />
  },
  {
    id: '720x1080',
    label: '720 × 1080',
    sublabel: 'Vertical • TikTok & Shorts (9:16)',
    width: 720,
    height: 1080,
    ratio: '9:16',
    icon: <Smartphone size={16} className="text-pink-400" />
  }
];

export const CreateOverlayModal: React.FC<CreateOverlayModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialName,
  initialMediaUrl
}) => {
  const router = useRouter();
  const [name, setName] = useState<string>(initialName || 'Alert Box Overlay');
  const [width, setWidth] = useState<number>(1080);
  const [height, setHeight] = useState<number>(720);
  const [selectedPreset, setSelectedPreset] = useState<string>('1080x720');
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialName) {
      setName(initialName);
    }
  }, [initialName]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: ResolutionPreset) => {
    setSelectedPreset(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleCustomWidth = (val: number) => {
    setWidth(val);
    setSelectedPreset('custom');
  };

  const handleCustomHeight = (val: number) => {
    setHeight(val);
    setSelectedPreset('custom');
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const finalWidth = Math.max(200, Math.min(3840, Number(width) || 1080));
      const finalHeight = Math.max(150, Math.min(2160, Number(height) || 720));
      const finalName = name.trim() || `Overlay (${finalWidth}x${finalHeight})`;

      const res = await fetch('/api/overlays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          width: finalWidth,
          height: finalHeight,
          ...(initialMediaUrl ? { mediaUrl: initialMediaUrl } : {})
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create overlay');
      }

      const created = data.overlay;
      if (onCreated) {
        onCreated(created);
      }

      onClose();
      // Redirect the user to the dedicated overlay management studio
      router.push(`/dashboard?overlay=${created._id}`);
    } catch (err: any) {
      setError(err.message || 'Could not create overlay. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0A0E1A] border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden border-cyan-500/20">
        
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Tv size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Chakra_Petch'] flex items-center gap-2">
                <span>Create New Overlay</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-normal">
                  OBS Studio
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Choose canvas resolution (Default 1080×720)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={creating}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-5 relative z-10">
          {/* Overlay Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
              <span>Overlay Name</span>
              <span className="text-[10px] text-slate-500 font-normal font-sans">Optional label for your scene</span>
            </label>
            <input
              type="text"
              required
              placeholder="Main Stream Alert Box"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm font-medium transition-colors"
            />
          </div>

          {/* Resolution Choice (Presets) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono block">
              Resolution Choice
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-400/80 shadow-[0_0_15px_rgba(0,240,255,0.15)] ring-1 ring-cyan-400/40'
                        : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        {preset.icon}
                        <span className="text-xs font-bold font-mono text-white">
                          {preset.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {preset.sublabel}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center text-slate-950 flex-shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Width & Height Inputs */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 flex items-center gap-1.5 font-bold">
                <Layers size={13} className="text-cyan-400" />
                Dimensions (px)
              </span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                {width} × {height} px
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Width Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Width</label>
                <div className="relative">
                  <input
                    type="number"
                    min={200}
                    max={3840}
                    value={width}
                    onChange={(e) => handleCustomWidth(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                    px
                  </span>
                </div>
              </div>

              {/* Height Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Height</label>
                <div className="relative">
                  <input
                    type="number"
                    min={150}
                    max={2160}
                    value={height}
                    onChange={(e) => handleCustomHeight(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-500 pointer-events-none">
                    px
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Canvas Scale Preview */}
            <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Monitor size={12} className="text-cyan-400" />
                  Canvas Scale Preview
                </span>
                <span className="text-cyan-400 font-bold">
                  {width} × {height} px • {(width / (height || 1)).toFixed(2)}:1
                </span>
              </div>

              <div className="h-28 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center p-2 overflow-hidden relative">
                {/* Scaled frame */}
                <div
                  style={{
                    aspectRatio: `${width} / ${height}`,
                    maxHeight: '100%',
                    maxWidth: '100%'
                  }}
                  className="h-full border-2 border-dashed border-cyan-400/50 rounded-lg flex flex-col items-center justify-center relative bg-slate-950/90 shadow-inner px-3 py-1"
                >
                  {/* Subtle checkerboard */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none rounded-lg"
                    style={{
                      backgroundImage: `linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)`,
                      backgroundSize: '14px 14px',
                      backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0px'
                    }}
                  />
                  <Tv size={15} className="text-cyan-400/80 relative z-10" />
                  <span className="text-[10px] font-mono font-bold text-white relative z-10 mt-1">
                    {width} × {height}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 relative z-10">
                    OBS Browser Source
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              💡 In OBS Studio Browser Source properties, set Width: <b className="text-slate-300">{width}</b> and Height: <b className="text-slate-300">{height}</b>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={creating}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={creating}
              icon={<ArrowRight size={14} />}
              className="px-5 font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(0,240,255,0.3)]"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
