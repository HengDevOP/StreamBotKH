'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  CheckCheck,
  Trash2,
  Sparkles,
  DollarSign,
  Shield,
  Megaphone,
  ChevronRight,
  ExternalLink,
  Inbox,
  RotateCw,
  X
} from 'lucide-react';
import { request } from '../../services/api';
import { MailboxMessage } from './MailboxDrawer';

interface MailboxDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullMailbox: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const MailboxDropdown: React.FC<MailboxDropdownProps> = ({
  isOpen,
  onClose,
  onOpenFullMailbox,
  onUnreadCountChange
}) => {
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchDropdownMessages = async () => {
    setLoading(true);
    try {
      const res = await request<{ messages: MailboxMessage[]; unreadCount: number }>('/mailbox');
      if (res && res.messages) {
        setMessages(res.messages.slice(0, 10)); // Top 10 recent
        onUnreadCountChange?.(res.unreadCount);
      }
    } catch (err) {
      console.warn('[MailboxDropdown] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDropdownMessages();
    }
  }, [isOpen]);

  // Click outside to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const handleMarkAsRead = async (message: MailboxMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (message.isRead) return;

    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ messageId: message.id })
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
      );
      onUnreadCountChange?.(Math.max(0, unreadCount - 1));
    } catch (err) {}
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0) return;

    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ all: true })
      });
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      onUnreadCountChange?.(0);
    } catch (err) {}
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 rounded-2xl bg-[#090D18]/95 backdrop-blur-2xl border border-slate-700/80 shadow-[0_16px_40px_rgba(0,0,0,0.85)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans"
    >
      {/* Top Header */}
      <div className="p-3.5 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Mail size={14} />
          </div>
          <span className="font-bold text-white text-xs font-mono">Mailbox &amp; Alerts</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-cyan-400 text-slate-950">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-cyan-400 text-[11px] font-mono transition-colors flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck size={13} />
              <span>Read all</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/60">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <RotateCw size={18} className="animate-spin text-cyan-400" />
            <span>Loading notifications...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <Inbox size={28} className="mx-auto text-slate-600" />
            <p>Your mailbox is empty and clean.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUnread = !msg.isRead;
            return (
              <div
                key={msg.id}
                onClick={() => {
                  handleMarkAsRead(msg);
                  onOpenFullMailbox();
                }}
                className={`p-3.5 hover:bg-slate-800/50 cursor-pointer transition-colors space-y-1 ${
                  isUnread ? 'bg-cyan-500/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 animate-pulse" />
                    )}
                    <span className="text-[10px] font-mono font-bold text-slate-400 truncate">
                      {msg.senderName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className={`text-xs font-bold line-clamp-1 ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                  {msg.title}
                </h4>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {msg.preview || msg.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Dropdown Footer: Full Mailbox Button */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-900/80">
        <button
          onClick={() => {
            onClose();
            onOpenFullMailbox();
          }}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 hover:text-cyan-300 text-slate-200 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 border border-slate-700"
        >
          <span>Open Full Mailbox Desk</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
