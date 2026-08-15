import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { VoiceCallModal } from '../chat/VoiceCallModal';
import { ThemeToggle } from '../common/ThemeToggle';
import type { Message } from '../../types';
import { sounds } from '../../utils/audio';
import { exportChatAsTxt, exportChatAsPdf } from '../../utils/exportChat';
import {
  X, Check, User, Phone, ArrowRight,
  Search, Lock, ShieldCheck, RotateCw, CheckCircle2, Download, FileText, Sparkles
} from 'lucide-react';

type InlineStep = 'name' | 'phone' | 'completed';

export const CustomerChatPortal: React.FC = () => {
  const {
    customerSession,
    customerConversation,
    setCustomerSession,
    messages,
    fetchMessages,
    addMessage,
    markAllMessagesRead,
    typingState
  } = useChatStore();

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [savedName, setSavedName] = useState('');
  const [inlineStep, setInlineStep] = useState<InlineStep>('name');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socket = getSocket();

  useEffect(() => {
    // Check if previously registered
    const savedSessionId = localStorage.getItem('customer_session_id');
    const registered = localStorage.getItem('customer_registered') === 'true';

    if (savedSessionId && registered) {
      restoreSession(savedSessionId);
    }
  }, []);

  const restoreSession = async (sessionId: string) => {
    try {
      const data = await api.getCustomerSession(sessionId);
      setCustomerSession(data.customer, data.conversation);
      setNameInput(data.customer.name);
      setSavedName(data.customer.name);
      setPhoneInput(data.customer.phone);
      setInlineStep('completed');
      await fetchMessages(data.conversation._id);

      socket.emit('join_conversation', {
        conversationId: data.conversation._id,
        role: 'customer',
        userId: data.customer._id
      });
    } catch (err) {
      console.error('Session restore error:', err);
      localStorage.removeItem('customer_session_id');
      localStorage.removeItem('customer_registered');
      setInlineStep('name');
    }
  };

  // Step 1: User enters name
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSavedName(nameInput.trim());
    setInlineStep('phone');
  };

  // Step 2: User enters phone — then create session + send welcome
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim() || !savedName) return;

    setSubmitLoading(true);
    try {
      const data = await api.initCustomer({
        name: savedName,
        phone: phoneInput.trim(),
        isGuest: false
      });

      localStorage.setItem('customer_session_id', data.customer.sessionId);
      localStorage.setItem('customer_registered', 'true');

      setCustomerSession(data.customer, data.conversation);
      setInlineStep('completed');
      await fetchMessages(data.conversation._id);

      socket.emit('join_conversation', {
        conversationId: data.conversation._id,
        role: 'customer',
        userId: data.customer._id
      });

      await fetchMessages(data.conversation._id);
      const currentMsgs = useChatStore.getState().messages;

      if (!currentMsgs || currentMsgs.length <= 1) {
        const welcomeMsg = await api.sendMessage({
          conversationId: data.conversation._id,
          senderType: 'agent',
          senderId: 'agent_auto_welcome',
          senderName: 'Support Executive 👋',
          content: `👋 Hello ${data.customer.name}! Welcome to Live Support. Thank you for connecting (${data.customer.phone}). An executive is active on your session. How can we assist you today?`
        });
        addMessage(welcomeMsg);
      }
    } catch (err) {
      console.error('Init error:', err);
      alert('Failed to connect to support. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSession || !nameInput.trim()) return;
    try {
      const data = await api.initCustomer({
        sessionId: customerSession.sessionId,
        name: nameInput,
        phone: phoneInput
      });
      setCustomerSession(data.customer, data.conversation);
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Profile update error:', err);
    }
  };

  useEffect(() => {
    socket.on('receive_message', (msg: Message) => {
      addMessage(msg);
      sounds.playReceived();
      if (customerConversation) {
        socket.emit('mark_read', { conversationId: customerConversation._id, readerType: 'customer' });
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
  }, [socket, customerConversation]);

  // Auto-rejoin conversation room on connect/reconnect
  useEffect(() => {
    const handleConnect = () => {
      if (customerSession?._id && customerConversation?._id) {
        socket.emit('join_conversation', {
          conversationId: customerConversation._id,
          role: 'customer',
          userId: customerSession._id
        });
        socket.emit('mark_read', { conversationId: customerConversation._id, readerType: 'customer' });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, customerSession?._id, customerConversation?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, inlineStep]);

  const isAgentTyping = customerConversation && typingState[customerConversation._id]?.senderType === 'agent' && typingState[customerConversation._id]?.isTyping;

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.content && m.content.toLowerCase().includes(q)) ||
      (m.senderName && m.senderName.toLowerCase().includes(q)) ||
      (m.fileName && m.fileName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="h-screen w-full flex flex-col bg-[#f5f5f7] dark:bg-[#000000] transition-colors duration-300">
      {/* ── Apple iOS Frosted Header Bar ── */}
      <div className="bg-white/80 dark:bg-[#161618]/80 backdrop-blur-2xl px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shadow-xs z-20 text-[#1d1d1f] dark:text-[#f5f5f7] select-none transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer flex items-center gap-3" onClick={() => setIsEditingProfile(true)}>
            <div className="relative">
              <img
                src={customerConversation?.assignedAgent?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"}
                alt={customerConversation?.assignedAgent?.name || "Support"}
                className="w-10 h-10 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.1] shadow-xs"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#34c759] rounded-full border-2 border-white dark:border-[#161618]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm md:text-base font-semibold tracking-tight">
                  {customerConversation?.assignedAgent?.name || "Official Support"}
                </h2>
                <CheckCircle2 className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff] fill-blue-500/10" />
              </div>
              <p className="text-[11px] text-[#86868b] font-medium">
                {isAgentTyping ? (
                  <span className="text-[#0071e3] dark:text-[#0a84ff] font-semibold animate-pulse">typing...</span>
                ) : (
                  'Verified Agent • Online'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Search Chat & Export"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
              showSearch
                ? 'bg-blue-500/15 text-[#0071e3] dark:text-[#0a84ff]'
                : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#6e6e73] dark:text-[#a1a1a6]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowVoiceCall(true)}
            title="FaceTime Audio Call"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-[#34c759] dark:text-[#30d158] transition-all active:scale-90"
          >
            <Phone className="w-4 h-4" />
          </button>
          
          <ThemeToggle />
        </div>
      </div>

      {/* ── Slide-down Search & Export Drawer ── */}
      {showSearch && (
        <div className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.08] shadow-md z-10 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[#f5f5f7] dark:bg-[#2c2c2e] px-3.5 py-1.5 rounded-xl border border-black/[0.05] dark:border-white/[0.08]">
            <Search className="w-3.5 h-3.5 text-[#86868b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation..."
              className="w-full bg-transparent text-xs text-[#1d1d1f] dark:text-[#f5f5f7] outline-none placeholder-[#86868b]"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportChatAsTxt(filteredMessages, 'Support_Chat')}
              title="Export as Text"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#1d1d1f] dark:text-[#f5f5f7] text-xs font-semibold transition-all active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Export TXT</span>
            </button>
            <button
              onClick={() => exportChatAsPdf(filteredMessages, 'Support_Chat')}
              title="Export as PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button onClick={() => setShowSearch(false)} className="p-1 rounded-lg text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Voice Call Modal ── */}
      {showVoiceCall && (
        <VoiceCallModal
          contactName={customerConversation?.assignedAgent?.name || "Official Support"}
          contactImage={customerConversation?.assignedAgent?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"}
          phoneNumber={phoneInput || "+91 9876543210"}
          onClose={() => setShowVoiceCall(false)}
        />
      )}

      {/* ── Edit Profile Modal ── */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1e] p-6 rounded-[24px] max-w-sm w-full relative shadow-2xl border border-black/[0.06] dark:border-white/[0.1] animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsEditingProfile(false)} className="absolute top-4 right-4 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">Chat Profile</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] mb-1">Your Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Full Name"
                  className="w-full bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] outline-none focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] outline-none focus:border-[#0071e3]"
                />
              </div>
              <button type="submit" className="w-full mt-2 bg-[#0071e3] hover:bg-[#0077ed] text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all">
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Messages Canvas ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-wallpaper">

        {/* ════ APPLE BRAND PROFILE CARD ════ */}
        <div className="my-3 max-w-sm mx-auto">
          <div className="bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl rounded-[24px] p-5 shadow-sm text-center border border-black/[0.06] dark:border-white/[0.08] transition-all">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <img
                src={customerConversation?.assignedAgent?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"}
                alt={customerConversation?.assignedAgent?.name || "Support"}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#0071e3] dark:border-[#0a84ff] shadow-md"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#34c759] rounded-full border-2 border-white dark:border-[#1c1c1e]" />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <h3 className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {customerConversation?.assignedAgent?.name || "Support Desk"}
              </h3>
              <CheckCircle2 className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff]" />
            </div>
            <p className="text-xs text-[#86868b] mb-4 font-medium">
              Live Customer Support Assistant
            </p>

            {/* Apple Action Pills */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setShowSearch(true)}
                className="bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[#1d1d1f] dark:text-[#f5f5f7] p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all active:scale-95"
              >
                <Search className="w-4 h-4 text-[#0071e3] dark:text-[#0a84ff]" />
                <span>Search</span>
              </button>
              <button
                onClick={() => setShowVoiceCall(true)}
                className="bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[#1d1d1f] dark:text-[#f5f5f7] p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all active:scale-95"
              >
                <Phone className="w-4 h-4 text-[#34c759] dark:text-[#30d158]" />
                <span>Call</span>
              </button>
              <button
                onClick={() => setIsEditingProfile(true)}
                className="bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-[#1d1d1f] dark:text-[#f5f5f7] p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all active:scale-95"
              >
                <User className="w-4 h-4 text-purple-500" />
                <span>Profile</span>
              </button>
            </div>

            {/* Security Badges Row */}
            <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-[#86868b] pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5 text-emerald-500" /> Encrypted</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Verified</span>
              <span className="flex items-center gap-1"><RotateCw className="w-3.5 h-3.5 text-purple-500" /> Synced</span>
            </div>
          </div>
        </div>

        {/* Date Divider Badge */}
        <div className="flex justify-center my-3">
          <span className="bg-black/[0.04] dark:bg-white/[0.08] text-[#86868b] text-[11px] font-semibold px-3 py-1 rounded-full backdrop-blur-md">
            Today
          </span>
        </div>

        {/* ════ STEP 1: NAME ONBOARDING CARD ════ */}
        {inlineStep === 'name' && (
          <div className="flex justify-center my-4">
            <div className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.1] rounded-[24px] p-5 shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[#0071e3] dark:text-[#0a84ff] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Welcome to Live Support</h4>
                  <p className="text-[11px] text-[#86868b]">Step 1 of 2 • Enter your name</p>
                </div>
              </div>

              <form onSubmit={handleStep1Submit} className="space-y-3">
                <div className="flex items-center gap-2.5 bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 focus-within:border-[#0071e3] focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
                  <User className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-[#1d1d1f] dark:text-[#f5f5f7] outline-none placeholder-[#86868b]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="w-full bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 shadow-sm active:scale-98 transition-all"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ════ STEP 2: PHONE ONBOARDING CARD ════ */}
        {inlineStep === 'phone' && (
          <div className="flex justify-center my-4">
            <div className="bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.1] rounded-[24px] p-5 shadow-xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Nice to meet you, {savedName}!</h4>
                  <p className="text-[11px] text-[#86868b]">Step 2 of 2 • Enter phone number</p>
                </div>
              </div>

              <form onSubmit={handleStep2Submit} className="space-y-3">
                <div className="flex items-center gap-2.5 bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 focus-within:border-[#0071e3] focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
                  <Phone className="w-4 h-4 text-[#86868b] flex-shrink-0" />
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 9876543210"
                    required
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-[#1d1d1f] dark:text-[#f5f5f7] outline-none placeholder-[#86868b]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInlineStep('name')}
                    className="w-1/3 bg-black/[0.05] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] py-2.5 rounded-xl text-xs font-semibold hover:bg-black/[0.08] transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={!phoneInput.trim() || submitLoading}
                    className="w-2/3 bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-sm active:scale-98 transition-all"
                  >
                    {submitLoading ? 'Connecting...' : 'Start Live Chat 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════ MESSAGES STREAM ════ */}
        {customerSession && customerConversation && filteredMessages.map((msg) => (
          <MessageBubble
            key={`${msg._id}_${msg.status}`}
            message={msg}
            currentUserId={customerSession._id}
            isAgentView={false}
          />
        ))}

        {/* Typing Indicator */}
        {isAgentTyping && (
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl px-3.5 py-2 rounded-full w-fit shadow-xs border border-black/[0.04] dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 bg-[#0071e3] dark:bg-[#0a84ff] rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-[#0071e3] dark:bg-[#0a84ff] rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-[#0071e3] dark:bg-[#0a84ff] rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] font-medium text-[#86868b] ml-1">Agent is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Floating Capsule Input Dock ── */}
      {inlineStep === 'completed' && customerSession && customerConversation ? (
        <MessageInput
          conversationId={customerConversation._id}
          senderType="customer"
          senderId={customerSession._id}
          senderName={customerSession.name}
          isAgentView={false}
          placeholder="iMessage / Live Chat..."
        />
      ) : (
        <div className="bg-white/80 dark:bg-[#161618]/80 backdrop-blur-xl px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-xs text-[#86868b] font-medium">
          <span>Complete the step above to connect with a support agent</span>
        </div>
      )}
    </div>
  );
};
