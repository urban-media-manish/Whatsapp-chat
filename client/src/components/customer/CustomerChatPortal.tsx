import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MessageBubble } from '../chat/MessageBubble';
import { EmojiPickerModal } from '../chat/EmojiPickerModal';
import { VoiceCallModal } from '../chat/VoiceCallModal';
import { GetIdModal } from '../chat/GetIdModal';
import type { Message, MessageType } from '../../types';
import { sounds } from '../../utils/audio';
import { exportChatAsTxt, exportChatAsPdf } from '../../utils/exportChat';
import {
  X, Smile, Paperclip, Mic, Send,
  Bell, MoreVertical, Moon, Sun, Download, FileText,
  Image as ImageIcon, Camera, File, Music, ArrowDown,
  Trash2, Phone, Search, ChevronLeft, Smartphone
} from 'lucide-react';

const BRAND_NAME = "Support Official";
const SESSION_KEY = "support_session_id";
const NAME_KEY = "support_visitor_name";
const PHONE_KEY = "support_visitor_phone";
const NOTICE_KEY = "support_push_notice_dismissed";
const PUSH_PERM_KEY = "support_push_enabled";

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
  const [pushNoticeVisible, setPushNoticeVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(localStorage.getItem(PUSH_PERM_KEY) === 'true');
  const [showAttachSheet, setShowAttachSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showGetIdModal, setShowGetIdModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Connection & Presence state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('connecting');
  const [isAgentOnline, setIsAgentOnline] = useState(false);

  // PWA install prompt ref
  const deferredPromptRef = useRef<any>(null);

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
  const syncViewport = () => {
    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    document.documentElement.style.setProperty('--app-h', `${h}px`);
    document.documentElement.style.setProperty('--app-top', `${top}px`);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewport);
      window.visualViewport.addEventListener('scroll', syncViewport);
    }
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', () => setTimeout(syncViewport, 250));
    syncViewport();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', syncViewport);
        window.visualViewport.removeEventListener('scroll', syncViewport);
      }
      window.removeEventListener('resize', syncViewport);
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

        // Open Get ID Modal if visitor has not submitted their name/phone
        if (!storedName || !storedPhone || localStorage.getItem('support_id_registered') !== 'true') {
          setShowGetIdModal(true);
        }

        socket.emit('join_conversation', {
          conversationId: data.conversation._id,
          role: 'customer',
          userId: data.customer._id
        });

        // 1. Ensure 1st Welcome message is present
        const currentMsgs = useChatStore.getState().messages;
        const hasWelcome = currentMsgs && currentMsgs.some((m) => m.content && (m.content.includes('DlAM0ND') || m.content.includes('allpanelexch9.game')));

        const welcomeText = `💎 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 DlAM0ND 𝐄𝐗𝐂𝐇𝐀𝐍𝐆𝐄 💎\n𝐈𝐍𝐃𝐈𝐀’𝐒 𝐅𝐈𝐑𝐒𝐓 𝐌𝐄𝐓𝐀 𝐕𝐄𝐑𝐈𝐅𝐈𝐄𝐃 ✅ 𝐄𝐗𝐂𝐇𝐀𝐍𝐆𝐄 𝐁𝐑𝐀𝐍𝐃\n━━━━━━━━━━━━━━━\nAvailable site\n\nhttps://allpanelexch9.game\n━━━━━━━━━━━━━━━\n𝐌𝐢𝐧𝐢𝐦𝐮𝐦 🆔 @ 𝟐𝟎𝟎\n𝐌𝐢𝐧𝐢𝐦𝐮𝐦 𝐁€T@ 𝟏𝟎𝟎\n𝐂𝐫𝐞𝐚𝐭𝐞 𝐘𝐨𝐮𝐫 🆔𝐓𝐡𝐫𝐨𝐮𝐠𝐡 𝐔𝐬 & 𝐆𝐞𝐭 𝟓% 𝐁0𝐍𝐔𝐒\n⚡ 𝐅𝐚𝐬𝐭 𝐃𝐞-𝐩𝐨𝐬𝐢𝐭 & 𝐖𝐢𝐭𝐡-𝐝𝐫𝐚𝐰𝐚𝐥\n🔒 𝐒𝐞𝐜𝐮𝐫𝐞 & 𝐓𝐫𝐮𝐬𝐭-𝐞𝐝 𝐏𝐥𝐚𝐭𝐟𝐨𝐫𝐦\n𝟐𝟒𝐱𝟕 𝐂𝐮𝐬𝐭𝐨𝐦𝐞𝐫 𝐒𝐮𝐩𝐩𝐨𝐫𝐭\n━━━━━━━━━━━━━━━\n𝐈𝐍𝐃𝐈𝐀’𝐒 𝐅𝐈𝐑𝐒𝐓 𝐅𝐑𝐄𝐄 𝐏𝐑𝐄𝐃𝐈𝐂𝐓 & 𝐖𝐈𝐍 𝐒𝐈𝐓𝐄\n\nNote :- ( Humare yaha first dep0zit pe 5% b0nu$ milega )`;

        if (!hasWelcome) {
          const welcomeMsg = await api.sendMessage({
            conversationId: data.conversation._id,
            senderType: 'agent',
            senderId: 'agent_auto_welcome',
            senderName: BRAND_NAME,
            content: welcomeText,
            type: 'text'
          });
          addMessage(welcomeMsg);
        }

        // 2. Ensure 2nd Follow-up prompt message is present
        const afterWelcomeMsgs = useChatStore.getState().messages;
        const hasPrompt = afterWelcomeMsgs && afterWelcomeMsgs.some((m) => m.content && (m.content.includes('Please share your name and number') || m.content.includes('apni ID create karne')));

        if (!hasPrompt) {
          const promptText = "Please share your name and number for new id & bonus";
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
  }, []);

  // ── 3b. PWA Install Prompt Listener ──
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
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

  // Re-join on socket reconnect & presence listener
  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus('connected');
      if (customerSession?._id && customerConversation?._id) {
        socket.emit('join_conversation', {
          conversationId: customerConversation._id,
          role: 'customer',
          userId: customerSession._id
        });
        socket.emit('mark_read', { conversationId: customerConversation._id, readerType: 'customer' });
      }
    };

    const handleDisconnect = () => {
      setConnectionStatus('reconnecting');
    };

    const handleConnectError = () => {
      setConnectionStatus('reconnecting');
    };

    const handleAgentPresence = ({ status, onlineCount }: { status: string; onlineCount: number }) => {
      setIsAgentOnline(onlineCount > 0 || status === 'online');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('agent_presence', handleAgentPresence);

    if (socket.connected) {
      handleConnect();
    } else {
      setConnectionStatus('connecting');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('agent_presence', handleAgentPresence);
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

  // ── 6. Send Text Message (Instant 0ms) ──
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

    // 1. Instant Optimistic Render (<1ms)
    const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 6);
    const optimisticMsg: Message = {
      _id: tempId,
      conversation: customerConversation._id,
      senderType: 'customer',
      senderId: customerSession._id,
      senderName: visitorName || customerSession.name || 'Visitor',
      content,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    addMessage(optimisticMsg);
    sounds.playSent();
    scrollToBottom();

    // 2. Instant WebSocket Broadcast (~10ms)
    socket.emit('send_message', optimisticMsg);

    // 3. Background DB Save
    try {
      const serverMsg = await api.sendMessage({
        conversationId: customerConversation._id,
        senderType: 'customer',
        senderId: customerSession._id,
        senderName: visitorName || customerSession.name || 'Visitor',
        content,
        type: 'text'
      });

      addMessage(serverMsg);
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  // ── 6b. Quick Action Handler (Instant 0ms) ──
  const handleQuickSend = async (quickText: string) => {
    if (quickText.includes('Get ID') && (!visitorName || !visitorPhone || localStorage.getItem('support_id_registered') !== 'true')) {
      setShowGetIdModal(true);
      return;
    }

    if (!quickText.trim() || !customerConversation || !customerSession) return;

    const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 6);
    const optimisticMsg: Message = {
      _id: tempId,
      conversation: customerConversation._id,
      senderType: 'customer',
      senderId: customerSession._id,
      senderName: visitorName || customerSession.name || 'Visitor',
      content: quickText.trim(),
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    addMessage(optimisticMsg);
    sounds.playSent();
    scrollToBottom();

    socket.emit('send_message', optimisticMsg);

    try {
      const serverMsg = await api.sendMessage({
        conversationId: customerConversation._id,
        senderType: 'customer',
        senderId: customerSession._id,
        senderName: visitorName || customerSession.name || 'Visitor',
        content: quickText.trim(),
        type: 'text'
      });

      addMessage(serverMsg);
    } catch (err) {
      console.error('Quick send error:', err);
    }
  };

  // ── 6c. Get ID Modal Submission ──
  const handleSubmitGetId = async (submittedName: string, submittedPhone: string) => {
    localStorage.setItem(NAME_KEY, submittedName);
    localStorage.setItem('customer_name', submittedName);
    localStorage.setItem(PHONE_KEY, submittedPhone);
    localStorage.setItem('customer_phone', submittedPhone);
    localStorage.setItem('support_id_registered', 'true');

    setVisitorName(submittedName);
    setVisitorPhone(submittedPhone);

    const savedSessionId = localStorage.getItem(SESSION_KEY) || localStorage.getItem('customer_session_id');

    try {
      const data = await api.initCustomer({
        sessionId: savedSessionId || undefined,
        name: submittedName,
        phone: submittedPhone,
        isGuest: false
      });

      setCustomerSession(data.customer, data.conversation);
      setShowGetIdModal(false);

      // Automatically send the ID request message into chat
      await handleQuickSend(`🔥 I want to Get New ID!\n👤 Name: ${submittedName}\n📱 WhatsApp: ${submittedPhone}`);
      showToast('ID Request Sent!');
    } catch (err) {
      console.error('Error submitting ID:', err);
      setShowGetIdModal(false);
      await handleQuickSend(`🔥 I want to Get New ID!\n👤 Name: ${submittedName}\n📱 WhatsApp: ${submittedPhone}`);
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

  // ── 9. Menu & Settings Handlers ──
  const handleInstallPwa = async () => {
    setShowMenu(false);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      showToast('App is already installed on your device!');
      return;
    }

    if (deferredPromptRef.current) {
      try {
        await deferredPromptRef.current.prompt();
        const choiceResult = await deferredPromptRef.current.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          showToast('App installed to Home screen!');
        }
        deferredPromptRef.current = null;
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        showToast("Tap Safari Share button (⎕↑) → 'Add to Home Screen'");
      } else {
        showToast("Tap browser menu (⋮ / Share) → 'Add to Home screen'");
      }
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

  // Filter out any system welcome greeting (e.g. "Welcome to our Live Support, Guest_...")
  const validMessages = messages.filter((m) => {
    if (m.senderType === 'system' || (m.content && m.content.includes('Welcome to our Live Support'))) {
      return false;
    }
    return true;
  });

  // Sort messages: Guarantee Welcome Card is 1st and Prompt is 2nd
  const sortedMessages = [...validMessages].sort((a, b) => {
    const aIsWelcome = a.senderId === 'agent_auto_welcome' || (a.content && a.content.includes('DlAM0ND'));
    const bIsWelcome = b.senderId === 'agent_auto_welcome' || (b.content && b.content.includes('DlAM0ND'));
    const aIsPrompt = a.senderId === 'agent_auto_prompt' || (a.content && a.content.includes('Please share your name'));
    const bIsPrompt = b.senderId === 'agent_auto_prompt' || (b.content && b.content.includes('Please share your name'));

    if (aIsWelcome && bIsPrompt) return -1;
    if (bIsWelcome && aIsPrompt) return 1;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const deduplicatedMessages: Message[] = [];
  const seenWelcomeKeys = new Set<string>();
  const seenPromptKeys = new Set<string>();

  for (const m of sortedMessages) {
    if (m.senderId === 'agent_auto_welcome' || (m.content && m.content.includes('DlAM0ND'))) {
      const key = (m.content || '').trim();
      if (!seenWelcomeKeys.has(key)) {
        seenWelcomeKeys.add(key);
        deduplicatedMessages.push(m);
      }
    } else if (m.senderId === 'agent_auto_prompt' || (m.content && m.content.includes('Please share your name'))) {
      const key = (m.content || '').trim();
      if (!seenPromptKeys.has(key)) {
        seenPromptKeys.add(key);
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
    <div
      className="fixed left-0 right-0 w-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] select-none overflow-hidden"
      style={{
        top: 'var(--app-top, 0px)',
        height: 'var(--app-h, 100dvh)',
        maxHeight: 'var(--app-h, 100dvh)'
      }}
    >
      
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="h-[56px] px-3 bg-[#075e54] dark:bg-[#1f2c33] text-white flex items-center justify-between z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-[40px] h-[40px] rounded-full overflow-hidden shrink-0 shadow-md border-2 border-white/30 bg-emerald-700 flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
              alt="Support Official"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="absolute text-sm font-bold text-white uppercase select-none -z-10">S</span>
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#075e54] dark:border-[#1f2c33] rounded-full transition-colors ${
              connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                ? 'bg-amber-400 animate-pulse'
                : isAgentTyping || isAgentOnline
                  ? 'bg-emerald-400'
                  : 'bg-gray-400'
            }`} />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h1 className="text-[15px] font-semibold tracking-tight truncate leading-tight flex items-center gap-1.5">
              <span>{BRAND_NAME}</span>
            </h1>
            <p className="text-[11px] leading-tight">
              {connectionStatus === 'connecting' ? (
                <span className="text-amber-200 animate-pulse font-medium">Connecting…</span>
              ) : connectionStatus === 'reconnecting' || connectionStatus === 'disconnected' ? (
                <span className="text-amber-200 animate-pulse font-medium">Reconnecting…</span>
              ) : isAgentTyping ? (
                <span className="font-semibold italic text-amber-200 animate-pulse">typing…</span>
              ) : isAgentOnline ? (
                <span className="text-emerald-200 dark:text-emerald-400 font-medium">Online</span>
              ) : (
                <span className="text-white/70 dark:text-white/60">Offline</span>
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
                    onClick={handleInstallPwa}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#f0f2f5] dark:hover:bg-[#111b21] transition-colors flex items-center justify-between"
                  >
                    <span>Add to Home screen</span>
                    <Smartphone className="w-4 h-4 text-[#00a884]" />
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
        className="flex-1 min-h-0 overflow-y-auto p-3 md:px-6 space-y-2 chat-wallpaper relative"
      >
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-[#00a884] dark:text-emerald-400 flex items-center justify-center mb-3 shadow-sm">
              <Smile className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef] mb-1">
              Welcome to Support Official
            </h2>
            <p className="text-xs text-[#667781] dark:text-[#8696a0] leading-relaxed mb-4">
              Click below to instantly get your ID and 24/7 customer support.
            </p>
            <button
              onClick={() => handleQuickSend('Get ID Now')}
              className="px-6 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <span>🔥 Get ID Now</span>
            </button>
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
          className="absolute bottom-24 right-4 w-10 h-10 rounded-full bg-white dark:bg-[#202c33] text-[#667781] dark:text-[#8696a0] shadow-lg flex items-center justify-center z-20 border border-black/[0.08] dark:border-white/[0.08] transition-all hover:scale-105 active:scale-95"
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
      <footer className="bg-[#f0f2f5] dark:bg-[#202c33] px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-black/[0.06] dark:border-white/[0.08] z-30 shrink-0">
        {/* Quick Action Chips */}
        <div className="px-1 pb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleQuickSend('Get ID Now')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white text-xs font-bold shadow-xs active:scale-95 transition-all whitespace-nowrap"
          >
            <span>🔥 Get ID Now</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickSend('Deposit')}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-[#2a3942] hover:bg-[#e9edef] dark:hover:bg-[#32444d] text-[#111b21] dark:text-[#e9edef] text-xs font-medium border border-black/[0.06] dark:border-white/[0.08] shadow-xs active:scale-95 transition-all whitespace-nowrap"
          >
            <span>⚡ Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickSend('Withdrawal')}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-[#2a3942] hover:bg-[#e9edef] dark:hover:bg-[#32444d] text-[#111b21] dark:text-[#e9edef] text-xs font-medium border border-black/[0.06] dark:border-white/[0.08] shadow-xs active:scale-95 transition-all whitespace-nowrap"
          >
            <span>💸 Withdrawal</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickSend('Customer Support')}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-white dark:bg-[#2a3942] hover:bg-[#e9edef] dark:hover:bg-[#32444d] text-[#111b21] dark:text-[#e9edef] text-xs font-medium border border-black/[0.06] dark:border-white/[0.08] shadow-xs active:scale-95 transition-all whitespace-nowrap"
          >
            <span>💬 Support</span>
          </button>
        </div>

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
                onFocus={() => {
                  setTimeout(() => {
                    syncViewport();
                    scrollToBottom();
                  }, 50);
                }}
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

      {/* ═══════════════ GET ID MODAL (POPUP) ═══════════════ */}
      <GetIdModal
        isOpen={showGetIdModal}
        onSubmit={handleSubmitGetId}
        initialName={visitorName}
        initialPhone={visitorPhone}
      />

      {/* ═══════════════ TOAST NOTIFICATION ═══════════════ */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#111b21]/90 text-white text-xs px-4 py-2 rounded-full shadow-2xl z-50 backdrop-blur-md animate-pop">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
