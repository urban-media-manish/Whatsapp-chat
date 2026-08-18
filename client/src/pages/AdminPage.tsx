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
      navigate('/admin/login', { replace: true });
    } else if (isAuthenticated) {
      fetchConversations();
      socket.emit('join_agent_workspace', { userId: user?._id });
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    setShowContextPanel(false);
  }, [activeConversation?._id]);

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
    const handleReceive = (msg: Message) => {
      addMessage(msg);
    };

    const handleNewConv = () => {
      fetchConversations();
    };

    const handleConvActivity = (msg: Message) => {
      addMessage(msg);
      fetchConversations();
    };

    const handleConvDeleted = ({ conversationId }: { conversationId: string }) => {
      const store = useChatStore.getState();
      if (store.activeConversation?._id === conversationId) {
        store.setActiveConversation(null);
      }
      store.fetchConversations();
    };

    const handleMsgDeleted = ({ conversationId }: { conversationId: string }) => {
      const store = useChatStore.getState();
      if (store.activeConversation?._id === conversationId) {
        store.fetchMessages(conversationId);
      }
      store.fetchConversations();
    };

    const handleTyping = ({ conversationId, senderName, senderType, isTyping }: { conversationId: string; senderName: string; senderType: string; isTyping: boolean }) => {
      const store = useChatStore.getState();
      store.setTyping(conversationId, senderName, isTyping, senderType);
    };

    const handleOnlineList = ({ onlineCustomers }: { onlineCustomers: string[] }) => {
      useChatStore.getState().setOnlineCustomers(onlineCustomers || []);
    };

    const handleCustomerPresence = ({ customerId, status, onlineCustomers }: { customerId: string; status: string; onlineCustomers?: string[] }) => {
      const store = useChatStore.getState();
      if (onlineCustomers) {
        store.setOnlineCustomers(onlineCustomers);
      } else if (status === 'online') {
        store.addOnlineCustomer(customerId);
      } else {
        store.removeOnlineCustomer(customerId);
      }
    };

    const handleReadAck = ({ conversationId }: { conversationId: string }) => {
      useChatStore.getState().markAllMessagesRead(conversationId);
    };

    const handleStatusUpdate = ({ messageId, status }: { messageId: string; status: any }) => {
      useChatStore.setState((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? { ...m, status } : m))
      }));
    };

    socket.on('receive_message', handleReceive);
    socket.on('new_conversation', handleNewConv);
    socket.on('conversation_activity', handleConvActivity);
    socket.on('conversation_deleted', handleConvDeleted);
    socket.on('message_deleted', handleMsgDeleted);
    socket.on('user_typing', handleTyping);
    socket.on('online_customers_list', handleOnlineList);
    socket.on('customer_presence', handleCustomerPresence);
    socket.on('messages_read_ack', handleReadAck);
    socket.on('message_status_update', handleStatusUpdate);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('new_conversation', handleNewConv);
      socket.off('conversation_activity', handleConvActivity);
      socket.off('conversation_deleted', handleConvDeleted);
      socket.off('message_deleted', handleMsgDeleted);
      socket.off('user_typing', handleTyping);
      socket.off('online_customers_list', handleOnlineList);
      socket.off('customer_presence', handleCustomerPresence);
      socket.off('messages_read_ack', handleReadAck);
      socket.off('message_status_update', handleStatusUpdate);
    };
  }, [socket]);

  useEffect(() => {
    const handleConnect = () => {
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
      <div className="h-screen w-full flex items-center justify-center bg-[#f5f5f7] dark:bg-[#000000] text-[#86868b]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full" />
          <p className="text-xs font-medium text-[#86868b]">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-[100dvh] w-full flex bg-[#f5f5f7] dark:bg-[#000000] overflow-hidden select-none transition-colors duration-300 font-sans">
      <AdminSidebar currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)} />

      {currentTab === 'chats' ? (
        <div className={`flex-1 min-w-0 overflow-hidden relative ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex-1 min-w-0 h-full flex flex-col">
            <AdminChatArea
              onToggleContextPanel={() => setShowContextPanel(p => !p)}
              showContextPanel={showContextPanel}
            />
          </div>
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
