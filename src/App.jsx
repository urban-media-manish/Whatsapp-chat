import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AdminDashboard from './components/AdminDashboard';
import CallModal from './components/CallModal';

function MainApp() {
  const { user, loading } = useAuth();
  const { socket } = useSocket();
  const [viewMode, setViewMode] = useState('user'); // 'user' or 'admin'
  const [activeChat, setActiveChat] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // Auto select Support chat for regular users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      fetch(`/api/chats?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.chats && data.chats.length > 0) {
            const supportChat = data.chats.find(c => c.name.includes('Support')) || data.chats[0];
            setActiveChat({
              chatId: supportChat.chatId,
              contact: {
                id: supportChat.contactId,
                name: supportChat.name,
                username: supportChat.username,
                avatar: supportChat.avatar,
                about: supportChat.about,
                status: supportChat.userStatus
              }
            });
          }
        });
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00a884', background: '#0c1317' }}>
        <h2>Loading Realtime WhatsApp Support...</h2>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top View Mode Switcher Toolbar */}
      <div className="view-switcher-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600, fontSize: '13px' }}>
          <span style={{ color: '#00a884' }}>💬 WhatsApp Live Support</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>LoggedIn as: <strong>{user.name}</strong> ({user.phone || `@${user.username}`})</span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`view-btn ${viewMode === 'user' ? 'active' : ''}`}
            onClick={() => setViewMode('user')}
          >
            👤 Customer Support View
          </button>
          <button 
            className={`view-btn ${viewMode === 'admin' ? 'active' : ''}`}
            onClick={() => setViewMode('admin')}
          >
            📊 Agent Management View
          </button>
        </div>
      </div>

      {/* View Rendering */}
      {viewMode === 'admin' ? (
        <AdminDashboard />
      ) : (
        <div className="app-container">
          <Sidebar 
            activeChat={activeChat} 
            onSelectChat={(chatId, contact) => setActiveChat({ chatId, contact })}
            theme="dark"
            toggleTheme={() => {}}
            onOpenStory={() => {}}
          />

          <main className="main-chat">
            {activeChat ? (
              <ChatWindow 
                activeChat={activeChat} 
                contact={activeChat.contact} 
                onStartCall={(type) => setActiveCall({ contact: activeChat.contact, callType: type })}
                onOpenLightbox={() => {}}
              />
            ) : (
              <div className="empty-state">
                <h2>Loading Support Chat...</h2>
              </div>
            )}
          </main>
        </div>
      )}

      {activeCall && (
        <CallModal 
          contact={activeCall.contact} 
          callType={activeCall.callType}
          onEndCall={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
