import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import AuthModal from './components/AuthModal';
import CustomerInitModal from './components/CustomerInitModal';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AdminDashboard from './components/AdminDashboard';
import CallModal from './components/CallModal';

// User Main Support Page
function UserMainPage() {
  const { user, loading, autoGuestLogin } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // Fetch Support Chat once user is logged in / guest initialized
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

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00a884', background: '#0c1317' }}>
        <h2>Connecting to Live Support...</h2>
      </div>
    );
  }

  // Prompt new visitor for Name and WhatsApp Mobile Number if not registered yet
  if (!user) {
    return <CustomerInitModal onSubmit={(name, phone) => autoGuestLogin(name, phone)} />;
  }

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

      {/* Discrete Admin Link for Management */}
      <div style={{ position: 'fixed', bottom: '12px', right: '16px', zIndex: 1000 }}>
        <Link 
          to="/admin" 
          style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '11px', 
            textDecoration: 'none',
            background: 'rgba(0,0,0,0.6)',
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

// Admin Management Page (LOGIN REQUIRED FOR ADMIN ONLY)
function AdminPage() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00a884', background: '#0c1317' }}>
        <h2>Loading Admin Console...</h2>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <AuthModal isAdminLogin={true} />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="view-switcher-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600, fontSize: '13px' }}>
          <span style={{ color: '#00a884' }}>📊 Agent Management Console</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ color: 'var(--text-secondary)' }}>Agent: <strong>{user.name}</strong> ({user.phone})</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link 
            to="/" 
            className="view-btn active"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            ← View Customer Page
          </Link>
          <button className="view-btn" onClick={logout} style={{ borderColor: '#ea4335', color: '#ea4335' }}>
            Logout Admin
          </button>
        </div>
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
