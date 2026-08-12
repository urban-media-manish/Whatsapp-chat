import type { User, Customer, Conversation, Message, Note, QuickReply, AnalyticsData } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000');
const API_BASE = `${BASE_URL}/api`;

const getHeaders = () => {
  const token = localStorage.getItem('agent_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth API
  login: async (email: string, password: string): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  getAgents: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/auth/agents`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch agents');
    return res.json();
  },

  updateAgentStatus: async (status: string): Promise<{ status: string }> => {
    const res = await fetch(`${API_BASE}/auth/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Customer Session API
  initCustomer: async (payload: {
    sessionId?: string;
    name?: string;
    phone?: string;
    isGuest?: boolean;
  }): Promise<{ customer: Customer; conversation: Conversation }> => {
    const res = await fetch(`${API_BASE}/customer/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to initialize session');
    return res.json();
  },

  getCustomerSession: async (sessionId: string): Promise<{ customer: Customer; conversation: Conversation }> => {
    const res = await fetch(`${API_BASE}/customer/session/${sessionId}`);
    if (!res.ok) throw new Error('Session not found');
    return res.json();
  },

  // Conversations API
  getConversations: async (params?: {
    status?: string;
    filter?: string;
    priority?: string;
    tag?: string;
    search?: string;
  }): Promise<Conversation[]> => {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/conversations?${query}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  getConversationById: async (id: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, { headers: getHeaders() });
    return res.json();
  },

  assignAgent: async (conversationId: string, agentId: string | null): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/assign`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ agentId })
    });
    return res.json();
  },

  updateStatus: async (conversationId: string, status?: string, priority?: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, priority })
    });
    return res.json();
  },

  togglePin: async (id: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations/${id}/toggle-pin`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return res.json();
  },

  toggleArchive: async (id: string): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations/${id}/toggle-archive`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return res.json();
  },

  deleteConversation: async (id: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  toggleCustomerBlockMute: async (id: string, payload: { blocked?: boolean; muted?: boolean }) => {
    const res = await fetch(`${API_BASE}/conversations/${id}/customer-actions`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  addTag: async (conversationId: string, tag: string): Promise<string[]> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/tags`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tag })
    });
    return res.json();
  },

  removeTag: async (conversationId: string, tag: string): Promise<string[]> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // Notes API
  getNotes: async (conversationId: string): Promise<Note[]> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/notes`, { headers: getHeaders() });
    return res.json();
  },

  addNote: async (conversationId: string, content: string): Promise<Note> => {
    const res = await fetch(`${API_BASE}/conversations/${conversationId}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    });
    return res.json();
  },

  // Quick Replies API
  getQuickReplies: async (): Promise<QuickReply[]> => {
    const res = await fetch(`${API_BASE}/conversations/meta/quick-replies`, { headers: getHeaders() });
    return res.json();
  },

  // Messages API
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const res = await fetch(`${API_BASE}/messages/${conversationId}`);
    return res.json();
  },

  sendMessage: async (payload: {
    conversationId: string;
    senderType: 'customer' | 'agent' | 'system';
    senderId: string;
    senderName: string;
    content?: string;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    replyToId?: string;
  }): Promise<Message> => {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  editMessage: async (id: string, content: string): Promise<Message> => {
    const res = await fetch(`${API_BASE}/messages/${id}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return res.json();
  },

  deleteMessage: async (id: string): Promise<Message> => {
    const res = await fetch(`${API_BASE}/messages/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  reactMessage: async (id: string, emoji: string, by: string, byName?: string): Promise<Message> => {
    const res = await fetch(`${API_BASE}/messages/${id}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, by, byName })
    });
    return res.json();
  },

  // Upload API
  uploadFile: async (file: File): Promise<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    type: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  // AI API
  getAISuggestions: async (conversationId: string): Promise<{ suggestions: string[] }> => {
    const res = await fetch(`${API_BASE}/ai/suggest`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ conversationId })
    });
    return res.json();
  },

  analyzeSentiment: async (conversationId: string): Promise<{ sentiment: string; intent: string }> => {
    const res = await fetch(`${API_BASE}/ai/sentiment`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ conversationId })
    });
    return res.json();
  },

  summarizeChat: async (conversationId: string): Promise<{ summary: string }> => {
    const res = await fetch(`${API_BASE}/ai/summarize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ conversationId })
    });
    return res.json();
  },

  translateText: async (text: string, targetLang?: string): Promise<{ translatedText: string }> => {
    const res = await fetch(`${API_BASE}/ai/translate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, targetLang })
    });
    return res.json();
  },

  // Analytics API
  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await fetch(`${API_BASE}/analytics/overview`, { headers: getHeaders() });
    return res.json();
  },

  // Settings API
  getSettings: async (): Promise<{ welcomeMessage: string }> => {
    const res = await fetch(`${API_BASE}/settings`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  saveSettings: async (welcomeMessage: string): Promise<{ welcomeMessage: string }> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ welcomeMessage })
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  }
};
