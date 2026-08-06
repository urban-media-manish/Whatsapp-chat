import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, CheckCheck, ArrowLeft, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat'
  const messagesEndRef = useRef(null);

  // Fetch all customer chats for Admin management
  const fetchChats = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chats?userId=${user.id}`);
      const data = await res.json();
      if (data.chats) {
        setChats(data.chats);
        if (data.chats.length > 0 && !activeChat) {
          const first = data.chats[0];
          setActiveChat({
            chatId: first.chatId,
            contact: {
              id: first.contactId,
              name: first.name,
              username: first.username,
              phone: first.phone,
              avatar: first.avatar,
              about: first.about,
              status: first.userStatus
            }
          });
        }
      }
    } catch (err) {
      console.error('Fetch admin chats error:', err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    fetch(`/api/messages/${activeChat.chatId}`)
      .then(res => res.json())
      .then(data => setMessages(data.messages || []));

    if (socket) {
      socket.emit('mark_read', { chatId: activeChat.chatId, userId: user.id, senderId: activeChat.contact.id });

      const handleNewMsg = (msg) => {
        if (msg.chat_id === activeChat.chatId) {
          setMessages(prev => [...prev, msg]);
          socket.emit('mark_read', { chatId: activeChat.chatId, userId: user.id, senderId: activeChat.contact.id });
        }
        fetchChats();
      };

      const handleSentMsg = (msg) => {
        if (msg.chat_id === activeChat.chatId) {
          setMessages(prev => [...prev, msg]);
        }
        fetchChats();
      };

      socket.on('new_message', handleNewMsg);
      socket.on('message_sent', handleSentMsg);

      return () => {
        socket.off('new_message', handleNewMsg);
        socket.off('message_sent', handleSentMsg);
      };
    }
  }, [activeChat, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = () => {
    if (!inputText.trim() || !activeChat || !socket) return;

    socket.emit('send_message', {
      chatId: activeChat.chatId,
      senderId: user.id,
      recipientId: activeChat.contact.id,
      text: inputText.trim(),
      type: 'text'
    });

    setInputText('');
  };

  // Send BETBOSS99 Promo Card
  const handleSendPromoCard = () => {
    if (!activeChat || !socket) return;

    const templatePayload = {
      title: "🤝 BETBOSS99 | TRUSTED & SECURE 🤝",
      subtitle: "100% Safe Platform",
      officialUrl: "www.betboss99.com",
      guideUrl: "https://vimeo.com/1109852737",
      points: "1 Pt = ₹1 | Min ID ₹100 | Min Bet ₹100\n(Demo ID: \"Login With Demo\")",
      verifiedNotice: "⚡ VERIFIED SITES (AUTO DEPOSIT & WITHDRAWAL)",
      verifiedSites: ["betboss99.com", "reallotus365.ink"],
      footer: "💎 24/7 Live Customer Support | Kheliye Bina Kisi Darr Ke! 💎"
    };

    socket.emit('send_message', {
      chatId: activeChat.chatId,
      senderId: user.id,
      recipientId: activeChat.contact.id,
      text: "🤝 BETBOSS99 | TRUSTED & SECURE 🤝",
      type: "template",
      templateData: templatePayload
    });
  };

  // Send Selection Options Card
  const handleSendOptionsCard = () => {
    if (!activeChat || !socket) return;

    const optionsPayload = {
      prompt: "Please select one site",
      hint: "Tap any number below to continue",
      buttons: ["1️⃣ Welcome To Real Lotus365"]
    };

    socket.emit('send_message', {
      chatId: activeChat.chatId,
      senderId: user.id,
      recipientId: activeChat.contact.id,
      text: "Please select one site",
      type: "options",
      optionsData: optionsPayload
    });
  };

  // Send Error Alert
  const handleSendErrorAlert = () => {
    if (!activeChat || !socket) return;

    socket.emit('send_message', {
      chatId: activeChat.chatId,
      senderId: user.id,
      recipientId: activeChat.contact.id,
      text: "Something went wrong. Please try again.",
      type: "alert"
    });
  };

  const filteredChats = chats.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="app-container">
      {/* Left Customer List Sidebar */}
      <aside className={`sidebar ${mobileView === 'chat' ? 'mobile-hidden' : ''}`}>
        <header className="sidebar-header">
          <div className="user-avatar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={user.avatar} alt="Support Agent" className="avatar" />
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px' }}>Customer Management</div>
              <div style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 600 }}>Agent Console • Online</div>
            </div>
          </div>
        </header>

        {/* User Search */}
        <div className="search-container">
          <div className="search-box">
            <Search size={18} color="var(--icon-color)" />
            <input 
              type="text" 
              placeholder="Search user name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="chats-list">
          {filteredChats.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No customer chats yet.
            </div>
          ) : (
            filteredChats.map(chat => {
              const isOnline = onlineUsers.has(chat.contactId) || chat.userStatus === 'online';
              const isSelected = activeChat && activeChat.chatId === chat.chatId;

              return (
                <div 
                  key={chat.chatId} 
                  className={`chat-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    setActiveChat({
                      chatId: chat.chatId,
                      contact: {
                        id: chat.contactId,
                        name: chat.name,
                        username: chat.username,
                        phone: chat.phone,
                        avatar: chat.avatar,
                        about: chat.about,
                        status: isOnline ? 'online' : 'offline'
                      }
                    });
                    setMobileView('chat');
                  }}
                >
                  <div className="chat-avatar-wrapper">
                    <img src={chat.avatar} alt={chat.name} className="avatar" />
                    {isOnline && <div className="online-indicator" />}
                  </div>

                  <div className="chat-info">
                    <div className="chat-top-row">
                      <span className="chat-name">{chat.name}</span>
                      <span className="chat-time">
                        {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div className="chat-phone">{chat.phone || `@${chat.username}`}</div>

                    <div className="chat-bottom-row">
                      <span className="last-msg">{chat.lastMessage || 'No messages'}</span>
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
      </aside>

      {/* Right Live Customer Support Console */}
      <main className={`main-chat ${mobileView === 'list' ? 'mobile-hidden' : ''}`}>
        {activeChat ? (
          <div className="chat-window">
            {/* Header */}
            <header className="support-header">
              <div className="support-header-info">
                {/* Mobile Back Button */}
                <button 
                  className="icon-btn" 
                  style={{ color: 'white', marginRight: '4px' }} 
                  onClick={() => setMobileView('list')}
                >
                  <ArrowLeft size={22} />
                </button>

                <img src={activeChat.contact.avatar} alt={activeChat.contact.name} className="avatar" />
                <div>
                  <div className="support-name">
                    {activeChat.contact.name}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    📱 {activeChat.contact.phone || `@${activeChat.contact.username}`} • {onlineUsers.has(activeChat.contact.id) ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            </header>

            {/* Quick Template Generator Bar for Agents */}
            <div style={{ padding: '8px 14px', background: '#162026', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'center', overflowX: 'auto', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Quick Cards:</span>
              <button className="view-btn" onClick={handleSendPromoCard} style={{ borderColor: '#f7b731', color: '#f7b731', whiteSpace: 'nowrap' }}>
                + BETBOSS99 Card
              </button>
              <button className="view-btn" onClick={handleSendOptionsCard} style={{ borderColor: '#25d366', color: '#25d366', whiteSpace: 'nowrap' }}>
                + Option Buttons
              </button>
              <button className="view-btn" onClick={handleSendErrorAlert} style={{ borderColor: '#ea4335', color: '#ea4335', whiteSpace: 'nowrap' }}>
                + Error Alert
              </button>
            </div>

            {/* Messages Flow */}
            <div className="messages-container doodle-bg">
              <div className="date-divider">Today</div>

              {messages.map(msg => {
                const isOutgoing = msg.sender_id === user.id;

                let templateObj = null;
                if (msg.type === 'template' && msg.template_data) {
                  try { templateObj = JSON.parse(msg.template_data); } catch(e){}
                }

                let optionsObj = null;
                if (msg.type === 'options' && msg.options_data) {
                  try { optionsObj = JSON.parse(msg.options_data); } catch(e){}
                }

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOutgoing ? 'flex-end' : 'flex-start' }}>
                    {msg.type === 'template' && templateObj ? (
                      <div className="promo-card">
                        <div className="promo-card-title">
                          <span>{templateObj.title}</span>
                        </div>
                        <div className="promo-card-row" style={{ color: '#25d366', fontWeight: 700 }}>
                          ✅ {templateObj.subtitle}
                        </div>
                        <div className="promo-card-row">
                          🌐 Official: <a href={`https://${templateObj.officialUrl}`} target="_blank" rel="noreferrer" className="promo-card-link">{templateObj.officialUrl}</a>
                        </div>
                        <div className="promo-card-row">
                          📹 ID Guide: <a href={templateObj.guideUrl} target="_blank" rel="noreferrer" className="promo-card-link">{templateObj.guideUrl}</a>
                        </div>
                        <div className="promo-card-divider" />
                        <div className="promo-card-row" style={{ whiteSpace: 'pre-line' }}>
                          💰 {templateObj.points}
                        </div>
                        <div className="promo-card-divider" />
                        <div className="promo-card-row" style={{ color: '#f7b731', fontWeight: 700 }}>
                          {templateObj.verifiedNotice}
                        </div>
                        {templateObj.verifiedSites && templateObj.verifiedSites.map((site, i) => (
                          <div key={i} className="promo-card-row">
                            🌐 <a href={`https://${site}`} target="_blank" rel="noreferrer" className="promo-card-link">{site}</a>
                          </div>
                        ))}
                        <div className="promo-card-divider" />
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {templateObj.footer}
                        </div>
                      </div>
                    ) : msg.type === 'options' && optionsObj ? (
                      <div className="options-card">
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14.5px' }}>
                          {optionsObj.prompt}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {optionsObj.hint}
                        </div>
                        {optionsObj.buttons && optionsObj.buttons.map((btnText, i) => (
                          <button key={i} className="options-btn">
                            {btnText}
                          </button>
                        ))}
                      </div>
                    ) : msg.type === 'alert' ? (
                      <div className="error-alert-bubble">
                        ⚠️ {msg.text}
                      </div>
                    ) : (
                      <div className={`message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                        {msg.text}
                        <div className="message-meta">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOutgoing && <CheckCheck size={15} color="var(--tick-blue)" />}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <footer className="chat-input-bar">
              <div className="input-box-wrapper">
                <input 
                  type="text" 
                  className="input-box" 
                  placeholder="Type a support reply..." 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                />
              </div>
              <button className="send-circle-btn" onClick={handleSendText}>
                <Send size={20} />
              </button>
            </footer>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Select a User Chat</h2>
            <p>Select a customer from the left sidebar to start live support management.</p>
          </div>
        )}
      </main>
    </div>
  );
}
