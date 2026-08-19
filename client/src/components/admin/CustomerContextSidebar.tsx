import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import type { Note } from '../../types';
import { Tag, Plus, StickyNote, Sparkles, X, Trash2, Eraser, AlertTriangle } from 'lucide-react';

interface CustomerContextSidebarProps {
  onClose?: () => void;
}

export const CustomerContextSidebar: React.FC<CustomerContextSidebarProps> = ({ onClose }) => {
  const { activeConversation, fetchConversations } = useChatStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  useEffect(() => {
    if (activeConversation) {
      loadNotes();
      analyzeSentiment();
    }
  }, [activeConversation?._id]);

  const loadNotes = async () => {
    if (!activeConversation) return;
    try {
      const data = await api.getNotes(activeConversation._id);
      setNotes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const analyzeSentiment = async () => {
    if (!activeConversation) return;
    try {
      await api.analyzeSentiment(activeConversation._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeConversation) return;
    try {
      const created = await api.addNote(activeConversation._id, newNote);
      setNotes([created, ...notes]);
      setNewNote('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim() || !activeConversation) return;
    try {
      await api.addTag(activeConversation._id, newTag);
      setNewTag('');
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!activeConversation) return;
    try {
      await api.removeTag(activeConversation._id, tag);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeConversation) return;
    setIsSummarizing(true);
    try {
      const res = await api.summarizeChat(activeConversation._id);
      setSummaryText(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!activeConversation) return null;

  const customer = activeConversation.customer;

  return (
    <div className="w-full md:w-80 absolute md:relative right-0 top-0 bottom-0 z-30 h-full bg-white dark:bg-[#111b21] border-l border-[#e9edef] dark:border-[#222d34] overflow-y-auto flex flex-col text-[#111b21] dark:text-[#e9edef] flex-shrink-0 shadow-2xl md:shadow-none transition-colors duration-300">

      {/* Customer Header with Close Button */}
      <div className="flex flex-col items-center text-center p-5 border-b border-[#e9edef] dark:border-[#222d34] relative bg-[#f0f2f5] dark:bg-[#202c33]">
        <button
          onClick={onClose}
          title="Close Inspector"
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#8696a0] hover:text-[#111b21] dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md mb-2.5 border-2 border-[#00a884]"
          style={{ background: `hsl(${(customer?.name?.charCodeAt(0) || 65) * 11 % 360}, 50%, 42%)` }}
        >
          {customer?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <h2 className="text-base font-bold tracking-tight text-[#111b21] dark:text-[#e9edef]">{customer?.name || 'Customer'}</h2>
        <p className="text-xs text-[#8696a0] font-mono mt-0.5">{customer?.phone}</p>
        <span className="text-[10px] font-semibold text-[#00a884] bg-[#00a884]/15 px-2.5 py-0.5 rounded-full mt-2">
          {customer?.isGuest ? 'Guest Session' : 'WhatsApp Verified'}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">

        {/* AI Sentiment & Intent Card */}
        <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Intelligence Insights
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8696a0]">Mood:</span>
            <span className={`font-semibold capitalize px-2 py-0.5 rounded-md text-[11px] ${
              activeConversation.sentiment === 'frustrated' || activeConversation.sentiment === 'urgent'
                ? 'bg-red-500/15 text-red-500'
                : activeConversation.sentiment === 'positive'
                ? 'bg-emerald-500/15 text-emerald-500'
                : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#8696a0]'
            }`}>
              {activeConversation.sentiment || 'neutral'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8696a0]">Intent:</span>
            <span className="font-semibold text-[#00a884] text-[11px]">{activeConversation.intent || 'Customer Inquiry'}</span>
          </div>
        </div>

        {/* AI Ticket Summarizer Widget */}
        <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-3.5 rounded-2xl border border-black/[0.04] dark:border-white/[0.06] flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#00a884] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Ticket Summary
            </span>
            <button
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              className="text-[10px] bg-[#00a884]/15 hover:bg-[#00a884]/25 text-[#00a884] px-2.5 py-1 rounded-lg font-semibold transition-all"
            >
              {isSummarizing ? 'Generating...' : 'Summarize'}
            </button>
          </div>
          {(summaryText || activeConversation.summary) && (
            <p className="text-xs text-[#111b21] dark:text-[#e9edef] bg-white dark:bg-[#111b21] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06] whitespace-pre-wrap leading-relaxed">
              {summaryText || activeConversation.summary}
            </p>
          )}
        </div>

        {/* Tags / Labels */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#8696a0] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#00a884]" /> Tags & Labels
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {(activeConversation.tags || []).map((t) => (
              <span key={t} className="bg-[#00a884]/15 text-[#00a884] text-[11px] font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 border border-[#00a884]/25">
                {t}
                <button onClick={() => handleRemoveTag(t)} className="text-[#8696a0] hover:text-red-500">✕</button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddTag} className="flex gap-1.5">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag (e.g. VIP, Priority)..."
              className="flex-1 bg-[#f0f2f5] dark:bg-[#202c33] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[#111b21] dark:text-[#e9edef] rounded-xl px-3 py-1.5 outline-none focus:border-[#00a884]"
            />
            <button type="submit" className="px-2.5 bg-[#00a884] hover:bg-[#008f70] text-white rounded-xl text-xs font-semibold shadow-xs">
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Private Notes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#8696a0] uppercase tracking-wider flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-amber-500" /> Private Notes
            </span>
          </div>

          <form onSubmit={handleAddNote} className="mb-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add an internal note visible only to staff..."
              rows={2}
              className="w-full bg-[#f0f2f5] dark:bg-[#202c33] border border-black/[0.06] dark:border-white/[0.08] text-xs text-[#111b21] dark:text-[#e9edef] rounded-xl p-2.5 outline-none focus:border-[#00a884] resize-none mb-1.5"
            />
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="w-full bg-[#00a884]/15 text-[#00a884] hover:bg-[#00a884]/25 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
            >
              + Save Private Note
            </button>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notes.map((n) => (
              <div key={n._id} className="bg-[#f0f2f5] dark:bg-[#202c33] p-2.5 rounded-xl border border-black/[0.04] dark:border-white/[0.06]">
                <div className="flex justify-between items-center text-[10px] text-[#00a884] font-semibold mb-1">
                  <span>{n.agentName}</span>
                  <span className="text-[#8696a0]">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone Actions */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.08] pt-4 mt-2">
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Danger Actions
          </span>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Clear all messages history with ${activeConversation.customer?.name || 'this customer'}?`)) {
                  useChatStore.getState().clearChat(activeConversation._id);
                }
              }}
              className="w-full py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5" /> Clear Messages History
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete entire chat with ${activeConversation.customer?.name || 'this customer'}? This action cannot be undone.`)) {
                  useChatStore.getState().deleteConversation(activeConversation._id);
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-sm shadow-red-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Entire Conversation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
