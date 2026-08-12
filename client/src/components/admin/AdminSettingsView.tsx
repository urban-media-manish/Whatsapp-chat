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
      setToastMessage('Settings saved successfully!');
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
      <div className="flex-1 flex items-center justify-center bg-[#111b21] text-gray-400">
        <div className="animate-spin w-8 h-8 border-4 border-[#00a884] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0b141a] p-4 sm:p-6 overflow-y-auto space-y-6 text-gray-100">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#00a884]" /> Workspace & Support Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">Configure global automation behaviors, welcome greetings, and integrations</p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="max-w-2xl bg-[#202c33] p-5 sm:p-6 rounded-2xl border border-gray-800 shadow-xl space-y-5">
        
        {/* Dynamic Welcome Message Section */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-200">
            Auto-Welcome Message Template
          </label>
          <p className="text-xs text-gray-400 leading-relaxed">
            This message will be sent automatically as the first system greeting to the customer as soon as they initialize their session (adds name & phone number).
          </p>

          <div className="relative mt-2">
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={5}
              placeholder="Write your welcome message here..."
              className="w-full bg-[#111b21] border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-gray-200 outline-none focus:border-[#00a884] transition-colors resize-none placeholder-gray-600"
            />
          </div>
        </div>

        {/* Tip Box explaining Placeholders */}
        <div className="bg-[#111b21] p-4 rounded-xl border border-gray-800 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300 space-y-1">
            <p className="font-bold text-gray-200">Tip: Use dynamic placeholders!</p>
            <p className="leading-relaxed">
              Use <code className="text-[#00a884] bg-[#00a884]/10 px-1.5 py-0.5 rounded font-mono font-bold">{'{name}'}</code> inside the template. The backend will automatically replace it with the customer's full name.
            </p>
            <p className="text-gray-400 italic mt-1 font-mono">
              Example: "Hello {'{name}'}! Welcome to support. An agent will join you soon."
            </p>
          </div>
        </div>

        {/* Alert/Feedback Banners */}
        {toastMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#00a884] hover:bg-[#008f70] disabled:bg-[#00a884]/50 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
          >
            {isSaving ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
