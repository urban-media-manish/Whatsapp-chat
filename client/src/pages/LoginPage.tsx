import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MessageSquare, Lock, Mail, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('admin@support.com');
  const [password, setPassword] = useState('admin123');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickLogin = async (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    try {
      await login(e, p);
      navigate('/admin');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#202c33] rounded-3xl shadow-2xl p-8 border border-white/10 backdrop-blur-xl relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#00a884] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#00a884]/30">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin & Support Portal</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enterprise WhatsApp Web & Intercom Dashboard</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-[#2a3942] border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#00a884] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-[#2a3942] border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-[#00a884] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#00a884] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#008f70] transition-transform active:scale-[0.98] shadow-lg shadow-[#00a884]/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : <>Login to Workspace <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {/* Demo Quick Login Pills */}
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <span className="block text-[11px] font-semibold text-gray-400 text-center uppercase tracking-wider mb-2">
            Click Quick Demo Login:
          </span>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@support.com', 'admin123')}
              className="text-[11px] bg-emerald-500/10 text-emerald-500 font-semibold px-2.5 py-1 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-transform"
            >
              👑 Admin (admin@support.com)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('agent@support.com', 'agent123')}
              className="text-[11px] bg-sky-500/10 text-sky-500 font-semibold px-2.5 py-1 rounded-lg border border-sky-500/20 hover:bg-sky-500/20 active:scale-95 transition-transform"
            >
              🎧 Agent (agent@support.com)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager@support.com', 'manager123')}
              className="text-[11px] bg-purple-500/10 text-purple-500 font-semibold px-2.5 py-1 rounded-lg border border-purple-500/20 hover:bg-purple-500/20 active:scale-95 transition-transform"
            >
              💼 Manager (manager@support.com)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
