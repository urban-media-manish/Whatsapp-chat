import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MessageBubble } from '../chat/MessageBubble';
import { EmojiPickerModal } from '../chat/EmojiPickerModal';
import { VoiceCallModal } from '../chat/VoiceCallModal';
import type { Message, MessageType } from '../../types';
import { sounds } from '../../utils/audio';
import { exportChatAsTxt, exportChatAsPdf } from '../../utils/exportChat';
import {
  X, Smile, Paperclip, Mic, Send,
  Bell, MoreVertical, Moon, Sun, Download, FileText,
  Image as ImageIcon, Camera, File, Music, ArrowDown,
  Trash2, Phone, Search, ChevronLeft, Sparkles
} from 'lucide-react';

const BRAND_NAME = "Support Official";
const SESSION_KEY = "support_session_id";
const NAME_KEY = "support_visitor_name";
const PHONE_KEY = "support_visitor_phone";
const NOTICE_KEY = "support_push_notice_dismissed";
const PUSH_PERM_KEY = "support_push_enabled";
const SUBMITTED_KEY = "support_details_submitted";

export const CustomerChatPortal: React.FC = () => {
  const {
    customerSession,
    customerConversation,
    setCustomerSession,
    messages,
    fetchMessages,
    addMessage,
    markAllMessagesRead,
    typingState,
    theme,
    toggleTheme
  } = useChatStore();

  // State
  const [text, setText] = useState('');
  const [visitorName, setVisitorName] = useState(localStorage.getItem(NAME_KEY) || '');
  const [visitorPhone, setVisitorPhone] = useState(localStorage.getItem(PHONE_KEY) || '');
  
  // UI Panels / Modals
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showNameModal, setShowNameModal] = useState(() => {
    return localStorage.getItem(SUBMITTED_KEY) !== 'true';
  });
  const [nameInputVal, setNameInputVal] = useState(localStorage.getItem(NAME_KEY) || '');
  const [phoneInputVal, setPhoneInputVal] = useState(localStorage.getItem(PHONE_KEY) || '');
  const [pushNoticeVisible, setPushNoticeVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(localStorage.getItem(PUSH_PERM_KEY) === 'true');
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const socket = getSocket();

  // ── 1. Auto Viewport Sync for Mobile Virtual Keyboard ──
  useEffect(() => {
    const syncViewport = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-h', `${h}px`);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewport);
      window.visualViewport.addEventListener('scroll', syncViewport);
    }
    window.addEventListener('orientationchange', () => setTimeout(syncViewport, 250));
    syncViewport();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncViewport);
        window.visualViewport.removeEventListener('scroll', syncViewport);
      }
    };
  }, []);

  // ── 2. Toast Helper ──
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  // ── 3. Init Session (Frictionless Guest / Restored) ──
  useEffect(() => {
    const savedSessionId = localStorage.getItem(SESSION_KEY) || localStorage.getItem('customer_session_id');
    const storedName = localStorage.getItem(NAME_KEY) || localStorage.getItem('customer_name') || '';
    const storedPhone = localStorage.getItem(PHONE_KEY) || localStorage.getItem('customer_phone') || '';

    const init = async () => {
      try {
        const data = await api.initCustomer({
          sessionId: savedSessionId || undefined,
          name: storedName || undefined,
          phone: storedPhone || undefined,
          isGuest: !storedName
        });

        localStorage.setItem(SESSION_KEY, data.customer.sessionId);
        localStorage.setItem('customer_session_id', data.customer.sessionId);

        if (data.customer.name && !data.customer.name.startsWith('Guest_')) {
          localStorage.setItem(NAME_KEY, data.customer.name);
          localStorage.setItem('customer_name', data.customer.name);
          setVisitorName(data.customer.name);
        } else if (storedName) {
          setVisitorName(storedName);
        }

        if (data.customer.phone) {
          localStorage.setItem(PHONE_KEY, data.customer.phone);
          localStorage.setItem('customer_phone', data.customer.phone);
          setVisitorPhone(data.customer.phone);
        }

        setCustomerSession(data.customer, data.conversation);
        await fetchMessages(data.conversation._id);

        socket.emit('join_conversation', {
          conversationId: data.conversation._id,
          role: 'customer',
          userId: data.customer._id
        });

        // Ensure follow-up message is sent if not present
        const currentMsgs = useChatStore.getState().messages;
        const hasPrompt = currentMsgs && currentMsgs.some((m) => m.content && m.content.includes('apni ID create karne'));

        if (!hasPrompt) {
          const promptText = "👋 Sir/Ma'am, apni ID create karne aur 5% Deposit Bonus activate karne ke liye kripya apna Naam aur WhatsApp Number share karein. 👇";
          const promptMsg = await api.sendMessage({
            conversationId: data.conversation._id,
            senderType: 'agent',
            senderId: 'agent_auto_prompt',
            senderName: BRAND_NAME,
            content: promptText,
            type: 'text'
          });
          addMessage(promptMsg);
        }
      } catch (err) {
        console.error('Customer init error:', err);
      }
    };

    init();

    // Check notice banner
    const noticeDismissed = localStorage.getItem(NOTICE_KEY) === 'true';
    if (!noticeDismissed && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      setPushNoticeVisible(true);
    }

    // Trigger Name popup after 1.5s if visitor name not saved yet
    if (!storedName) {
      const timer = setTimeout(() => {
        setNameInputVal('');
        setPhoneInputVal('');
        setShowNameModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── 4. Socket Listeners ──
  useEffect(() => {
    const handleReceive = (msg: Message) => {
      addMessage(msg);
      sounds.playReceived();
      if (customerConversation) {
        socket.emit('mark_read', { conversationId: customerConversation._id, readerType: 'customer' });
      }
      // Check if user is scrolled up
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        if (scrollHeight - scrollTop - clientHeight > 100) {
          setShowScrollDown(true);
          setUnreadCount((prev) => prev + 1);
        }
      }
    };

    const handleReadAck = ({ conversationId }: { conversationId: string }) => {
      markAllMessagesRead(conversationId);
    };

    const handleStatusUpdate = ({ messageId, status }: { messageId: string; status: any }) => {
      useChatStore.setState((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? { ...m, status } : m))
      }));
    };

    const handleTyping = ({ conversationId, senderName, senderType, isTyping }: any) => {
      useChatStore.getState().setTyping(conversationId, senderName, isTyping, senderType);
    };

    socket.on('receive_message', handleReceive);
    socket.on('messages_read_ack', handleReadAck);
    socket.on('message_status_update', handleStatusUpdate);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('receive_message', handleReceive);
      socket.off('messages_read_ack', handleReadAck);
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('user_typing', handleTyping);
    };
  }, [socket, customerConversation]);

  // Re-join on socket reconnect
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
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, customerSession?._id, customerConversation?._id]);

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setShowScrollDown(false);
    setUnreadCount(0);
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  // Scroll listener for jump to bottom button
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight > 150) {
      setShowScrollDown(true);
    } else {
      setShowScrollDown(false);
      setUnreadCount(0);
    }
  };

  // ── 5. Typing Handlers ──
  const handleTypingStart = () => {
    if (!customerConversation || !customerSession) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', {
        conversationId: customerConversation._id,
        senderName: visitorName || 'Visitor',
        senderType: 'customer'
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleTypingStop, 2500);
  };

  const handleTypingStop = () => {
    if (!customerConversation) return;
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing_stop', {
        conversationId: customerConversation._id,
        senderType: 'customer'
      });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // ── 6. Send Text Message ──
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !customerConversation || !customerSession) return;

    const content = text.trim();
    setText('');
    handleTypingStop();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      sounds.playSent();
      const newMsg = await api.sendMessage({
        conversationId: customerConversation._id,
        senderType: 'customer',
        senderId: customerSession._id,
        senderName: visitorName || customerSession.name || 'Visitor',
        content,
        type: 'text'
      });
      addMessage(newMsg);
      scrollToBottom();
    } catch (err) {
      console.error('Send error:', err);
      showToast('Failed to send message');
    }
  };

  // ── 7. Voice Recording ──
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new (window as any).MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      showToast('Microphone permission required');
    }
  };

  const stopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current || !customerConversation || !customerSession) return;

    clearInterval(recordTimerRef.current);
    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const file = new (window as any).File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

      try {
        const uploadRes = await api.uploadFile(file);
        const newMsg = await api.sendMessage({
          conversationId: customerConversation._id,
          senderType: 'customer',
          senderId: customerSession._id,
          senderName: visitorName || customerSession.name || 'Visitor',
          content: '🎤 Voice message',
          fileUrl: uploadRes.fileUrl,
          fileName: uploadRes.fileName,
          type: 'audio'
        });
        addMessage(newMsg);
        sounds.playSent();
        scrollToBottom();
      } catch (err) {
        console.error('Voice send error:', err);
        showToast('Failed to send voice note');
      }

      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordDuration(0);
    };

    mediaRecorderRef.current.stop();
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current) {
      clearInterval(recordTimerRef.current);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setRecordDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ── 8. File Upload Handler ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: MessageType) => {
    const file = e.target.files?.[0];
    if (!file || !customerConversation || !customerSession) return;
    setShowAttachSheet(false);

    try {
      showToast('Uploading file…');
      const uploadRes = await api.uploadFile(file);
      const newMsg = await api.sendMessage({
        conversationId: customerConversation._id,
        senderType: 'customer',
        senderId: customerSession._id,
        senderName: visitorName || customerSession.name || 'Visitor',
        content: file.name,
        fileUrl: uploadRes.fileUrl,
        fileName: file.name,
        fileSize: file.size,
        type: fileType
      });
      addMessage(newMsg);
      sounds.playSent();
      scrollToBottom();
    } catch (err) {
      console.error('File upload error:', err);
      showToast('File upload failed');
    } finally {
      e.target.value = '';
    }
  };

  // ── 9. Modals Handlers (Name, Push, Clear) ──
  const handleSaveName = async () => {
    const trimmedName = nameInputVal.trim();
    const trimmedPhone = phoneInputVal.trim();
    if (!trimmedName || !customerSession) return;
    try {
      const data = await api.initCustomer({
        sessionId: customerSession.sessionId,
        name: trimmedName,
        phone: trimmedPhone || visitorPhone || undefined,
        isGuest: false
      });
      setCustomerSession(data.customer, data.conversation);
      setVisitorName(trimmedName);
      localStorage.setItem(NAME_KEY, trimmedName);
      localStorage.setItem('customer_name', trimmedName);
      localStorage.setItem(SUBMITTED_KEY, 'true');
      if (trimmedPhone) {
        setVisitorPhone(trimmedPhone);
        localStorage.setItem(PHONE_KEY, trimmedPhone);
        localStorage.setItem('customer_phone', trimmedPhone);
      }
      setShowNameModal(false);
      showToast('Details saved!');

      // Automatically post details in chat
      if (customerConversation) {
        const introText = trimmedPhone
          ? `Hello Support! My name is ${trimmedName} and WhatsApp number is ${trimmedPhone}. Please activate my ID with 5% bonus.`
          : `Hello Support! My name is ${trimmedName}. Please activate my ID.`;

        sounds.playSent();
        const newMsg = await api.sendMessage({
          conversationId: customerConversation._id,
          senderType: 'customer',
          senderId: customerSession._id,
          senderName: trimmedName,
          content: introText,
          type: 'text'
        });
        addMessage(newMsg);
        scrollToBottom();
      }
    } catch (err) {
      console.error('Save name error:', err);
      showToast('Failed to save details');
    }
  };

  const handleEnablePush = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setPushEnabled(true);
          localStorage.setItem(PUSH_PERM_KEY, 'true');
          setPushNoticeVisible(false);
          showToast('Notifications enabled!');
        } else {
          showToast('Notification permission denied');
        }
      } catch (err) {
        console.error('Push error:', err);
      }
    }
  };

  const handleClearChat = () => {
    setShowMenu(false);
    if (confirm('Clear chat history on this device?')) {
      useChatStore.setState({ messages: [] });
      showToast('Chat cleared locally');
    }
  };

  // Helper date formatter for Day Dividers
  const formatDayDivider = (isoDate: string) => {
    const d = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  };

  const isAgentTyping = customerConversation && typingState[customerConversation._id]?.senderType === 'agent' && typingState[customerConversation._id]?.isTyping;

  // Filtered messages for search + deduplication
  const deduplicatedMessages: Message[] = [];
  const seenWelcomeKeys = new Set<string>();

  for (const m of messages) {
    if (m.senderId === 'agent_auto_welcome' || (m.content && m.content.includes('DlAM0ND'))) {
      const key = (m.content || '').trim();
      if (!seenWelcomeKeys.has(key)) {
        seenWelcomeKeys.add(key);
        deduplicatedMessages.push(m);
      }
    } else {
      if (!deduplicatedMessages.some((existing) => existing._id === m._id)) {
        deduplicatedMessages.push(m);
      }
    }
  }

  const filteredMessages = deduplicatedMessages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.content && m.content.toLowerCase().includes(q)) ||
      (m.senderName && m.senderName.toLowerCase().includes(q)) ||
      (m.fileName && m.fileName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="h-screen w-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] select-none overflow-hidden relative" style={{ height: 'var(--app-h, 100dvh)' }}>
      
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="h-[56px] px-3 bg-[#075e54] dark:bg-[#1f2c33] text-white flex items-center justify-between z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[38px] h-[38px] rounded-full bg-white/20 flex items-center justify-center font-bold text-base text-white shrink-0 shadow-inner">
            S
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-[15px] font-semibold tracking-tight truncate leading-tight">
              {BRAND_NAME}
            </h1>
            <p className="text-[11px] text-emerald-200 dark:text-emerald-400 leading-tight">
              {isAgentTyping ? (
                <span className="font-semibold italic text-amber-200 animate-pulse">typing…</span>
              ) : (
                'Online'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <button
            onClick={() => setShowNotifPanel(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 active:bg-white/20 transition-all relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Voice Call Button */}
          <button
            onClick={() => setShowVoiceCall(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 active:bg-white/20 transition-all"
            aria-label="Voice Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              showSearch ? 'bg-black/20 text-amber-300' : 'text-white/90 hover:bg-white/10'
            }`}
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* 3-Dots Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 active:bg-white/20 transition-all"
              aria-label="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Menu Popover */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-12 w-60 bg-white dark:bg-[#202c33] rounded-xl shadow-2xl py-1.5 z-50 text-[#111b21] dark:text-[#e9edef] border border-black/[0.06] dark:border-white/[0.08] animate-pop text-sm font-normal">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setNameInputVal(visitorName || '');
                      setShowNameModal(true);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] transition-colors"
                  >
                    Change your name
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowNotifPanel(true); }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] transition-colors"
                  >
                    Notification settings
                  </button>
                  <button
                    onClick={() => { toggleTheme(); setShowMenu(false); }}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] transition-colors flex items-center justify-between"
                  >
                    <span>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</span>
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  </button>
                  <div className="h-[1px] bg-black/[0.06] dark:bg-white/[0.08] my-1" />
                  <button
                    onClick={handleClearChat}
                    className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Clear chat on this device
                  </button>
                  <a
                    href="https://t.me/rickymeta?text=Hi%2C%20i%20Want%20Web%20App%20For%20My%20Business"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2.5 text-left text-[#00a884] hover:bg-[#00a884]/10 transition-colors flex items-center gap-2 font-medium"
                    onClick={() => setShowMenu(false)}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Contact Web App Developer</span>
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════ STICKY NOTIFICATION PROMPT ═══════════════ */}
      {pushNoticeVisible && (
        <div className="bg-[#182229] text-white px-3 py-2 text-xs flex items-center justify-between gap-2 shadow-md z-20 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-4 h-4 text-[#25d366] shrink-0" />
            <span className="truncate">Turn on notifications so you don't miss our reply</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEnablePush}
              className="bg-[#25d366] hover:bg-[#1da851] text-[#05231b] font-semibold px-2.5 py-1 rounded-md text-[11px] transition-colors"
            >
              Turn on
            </button>
            <button
              onClick={() => {
                setPushNoticeVisible(false);
                localStorage.setItem(NOTICE_KEY, 'true');
              }}
              className="text-white/60 hover:text-white p-0.5"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ SEARCH & EXPORT DRAWER ═══════════════ */}
      {showSearch && (
        <div className="bg-white dark:bg-[#111b21] px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-2 z-20 shadow-sm animate-in slide-in-from-top-1">
          <div className="flex-1 flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33] px-3 py-1.5 rounded-lg">
            <Search className="w-3.5 h-3.5 text-[#8696a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in chat…"
              className="w-full bg-transparent text-xs text-[#111b21] dark:text-[#e9edef] outline-none"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#8696a0] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => exportChatAsTxt(filteredMessages, 'Chat_Export')}
              className="p-1.5 bg-[#00a884]/15 hover:bg-[#00a884]/25 text-[#00a884] dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1"
              title="Export TXT"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => exportChatAsPdf(filteredMessages, 'Chat_Export')}
              className="p-1.5 bg-[#00a884] hover:bg-[#008f70] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
              title="Export PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ CONVERSATION BODY ═══════════════ */}
      <main
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 md:px-6 space-y-2 chat-wallpaper relative"
      >
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-[#00a884] dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
              <Smile className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef] mb-1.5">
              Hi, how can we help?
            </h2>
            <p className="text-xs text-[#667781] dark:text-[#8696a0] leading-relaxed">
              Send us a message — we usually reply within a few minutes. Messages are saved to this device.
            </p>
          </div>
        )}

        {/* Message List with Day Dividers */}
        {filteredMessages.map((msg, index) => {
          const prevMsg = filteredMessages[index - 1];
          const isNewDay = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

          return (
            <React.Fragment key={msg._id || index}>
              {isNewDay && (
                <div className="flex justify-center my-3">
                  <span className="bg-white/90 dark:bg-[#182229]/90 text-[#667781] dark:text-[#8696a0] text-[11px] font-semibold px-3 py-1 rounded-lg shadow-xs backdrop-blur-md uppercase tracking-wider">
                    {formatDayDivider(msg.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubble
                message={msg}
                currentUserId={customerSession?._id}
                isAgentView={false}
              />
            </React.Fragment>
          );
        })}

        <div ref={messagesEndRef} />
      </main>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollDown && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-4 w-10 h-10 rounded-full bg-white dark:bg-[#202c33] text-[#667781] dark:text-[#8696a0] shadow-lg flex items-center justify-center z-20 border border-black/[0.08] dark:border-white/[0.08] transition-all hover:scale-105 active:scale-95"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#25d366] text-[#05231b] font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ═══════════════ COMPOSER & INPUT BAR ═══════════════ */}
      <footer className="bg-[#f0f2f5] dark:bg-[#202c33] px-2 py-2 border-t border-black/[0.06] dark:border-white/[0.08] z-20 shrink-0">
        {isRecording ? (
          /* Live Voice Recording Bar */
          <div className="flex items-center gap-3 px-2 py-1 bg-white dark:bg-[#111b21] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm animate-pop">
            <button
              onClick={cancelVoiceRecording}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
              title="Cancel recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-rec-dot" />
            <span className="text-xs font-semibold text-red-500 font-mono">
              {formatDuration(recordDuration)}
            </span>
            <span className="text-xs text-[#667781] dark:text-[#8696a0] flex-1 truncate">
              Recording — tap send when done
            </span>
            <button
              onClick={stopAndSendVoiceRecording}
              className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
              title="Send audio"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Standard WhatsApp Composer */
          <div className="flex items-center gap-1.5">
            {/* Emoji Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-full transition-colors ${
                showEmojiPicker ? 'text-[#00a884] bg-emerald-50 dark:bg-emerald-950/30' : 'text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white'
              }`}
              title="Emoji"
            >
              <Smile className="w-6 h-6" />
            </button>

            {/* Attachments Sheet Trigger */}
            <button
              onClick={() => setShowAttachSheet(true)}
              className="p-2 text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded-full transition-colors"
              title="Attach"
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            {/* Text Input */}
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-2xl px-3.5 py-2 flex items-center border border-black/[0.04] dark:border-white/[0.04] shadow-xs">
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  handleTypingStart();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message"
                className="w-full bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-none resize-none max-h-24 leading-5"
              />
            </div>

            {/* Mic or Send Button */}
            {text.trim() ? (
              <button
                onClick={() => handleSendMessage()}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={startVoiceRecording}
                className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0"
                title="Record voice message"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </footer>

      {/* ═══════════════ HIDDEN FILE INPUTS ═══════════════ */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={(e) => handleFileUpload(e, 'document')}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFileUpload(e, 'image')}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => handleFileUpload(e, 'audio')}
      />

      {/* ═══════════════ ATTACHMENT BOTTOM SHEET ═══════════════ */}
      {showAttachSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowAttachSheet(false)} />
          <div className="w-full max-w-lg bg-white dark:bg-[#202c33] rounded-t-3xl p-6 z-50 border-t border-black/[0.06] dark:border-white/[0.08] shadow-2xl animate-sheet">
            <div className="w-12 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mb-6" />
            <div className="grid grid-cols-4 gap-4 text-center">
              {/* Gallery */}
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*,video/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">Gallery</span>
              </button>

              {/* Camera */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">Camera</span>
              </button>

              {/* Document */}
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = '*/*';
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <File className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">Document</span>
              </button>

              {/* Audio */}
              <button
                onClick={() => audioInputRef.current?.click()}
                className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <Music className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">Audio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ NOTIFICATION CENTRE DRAWER ═══════════════ */}
      {showNotifPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowNotifPanel(false)} />
          <div className="w-full max-w-sm bg-white dark:bg-[#111b21] h-full z-50 flex flex-col shadow-2xl border-l border-black/[0.06] dark:border-white/[0.08] animate-drawer">
            {/* Header */}
            <header className="h-[56px] px-3 bg-[#075e54] dark:bg-[#1f2c33] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowNotifPanel(false)} className="p-1 rounded-full hover:bg-white/10">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-base font-semibold">Notifications</h2>
              </div>
              <button onClick={() => showToast('Notifications cleared')} className="text-xs text-emerald-200 hover:text-white">
                Clear all
              </button>
            </header>

            {/* Push Switch Row */}
            <div className="p-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">Push notifications</h3>
                <p className="text-xs text-[#667781] dark:text-[#8696a0] mt-0.5">
                  Get a phone alert when support replies, even after you close this page.
                </p>
              </div>
              <button
                onClick={handleEnablePush}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  pushEnabled ? 'bg-[#00a884]' : 'bg-black/20 dark:bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform absolute top-0.5 ${
                    pushEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 text-[#8696a0] flex items-center justify-center mb-3">
                <Bell className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">No notifications yet</p>
              <p className="text-xs text-[#667781] dark:text-[#8696a0] mt-1">
                Replies from support will show up here.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ NAME & WHATSAPP NUMBER MODAL ═══════════════ */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202c33] p-6 rounded-3xl max-w-sm w-full relative shadow-2xl border border-black/[0.06] dark:border-white/[0.08] animate-pop">
            <div className="w-12 h-12 rounded-2xl bg-[#00a884]/15 text-[#00a884] dark:text-emerald-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef] mb-1">
              Activate ID & 5% Bonus
            </h2>
            <p className="text-xs text-[#667781] dark:text-[#8696a0] mb-4 leading-relaxed">
              Kripya apna Naam aur WhatsApp Number enter karein taaki hum aapki ID turant generate kar sakein.
            </p>
            
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-semibold text-[#8696a0] mb-1">Aapka Naam / Name *</label>
                <input
                  type="text"
                  value={nameInputVal}
                  onChange={(e) => setNameInputVal(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  maxLength={40}
                  className="w-full bg-[#f0f2f5] dark:bg-[#111b21] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#111b21] dark:text-[#e9edef] outline-none focus:border-[#00a884]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8696a0] mb-1">WhatsApp Mobile Number *</label>
                <input
                  type="tel"
                  value={phoneInputVal}
                  onChange={(e) => setPhoneInputVal(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  maxLength={20}
                  className="w-full bg-[#f0f2f5] dark:bg-[#111b21] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#111b21] dark:text-[#e9edef] outline-none focus:border-[#00a884]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSaveName}
                disabled={!nameInputVal.trim()}
                className="px-5 py-2.5 text-xs font-semibold bg-[#00a884] hover:bg-[#008f70] disabled:opacity-50 text-white rounded-xl shadow-md active:scale-95 transition-all"
              >
                Submit & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ VOICE CALL MODAL ═══════════════ */}
      {showVoiceCall && (
        <VoiceCallModal
          contactName={BRAND_NAME}
          contactImage="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
          phoneNumber={visitorPhone || "+91 9876543210"}
          onClose={() => setShowVoiceCall(false)}
        />
      )}

      {/* ═══════════════ EMOJI PICKER MODAL ═══════════════ */}
      {showEmojiPicker && (
        <EmojiPickerModal
          onSelect={(emoji) => {
            setText((prev) => prev + emoji);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* ═══════════════ TOAST NOTIFICATION ═══════════════ */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#111b21]/90 text-white text-xs px-4 py-2 rounded-full shadow-2xl z-50 backdrop-blur-md animate-pop">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
