import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AdminDashboard from './components/AdminDashboard';
import CallModal from './components/CallModal';

// User Main Support Page (Clean WhatsApp Web View)
function UserMainPage() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    if (user) {
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
                phone: supportChat.phone,
                avatar: supportChat.avatar,
                about: supportChat.about,
                status: supportChat.userStatus
              }
            });
          }
        });
    }
  }, [user]);

  if (!user) return <AuthModal />;

  return (
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

      {activeCall && (
        <CallModal 
          contact={activeCall.contact} 
          callType={activeCall.callType}
          onEndCall={() => setActiveCall(null)}
        />
      )}

      {/* Discrete Admin Link in corner for management */}
      <div style={{ position: 'fixed', bottom: '12px', right: '16px', zIndex: 1000 }}>
        <Link 
          to="/admin" 
          style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '11px', 
            textDecoration: 'none',
            background: 'rgba(0,0,0,0.5)',
            padding: '4px 10px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}
        >
          🔐 Admin Dashboard
        </Link>
      </div>
    </div>
  );
}

// Admin Management Page
function AdminPage() {
  const { user } = useAuth();

  if (!user) return <AuthModal />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header bar with link back to main page */}
      <div className="view-switcher-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600, fontSize: '13px' }}>
          <span style={{ color: '#00a884' }}>📊 Agent Management Console</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>Agent: <strong>{user.name}</strong> ({user.phone || `@${user.username}`})</span>
        </div>

        <Link 
          to="/" 
          className="view-btn active"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          ← Go to User Main Page
        </Link>
      </div>

      <AdminDashboard />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<UserMainPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
