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
    <div className={`h-full flex flex-row bg-[#111b21] border-r border-[#222d34] select-none ${
      currentTab === 'analytics'
        ? 'w-16 md:w-auto flex'
        : activeConversation
          ? 'hidden md:flex'
          : 'w-full md:w-auto flex'
    }`}>
      {/* Far-Left Vertical Icon Strip */}
      <div className={`w-16 bg-[#202c33] flex flex-col items-center justify-between py-4 border-r border-[#222d34] z-20 ${
        currentTab === 'chats' ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 rounded-2xl bg-[#00a884] flex items-center justify-center text-white shadow-lg shadow-[#00a884]/30">
            <MessageSquare className="w-6 h-6" />
          </div>

          <button
            onClick={() => onSelectTab('chats')}
            title="Chats"
            className={`relative p-3 rounded-2xl transition-all ${
              currentTab === 'chats'
                ? 'bg-[#00a884]/20 text-[#00a884]'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {getUnreadTotal() > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-black font-bold text-[9px] rounded-full flex items-center justify-center">
                {getUnreadTotal()}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('analytics')}
            title="Analytics & Reports"
            className={`p-3 rounded-2xl transition-all ${
              currentTab === 'analytics'
                ? 'bg-[#00a884]/20 text-[#00a884]'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            title="Workspace Settings"
            className={`p-3 rounded-2xl transition-all ${
              currentTab === 'settings'
                ? 'bg-[#00a884]/20 text-[#00a884]'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <ThemeToggle />

          {/* User Status Avatar & Click Menu */}
          <div ref={menuRef} className="relative cursor-pointer">
            <button
              type="button"
              onClick={() => setShowProfileMenu((p) => !p)}
              className="relative focus:outline-none block"
            >
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'Agent'}`}
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover border border-emerald-500/40"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#202c33] ${
                user?.status === 'online' ? 'bg-emerald-500' :
                user?.status === 'busy' ? 'bg-amber-500' : 'bg-gray-500'
              }`} />
            </button>

            {/* Stable Click Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute left-12 bottom-0 w-48 bg-[#233138] border border-gray-700/60 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150 text-gray-200">
                <div className="px-4 py-2 border-b border-gray-700/60">
                  <p className="text-xs font-bold text-gray-100 truncate">{user?.name}</p>
                  <p className="text-[10px] text-gray-400 capitalize truncate mt-0.5">{user?.role || 'Agent'}</p>
                </div>
                
                <div className="px-4 py-1.5 text-[10px] text-gray-500 font-bold uppercase">Availability</div>
                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); setStatus('online'); }}
                  className="w-full text-left px-4 py-1.5 text-xs hover:bg-[#111b21] flex items-center gap-2 text-emerald-400"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Online
                </button>
                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); setStatus('busy'); }}
                  className="w-full text-left px-4 py-1.5 text-xs hover:bg-[#111b21] flex items-center gap-2 text-amber-400"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Busy
                </button>
                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); setStatus('offline'); }}
                  className="w-full text-left px-4 py-1.5 text-xs hover:bg-[#111b21] flex items-center gap-2 text-gray-400"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-500" /> Offline
                </button>

                <button
                  type="button"
                  onClick={() => { setShowProfileMenu(false); logout(); }}
                  className="text-xs text-red-400 p-2 hover:bg-red-500/10 rounded-xl text-left flex items-center gap-2 border-t border-gray-700/60 mt-1 font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-400" /> Logout Workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Conversation List Sidebar */}
      <div className={`flex-1 min-w-0 md:flex-none md:w-80 sm:md:w-96 flex flex-col h-full bg-[#111b21] border-r border-[#222d34] ${currentTab === 'analytics' ? 'hidden md:flex' : 'flex'}`}>
        {/* Top Header & Search */}
        <div className="p-3 bg-[#202c33] border-b border-[#222d34] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              Chats <span className="text-xs font-normal text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded-full">{conversations.length}</span>
            </h1>

            {/* 3-Dot Mobile Menu Button (Mobile Only) */}
            <div className="relative md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full transition-colors"
                title="Menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-10 w-48 bg-[#233138] border border-gray-700/60 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-gray-200">
                  <button
                    onClick={() => { setShowMobileMenu(false); onSelectTab('analytics'); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-[#111b21] transition-colors"
                  >
                    Analytics & Reports
                  </button>
                  <button
                    onClick={() => { setShowMobileMenu(false); onSelectTab('settings'); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-[#111b21] transition-colors"
                  >
                    Workspace Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      const html = document.documentElement;
                      const isDark = html.classList.contains('dark');
                      if (isDark) {
                        html.classList.remove('dark');
                        localStorage.setItem('theme', 'light');
                      } else {
                        html.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-200 hover:bg-[#111b21] transition-colors"
                  >
                    Toggle Dark Mode
                  </button>
                  
                  <div className="border-t border-gray-700/60 my-1"></div>
                  
                  <div className="px-4 py-1.5 text-[10px] text-gray-500 font-bold uppercase">Set Status</div>
                  <button
                    onClick={() => { setShowMobileMenu(false); setStatus('online'); }}
                    className="w-full text-left px-4 py-1.5 text-xs text-emerald-400 hover:bg-[#111b21] transition-colors flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
                  </button>
                  <button
                    onClick={() => { setShowMobileMenu(false); setStatus('busy'); }}
                    className="w-full text-left px-4 py-1.5 text-xs text-amber-400 hover:bg-[#111b21] transition-colors flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Busy
                  </button>
                  <button
                    onClick={() => { setShowMobileMenu(false); setStatus('offline'); }}
                    className="w-full text-left px-4 py-1.5 text-xs text-gray-400 hover:bg-[#111b21] transition-colors flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-gray-500"></span> Offline
                  </button>

                  <div className="border-t border-gray-700/60 my-1"></div>
                  <button
                    onClick={() => { setShowMobileMenu(false); logout(); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-[#111b21] transition-colors font-semibold"
                  >
                    Logout Workspace
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers or messages..."
              className="w-full bg-[#111b21] text-gray-200 placeholder-gray-500 text-xs rounded-xl pl-9 pr-4 py-2 outline-none border border-transparent focus:border-[#00a884] transition-colors"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar w-full">
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
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeFilter === tab.id
                    ? 'bg-[#00a884] text-white shadow-sm'
                    : 'bg-[#111b21] text-gray-400 hover:bg-white/10 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/40">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
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
                  className={`group relative flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                  }`}
                >
                  {/* Customer Avatar */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white border border-gray-700 select-none"
                      style={{ background: `hsl(${(conv.customer?.name?.charCodeAt(0) || 65) * 7 % 360}, 50%, 35%)` }}
                    >
                      {conv.customer?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#111b21]" />
                  </div>

                    {/* Info Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-200 truncate">
                        {conv.customer?.name || 'Customer'}
                      </h3>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeStr}</span>
                    </div>

                    {(() => {
                      const isTyping = typingState[conv._id]?.senderType === 'customer' && typingState[conv._id]?.isTyping;
                      return (
                        <p className={`text-xs truncate ${isTyping ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>
                          {isTyping ? 'typing...' : (conv.lastMessage?.content || 'No messages yet')}
                        </p>
                      );
                    })()}

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          conv.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          conv.priority === 'high' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700/40 text-gray-400'
                        }`}>
                          {conv.priority}
                        </span>
                        {conv.isPinned && <Pin className="w-3 h-3 text-emerald-400 fill-emerald-400" />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete entire chat with ${conv.customer?.name || 'Customer'}?`)) {
                              deleteConversation(conv._id);
                            }
                          }}
                          title="Delete Chat"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {conv.unreadCount > 0 && !isSelected && (
                          <span className="bg-[#00a884] text-black font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
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
