'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export function parseLocalDateTime(raw?: string | null): Date | null {
  if (!raw) return null;
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = match[4] !== undefined ? Number(match[4]) : 23;
    const minute = match[5] !== undefined ? Number(match[5]) : 59;
    const d = new Date(year, month, day, hour, minute, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(raw);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function toLocalDateTimeValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
}

export function formatGoalEndDate(raw?: string | null): string {
  if (!raw) return '';
  const dateOnlyMatch = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const d = new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
  const parsed = parseLocalDateTime(raw);
  if (!parsed) return raw;
  const datePart = parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const timePart = parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${datePart} · ${timePart}`;
}

interface DateTimeCalendarPickerProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
}

export const DateTimeCalendarPicker: React.FC<DateTimeCalendarPickerProps> = ({
  value,
  onChange,
  placeholder = 'Select end date & time'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  const selectedDate = parseLocalDateTime(value);

  // Viewed calendar month/year
  const [viewYear, setViewYear] = useState<number>(() =>
    (selectedDate || new Date()).getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    (selectedDate || new Date()).getMonth()
  );

  // Sync viewed month when opening
  useEffect(() => {
    if (isOpen) {
      const base = parseLocalDateTime(value) || new Date();
      setViewYear(base.getFullYear());
      setViewMonth(base.getMonth());
    }
  }, [isOpen]);

  // Compute smart viewport-clamped anchor position on desktop
  const updatePosition = () => {
    if (typeof window === 'undefined') return;
    const desktop = window.innerWidth >= 768;
    setIsDesktop(desktop);
    if (!desktop || !triggerRef.current) {
      setPopoverPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const pickerWidth = 336;
    const pickerHeight = popoverRef.current?.offsetHeight || 430;
    const margin = 12;

    let top = rect.bottom + 6;
    if (top + pickerHeight > window.innerHeight - margin) {
      const flippedTop = rect.top - pickerHeight - 6;
      top =
        flippedTop >= margin
          ? flippedTop
          : Math.max(margin, window.innerHeight - pickerHeight - margin);
    }

    let left = rect.right - pickerWidth;
    if (left < margin) left = rect.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - pickerWidth - margin));

    setPopoverPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Base date/time used when modifying individual parts
  const getWorkingDate = (): Date => {
    if (selectedDate) return new Date(selectedDate.getTime());
    const fallback = new Date();
    fallback.setHours(23, 59, 0, 0);
    return fallback;
  };

  const workingDate = getWorkingDate();
  const hours24 = workingDate.getHours();
  const minutes = workingDate.getMinutes();
  const isPM = hours24 >= 12;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  const [hourInput, setHourInput] = useState<string>(pad2(hours12));
  const [minuteInput, setMinuteInput] = useState<string>(pad2(minutes));

  useEffect(() => {
    setHourInput(pad2(hours12));
    setMinuteInput(pad2(minutes));
  }, [value, isOpen, hours12, minutes]);

  // Build 42-day (6-week) calendar cells
  const buildCalendarDays = () => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { year: number; month: number; day: number; inCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      cells.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        inCurrentMonth: false
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        year: viewYear,
        month: viewMonth,
        day,
        inCurrentMonth: true
      });
    }

    // Trailing days from next month to fill 42 cells
    let nextDay = 1;
    while (cells.length < 42) {
      const d = new Date(viewYear, viewMonth + 1, nextDay++);
      cells.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        inCurrentMonth: false
      });
    }

    return cells;
  };

  const handlePrevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleNextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const next = getWorkingDate();
    next.setFullYear(year, month, day);
    setViewYear(year);
    setViewMonth(month);
    onChange(toLocalDateTimeValue(next));
  };

  const handleStepHour = (delta: number) => {
    const next = getWorkingDate();
    next.setHours(next.getHours() + delta);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    onChange(toLocalDateTimeValue(next));
  };

  const handleStepMinute = (delta: number) => {
    const next = getWorkingDate();
    next.setMinutes(next.getMinutes() + delta);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    onChange(toLocalDateTimeValue(next));
  };

  const handleSetPeriod = (wantPM: boolean) => {
    const next = getWorkingDate();
    const curHours = next.getHours();
    if (wantPM && curHours < 12) {
      next.setHours(curHours + 12);
    } else if (!wantPM && curHours >= 12) {
      next.setHours(curHours - 12);
    }
    onChange(toLocalDateTimeValue(next));
  };

  const commitHourInput = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setHourInput(pad2(hours12));
      return;
    }
    const clamped12 = Math.min(12, Math.max(1, parsed));
    const next = getWorkingDate();
    const nextHour24 = isPM
      ? clamped12 === 12
        ? 12
        : clamped12 + 12
      : clamped12 === 12
      ? 0
      : clamped12;
    next.setHours(nextHour24);
    setHourInput(pad2(clamped12));
    onChange(toLocalDateTimeValue(next));
  };

  const commitMinuteInput = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      setMinuteInput(pad2(minutes));
      return;
    }
    const clampedMin = Math.min(59, Math.max(0, parsed));
    const next = getWorkingDate();
    next.setMinutes(clampedMin);
    setMinuteInput(pad2(clampedMin));
    onChange(toLocalDateTimeValue(next));
  };

  const handleQuickMinute = (min: number) => {
    const next = getWorkingDate();
    next.setMinutes(min);
    onChange(toLocalDateTimeValue(next));
  };

  const handleQuickOffset = (hoursOffset: number) => {
    const next = new Date(Date.now() + hoursOffset * 60 * 60 * 1000);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    onChange(toLocalDateTimeValue(next));
  };

  const handleJumpToday = () => {
    const now = new Date();
    const next = getWorkingDate();
    next.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onChange(toLocalDateTimeValue(next));
  };

  const today = new Date();
  const calendarDays = buildCalendarDays();

  return (
    <>
      {/* Trigger Field */}
      <div className="relative flex items-center">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full px-3 py-2.5 rounded-xl bg-slate-950 border text-left font-mono text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
            isOpen
              ? 'border-emerald-400 ring-1 ring-emerald-400/30'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <Calendar size={14} className="text-emerald-400 flex-shrink-0" />
            <span className={`truncate ${selectedDate ? 'text-white' : 'text-slate-500'}`}>
              {selectedDate ? formatGoalEndDate(value) : placeholder}
            </span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            {selectedDate ? (
              <span
                role="button"
                tabIndex={0}
                title="Clear end date"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onChange('');
                  }
                }}
                className="p-0.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
              >
                <X size={13} />
              </span>
            ) : (
              <Clock size={13} className="text-slate-500" />
            )}
          </span>
        </button>
      </div>

      {/* Portaled Calendar & Exact Time Picker */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed inset-0 z-[9998] ${
              isDesktop
                ? 'bg-transparent'
                : 'flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <div
              ref={popoverRef}
              onClick={(e) => e.stopPropagation()}
              style={
                isDesktop && popoverPos
                  ? { position: 'fixed', top: popoverPos.top, left: popoverPos.left }
                  : undefined
              }
              className="w-[min(336px,calc(100vw-1.5rem))] rounded-2xl bg-[#0A0F1D] border border-emerald-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-3.5 space-y-3 text-slate-100 select-none antialiased"
            >
              {/* 1. Calendar Month Navigation Header */}
              <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-800/90">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="text-xs sm:text-sm font-bold text-white font-['Chakra_Petch'] tracking-wide">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close calendar"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* 2. Weekday Headers & 6-Week Day Grid */}
              <div className="space-y-1">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className="text-[10px] font-mono font-bold text-slate-500 py-0.5">
                      {wd}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, idx) => {
                    const isSelected =
                      Boolean(selectedDate) &&
                      selectedDate!.getFullYear() === cell.year &&
                      selectedDate!.getMonth() === cell.month &&
                      selectedDate!.getDate() === cell.day;

                    const isToday =
                      today.getFullYear() === cell.year &&
                      today.getMonth() === cell.month &&
                      today.getDate() === cell.day;

                    return (
                      <button
                        key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                        type="button"
                        onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                        className={`h-8 rounded-lg font-mono text-xs transition-all flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                            : isToday
                            ? 'border border-emerald-500/50 text-emerald-300 font-bold bg-emerald-500/10 hover:bg-emerald-500/20'
                            : cell.inCurrentMonth
                            ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                            : 'text-slate-600 hover:bg-slate-900 hover:text-slate-400'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Exact Time Picker */}
              <div className="pt-2.5 border-t border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock size={12} className="text-emerald-400" />
                    Exact Time
                  </span>

                  {/* Hour : Minute + AM/PM Controls */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleStepHour(-1)}
                        className="px-1.5 py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        title="Previous hour"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        aria-label="Hour"
                        value={hourInput}
                        onChange={(e) => setHourInput(e.target.value.replace(/\D/g, ''))}
                        onBlur={() => commitHourInput(hourInput)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitHourInput(hourInput);
                          }
                        }}
                        className="w-7 py-1 bg-transparent text-center font-mono text-xs font-bold text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepHour(1)}
                        className="px-1.5 py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        title="Next hour"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-mono font-bold text-slate-400 text-xs">:</span>

                    <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleStepMinute(-1)}
                        className="px-1.5 py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        title="Previous minute"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        aria-label="Minute"
                        value={minuteInput}
                        onChange={(e) => setMinuteInput(e.target.value.replace(/\D/g, ''))}
                        onBlur={() => commitMinuteInput(minuteInput)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitMinuteInput(minuteInput);
                          }
                        }}
                        className="w-7 py-1 bg-transparent text-center font-mono text-xs font-bold text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleStepMinute(1)}
                        className="px-1.5 py-1 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        title="Next minute"
                      >
                        +
                      </button>
                    </div>

                    {/* AM / PM Segmented Toggle */}
                    <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 font-mono text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => handleSetPeriod(false)}
                        className={`px-1.5 py-1 rounded-md transition-colors cursor-pointer ${
                          !isPM
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPeriod(true)}
                        className={`px-1.5 py-1 rounded-md transition-colors cursor-pointer ${
                          isPM
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Minute & Preset Chips */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <div className="flex items-center gap-1">
                    {[0, 15, 30, 45, 59].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleQuickMinute(m)}
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] border transition-colors cursor-pointer ${
                          selectedDate && minutes === m
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        :{pad2(m)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    {[
                      { label: '+24h', hours: 24 },
                      { label: '+7d', hours: 24 * 7 },
                      { label: '+14d', hours: 24 * 14 }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleQuickOffset(preset.hours)}
                        className="px-1.5 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 font-mono text-[10px] text-cyan-300 transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Selected Summary & Action Footer */}
              <div className="pt-2.5 border-t border-slate-800/90 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono font-bold text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
                >
                  No End Date
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDate) {
                      onChange(toLocalDateTimeValue(workingDate));
                    }
                    setIsOpen(false);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-colors cursor-pointer"
                >
                  <Check size={13} />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
