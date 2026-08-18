import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MessageSquare, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, isAuthenticated, checkAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    checkAuth();
  }, []);

  React.useEffect(() => {
    if (isAuthenticated || (typeof window !== 'undefined' && localStorage.getItem('agent_token'))) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a] p-4 relative overflow-hidden transition-colors duration-300">
      {/* Ambient WhatsApp Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00a884]/15 dark:bg-[#00a884]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#005c4b]/20 dark:bg-[#005c4b]/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-[420px] bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-2xl rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.7)] p-8 border border-black/[0.08] dark:border-white/[0.1] relative transition-all duration-300">
        
        {/* macOS Window Controls & Theme Toggle Header */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 dark:border-white/10" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 dark:border-white/10" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 dark:border-white/10" />
          </div>
          <ThemeToggle />
        </div>

        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-[#00a884] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00a884]/30 ring-1 ring-white/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111b21] dark:text-[#e9edef]">
            Admin Portal
          </h1>
          <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1 font-medium">
            Authorized Personnel Only
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl text-center font-medium flex items-center justify-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#111b21] dark:text-[#8696a0] mb-1.5 ml-1">
              Admin Email / Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/[0.06] dark:border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:bg-white dark:focus:bg-[#202c33] focus:ring-4 focus:ring-[#00a884]/15 outline-none transition-all"
                placeholder="Enter admin email"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111b21] dark:text-[#8696a0] mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/[0.06] dark:border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:bg-white dark:focus:bg-[#202c33] focus:ring-4 focus:ring-[#00a884]/15 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-[#00a884] hover:bg-[#008f70] text-white py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] shadow-md shadow-[#00a884]/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Security Badge */}
        <div className="mt-7 flex items-center justify-center gap-1.5 text-[11px] text-[#86868b]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
          <span>Encrypted Admin Access</span>
        </div>
      </div>
    </div>
  );
};
