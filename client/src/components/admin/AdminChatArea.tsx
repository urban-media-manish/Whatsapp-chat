import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { VoiceCallModal } from '../chat/VoiceCallModal';
import { Download, Sparkles, RefreshCw, MessageSquare, Phone, FileText, ArrowLeft } from 'lucide-react';
import type { User, Message } from '../../types';
import { sounds } from '../../utils/audio';
import { exportChatAsPdf, exportChatAsTxt } from '../../utils/exportChat';

interface AdminChatAreaProps {
  onToggleContextPanel?: () => void;
  showContextPanel?: boolean;
}

export const AdminChatArea: React.FC<AdminChatAreaProps> = ({ onToggleContextPanel, showContextPanel }) => {
  const { activeConversation, messages, addMessage, markAllMessagesRead, fetchConversations, typingState, setActiveConversation } = useChatStore();
  const { user } = useAuthStore();
  const [agents, setAgents] = useState<User[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [isAiBotActive, setIsAiBotActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socket = getSocket();

  useEffect(() => {
    loadAgents();
    if (user?._id) {
      socket.emit('join_agent_workspace', { userId: user._id });
    }
  }, [user?._id]);

  useEffect(() => {
    if (activeConversation) {
      socket.emit('join_conversation', {
        conversationId: activeConversation._id,
        role: 'agent',
        userId: user?._id
      });
      socket.emit('mark_read', { conversationId: activeConversation._id, readerType: 'agent' });
      fetchAISuggestions();
    }
  }, [activeConversation?._id]);

  useEffect(() => {
    socket.on('receive_message', (msg: Message) => {
      addMessage(msg);
      sounds.playReceived();
      if (activeConversation) {
        socket.emit('mark_read', { conversationId: activeConversation._id, readerType: 'agent' });

        if (isAiBotActive && msg.senderType === 'customer') {
          setTimeout(async () => {
            try {
              const aiData = await api.getAISuggestions(activeConversation._id);
              if (aiData.suggestions && aiData.suggestions.length > 0) {
                const replyText = aiData.suggestions[0];
                const aiMsg = await api.sendMessage({
                  conversationId: activeConversation._id,
                  senderType: 'agent',
                  senderId: user?._id || 'ai_bot',
                  senderName: 'Support AI Executive 🤖',
                  content: replyText
                });
                addMessage(aiMsg);
                socket.emit('send_message', aiMsg);
                sounds.playSent();
              }
            } catch (err) {
              console.error('AI Auto-reply error:', err);
            }
          }, 1200);
        }
      }
    });

    socket.on('messages_read_ack', ({ conversationId }: { conversationId: string }) => {
      markAllMessagesRead(conversationId);
    });

    socket.on('message_status_update', ({ messageId, status }: { messageId: string; status: any }) => {
      useChatStore.setState((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, status } : m
        )
      }));
    });

    socket.on('user_typing', ({ conversationId, senderName, senderType, isTyping }: { conversationId: string; senderName: string; senderType: string; isTyping: boolean }) => {
      const store = useChatStore.getState();
      store.setTyping(conversationId, senderName, isTyping, senderType);
    });

    return () => {
      socket.off('receive_message');
      socket.off('messages_read_ack');
      socket.off('message_status_update');
      socket.off('user_typing');
    };
  }, [socket, activeConversation, isAiBotActive, user?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAgents = async () => {
    try {
      const list = await api.getAgents();
      setAgents(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAISuggestions = async () => {
    if (!activeConversation) return;
    setIsGeneratingAI(true);
    try {
      const data = await api.getAISuggestions(activeConversation._id);
      setAiSuggestions(data.suggestions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!activeConversation) return;
    try {
      await api.assignAgent(activeConversation._id, agentId || null);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!activeConversation) return;
    try {
      await api.updateStatus(activeConversation._id, status);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!activeConversation) return;
    try {
      await api.updateStatus(activeConversation._id, undefined, priority);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPDF = () => {
    if (!activeConversation) return;
    exportChatAsPdf(messages, activeConversation.customer?.name || 'Customer');
  };

  const handleExportTXT = () => {
    if (!activeConversation) return;
    exportChatAsTxt(messages, activeConversation.customer?.name || 'Customer');
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f5f5f7] dark:bg-[#000000] text-[#86868b] p-8 text-center border-r border-black/[0.06] dark:border-white/[0.08]">
        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-[#1c1c1e] shadow-lg flex items-center justify-center mb-5 text-[#0071e3] dark:text-[#0a84ff] border border-black/[0.06] dark:border-white/[0.08]">
          <MessageSquare className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">Workspace Live Console</h2>
        <p className="text-xs text-[#86868b] max-w-sm mt-2 font-medium">
          Select a customer from the left sidebar to start live assistance, trigger AI suggestions, and manage ticket details.
        </p>
      </div>
    );
  }

  const customerName = activeConversation.customer?.name || 'Customer';
  const isCustomerTyping = typingState[activeConversation._id]?.senderType === 'customer' && typingState[activeConversation._id]?.isTyping;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f5f7] dark:bg-[#000000] relative border-r border-black/[0.06] dark:border-white/[0.08] min-w-0 overflow-hidden transition-colors duration-300">
      {/* Apple macOS Workspace Top Bar */}
      <div className="bg-white/80 dark:bg-[#161618]/80 backdrop-blur-2xl px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs z-10">
        <div className="flex items-center gap-3">
          {/* Back Button (Mobile Only) */}
          <button
            onClick={() => setActiveConversation(null)}
            className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-full md:hidden text-[#86868b] transition-colors"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleContextPanel}
            title="Click to view customer details"
            className={`relative group/dp focus:outline-none rounded-full transition-all ${
              showContextPanel ? 'ring-2 ring-[#0071e3] ring-offset-2 ring-offset-white dark:ring-offset-[#161618]' : ''
            }`}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs group-hover/dp:scale-105 transition-transform"
              style={{ background: `hsl(${(customerName.charCodeAt(0) || 65) * 11 % 360}, 65%, 48%)` }}
            >
              {customerName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#34c759] rounded-full border-2 border-white dark:border-[#161618]" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">{customerName}</h2>
              <span className="text-[11px] text-[#86868b] font-mono">{activeConversation.customer?.phone}</span>
            </div>
            <p className="text-[11px] font-medium text-[#86868b]">
              {isCustomerTyping ? (
                <span className="text-[#0071e3] dark:text-[#0a84ff] font-semibold animate-pulse">typing...</span>
              ) : (
                'Live Customer • Active Session'
              )}
            </p>
          </div>
        </div>

        {/* macOS Action Controls & Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* AI Auto-Bot Switch */}
          <button
            onClick={() => setIsAiBotActive(!isAiBotActive)}
            title={isAiBotActive ? 'AI Auto-Bot is ON' : 'Turn ON AI Auto-Bot'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
              isAiBotActive
                ? 'bg-blue-500/15 text-[#0071e3] dark:text-[#0a84ff] border-blue-500/30 shadow-xs'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b] border-black/[0.04] dark:border-white/[0.06] hover:text-[#1d1d1f] dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Bot: {isAiBotActive ? 'ON' : 'OFF'}</span>
          </button>

          {/* Priority Select */}
          <select
            value={activeConversation.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="bg-black/[0.04] dark:bg-white/[0.06] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-2.5 py-1 outline-none font-medium"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent 🔥</option>
          </select>

          {/* Ticket Status Select */}
          <select
            value={activeConversation.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-black/[0.04] dark:bg-white/[0.06] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-2.5 py-1 outline-none font-medium"
          >
            <option value="open">🟢 Open</option>
            <option value="pending">🟡 Pending</option>
            <option value="resolved">🔵 Resolved</option>
            <option value="closed">⚪ Closed</option>
          </select>

          {/* Assign Agent Select */}
          <select
            value={activeConversation.assignedAgent?._id || ''}
            onChange={(e) => handleAssignAgent(e.target.value)}
            className="bg-black/[0.04] dark:bg-white/[0.06] text-xs text-[#1d1d1f] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-2.5 py-1 outline-none font-medium"
          >
            <option value="">Unassigned</option>
            {agents.map((ag) => (
              <option key={ag._id} value={ag._id}>{ag.name}</option>
            ))}
          </select>

          {/* Voice Call Button */}
          <button
            onClick={() => setShowVoiceCall(true)}
            title="FaceTime Audio Call"
            className="p-2 text-[#34c759] hover:bg-emerald-500/10 rounded-xl transition-all active:scale-95"
          >
            <Phone className="w-4 h-4" />
          </button>
          
          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            title="Export Chat PDF"
            className="p-2 text-[#0071e3] dark:text-[#0a84ff] hover:bg-blue-500/10 rounded-xl transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
          </button>
          
          {/* Export TXT Button */}
          <button
            onClick={handleExportTXT}
            title="Export Chat TXT"
            className="p-2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Voice Call Modal ── */}
      {showVoiceCall && (
        <VoiceCallModal
          contactName={customerName}
          phoneNumber={activeConversation.customer?.phone || "+91 9876543210"}
          onClose={() => setShowVoiceCall(false)}
        />
      )}

      {/* Apple AI Suggested Replies Bar */}
      <div className="bg-white/60 dark:bg-[#161618]/60 backdrop-blur-xl px-4 py-2 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Smart Replies:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto flex-1 no-scrollbar">
          {isGeneratingAI ? (
            <span className="text-xs text-[#86868b] italic">Generating Apple Intelligence suggestions...</span>
          ) : (
            aiSuggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={async () => {
                  const msg = await api.sendMessage({
                    conversationId: activeConversation._id,
                    senderType: 'agent',
                    senderId: user?._id || 'agent',
                    senderName: user?.name || 'Support Agent',
                    content: sug
                  });
                  addMessage(msg);
                  socket.emit('send_message', msg);
                }}
                className="text-xs text-[#1d1d1f] dark:text-[#f5f5f7] bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.1] hover:border-[#0071e3] hover:text-[#0071e3] dark:hover:text-[#0a84ff] px-3.5 py-1 rounded-full truncate max-w-xs transition-all shrink-0 shadow-2xs active:scale-95"
              >
                {sug}
              </button>
            ))
          )}
        </div>

        <button onClick={fetchAISuggestions} title="Refresh Suggestions" className="p-1 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 chat-wallpaper">
        {messages.map((msg) => (
          <MessageBubble
            key={`${msg._id}_${msg.status}`}
            message={msg}
            currentUserId={user?._id}
            isAgentView={true}
          />
        ))}

        {isCustomerTyping && (
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl px-3.5 py-2 rounded-full w-fit shadow-xs border border-black/[0.04] dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 bg-[#0071e3] dark:bg-[#0a84ff] rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-[#0071e3] dark:bg-[#0a84ff] rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-[#0071e3] dark:bg-[#0a84ff] rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] font-medium text-[#86868b] ml-1">Customer is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Apple Capsule Input Dock */}
      <MessageInput
        conversationId={activeConversation._id}
        senderType="agent"
        senderId={user?._id || 'agent'}
        senderName={user?.name || 'Support Agent'}
        isAgentView={true}
      />
    </div>
  );
};
