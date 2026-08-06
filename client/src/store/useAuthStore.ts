import { create } from 'zustand';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setStatus: (status: 'online' | 'offline' | 'busy' | 'away') => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, pass: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.login(email, pass);
      if (user.token) {
        localStorage.setItem('agent_token', user.token);
      }
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Invalid credentials', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('agent_token');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('agent_token');
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      localStorage.removeItem('agent_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setStatus: async (status) => {
    try {
      await api.updateAgentStatus(status);
      const user = get().user;
      if (user) {
        set({ user: { ...user, status } });
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  }
}));
