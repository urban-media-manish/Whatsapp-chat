import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { api } from '../../services/api';
import type { Note } from '../../types';
import { Tag, Plus, StickyNote, Sparkles, X } from 'lucide-react';

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
    <div className="w-80 h-full bg-[#111b21] border-l border-[#222d34] overflow-y-auto flex flex-col gap-0 text-gray-200 flex-shrink-0">

      {/* Customer Header with Close Button */}
      <div className="flex flex-col items-center text-center p-4 pb-4 border-b border-[#222d34] relative">

        {/* Close Button */}
        <button
          onClick={onClose}
          title="Close panel"
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Initials Avatar (no more cartoon!) */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2 border-emerald-500 mb-2 shadow-lg"
          style={{ background: `hsl(${(customer?.name?.charCodeAt(0) || 65) * 7 % 360}, 60%, 40%)` }}>
          {customer?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <h2 className="text-base font-bold text-gray-100">{customer?.name || 'Customer'}</h2>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{customer?.phone}</p>
        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-2">
          {customer?.isGuest ? 'Guest Session' : 'Registered Customer'}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4">

      {/* AI Sentiment & Intent Gauge */}
      <div className="bg-[#202c33] p-3 rounded-2xl border border-gray-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Sentiment & Intent
          </span>
        </div>
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-gray-400">Customer Mood:</span>
          <span className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
            activeConversation.sentiment === 'frustrated' || activeConversation.sentiment === 'urgent'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : activeConversation.sentiment === 'positive'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-gray-700/40 text-gray-300'
          }`}>
            {activeConversation.sentiment}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Detected Intent:</span>
          <span className="font-semibold text-emerald-400 text-[11px]">{activeConversation.intent}</span>
        </div>
      </div>

      {/* AI Ticket Summarizer Widget */}
      <div className="bg-[#202c33] p-3 rounded-2xl border border-gray-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Ticket Summary
          </span>
          <button
            onClick={handleGenerateSummary}
            disabled={isSummarizing}
            className="text-[10px] bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-2 py-1 rounded-lg font-semibold"
          >
            {isSummarizing ? 'Generating...' : 'Summarize'}
          </button>
        </div>
        {(summaryText || activeConversation.summary) && (
          <p className="text-xs text-gray-300 bg-[#111b21] p-2.5 rounded-xl border border-gray-700 whitespace-pre-wrap leading-relaxed">
            {summaryText || activeConversation.summary}
          </p>
        )}
      </div>

      {/* Tags / Labels */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-[#00a884]" /> Tags & Labels
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {(activeConversation.tags || []).map((t) => (
            <span key={t} className="bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-500/30">
              {t}
              <button onClick={() => handleRemoveTag(t)} className="text-gray-400 hover:text-white">✕</button>
            </span>
          ))}
        </div>

        <form onSubmit={handleAddTag} className="flex gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag (e.g. VIP, Billing)..."
            className="flex-1 bg-[#202c33] border border-gray-700 text-xs text-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#00a884]"
          />
          <button type="submit" className="p-1.5 bg-[#00a884] text-white rounded-lg text-xs font-bold hover:bg-[#008f70]">
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Internal Agent Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
            <StickyNote className="w-3.5 h-3.5 text-amber-400" /> Private Agent Notes
          </span>
        </div>

        <form onSubmit={handleAddNote} className="mb-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a private note visible only to support staff..."
            rows={2}
            className="w-full bg-[#202c33] border border-gray-700 text-xs text-gray-200 rounded-xl p-2.5 outline-none focus:border-amber-400 resize-none mb-1"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="w-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            + Save Private Note
          </button>
        </form>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map((n) => (
            <div key={n._id} className="bg-[#202c33] p-2.5 rounded-xl border border-gray-800">
              <div className="flex justify-between items-center text-[10px] text-amber-400 font-semibold mb-1">
                <span>{n.agentName}</span>
                <span className="text-gray-500">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{n.content}</p>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};
