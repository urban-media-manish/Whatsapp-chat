import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { getSocket } from '../services/socket';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminChatArea } from '../components/admin/AdminChatArea';
import { CustomerContextSidebar } from '../components/admin/CustomerContextSidebar';
import { AdminAnalyticsView } from '../components/admin/AdminAnalyticsView';
import { AdminSettingsView } from '../components/admin/AdminSettingsView';
import type { Message } from '../types';

export const AdminPage: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const { fetchConversations, addMessage, activeConversation } = useChatStore();
  const [currentTab, setCurrentTab] = useState<'chats' | 'analytics' | 'settings'>('chats');
  const [showContextPanel, setShowContextPanel] = useState(false);

  const navigate = useNavigate();
  const socket = getSocket();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login');
    } else if (isAuthenticated) {
      fetchConversations();
      socket.emit('join_agent_workspace', { userId: user?._id });
    }
  }, [isAuthenticated, isLoading]);

  // Close context panel when switching to a different conversation
  useEffect(() => {
    setShowContextPanel(false);
  }, [activeConversation?._id]);

  // Press Escape (Esc) key to close active chat (WhatsApp Web shortcut)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useChatStore.getState().setActiveConversation(null);
        setShowContextPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    socket.on('receive_message', (msg: Message) => {
      addMessage(msg);
    });

    socket.on('new_conversation', () => {
      fetchConversations();
    });

    socket.on('conversation_activity', (msg: Message) => {
      addMessage(msg);
      fetchConversations();
    });

    socket.on('conversation_deleted', ({ conversationId }: { conversationId: string }) => {
      const store = useChatStore.getState();
      if (store.activeConversation?._id === conversationId) {
        store.setActiveConversation(null);
      }
      store.fetchConversations();
    });

    socket.on('message_deleted', ({ conversationId }: { conversationId: string }) => {
      const store = useChatStore.getState();
      if (store.activeConversation?._id === conversationId) {
        store.fetchMessages(conversationId);
      }
      store.fetchConversations();
    });

    socket.on('user_typing', ({ conversationId, senderName, senderType, isTyping }: { conversationId: string; senderName: string; senderType: string; isTyping: boolean }) => {
      const store = useChatStore.getState();
      store.setTyping(conversationId, senderName, isTyping, senderType);
    });

    return () => {
      socket.off('receive_message');
      socket.off('new_conversation');
      socket.off('conversation_activity');
      socket.off('conversation_deleted');
      socket.off('message_deleted');
      socket.off('user_typing');
    };
  }, [socket]);

  // Auto-rejoin agent workspace & active conversation on connect/reconnect
  useEffect(() => {
    const handleConnect = () => {
      console.log('🔌 Agent Socket connected: re-joining workspace...');
      if (user?._id) {
        socket.emit('join_agent_workspace', { userId: user._id });
      }
      if (activeConversation?._id) {
        socket.emit('join_conversation', {
          conversationId: activeConversation._id,
          role: 'agent',
          userId: user?._id
        });
        socket.emit('mark_read', { conversationId: activeConversation._id, readerType: 'agent' });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, user?._id, activeConversation?._id]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#111b21] text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full" />
          <p className="text-sm font-semibold text-gray-300">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen w-full flex bg-[#111b21] overflow-hidden select-none">
      <AdminSidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

      {currentTab === 'chats' ? (
        <div className={`flex-1 min-w-0 overflow-hidden relative ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex-1 min-w-0 h-full flex flex-col">
            {/* Pass toggle + state to AdminChatArea so clicking DP opens/closes the panel */}
            <AdminChatArea
              onToggleContextPanel={() => setShowContextPanel(p => !p)}
              showContextPanel={showContextPanel}
            />
          </div>
          {/* CustomerContextSidebar is HIDDEN by default — only visible when showContextPanel = true */}
          {activeConversation && showContextPanel && (
            <CustomerContextSidebar onClose={() => setShowContextPanel(false)} />
          )}
        </div>
      ) : currentTab === 'analytics' ? (
        <AdminAnalyticsView />
      ) : (
        <AdminSettingsView />
      )}
    </div>
  );
};
