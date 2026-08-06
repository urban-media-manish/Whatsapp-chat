import React, { useState } from 'react';
import { Check, CheckCheck, Reply, Smile, Edit3, Trash2 } from 'lucide-react';
import type { Message } from '../../types';
import { MediaPreviewer } from './MediaPreviewer';
import { api } from '../../services/api';
import { useChatStore } from '../../store/useChatStore';

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string;
  isAgentView?: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentUserId, isAgentView }) => {
  const { setReplyToMessage } = useChatStore();
  const [showReactors, setShowReactors] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isSystem = message.senderType === 'system';
  const isSentByMe = isAgentView
    ? message.senderType === 'agent'
    : (message.senderType === 'customer' || message.senderId === currentUserId);

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleReact = async (emoji: string) => {
    try {
      setShowReactors(false);
      await api.reactMessage(message._id, emoji, currentUserId || 'user', isAgentView ? 'Support Agent' : 'Customer');
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this message?')) {
      try {
        await api.deleteMessage(message._id);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await api.editMessage(message._id, editContent);
      setIsEditing(false);
    } catch (err) {
      console.error('Edit error:', err);
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-[11px] font-medium px-4 py-1.5 rounded-xl text-center shadow-sm max-w-md">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-2 ${isSentByMe ? 'justify-end' : 'justify-start'} group`}>

      {/* ── Action buttons LEFT of bubble (for sent/my messages) ── */}
      {isSentByMe && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1.5 self-end mb-1 flex-shrink-0">
          <button onClick={() => setReplyToMessage(message)} title="Reply"
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowReactors(!showReactors)} title="React"
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Smile className="w-3.5 h-3.5" />
          </button>
          {!message.isDeleted && (
            <>
              <button onClick={() => setIsEditing(true)} title="Edit"
                className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} title="Delete"
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Bubble ── */}
      <div
        style={{ maxWidth: '65%', minWidth: 0 }}
        className={`relative rounded-2xl px-3.5 py-2 shadow-sm break-words ${
          isSentByMe
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-gray-100 rounded-tr-none'
            : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-tl-none border border-black/5 dark:border-white/5'
        }`}
      >
        {/* Sender Label */}
        {!isSentByMe && (
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
            {message.senderName || 'Support Agent'}
          </p>
        )}

        {/* Quoted Reply Snippet */}
        {message.replyToSnippet && (
          <div className="mb-1.5 p-2 rounded-lg bg-black/5 dark:bg-black/20 border-l-4 border-emerald-500 text-xs">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-[10px]">
              {message.replyToSnippet.senderName}
            </p>
            <p className="truncate text-gray-600 dark:text-gray-300 text-[11px]">
              {message.replyToSnippet.content}
            </p>
          </div>
        )}

        {/* Media Preview */}
        {message.type !== 'text' && (
          <MediaPreviewer
            type={message.type}
            fileUrl={message.fileUrl}
            fileName={message.fileName}
            fileSize={message.fileSize}
          />
        )}

        {/* Message Content or Edit Mode */}
        {isEditing ? (
          <div className="mt-1">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white dark:bg-black/30 border border-emerald-500 rounded px-2 py-1 text-xs outline-none"
            />
            <div className="flex gap-2 mt-1 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-[10px] text-gray-500 hover:underline">Cancel</button>
              <button onClick={handleSaveEdit} className="text-[10px] text-emerald-600 font-bold hover:underline">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed" style={{ overflowWrap: 'anywhere' }}>
            {message.content}
            {message.isEdited && <span className="text-[9px] text-gray-400 ml-1 italic">(edited)</span>}
          </p>
        )}

        {/* Timestamp & Status Ticks */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span>{formattedTime}</span>
          {isSentByMe && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-gray-400 inline" />
              ) : (
                <Check className="w-3.5 h-3.5 text-gray-400 inline" />
              )}
            </span>
          )}
        </div>

        {/* Emoji Reactions Pill */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`absolute -bottom-3.5 ${isSentByMe ? 'right-2' : 'left-2'} flex gap-0.5 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-gray-700/80 rounded-full px-2 py-0.5 shadow-md text-[11px]`}>
            {message.reactions.map((r, idx) => (
              <span key={idx} title={r.byName}>{r.emoji}</span>
            ))}
          </div>
        )}

        {/* Quick Reaction Bar */}
        {showReactors && (
          <div className={`absolute top-8 ${isSentByMe ? 'right-0' : 'left-0'} z-30 flex gap-1 bg-white dark:bg-[#202c33] p-1.5 rounded-full shadow-xl border border-gray-200 dark:border-gray-700`}>
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => handleReact(emoji)}
                className="hover:scale-125 transition-transform p-1 text-base">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Action buttons RIGHT of bubble (for received messages) ── */}
      {!isSentByMe && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 self-end mb-1 flex-shrink-0">
          <button onClick={() => setReplyToMessage(message)} title="Reply"
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowReactors(!showReactors)} title="React"
            className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Smile className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
};
