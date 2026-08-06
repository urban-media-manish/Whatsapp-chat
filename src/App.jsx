import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import CallModal from './components/CallModal';
import StoryModal from './components/StoryModal';
import ImageLightbox from './components/ImageLightbox';

function MainApp() {
  const { user, loading } = useAuth();
  const { socket } = useSocket();
  const [activeChat, setActiveChat] = useState(null); // { chatId, contact }
  const [theme, setTheme] = useState('dark');
  const [activeCall, setActiveCall] = useState(null); // { contact, callType }
  const [showStory, setShowStory] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Listen for incoming real-time calls
  useEffect(() => {
    if (socket) {
      socket.on('incoming_call', ({ from, callerName, callerAvatar, callType }) => {
        setActiveCall({
          contact: { id: from, name: callerName, avatar: callerAvatar },
          callType
        });
      });

      return () => {
        socket.off('incoming_call');
      };
    }
  }, [socket]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSelectChat = (chatId, contact) => {
    setActiveChat({ chatId, contact });
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00a884', background: '#0c1317' }}>
        <h2>Loading Realtime WhatsApp...</h2>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeChat={activeChat} 
        onSelectChat={handleSelectChat}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenStory={() => setShowStory(true)}
      />

      <main className="main-chat">
        {activeChat ? (
          <ChatWindow 
            activeChat={activeChat} 
            contact={activeChat.contact} 
            onStartCall={(type) => setActiveCall({ contact: activeChat.contact, callType: type })}
            onOpenLightbox={(imgUrl) => setLightboxImage(imgUrl)}
          />
        ) : (
          <div className="empty-state">
            <svg className="empty-state-icon" width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.33 5L2 22l5.13-1.31C8.57 21.52 10.23 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.53 0-2.98-.42-4.24-1.15l-.3-.17-3.13.8 0.83-3.04-.2-.32C4.19 14.86 3.75 13.48 3.75 12c0-4.55 3.7-8.25 8.25-8.25s8.25 3.7 8.25 8.25-3.7 8.25-8.25 8.25z"/>
            </svg>
            <h2>WhatsApp Web Realtime</h2>
            <p>
              Send and receive real-time messages with real users, view online statuses, and start audio/video calls using WebSockets & SQLite database!
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
              🔒 End-to-end real-time database connection active
            </div>
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

      {showStory && <StoryModal onClose={() => setShowStory(false)} />}

      {lightboxImage && (
        <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
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
