import React, { useState } from 'react';
import { User, Phone, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { trackPixelLead } from '../../utils/pixel';

interface GetIdModalProps {
  isOpen: boolean;
  onSubmit: (name: string, phone: string) => Promise<void>;
  onClose?: () => void;
  initialName?: string;
  initialPhone?: string;
}

export const GetIdModal: React.FC<GetIdModalProps> = ({
  isOpen,
  onSubmit,
  onClose,
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

    // Fire Meta Pixel Lead Event
    trackPixelLead({ name: cleanName, phone: cleanPhone });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer" 
      />

      {/* Modal Card - Compact & Reduced Height */}
      <div className="relative w-full max-w-[360px] bg-white dark:bg-[#1f2c33] rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Compact Header (Logo Removed) */}
        <div className="bg-gradient-to-r from-[#075e54] to-[#128c7e] dark:from-[#1f2c33] dark:to-[#0b141a] px-4 pt-4 pb-3 text-white text-center relative">
          <h2 className="text-base font-bold tracking-tight text-white flex items-center justify-center gap-1">
            Get Your ID Now
          </h2>
          <p className="text-[11px] text-emerald-100/90 dark:text-emerald-200/80 mt-0.5 leading-snug">
            Get instant new ID with <span className="font-bold text-amber-300">5% First Deposit Bonus</span>
          </p>

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/15 px-2 py-0.5 rounded-full text-white backdrop-blur-xs">
              <ShieldCheck className="w-3 h-3 text-emerald-300" /> 100% Safe
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/15 px-2 py-0.5 rounded-full text-white backdrop-blur-xs">
              ⚡ 24x7 Support
            </span>
          </div>
        </div>

        {/* Compact Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs rounded-xl font-medium text-center animate-shake">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-[11px] font-bold text-[#111b21] dark:text-[#e9edef] mb-1 uppercase tracking-wider">
              Your Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8696a0]">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name (e.g. Rahul Sharma)"
                className="w-full bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-xs sm:text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none border border-black/[0.05] dark:border-white/[0.08] focus:border-[#00a884] transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-[11px] font-bold text-[#111b21] dark:text-[#e9edef] mb-1 uppercase tracking-wider">
              WhatsApp / Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8696a0]">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit WhatsApp number"
                className="w-full bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-xs sm:text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none border border-black/[0.05] dark:border-white/[0.08] focus:border-[#00a884] transition-all font-mono"
              />
            </div>
          </div>

          {/* Action Button: Get ID Now */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#25D366] to-[#00a884] hover:from-[#1da851] hover:to-[#008f70] active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing ID...</span>
                </div>
              ) : (
                <>
                  <span>🔥 Get ID Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-center text-[#8696a0]">
            🔒 Official & Instant WhatsApp Support
          </p>
        </form>
      </div>
    </div>
  );
};
