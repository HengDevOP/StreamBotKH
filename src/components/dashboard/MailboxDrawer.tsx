import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  X,
  RotateCw,
  CheckCheck,
  Trash2,
  Bell,
  Shield,
  Sparkles,
  DollarSign,
  Megaphone,
  ArrowLeft,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { request } from '../../services/api';

export interface MailboxMessage {
  id: string;
  streamerId: string;
  title: string;
  senderName: string;
  senderAvatar?: string;
  category: 'system' | 'donation' | 'security' | 'announcement';
  content: string;
  preview?: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  priority?: 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

interface MailboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const MailboxDrawer: React.FC<MailboxDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onUnreadCountChange
}) => {
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MailboxMessage | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'system' | 'donation' | 'security'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Fetch messages from backend
  const fetchMessages = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await request<{ messages: MailboxMessage[]; unreadCount: number }>('/mailbox');
      if (res && Array.isArray(res.messages)) {
        setMessages(res.messages);
        if (onUnreadCountChange) {
          onUnreadCountChange(res.unreadCount);
        }
      }
    } catch (err) {
      console.warn('[MailboxDrawer] Failed to fetch mailbox messages:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages(true);
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
  };

  // Mark single message as read
  const handleMarkAsRead = async (message: MailboxMessage) => {
    if (message.isRead) return;
    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ messageId: message.id })
      });
      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m));
        const newUnread = updated.filter((m) => !m.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(newUnread);
        return updated;
      });
      if (selectedMessage && selectedMessage.id === message.id) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
    } catch (e) {
      console.warn('Failed to mark read', e);
    }
  };

  // Toggle back to unread
  const handleToggleUnread = async (message: MailboxMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ messageId: message.id, unread: message.isRead })
      });
      setMessages((prev) => {
        const updated = prev.map((m) => (m.id === message.id ? { ...m, isRead: !m.isRead } : m));
        const newUnread = updated.filter((m) => !m.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(newUnread);
        return updated;
      });
      if (selectedMessage && selectedMessage.id === message.id) {
        setSelectedMessage({ ...selectedMessage, isRead: !selectedMessage.isRead });
      }
      showToast(message.isRead ? 'Marked as unread' : 'Marked as read');
    } catch (e) {
      console.warn('Failed to toggle unread', e);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await request('/mailbox/read', {
        method: 'POST',
        body: JSON.stringify({ all: true })
      });
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
      if (selectedMessage) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
      if (onUnreadCountChange) onUnreadCountChange(0);
      showToast('All messages marked as read');
    } catch (e) {
      console.warn('Failed to mark all read', e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await request('/mailbox', {
        method: 'DELETE',
        body: JSON.stringify({ messageId })
      });
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== messageId);
        const newUnread = updated.filter((m) => !m.isRead).length;
        if (onUnreadCountChange) onUnreadCountChange(newUnread);
        return updated;
      });
      if (selectedMessage && selectedMessage.id === messageId) {
        setSelectedMessage(null);
      }
      showToast('Message deleted');
    } catch (e) {
      console.warn('Failed to delete message', e);
    }
  };

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // Category / Read filter
      if (activeFilter === 'unread' && m.isRead) return false;
      if (activeFilter === 'system' && m.category !== 'system' && m.category !== 'announcement') return false;
      if (activeFilter === 'donation' && m.category !== 'donation') return false;
      if (activeFilter === 'security' && m.category !== 'security') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchContent = m.content.toLowerCase().includes(q);
        const matchSender = m.senderName.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchSender) return false;
      }

      return true;
    });
  }, [messages, activeFilter, searchQuery]);

  const unreadCount = useMemo(() => messages.filter((m) => !m.isRead).length, [messages]);

  // Format time relative
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Category Icon & Badge
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'donation':
        return {
          icon: DollarSign,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          label: 'Donation'
        };
      case 'security':
        return {
          icon: Shield,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          label: 'Security'
        };
      case 'announcement':
        return {
          icon: Megaphone,
          color: 'text-purple-400',
          bg: 'bg-purple-500/10 border-purple-500/20',
          label: 'Announce'
        };
      default:
        return {
          icon: Sparkles,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10 border-cyan-500/20',
          label: 'System'
        };
    }
  };

  const handleActionClick = (url?: string) => {
    if (!url) return;
    if (url.startsWith('/dashboard?tab=')) {
      const targetTab = url.replace('/dashboard?tab=', '').split('&')[0];
      if (onNavigateTab) {
        onNavigateTab(targetTab);
        onClose();
        return;
      }
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fadeIn"
      />

      {/* Slide-over Drawer (Desktop right side, full height, width 520px) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md sm:max-w-lg lg:max-w-xl bg-[#090d16] border-l border-slate-800 shadow-2xl flex flex-col h-full animate-slideInRight">
          
          {/* Header Deck */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#060911]/90 flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white font-['Chakra_Petch'] tracking-wide">
                    STREAMER MAILBOX
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  System notices, bank listener alerts &amp; platform updates
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-cyan-400 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={() => fetchMessages(true)}
                className={`p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white transition-colors ${
                  loading ? 'animate-spin text-cyan-400' : ''
                }`}
                title="Refresh mailbox"
              >
                <RotateCw size={16} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-white transition-colors"
                title="Close Mailbox"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Action Notification Toast */}
          {actionNotice && (
            <div className="bg-cyan-500/10 border-b border-cyan-500/30 px-4 py-2 flex items-center justify-between text-xs text-cyan-300 font-mono animate-fadeIn">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-cyan-400" />
                {actionNotice}
              </span>
            </div>
          )}

          {/* If Message is Selected, Render Message Detail View */}
          {selectedMessage ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Back to List Navigation */}
                <button
                  type="button"
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer group"
                >
                  <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to all messages</span>
                </button>

                {/* Message Header */}
                <div className="space-y-3 pb-4 border-b border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {(() => {
                      const meta = getCategoryMeta(selectedMessage.category);
                      const Icon = meta.icon;
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase border ${meta.bg} ${meta.color}`}
                        >
                          <Icon size={12} />
                          {meta.label}
                        </span>
                      );
                    })()}

                    {selectedMessage.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                        URGENT
                      </span>
                    )}

                    {selectedMessage.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        IMPORTANT
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-500 ml-auto flex items-center gap-1">
                      <Clock size={12} />
                      {formatTime(selectedMessage.createdAt)}
                    </span>
                  </div>

                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                    {selectedMessage.title}
                  </h1>

                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="text-slate-300">
                      From: <strong className="text-cyan-400">{selectedMessage.senderName}</strong>
                    </span>
                    <span>
                      {new Date(selectedMessage.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/60 p-4 sm:p-5 rounded-xl border border-slate-850">
                  {selectedMessage.content}
                </div>

                {/* Call to Action Button */}
                {selectedMessage.actionUrl && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleActionClick(selectedMessage.actionUrl)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold font-['Chakra_Petch'] text-sm shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all cursor-pointer"
                    >
                      <span>{selectedMessage.actionLabel || 'Take Action'}</span>
                      <ExternalLink size={15} />
                    </button>
                  </div>
                )}
              </div>

              {/* Message Bottom Action Controls */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleUnread(selectedMessage)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-mono transition-colors"
                >
                  <Mail size={13} />
                  <span>{selectedMessage.isRead ? 'Mark as Unread' : 'Mark as Read'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-mono transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Delete Message</span>
                </button>
              </div>
            </div>
          ) : (
            /* Otherwise, Render Message List Deck */
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Search & Filter Bar */}
              <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3 flex-shrink-0">
                {/* Search Input */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages by keyword, title, sender..."
                    className="w-full bg-slate-900/90 border border-slate-750 focus:border-cyan-500/60 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: 'All', count: messages.length },
                    { id: 'unread', label: 'Unread', count: unreadCount },
                    { id: 'system', label: 'System' },
                    { id: 'donation', label: 'Donations' },
                    { id: 'security', label: 'Security' }
                  ].map((filter) => {
                    const isActive = activeFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setActiveFilter(filter.id as any)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>{filter.label}</span>
                        {filter.count !== undefined && filter.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              isActive ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {filter.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-850 p-2 sm:p-3 space-y-2">
                {loading && messages.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <RotateCw size={24} className="mx-auto text-cyan-400 animate-spin" />
                    <p className="text-xs font-mono text-slate-400">Loading your mailbox messages...</p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 shadow-inner">
                      <Mail size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-300">No Messages Found</h3>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        {searchQuery
                          ? 'No messages match your search filter.'
                          : activeFilter === 'unread'
                          ? 'You are all caught up! No unread messages in your inbox.'
                          : 'Your mailbox is clean. System notifications will arrive here.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredMessages.map((message) => {
                    const meta = getCategoryMeta(message.category);
                    const CategoryIcon = meta.icon;

                    return (
                      <div
                        key={message.id}
                        onClick={() => {
                          setSelectedMessage(message);
                          handleMarkAsRead(message);
                        }}
                        className={`group relative p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                          !message.isRead
                            ? 'bg-slate-900/80 hover:bg-slate-900 border-cyan-500/40 hover:border-cyan-500/70 shadow-[0_0_15px_rgba(0,240,255,0.06)]'
                            : 'bg-slate-950/40 hover:bg-slate-900/40 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        {/* Unread Accent Indicator */}
                        {!message.isRead && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00F0FF] animate-pulse" />
                        )}

                        <div className="flex items-start gap-3 pl-1 sm:pl-1.5">
                          {/* Category Badge Icon */}
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.color} shadow-sm`}
                          >
                            <CategoryIcon size={14} />
                          </div>

                          {/* Message Content Preview */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-xs font-mono truncate ${
                                  !message.isRead ? 'text-cyan-300 font-bold' : 'text-slate-400 font-medium'
                                }`}
                              >
                                {message.senderName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>

                            <h4
                              className={`text-xs sm:text-sm tracking-tight leading-snug truncate ${
                                !message.isRead ? 'text-white font-bold' : 'text-slate-300 font-medium'
                              }`}
                            >
                              {message.title}
                            </h4>

                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {message.preview || message.content}
                            </p>

                            {/* Priority / Action Badges */}
                            <div className="flex items-center gap-1.5 pt-1">
                              {message.priority === 'urgent' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                                  URGENT
                                </span>
                              )}
                              {message.actionLabel && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400/90 group-hover:text-cyan-300 transition-colors">
                                  <span>{message.actionLabel}</span>
                                  <ChevronRight size={10} />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hover Actions: Toggle Unread & Delete */}
                          <div className="hidden sm:flex flex-col gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleToggleUnread(message, e)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title={message.isRead ? 'Mark as Unread' : 'Mark as Read'}
                            >
                              <Mail size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteMessage(message.id, e)}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Message"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Drawer Footer Status Deck */}
          <div className="p-3 border-t border-slate-800/80 bg-[#060911] flex items-center justify-between text-[11px] font-mono text-slate-500 flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              StreamBotKH Mailbox Engine
            </span>
            <span>{messages.length} Total Messages</span>
          </div>
        </div>
      </div>
    </div>
  );
};
