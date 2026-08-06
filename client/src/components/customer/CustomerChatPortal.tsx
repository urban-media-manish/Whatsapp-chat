import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MessageBubble } from '../chat/MessageBubble';
import { MessageInput } from '../chat/MessageInput';
import { ThemeToggle } from '../common/ThemeToggle';
import type { Message } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Edit3, Check, RefreshCw, Bot, User, Phone, ArrowRight } from 'lucide-react';

type InlineStep = 'name' | 'phone' | 'completed';

export const CustomerChatPortal: React.FC = () => {
  const {
    customerSession,
    customerConversation,
    setCustomerSession,
    messages,
    fetchMessages,
    addMessage,
    typingState
  } = useChatStore();

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [savedName, setSavedName] = useState('');
  const [inlineStep, setInlineStep] = useState<InlineStep>('name');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showQR, setShowQR] = useState(false);
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
    // else: show inline form immediately - no loading, no backend call needed yet
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

      // AUTO WELCOME MESSAGE FROM OUR SIDE
      const welcomeMsg = await api.sendMessage({
        conversationId: data.conversation._id,
        senderType: 'agent',
        senderId: 'agent_auto_welcome',
        senderName: 'Support Executive 👋',
        content: `👋 Hello ${data.customer.name}! Welcome to Live Support. Thank you for providing your contact details (${data.customer.phone}). An online support executive has been assigned to your ticket. How can we assist you today?`
      });
      addMessage(welcomeMsg);
    } catch (err) {
      console.error('Step 2 submit error:', err);
      alert('Failed to connect to support. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResetSession = () => {
    localStorage.removeItem('customer_session_id');
    localStorage.removeItem('customer_registered');
    setNameInput('');
    setPhoneInput('');
    setSavedName('');
    setInlineStep('name');
    setCustomerSession(null as any, null as any);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSession) return;
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
    });
    return () => {
      socket.off('receive_message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, inlineStep]);

  const isAgentTyping = customerConversation && typingState[customerConversation._id]?.senderType === 'agent' && typingState[customerConversation._id]?.isTyping;

  return (
    <div className="h-screen w-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a]">
      {/* ── Header ── */}
      <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 border-b border-gray-200 dark:border-gray-700/60 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Support Agent"
              className="w-10 h-10 rounded-full object-cover border border-emerald-500/30"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#202c33]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Support Agent (Online)</h2>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              {isAgentTyping ? 'typing...' : 'Online • Replies instantly'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {inlineStep === 'completed' && customerSession && (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-1.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 px-3 py-1.5 rounded-full text-xs text-gray-700 dark:text-gray-200 transition-colors"
            >
              <span className="font-medium truncate max-w-[120px]">{customerSession.name}</span>
              <Edit3 className="w-3.5 h-3.5 text-[#00a884]" />
            </button>
          )}

          <button onClick={handleResetSession} title="New Chat" className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-amber-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowQR(!showQR)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <QrCode className="w-5 h-5 text-[#00a884]" />
          </button>
          <ThemeToggle />
        </div>
      </div>

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

      {/* ── QR Modal ── */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202c33] p-6 rounded-3xl max-w-sm w-full text-center relative shadow-2xl">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-gray-400"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Scan QR Code</h3>
            <div className="flex justify-center p-4 bg-white rounded-2xl border border-gray-100">
              <QRCodeSVG value={window.location.href} size={180} />
            </div>
          </div>
        </div>
      )}

      {/* ── Messages Canvas ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-wallpaper">

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
        {customerSession && customerConversation && messages.map((msg) => (
          <MessageBubble
            key={msg._id}
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
