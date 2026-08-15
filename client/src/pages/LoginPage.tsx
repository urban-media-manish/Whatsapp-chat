import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { MessageSquare, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a] p-4 relative overflow-hidden transition-colors duration-300">
      {/* Ambient WhatsApp Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00a884]/15 dark:bg-[#00a884]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#005c4b]/20 dark:bg-[#005c4b]/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-[440px] bg-white/90 dark:bg-[#202c33]/90 backdrop-blur-2xl rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.7)] p-8 border border-black/[0.08] dark:border-white/[0.1] relative transition-all duration-300">
        
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
            Workspace Portal
          </h1>
          <p className="text-[13px] text-[#667781] dark:text-[#8696a0] mt-1 font-medium">
            WhatsApp Web Enterprise Support Console
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
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/[0.06] dark:border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:bg-white dark:focus:bg-[#202c33] focus:ring-4 focus:ring-[#00a884]/15 outline-none transition-all"
                placeholder="name@company.com"
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
            className="w-full mt-2 bg-[#00a884] hover:bg-[#008f70] text-white py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] shadow-md shadow-[#00a884]/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                Sign In to Workspace
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Login Pills */}
        <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center justify-center gap-1.5 mb-3 text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#00a884]" />
            <span>Quick Demo Accounts</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@support.com', 'admin123')}
              className="group p-2.5 bg-[#f0f2f5] hover:bg-[#e9edef] dark:bg-[#2a3942] dark:hover:bg-[#32434d] rounded-xl border border-black/[0.04] dark:border-white/[0.06] text-left transition-all active:scale-[0.97]"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00a884]/20 text-[#00a884] flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111b21] dark:text-[#e9edef] group-hover:text-[#00a884] transition-colors">Admin</p>
                  <p className="text-[10px] text-[#86868b]">Full Privileges</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('agent@support.com', 'agent123')}
              className="group p-2.5 bg-[#f0f2f5] hover:bg-[#e9edef] dark:bg-[#2a3942] dark:hover:bg-[#32434d] rounded-xl border border-black/[0.04] dark:border-white/[0.06] text-left transition-all active:scale-[0.97]"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold">
                  S
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111b21] dark:text-[#e9edef] group-hover:text-[#00a884] transition-colors">Support Desk</p>
                  <p className="text-[10px] text-[#86868b]">Live Desk</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#86868b]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
          <span>End-to-End Encrypted • WhatsApp Live Platform</span>
        </div>
      </div>
    </div>
  );
};
