import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Settings, Save, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';

export const AdminSettingsView: React.FC = () => {
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      setWelcomeMessage(res.welcomeMessage || '');
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load settings from server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setToastMessage(null);
    try {
      await api.saveSettings(welcomeMessage);
      setToastMessage('Settings updated successfully!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f5f5f7] dark:bg-[#000000] text-[#86868b]">
        <div className="animate-spin w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#f5f5f7] dark:bg-[#000000] p-6 lg:p-8 overflow-y-auto space-y-6 text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#0071e3] dark:text-[#0a84ff]" /> Workspace Configuration
        </h1>
        <p className="text-xs text-[#86868b] mt-1 font-medium">Configure global automation behaviors, greeting templates, and system policies</p>
      </div>

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="max-w-2xl bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl p-6 rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs space-y-5">
        
        {/* Dynamic Welcome Message Section */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Auto-Greeting Template
          </label>
          <p className="text-xs text-[#86868b] leading-relaxed">
            Sent automatically to new customer sessions as soon as they provide their name and phone number.
          </p>

          <div className="relative mt-2">
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={4}
              placeholder="Write your welcome greeting here..."
              className="w-full bg-[#f5f5f7] dark:bg-[#2c2c2e] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-[#1d1d1f] dark:text-[#f5f5f7] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-blue-500/15 transition-all resize-none placeholder-[#86868b]"
            />
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] p-4 rounded-xl border border-black/[0.04] dark:border-white/[0.06] flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-[#1d1d1f] dark:text-[#f5f5f7] space-y-1">
            <p className="font-bold">Dynamic Name Replacement</p>
            <p className="text-[#86868b] leading-relaxed">
              Use <code className="text-[#0071e3] dark:text-[#0a84ff] bg-blue-500/10 px-1.5 py-0.5 rounded font-mono font-bold">{'{name}'}</code> in your template. The system will automatically substitute the customer's full name.
            </p>
          </div>
        </div>

        {/* Feedback Banners */}
        {toastMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#0071e3] hover:bg-[#0077ed] dark:bg-[#0a84ff] text-white font-semibold text-sm px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Apply Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
