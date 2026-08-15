import React, { useState, useRef, useEffect } from 'react';
import { Search, MessageSquare, BarChart2, LogOut, Pin, Trash2, MoreVertical, Settings } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ThemeToggle } from '../common/ThemeToggle';

interface AdminSidebarProps {
  currentTab: 'chats' | 'analytics' | 'settings';
  onSelectTab: (tab: 'chats' | 'analytics' | 'settings') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout, setStatus } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    conversations,
    activeConversation,
    setActiveConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    typingState
  } = useChatStore();

  const getUnreadTotal = () => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  };

  return (
    <div className={`h-full flex flex-row bg-white/70 dark:bg-[#121214]/80 backdrop-blur-2xl border-r border-black/[0.06] dark:border-white/[0.08] select-none transition-colors duration-300 ${
      currentTab === 'analytics'
        ? 'w-16 md:w-auto flex'
        : activeConversation
          ? 'hidden md:flex'
          : 'w-full md:w-auto flex'
    }`}>
      {/* Far-Left macOS App Dock Strip */}
      <div className={`w-[70px] bg-[#f5f5f7]/90 dark:bg-[#161618]/90 backdrop-blur-2xl flex flex-col items-center justify-between py-4 border-r border-black/[0.06] dark:border-white/[0.08] z-20 ${
        currentTab === 'chats' ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="flex flex-col items-center gap-5 w-full">
          {/* macOS Traffic Lights */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-black/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-black/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-black/10" />
          </div>

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#409cff] dark:from-[#0a84ff] dark:to-[#5e5ce6] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>

          <div className="w-8 h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />

          {/* Navigation Items */}
          <button
            onClick={() => onSelectTab('chats')}
            title="Messages"
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
              currentTab === 'chats'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] dark:text-[#0a84ff] shadow-md border border-black/[0.04] dark:border-white/[0.08]'
                : 'text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {getUnreadTotal() > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff3b30] text-white font-bold text-[9px] rounded-full flex items-center justify-center shadow-sm">
                {getUnreadTotal()}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('analytics')}
            title="Analytics"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
              currentTab === 'analytics'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] dark:text-[#0a84ff] shadow-md border border-black/[0.04] dark:border-white/[0.08]'
                : 'text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            title="Settings"
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 ${
              currentTab === 'settings'
                ? 'bg-white dark:bg-[#2c2c2e] text-[#0071e3] dark:text-[#0a84ff] shadow-md border border-black/[0.04] dark:border-white/[0.08]'
                : 'text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom Profile & Theme Toggle */}
        <div className="flex flex-col items-center gap-3.5 w-full">
          <ThemeToggle />

          <div ref={menuRef} className="relative cursor-pointer">
            <button
              type="button"
              onClick={() => setShowProfileMenu((p) => !p)}
              className="relative focus:outline-none block active:scale-95 transition-transform"
            >
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'Agent'}`}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.1] shadow-xs"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#161618] ${
                user?.status === 'online' ? 'bg-[#34c759]' :
                user?.status === 'busy' ? 'bg-[#ff9500]' : 'bg-[#86868b]'
              }`} />
            </button>

            {showProfileMenu && (
              <div className="absolute left-12 bottom-0 w-52 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#1d1d1f] dark:text-[#f5f5f7]">
                <div className="px-4 py-2 border-b border-black/[0.04] dark:border-white/[0.06]">
                  <p className="text-xs font-bold truncate">{user?.name}</p>
                  <p className="text-[10px] text-[#86868b] capitalize truncate mt-0.5">{user?.role || 'Support Agent'}</p>
                </div>
                
                <div className="px-4 py-1.5 text-[10px] text-[#86868b] font-bold uppercase tracking-wider">Status</div>
                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); setStatus('online'); }}
                  className="w-full text-left px-4 py-1.5 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-[#34c759]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#34c759]" /> Online
                </button>
                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); setStatus('busy'); }}
                  className="w-full text-left px-4 py-1.5 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-[#ff9500]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#ff9500]" /> Busy
                </button>
                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); setStatus('offline'); }}
                  className="w-full text-left px-4 py-1.5 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center gap-2 text-[#86868b]"
                >
                  <span className="w-2 h-2 rounded-full bg-[#86868b]" /> Offline
                </button>

                <div className="border-t border-black/[0.04] dark:border-white/[0.06] my-1" />
                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); logout(); }}
                  className="w-full text-xs text-red-500 px-4 py-2 hover:bg-red-500/10 text-left flex items-center gap-2 font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" /> Sign Out Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Conversation List Column */}
      <div className={`flex-1 min-w-0 md:flex-none md:w-80 lg:w-[360px] flex flex-col h-full bg-white/50 dark:bg-[#161618]/50 backdrop-blur-xl border-r border-black/[0.06] dark:border-white/[0.08] ${
        currentTab === 'analytics' ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Top Header & Search */}
        <div className="p-3.5 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
              Messages <span className="text-[11px] font-semibold text-[#0071e3] dark:text-[#0a84ff] bg-blue-500/10 px-2 py-0.5 rounded-full">{conversations.length}</span>
            </h1>

            {/* Mobile Menu Button */}
            <div className="relative md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#86868b] rounded-full transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-10 w-48 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] rounded-2xl shadow-2xl py-2 z-50 text-[#1d1d1f] dark:text-[#f5f5f7]">
                  <button
                    onClick={() => { setShowMobileMenu(false); onSelectTab('analytics'); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    Analytics & Reports
                  </button>
                  <button
                    onClick={() => { setShowMobileMenu(false); onSelectTab('settings'); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    Workspace Settings
                  </button>
                  <button
                    onClick={() => { setShowMobileMenu(false); logout(); }}
                    className="w-full text-left px-4 py-2 text-xs text-red-500 font-semibold"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation (⌘K)..."
              className="w-full bg-black/[0.04] dark:bg-white/[0.06] text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b] text-xs rounded-xl pl-9 pr-4 py-2 outline-none border border-transparent focus:border-[#0071e3] focus:bg-white dark:focus:bg-[#1c1c1e] transition-all"
            />
          </div>

          {/* Apple Segmented Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-xl overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'mine', label: 'Mine' },
              { id: 'pinned', label: 'Pinned' },
              { id: 'archived', label: 'Archived' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  activeFilter === tab.id
                    ? 'bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white shadow-xs'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/[0.03] dark:divide-white/[0.04] p-1.5 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-[#86868b] text-xs">
              No conversations found.
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConversation?._id === conv._id;
              const timeStr = conv.lastMessage?.timestamp
                ? new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveConversation(conv)}
                  className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-180 ${
                    isSelected
                      ? 'bg-blue-500/10 dark:bg-blue-600/20 text-[#0071e3] dark:text-[#0a84ff]'
                      : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Customer Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs select-none"
                      style={{ background: `hsl(${(conv.customer?.name?.charCodeAt(0) || 65) * 11 % 360}, 65%, 48%)` }}
                    >
                      {conv.customer?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#34c759] rounded-full border-2 border-white dark:border-[#161618]" />
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`text-[13px] font-semibold truncate ${
                        isSelected ? 'text-[#0071e3] dark:text-[#0a84ff]' : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
                      }`}>
                        {conv.customer?.name || 'Customer'}
                      </h3>
                      <span className="text-[10px] text-[#86868b] whitespace-nowrap">{timeStr}</span>
                    </div>

                    {(() => {
                      const isTyping = typingState[conv._id]?.senderType === 'customer' && typingState[conv._id]?.isTyping;
                      return (
                        <p className={`text-xs truncate ${
                          isTyping
                            ? 'text-[#0071e3] dark:text-[#0a84ff] font-semibold animate-pulse'
                            : 'text-[#86868b]'
                        }`}>
                          {isTyping ? 'typing...' : (conv.lastMessage?.content || 'No messages yet')}
                        </p>
                      );
                    })()}

                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                          conv.priority === 'urgent' ? 'bg-red-500/15 text-red-500' :
                          conv.priority === 'high' ? 'bg-amber-500/15 text-amber-500' : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b]'
                        }`}>
                          {conv.priority}
                        </span>
                        {conv.isPinned && <Pin className="w-3 h-3 text-[#0071e3] fill-[#0071e3]" />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete chat with ${conv.customer?.name || 'Customer'}?`)) {
                              deleteConversation(conv._id);
                            }
                          }}
                          title="Delete Chat"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 text-[#86868b] hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {conv.unreadCount > 0 && !isSelected && (
                          <span className="bg-[#0071e3] dark:bg-[#0a84ff] text-white font-bold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
