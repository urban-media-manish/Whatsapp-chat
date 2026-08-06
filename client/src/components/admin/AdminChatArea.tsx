import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { Download, FileSpreadsheet, Sparkles, RefreshCw, MessageSquare } from 'lucide-react';
import type { User } from '../../types';

interface AdminChatAreaProps {
  onToggleContextPanel?: () => void;
  showContextPanel?: boolean;
}

export const AdminChatArea: React.FC<AdminChatAreaProps> = ({ onToggleContextPanel, showContextPanel }) => {
  const { activeConversation, messages, addMessage, fetchConversations, typingState } = useChatStore();
  const { user } = useAuthStore();
  const [agents, setAgents] = useState<User[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socket = getSocket();

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      socket.emit('join_conversation', {
        conversationId: activeConversation._id,
        role: 'agent',
        userId: user?._id
      });
      fetchAISuggestions();
    }
  }, [activeConversation?._id]);

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
    window.open(`/api/export/pdf/${activeConversation._id}`, '_blank');
  };

  const handleExportCSV = () => {
    if (!activeConversation) return;
    window.open(`/api/export/csv/${activeConversation._id}`, '_blank');
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#111b21] text-gray-400 p-8 text-center border-r border-[#222d34]">
        <div className="w-20 h-20 rounded-full bg-[#202c33] flex items-center justify-center mb-4 text-[#00a884]">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-200">WhatsApp Web Enterprise Support</h2>
        <p className="text-xs text-gray-500 max-w-sm mt-2">
          Select a customer chat from the sidebar to start live assistance, view AI suggested replies, and manage customer notes.
        </p>
      </div>
    );
  }

  const customerName = activeConversation.customer?.name || 'Customer';
  const isCustomerTyping = typingState[activeConversation._id]?.senderType === 'customer' && typingState[activeConversation._id]?.isTyping;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative border-r border-[#222d34] min-w-0 overflow-hidden">
      {/* Workspace Header */}
      <div className="bg-[#202c33] px-4 py-3 border-b border-[#222d34] flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleContextPanel}
            title="Click to view customer details"
            className={`relative group/dp focus:outline-none rounded-full transition-all ${
              showContextPanel ? 'ring-2 ring-[#00a884] ring-offset-1 ring-offset-[#202c33]' : ''
            }`}
          >
            {/* Initials Avatar — no cartoon */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white border border-emerald-500/40 group-hover/dp:border-[#00a884] transition-colors cursor-pointer"
              style={{ background: `hsl(${(customerName.charCodeAt(0) || 65) * 7 % 360}, 55%, 38%)` }}
            >
              {customerName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#202c33]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-100">{customerName}</h2>
              <span className="text-[11px] text-gray-400 font-mono">{activeConversation.customer?.phone}</span>
            </div>
            <p className="text-[11px] text-emerald-400">
              {isCustomerTyping ? 'Customer is typing...' : 'Online • Active Session'}
            </p>
          </div>
        </div>

        {/* Action Controls & Selectors */}
        <div className="flex items-center gap-2">
          {/* Priority Select */}
          <select
            value={activeConversation.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="bg-[#111b21] text-xs text-gray-200 border border-gray-700 rounded-lg px-2 py-1 outline-none font-medium"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Ticket Status Select */}
          <select
            value={activeConversation.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-[#111b21] text-xs text-gray-200 border border-gray-700 rounded-lg px-2 py-1 outline-none font-medium"
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
            className="bg-[#111b21] text-xs text-gray-200 border border-gray-700 rounded-lg px-2 py-1 outline-none font-medium"
          >
            <option value="">Unassigned</option>
            {agents.map((ag) => (
              <option key={ag._id} value={ag._id}>{ag.name}</option>
            ))}
          </select>

          {/* Export Buttons */}
          <button onClick={handleExportPDF} title="Export Chat PDF" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
            <Download className="w-4 h-4 text-emerald-400" />
          </button>
          <button onClick={handleExportCSV} title="Export CSV" className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {/* AI Suggested Replies Bar */}
      <div className="bg-[#111b21]/90 px-4 py-2 border-b border-[#222d34] flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>AI Suggested Replies:</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto flex-1 no-scrollbar">
          {isGeneratingAI ? (
            <span className="text-xs text-gray-500 italic">Generating Smart Suggestions...</span>
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
                className="text-xs text-gray-300 bg-[#202c33] border border-emerald-500/30 hover:border-emerald-500 hover:bg-[#2a3942] px-3 py-1 rounded-full truncate max-w-xs transition-colors shrink-0"
              >
                {sug}
              </button>
            ))
          )}
        </div>

        <button onClick={fetchAISuggestions} title="Refresh AI Suggestions" className="p-1 text-gray-400 hover:text-white">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 chat-wallpaper">
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            currentUserId={user?._id}
            isAgentView={true}
          />
        ))}

        {isCustomerTyping && (
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#202c33] px-3 py-1.5 rounded-full w-fit shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] font-medium text-emerald-400 ml-1">Customer is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
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
