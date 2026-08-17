import React, { useState } from 'react';
import { User, Phone, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

interface GetIdModalProps {
  isOpen: boolean;
  onSubmit: (name: string, phone: string) => Promise<void>;
  initialName?: string;
  initialPhone?: string;
}

export const GetIdModal: React.FC<GetIdModalProps> = ({
  isOpen,
  onSubmit,
  initialName = '',
  initialPhone = ''
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError('Please enter your name');
      return;
    }

    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 8) {
      setError('Please enter a valid WhatsApp number');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(cleanName, cleanPhone);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1f2c33] rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-r from-[#075e54] to-[#128c7e] dark:from-[#1f2c33] dark:to-[#0b141a] px-6 pt-6 pb-5 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#25D366] to-[#128c7e] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-900/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Get Your ID Now
          </h2>
          <p className="text-xs text-emerald-100/90 dark:text-emerald-200/80 mt-1 leading-relaxed max-w-xs mx-auto">
            Fill your details below to get instant new ID with <span className="font-bold text-amber-300">5% First Deposit Bonus</span>.
          </p>

          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full text-white backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> 100% Safe & Verified
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full text-white backdrop-blur-xs">
              ⚡ 24x7 Instant Support
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs rounded-xl font-medium text-center animate-shake">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-[#111b21] dark:text-[#e9edef] mb-1.5 uppercase tracking-wider">
              Your Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8696a0]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name (e.g. Rahul Sharma)"
                className="w-full bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm rounded-2xl pl-10 pr-4 py-3 outline-none border border-black/[0.05] dark:border-white/[0.08] focus:border-[#00a884] transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-xs font-bold text-[#111b21] dark:text-[#e9edef] mb-1.5 uppercase tracking-wider">
              WhatsApp / Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8696a0]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit WhatsApp number"
                className="w-full bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-sm rounded-2xl pl-10 pr-4 py-3 outline-none border border-black/[0.05] dark:border-white/[0.08] focus:border-[#00a884] transition-all font-mono"
              />
            </div>
          </div>

          {/* Action Button: Get ID Now (NO SKIP) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#00a884] hover:from-[#1da851] hover:to-[#008f70] active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing ID...</span>
                </div>
              ) : (
                <>
                  <span>🔥 Get ID Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-[#8696a0] mt-1">
            🔒 By clicking, you will be connected with our official support team.
          </p>
        </form>
      </div>
    </div>
  );
};
