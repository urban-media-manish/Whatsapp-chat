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
  X, Check, Bot, User, Phone, ArrowRight,
  ArrowLeft, Search, Lock, ShieldCheck, RotateCw, HelpCircle, CheckCircle2, Download, FileText
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
      // Create customer + conversation in backend
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

      // Join socket room
      socket.emit('join_conversation', {
        conversationId: data.conversation._id,
        role: 'customer',
        userId: data.customer._id
      });

      // Check existing messages before sending auto welcome
      await fetchMessages(data.conversation._id);
      const currentMsgs = useChatStore.getState().messages;

      if (!currentMsgs || currentMsgs.length <= 1) {
        // Brand new customer -> Send initial welcome message
        const welcomeMsg = await api.sendMessage({
          conversationId: data.conversation._id,
          senderType: 'agent',
          senderId: 'agent_auto_welcome',
          senderName: 'Support Executive 👋',
          content: `👋 Hello ${data.customer.name}! Welcome to Live Support. Thank you for providing your contact details (${data.customer.phone}). An online support executive has been assigned to your ticket. How can we assist you today?`
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

    return () => {
      socket.off('receive_message');
      socket.off('messages_read_ack');
      socket.off('message_status_update');
    };
  }, [socket, customerConversation]);

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
    <div className="h-screen w-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a]">
      {/* ── WhatsApp Header Bar ── */}
      <div className="bg-[#008069] dark:bg-[#202c33] px-3 md:px-4 py-2.5 border-b border-black/10 dark:border-gray-700/60 flex items-center justify-between shadow-md z-20 text-white select-none">
        <div className="flex items-center gap-2.5">
          <button title="Back" className="p-1 hover:bg-black/15 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="relative cursor-pointer flex items-center gap-2.5" onClick={() => setIsEditingProfile(true)}>
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
              alt="WhatsApp"
              className="w-10 h-10 rounded-full object-cover border border-white/30 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm md:text-base font-bold text-white tracking-wide">WhatsApp</h2>
                <CheckCircle2 className="w-4 h-4 text-white fill-[#1da1f2]" />
              </div>
              <p className="text-[11px] text-emerald-100 dark:text-emerald-400 font-medium">
                {isAgentTyping ? 'typing...' : 'Online • Official Support'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Search Chat & Export"
            className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-black/25 text-amber-300' : 'hover:bg-black/15 text-white'}`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => setShowVoiceCall(true)} title="Audio Call" className="p-2 rounded-full hover:bg-black/15 text-white transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* ── Slide-down Search & Export Drawer ── */}
      {showSearch && (
        <div className="bg-white dark:bg-[#111b21] px-4 py-2.5 border-b border-gray-200 dark:border-gray-700/60 shadow-md z-10 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-gray-100 dark:bg-[#202c33] px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat messages..."
              className="w-full bg-transparent text-xs text-gray-900 dark:text-white outline-none placeholder-gray-400"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportChatAsTxt(filteredMessages, 'WhatsApp_Chat')}
              title="Export as Text"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-[#00a884] dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export TXT</span>
            </button>
            <button
              onClick={() => exportChatAsPdf(filteredMessages, 'WhatsApp_Chat')}
              title="Export as PDF / Print"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button onClick={() => setShowSearch(false)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Voice Call Modal ── */}
      {showVoiceCall && (
        <VoiceCallModal
          contactName="WhatsApp"
          contactImage="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
          phoneNumber={phoneInput || "+91 9876543210"}
          onClose={() => setShowVoiceCall(false)}
        />
      )}

      {/* ── Edit Profile Modal ── */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202c33] p-6 rounded-3xl max-w-sm w-full relative shadow-2xl">
            <button onClick={() => setIsEditingProfile(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Your Chat Profile</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Full Name"
                className="w-full bg-gray-50 dark:bg-[#2a3942] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#00a884]" />
              <input type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="Phone Number"
                className="w-full bg-gray-50 dark:bg-[#2a3942] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-[#00a884]" />
              <button type="submit" className="w-full bg-[#00a884] text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Save
              </button>
            </form>
          </div>
        </div>
      )}



      {/* ── Messages Canvas ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-wallpaper">

        {/* ════ CENTER WELCOME BRAND PROFILE CARD ════ */}
        <div className="my-2 max-w-sm mx-auto">
          <div className="bg-white dark:bg-[#202c33] rounded-3xl p-5 shadow-xl text-center border border-gray-100 dark:border-gray-700/60 transition-all hover:shadow-2xl">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                alt="WhatsApp"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#00a884] shadow-md"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#202c33]" />
            </div>

            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white">WhatsApp</h3>
              <CheckCircle2 className="w-4 h-4 text-white fill-[#1da1f2]" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">Welcome to WhatsApp</p>

            {/* 3 Green Action Buttons */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <button className="bg-[#e7fce9] dark:bg-emerald-950/40 text-[#00a884] dark:text-emerald-400 p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-2xs">
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
              <button onClick={() => setShowVoiceCall(true)} className="bg-[#e7fce9] dark:bg-emerald-950/40 text-[#00a884] dark:text-emerald-400 p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-2xs">
                <Phone className="w-4 h-4" />
                <span>Call</span>
              </button>
              <button className="bg-[#e7fce9] dark:bg-emerald-950/40 text-[#00a884] dark:text-emerald-400 p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-2xs">
                <HelpCircle className="w-4 h-4" />
                <span>Help</span>
              </button>
            </div>

            {/* Security Badges Row */}
            <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-[#00a884] dark:text-emerald-400 pt-3 border-t border-gray-100 dark:border-gray-700/60">
              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Encrypted</span>
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Private</span>
              <span className="flex items-center gap-1"><RotateCw className="w-3.5 h-3.5" /> Synced</span>
            </div>
          </div>
        </div>

        {/* Date Badge */}
        <div className="flex justify-center my-3">
          <span className="bg-white/90 dark:bg-[#202c33]/90 text-gray-600 dark:text-gray-300 text-[11px] font-bold px-3.5 py-1 rounded-full shadow-xs border border-gray-200/60 dark:border-gray-700/60">
            Today
          </span>
        </div>

        {/* ════ STEP 1: NAME BUBBLE ════ */}
        {inlineStep === 'name' && (
          <div className="flex justify-end">
            <div className="bg-[#d9fdd3] dark:bg-[#005c4b] border-r-4 border-[#00a884] rounded-2xl rounded-tr-none p-4 shadow-lg max-w-xs w-full">
              <div className="flex items-center justify-end gap-2 mb-2">
                <span className="text-xs font-bold text-[#00a884]">Support Bot</span>
                <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-100 mb-3">
                👋 Welcome! Please enter your <b>Full Name</b> to get started:
              </p>
              <form onSubmit={handleStep1Submit} className="space-y-2">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#2a3942] border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus-within:border-[#00a884] transition-colors">
                  <User className="w-4 h-4 text-[#00a884] flex-shrink-0" />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Your Full Name"
                    required
                    autoFocus
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="w-full bg-[#00a884] text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#009070] disabled:opacity-40 transition-colors"
                >
                  Next — Enter Phone Number <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ════ STEP 2: PHONE BUBBLE ════ */}
        {inlineStep === 'phone' && (
          <>
            {/* Confirmation bubble that name was saved */}
            <div className="flex justify-end">
              <div className="bg-[#d9fdd3] dark:bg-[#005c4b] border-r-4 border-emerald-400 rounded-2xl rounded-tr-none px-4 py-2 shadow text-xs text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" /> Name saved: {savedName}
              </div>
            </div>

            <div className="flex justify-end">
              <div className="bg-[#d9fdd3] dark:bg-[#005c4b] border-r-4 border-[#00a884] rounded-2xl rounded-tr-none p-4 shadow-lg max-w-xs w-full">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <span className="text-xs font-bold text-[#00a884]">Support Bot</span>
                  <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-100 mb-3">
                  Nice to meet you, <b>{savedName}</b>! 📱 Now enter your <b>Phone Number</b>:
                </p>
                <form onSubmit={handleStep2Submit} className="space-y-2">
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#2a3942] border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 focus-within:border-[#00a884] transition-colors">
                    <Phone className="w-4 h-4 text-[#00a884] flex-shrink-0" />
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+91 9876543210"
                      required
                      autoFocus
                      className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInlineStep('name')}
                      className="w-1/3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 py-2 rounded-xl text-xs font-semibold hover:bg-gray-200"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={!phoneInput.trim() || submitLoading}
                      className="w-2/3 bg-[#00a884] text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 hover:bg-[#009070] disabled:opacity-40 transition-colors"
                    >
                      {submitLoading ? 'Connecting...' : 'Start Chat 🚀'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* ════ MESSAGES ════ */}
        {customerSession && customerConversation && filteredMessages.map((msg) => (
          <MessageBubble
            key={`${msg._id}_${msg.status}`}
            message={msg}
            currentUserId={customerSession._id}
            isAgentView={false}
          />
        ))}

        {isAgentTyping && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#202c33] px-3 py-2 rounded-full w-fit shadow-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px] font-medium text-emerald-600 ml-1">Agent is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      {inlineStep === 'completed' && customerSession && customerConversation ? (
        <MessageInput
          conversationId={customerConversation._id}
          senderType="customer"
          senderId={customerSession._id}
          senderName={customerSession.name}
          isAgentView={false}
          placeholder="Type your message..."
        />
      ) : (
        <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span>👆 Please fill in your Name & Phone Number above to start chatting</span>
        </div>
      )}
    </div>
  );
};
