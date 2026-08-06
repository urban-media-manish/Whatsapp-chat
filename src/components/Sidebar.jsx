import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, Moon, Sun, Search, LogOut, CheckCheck, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Sidebar({ activeChat, onSelectChat, theme, toggleTheme, onOpenStory }) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch chats list
  const fetchChats = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chats?userId=${user.id}`);
      const data = await res.json();
      if (data.chats) {
        setChats(data.chats);
      }
    } catch (err) {
      console.error('Error loading chats:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user]);

  // Handle user search in database
  const handleUserSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setUserSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&userId=${user.id}`);
      const data = await res.json();
      setUserSearchResults(data.users || []);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  // Start new chat with a user
  const handleStartChat = async (contactId) => {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: user.id, contactId })
      });
      const data = await res.json();
      if (data.chat) {
        setShowSearchModal(false);
        await fetchChats();
        onSelectChat(data.chat.chatId, data.contact);
      }
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    if (filter === 'unread') return chat.unreadCount > 0;
    return true;
  });

  return (
    <aside className="sidebar">
      {/* Header */}
      <header className="sidebar-header">
        <div className="user-avatar-wrapper" title={`${user.name} (${user.username})`}>
          <img src={user.avatar} alt={user.name} className="avatar" />
          <div className="online-indicator" />
        </div>

        <div className="header-icons">
          <button className="icon-btn" title="Status Stories" onClick={onOpenStory}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
          </button>

          <button className="icon-btn" title="New Chat with Real User" onClick={() => setShowSearchModal(true)}>
            <UserPlus size={20} />
          </button>

          <button className="icon-btn" title="Toggle Theme" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="icon-btn" title="Logout" onClick={logout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Search Input */}
      <div className="search-container">
        <div className="search-box">
          <Search size={18} color="var(--icon-color)" />
          <input 
            type="text" 
            placeholder="Search or start new chat" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="chat-filters">
        <button 
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-chip ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread
        </button>
      </div>

      {/* Chats List */}
      <div className="chats-list">
        {filteredChats.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlignment: 'center', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No conversations yet.<br/>
            Click <strong>+ User</strong> above to start messaging a real user!
          </div>
        ) : (
          filteredChats.map(chat => {
            const isOnline = onlineUsers.has(chat.contactId) || chat.userStatus === 'online';
            const isSelected = activeChat && activeChat.chatId === chat.chatId;

            return (
              <div 
                key={chat.chatId} 
                className={`chat-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectChat(chat.chatId, {
                  id: chat.contactId,
                  name: chat.name,
                  username: chat.username,
                  avatar: chat.avatar,
                  about: chat.about,
                  status: isOnline ? 'online' : 'offline'
                })}
              >
                <div className="chat-avatar-wrapper">
                  <img src={chat.avatar} alt={chat.name} className="avatar" />
                  {isOnline && <div className="online-indicator" />}
                </div>

                <div className="chat-info">
                  <div className="chat-top-row">
                    <span className="chat-name">{chat.name}</span>
                    <span className={`chat-time ${chat.unreadCount > 0 ? 'unread' : ''}`}>
                      {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="chat-bottom-row">
                    <span className="last-msg">
                      <span className="msg-text-snippet">{chat.lastMessage || 'Click to chat'}</span>
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="unread-badge">{chat.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Search Real Users Modal */}
      {showSearchModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="auth-card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Find & Chat with Real User</h3>
              <button className="icon-btn" onClick={() => setShowSearchModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="search-box" style={{ marginTop: '12px' }}>
              <Search size={18} color="var(--icon-color)" />
              <input 
                type="text" 
                placeholder="Type username or name..." 
                value={searchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userSearchResults.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                  {searchQuery ? 'No users found with that name.' : 'Type a username to search database...'}
                </div>
              ) : (
                userSearchResults.map(u => (
                  <div 
                    key={u.id}
                    onClick={() => handleStartChat(u.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--search-bg)',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <img src={u.avatar} alt={u.name} className="avatar" />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px' }}>{u.name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>@{u.username} • {u.about}</div>
                    </div>
                    <button className="auth-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Chat</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
