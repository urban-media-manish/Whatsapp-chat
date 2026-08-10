import { Search, MessageSquare, BarChart2, LogOut, Pin, Trash2 } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ThemeToggle } from '../common/ThemeToggle';

interface AdminSidebarProps {
  currentTab: 'chats' | 'analytics';
  onSelectTab: (tab: 'chats' | 'analytics') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout, setStatus } = useAuthStore();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter
  } = useChatStore();

  const getUnreadTotal = () => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  };

  return (
    <div className="h-full flex flex-row bg-[#111b21] border-r border-[#222d34] select-none">
      {/* Far-Left Vertical Icon Strip */}
      <div className="w-16 bg-[#202c33] flex flex-col items-center justify-between py-4 border-r border-[#222d34] z-20">
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
        </div>

        <div className="flex flex-col items-center gap-4">
          <ThemeToggle />

          {/* User Status Avatar */}
          <div className="relative group cursor-pointer">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={user?.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
            />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#202c33]" />

            {/* Quick Status Dropdown Hover */}
            <div className="absolute bottom-0 left-14 hidden group-hover:flex flex-col bg-[#202c33] border border-gray-700/80 rounded-xl p-2 shadow-2xl z-50 w-36">
              <span className="text-[10px] font-bold text-gray-400 uppercase px-2 py-1">{user?.name} ({user?.role})</span>
              <button onClick={() => setStatus('online')} className="text-xs text-emerald-400 p-1.5 hover:bg-white/10 rounded text-left">🟢 Online</button>
              <button onClick={() => setStatus('busy')} className="text-xs text-amber-400 p-1.5 hover:bg-white/10 rounded text-left">🟡 Busy</button>
              <button onClick={() => setStatus('offline')} className="text-xs text-gray-400 p-1.5 hover:bg-white/10 rounded text-left">⚪ Offline</button>
              <button onClick={logout} className="text-xs text-red-400 p-1.5 hover:bg-red-500/10 rounded text-left flex items-center gap-1 border-t border-gray-700 mt-1">
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Conversation List Sidebar */}
      <div className="w-80 sm:w-96 flex flex-col h-full bg-[#111b21] border-r border-[#222d34]">
        {/* Top Header & Search */}
        <div className="p-3 bg-[#202c33] border-b border-[#222d34] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              Chats <span className="text-xs font-normal text-[#00a884] bg-[#00a884]/10 px-2 py-0.5 rounded-full">{conversations.length}</span>
            </h1>
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
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
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
                    <img
                      src={conv.customer?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.customer?.name}`}
                      alt={conv.customer?.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-700"
                    />
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

                    <p className="text-xs text-gray-400 truncate">
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>

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
