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
  setCustomerSession: (cust: Customer, conv: Conversation) => void;

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

  isLoadingConversations: false,
  isLoadingMessages: false,

  setActiveConversation: (conv) => {
    const { conversations, activeConversation } = get();
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
    set({
      activeConversation: conv ? { ...conv, unreadCount: 0 } : null,
      conversations: updatedConvs,
      replyToMessage: null
    });
    if (conv) {
      get().fetchMessages(conv._id);
    } else {
      set({ messages: [] });
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
    set({ isLoadingMessages: true });
    try {
      const msgs = await api.getMessages(conversationId);
      set({ messages: msgs, isLoadingMessages: false });
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (msg: Message) => {
    const { activeConversation, customerConversation, messages, conversations } = get();

    if (
      (activeConversation && activeConversation._id === msg.conversation) ||
      (customerConversation && customerConversation._id === msg.conversation)
    ) {
      const exists = messages.some(m => m._id === msg._id);
      if (!exists) {
        set({ messages: [...messages, msg] });
      }
    }

    const updatedConvs = conversations.map(c => {
      if (c._id === msg.conversation) {
        return {
          ...c,
          lastMessage: {
            content: msg.content || msg.fileName || `[${msg.type}]`,
            senderType: msg.senderType,
            type: msg.type,
            timestamp: msg.createdAt
          },
          updatedAt: msg.createdAt,
          unreadCount: (activeConversation?._id === c._id) ? 0 : c.unreadCount + 1
        };
      }
      return c;
    });

    set({ conversations: updatedConvs });
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
  }
}));
