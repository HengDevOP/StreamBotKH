'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Check, Sparkles } from 'lucide-react';
import { BADGE_ICON_LIST, BadgeCategory, BadgeIconDefinition } from '../../data/badgeIcons';

interface BadgeIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconId: string) => void;
  selectedIconId?: string;
  accentColor?: string;
}

const CATEGORIES: BadgeCategory[] = [
  'All',
  'Popular',
  'Gaming & Action',
  'Royalty & Ranks',
  'Symbols & Vibes'
];

export const BadgeIconPickerModal: React.FC<BadgeIconPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedIconId = 'Crown',
  accentColor = '#00F0FF'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<BadgeCategory>('All');

  const filteredIcons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return BADGE_ICON_LIST.filter((item) => {
      const matchesCategory =
        activeCategory === 'All' || item.category === activeCategory;
      if (!matchesCategory) return false;

      if (!q) return true;
      const matchesId = item.id.toLowerCase().includes(q);
      const matchesLabel = item.label.toLowerCase().includes(q);
      const matchesKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchesId || matchesLabel || matchesKeywords;
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-2xl flex flex-col rounded-none sm:rounded-2xl bg-[#090D18] border-0 sm:border sm:border-cyan-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0B101E]/95 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: `${accentColor}1A`,
                borderColor: `${accentColor}4D`,
                color: accentColor
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white font-['Chakra_Petch'] leading-tight">
                Select Vector Badge Icon
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Choose from {BADGE_ICON_LIST.length} high-resolution icons for your subscriber badge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls (Search + Categories) */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 space-y-3 flex-shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search icons (e.g. crown, flame, sword, star, heart)..."
              className="w-full bg-[#0B101E] border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const count =
                cat === 'All'
                  ? BADGE_ICON_LIST.length
                  : BADGE_ICON_LIST.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Icon Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {filteredIcons.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">No icons match "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="text-xs text-cyan-400 hover:underline"
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {filteredIcons.map((item) => {
                const IconComp = item.icon;
                const isSelected = selectedIconId.toLowerCase() === item.id.toLowerCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all group relative cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-400/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                    title={`${item.label} (${item.category})`}
                  >
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}

                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        color: isSelected ? accentColor : '#CBD5E1'
                      }}
                    >
                      <IconComp className="w-5 h-5 flex-shrink-0" />
                    </div>

                    <span
                      className={`text-[10px] font-medium text-center truncate max-w-full leading-tight ${
                        isSelected ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0B101E]/95 backdrop-blur-md flex-shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredIcons.length} of {BADGE_ICON_LIST.length} icons
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeIconPickerModal;
