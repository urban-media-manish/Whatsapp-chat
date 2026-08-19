import { create } from 'zustand';
import type { Conversation, Message, Customer, QuickReply } from '../types';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

export interface TypingState {
  isTyping: boolean;
  name: string;
  senderType?: string;
}

interface ChatState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  messagesCache: Record<string, Message[]>;
  quickReplies: QuickReply[];

  customerSession: Customer | null;
  customerConversation: Conversation | null;

  activeFilter: 'all' | 'unread' | 'mine' | 'pinned' | 'archived';
  statusFilter: 'all' | 'open' | 'pending' | 'resolved' | 'closed';
  priorityFilter: string;
  tagFilter: string;
  searchQuery: string;

  replyToMessage: Message | null;
  typingState: Record<string, TypingState>;
  onlineCustomers: string[];

  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  setTheme: (theme: 'dark' | 'light') => void;
  setActiveConversation: (conv: Conversation | null) => void;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  markAllMessagesRead: (conversationId: string) => void;
  setReplyToMessage: (msg: Message | null) => void;
  setTyping: (conversationId: string, name: string, isTyping: boolean, senderType?: string) => void;
  setOnlineCustomers: (ids: string[]) => void;
  addOnlineCustomer: (id: string) => void;
  removeOnlineCustomer: (id: string) => void;
  setCustomerSession: (cust: Customer, conv: Conversation) => void;
  deleteConversation: (id: string) => Promise<void>;
  clearChat: (id: string) => Promise<void>;

  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: 'all' | 'unread' | 'mine' | 'pinned' | 'archived') => void;
  setStatusFilter: (s: 'all' | 'open' | 'pending' | 'resolved' | 'closed') => void;
  setPriorityFilter: (p: string) => void;
  setTagFilter: (t: string) => void;

  fetchQuickReplies: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: nextTheme });
  },

  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  conversations: [],
  activeConversation: null,
  messages: [],
  messagesCache: {},
  quickReplies: [],

  customerSession: null,
  customerConversation: null,

  activeFilter: 'all',
  statusFilter: 'all',
  priorityFilter: 'all',
  tagFilter: '',
  searchQuery: '',

  replyToMessage: null,
  typingState: {},
  onlineCustomers: [],

  setOnlineCustomers: (ids) => set({ onlineCustomers: ids }),
  addOnlineCustomer: (id) => set((state) => ({
    onlineCustomers: state.onlineCustomers.includes(id) ? state.onlineCustomers : [...state.onlineCustomers, id]
  })),
  removeOnlineCustomer: (id) => set((state) => ({
    onlineCustomers: state.onlineCustomers.filter(cId => cId !== id)
  })),

  isLoadingConversations: false,
  isLoadingMessages: false,

  setActiveConversation: (conv) => {
    const { conversations, activeConversation, messagesCache } = get();
    const socket = getSocket();

    if (activeConversation && activeConversation._id !== conv?._id) {
      socket.emit('leave_conversation', { conversationId: activeConversation._id });
    }

    if (conv) {
      socket.emit('join_conversation', { conversationId: conv._id, role: 'agent' });
      socket.emit('mark_read', { conversationId: conv._id, readerType: 'agent' });
    }

    const updatedConvs = conversations.map(c =>
      c._id === conv?._id ? { ...c, unreadCount: 0 } : c
    );

    // 0ms INSTANT SWITCH: Load cached messages immediately without waiting for network!
    const cachedMsgs = conv ? (messagesCache[conv._id] || []) : [];

    set({
      activeConversation: conv ? { ...conv, unreadCount: 0 } : null,
      conversations: updatedConvs,
      messages: cachedMsgs,
      replyToMessage: null
    });

    if (conv) {
      get().fetchMessages(conv._id);
    }
  },

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const { activeFilter, statusFilter, priorityFilter, tagFilter, searchQuery, activeConversation } = get();
      const list = await api.getConversations({
        filter: activeFilter,
        status: statusFilter,
        priority: priorityFilter,
        tag: tagFilter,
        search: searchQuery
      });

      // Keep activeConversation in sync with fresh data — DON'T deselect it
      const updatedActive = activeConversation
        ? (list.find(c => c._id === activeConversation._id) || activeConversation)
        : null;

      set({ conversations: list, isLoadingConversations: false, activeConversation: updatedActive });
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      const msgs = await api.getMessages(conversationId);
      const { activeConversation, customerConversation, messagesCache } = get();
      const updatedCache = { ...messagesCache, [conversationId]: msgs };

      const isCurrentActive =
        (activeConversation && activeConversation._id === conversationId) ||
        (customerConversation && customerConversation._id === conversationId);

      set({
        messagesCache: updatedCache,
        messages: isCurrentActive ? msgs : get().messages,
        isLoadingMessages: false
      });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (msg: Message) => {
    const { activeConversation, customerConversation, messages, conversations, messagesCache } = get();
    const msgConvId = typeof msg.conversation === 'object' && msg.conversation !== null
      ? (msg.conversation as any)._id
      : msg.conversation;

    // Update messagesCache for this conversation
    const currentConvMsgs = messagesCache[msgConvId] || [];
    const cacheIndex = currentConvMsgs.findIndex(m =>
      m._id === msg._id ||
      (m._id.startsWith('temp_') && m.content === msg.content && m.senderType === msg.senderType)
    );
    let updatedConvMsgs: Message[];
    if (cacheIndex !== -1) {
      updatedConvMsgs = [...currentConvMsgs];
      updatedConvMsgs[cacheIndex] = { ...updatedConvMsgs[cacheIndex], ...msg, _id: msg._id };
    } else {
      updatedConvMsgs = [...currentConvMsgs, msg];
    }
    const updatedCache = { ...messagesCache, [msgConvId]: updatedConvMsgs };

    let updatedCurrentMessages = messages;
    if (
      (activeConversation && activeConversation._id === msgConvId) ||
      (customerConversation && customerConversation._id === msgConvId)
    ) {
      updatedCurrentMessages = updatedConvMsgs;
    }

    const conversationExists = conversations.some(c => c._id === msgConvId);
    if (!conversationExists) {
      set({ messagesCache: updatedCache, messages: updatedCurrentMessages });
      get().fetchConversations();
    } else {
      const updatedConvs = conversations.map(c => {
        if (c._id === msgConvId) {
          return {
            ...c,
            lastMessage: {
              content: msg.content || msg.fileName || `[${msg.type}]`,
              senderType: msg.senderType,
              type: msg.type,
              timestamp: msg.createdAt
            },
            updatedAt: msg.createdAt,
            unreadCount: (activeConversation?._id === c._id) ? 0 : (c.unreadCount || 0) + 1
          };
        }
        return c;
      }).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });

      set({ messagesCache: updatedCache, messages: updatedCurrentMessages, conversations: updatedConvs });
    }
  },

  markAllMessagesRead: (conversationId) => {
    set((state) => ({
      messages: state.messages.map((m) => {
        const cId = typeof m.conversation === 'object' && m.conversation !== null
          ? (m.conversation as any)._id
          : m.conversation;
        return (cId === conversationId || !conversationId) ? { ...m, status: 'read' as const } : m;
      })
    }));
  },

  setReplyToMessage: (msg) => set({ replyToMessage: msg }),

  setTyping: (conversationId, name, isTyping, senderType) => {
    set((state) => ({
      typingState: {
        ...state.typingState,
        [conversationId]: { isTyping, name, senderType }
      }
    }));
  },

  setCustomerSession: (cust, conv) => {
    set({ customerSession: cust, customerConversation: conv });
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q });
    get().fetchConversations();
  },

  setActiveFilter: (f) => {
    set({ activeFilter: f });
    get().fetchConversations();
  },

  setStatusFilter: (s) => {
    set({ statusFilter: s });
    get().fetchConversations();
  },

  setPriorityFilter: (p) => {
    set({ priorityFilter: p });
    get().fetchConversations();
  },

  setTagFilter: (t) => {
    set({ tagFilter: t });
    get().fetchConversations();
  },

  fetchQuickReplies: async () => {
    try {
      const replies = await api.getQuickReplies();
      set({ quickReplies: replies });
    } catch (err) {
      console.error(err);
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await api.deleteConversation(id);
      set((state) => {
        const isCurrent = state.activeConversation?._id === id;
        return {
          conversations: state.conversations.filter(c => c._id !== id),
          activeConversation: isCurrent ? null : state.activeConversation,
          messages: isCurrent ? [] : state.messages
        };
      });
    } catch (err) {
      console.error('Delete conversation error:', err);
      alert('Failed to delete conversation');
    }
  },

  clearChat: async (id: string) => {
    try {
      await api.clearChat(id);
      set((state) => ({
        messages: state.activeConversation?._id === id ? [] : state.messages,
        conversations: state.conversations.map(c =>
          c._id === id
            ? { ...c, lastMessage: { content: 'Chat history was cleared', senderType: 'system', type: 'text', timestamp: new Date().toISOString() }, unreadCount: 0 }
            : c
        )
      }));
    } catch (err) {
      console.error('Clear chat error:', err);
      alert('Failed to clear chat');
    }
  }
}));
