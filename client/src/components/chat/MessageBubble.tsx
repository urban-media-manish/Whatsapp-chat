import React, { useState } from 'react';
import { Check, CheckCheck, Reply, Smile, Edit3, Trash2, Copy, Download, Share2 } from 'lucide-react';
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

const renderFormattedText = (content: string) => {
  if (!content) return null;

  // Regex to match URLs like http://, https://, www., or domain.tld (e.g. reallotus365.ink)
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,6}(?:\/[^\s]*)?)/gi;
  const parts = content.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      let href = part;
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        href = 'https://' + href;
      }
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#027eb5] dark:text-[#53bdeb] font-semibold underline hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentUserId, isAgentView }) => {
  const { setReplyToMessage } = useChatStore();
  const [showReactors, setShowReactors] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1500);
    }
  };

  const handleDownloadFile = () => {
    if (!message.fileUrl) return;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const fullSrc = message.fileUrl.startsWith('http') || message.fileUrl.startsWith('data:') || message.fileUrl.startsWith('blob:')
      ? message.fileUrl
      : `${baseUrl}${message.fileUrl.startsWith('/') ? '' : '/'}${message.fileUrl}`;

    const a = document.createElement('a');
    a.href = fullSrc;
    a.download = message.fileName || 'downloaded_media';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleForwardMessage = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 1500);
    }
  };

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
        <div className="bg-[#ffeecd] dark:bg-[#182229] text-[#111b21] dark:text-[#e9edef] border border-amber-300/40 dark:border-gray-700/60 text-xs font-semibold px-4 py-2 rounded-xl text-center shadow-sm max-w-md leading-relaxed select-text">
          {message.content}
        </div>
      </div>
    );
  }

  const senderInitial = message.senderName ? message.senderName.charAt(0).toUpperCase() : (isSentByMe ? 'U' : 'A');

  return (
    <div className={`flex w-full mb-3.5 ${isSentByMe ? 'justify-end' : 'justify-start'} group items-start`}>

      {/* Received Avatar (Left side of bubble) */}
      {!isSentByMe && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 mr-2 mt-0.5 shadow-sm">
          {senderInitial}
        </div>
      )}

      {/* ── Action buttons LEFT of bubble (for sent/my messages) ── */}
      {isSentByMe && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1.5 self-end mb-1 flex-shrink-0 bg-white/90 dark:bg-[#111b21]/90 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-gray-200/60 dark:border-gray-700/60">
          <button onClick={() => setReplyToMessage(message)} title="Reply"
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowReactors(!showReactors)} title="React"
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Smile className="w-3.5 h-3.5" />
          </button>
          {message.content && (
            <button onClick={handleCopyText} title="Copy Text"
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {message.fileUrl && (
            <button onClick={handleDownloadFile} title="Save / Download Media"
              className="p-1 hover:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleForwardMessage} title="Forward"
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {!message.isDeleted && (
            <>
              <button onClick={() => setIsEditing(true)} title="Edit"
                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} title="Delete"
                className="p-1 hover:bg-red-500/10 rounded-lg text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Bubble ── */}
      <div
        style={{ maxWidth: '70%', minWidth: '120px' }}
        className={`relative rounded-2xl px-3.5 py-2 shadow-xs break-words ${
          isSentByMe
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-gray-100 rounded-tr-none'
            : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-tl-none border border-black/5 dark:border-white/5'
        }`}
      >
        {/* Toast Copied Notification */}
        {showCopiedToast && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg z-40 animate-in fade-in zoom-in-90 duration-150 whitespace-nowrap">
            Copied to clipboard! ✓
          </div>
        )}

        {/* Quick Reactions Floating Popover */}
        {showReactors && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-[#202c33] px-2.5 py-1.5 rounded-full shadow-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 animate-in fade-in zoom-in-90 duration-150">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-base hover:scale-130 transition-transform p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Sender Name Label */}
        {!isSentByMe && (
          <p className="text-[11px] font-bold text-[#00a884] dark:text-[#00a884] mb-1">
            {message.senderName || 'Support Agent'}
          </p>
        )}

        {/* Quoted Reply Snippet */}
        {message.replyToSnippet && (
          <div className="mb-1.5 p-2 rounded-lg bg-black/5 dark:bg-black/20 border-l-4 border-[#00a884] text-xs">
            <p className="font-semibold text-[#00a884] text-[10px]">
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
              className="w-full bg-white dark:bg-black/30 border border-[#00a884] rounded px-2 py-1 text-xs outline-none"
            />
            <div className="flex gap-2 mt-1 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-[10px] text-gray-500 hover:underline">Cancel</button>
              <button onClick={handleSaveEdit} className="text-[10px] text-[#00a884] font-bold hover:underline">Save</button>
            </div>
          </div>
        ) : (
          !(message.type !== 'text' && (message.content.startsWith('[Attached ') || message.content === '[Voice Note]' || message.content === '')) && (
            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text mt-1" style={{ overflowWrap: 'anywhere' }}>
              {renderFormattedText(message.content)}
              {message.isEdited && <span className="text-[9px] text-gray-400 ml-1 italic">(edited)</span>}
            </p>
          )
        )}

        {/* Timestamp & Status Ticks */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781] dark:text-[#8696a0]">
          <span>{formattedTime}</span>
          {isSentByMe && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] inline" />
              ) : (
                <Check className="w-3.5 h-3.5 text-[#8696a0] inline" />
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
      </div>

      {/* ── Action buttons RIGHT of bubble (for received messages) ── */}
      {!isSentByMe && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 self-end mb-1 flex-shrink-0 bg-white/90 dark:bg-[#111b21]/90 backdrop-blur-xs p-1 rounded-xl shadow-xs border border-gray-200/60 dark:border-gray-700/60">
          <button onClick={() => setReplyToMessage(message)} title="Reply"
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowReactors(!showReactors)} title="React"
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Smile className="w-3.5 h-3.5" />
          </button>
          {message.content && (
            <button onClick={handleCopyText} title="Copy Text"
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {message.fileUrl && (
            <button onClick={handleDownloadFile} title="Save / Download Media"
              className="p-1 hover:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleForwardMessage} title="Forward"
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400">
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sent Avatar (Right side of bubble) */}
      {isSentByMe && (
        <div className="w-8 h-8 rounded-full bg-[#00a884] text-white font-bold flex items-center justify-center text-xs flex-shrink-0 ml-2 mt-0.5 shadow-sm">
          {senderInitial}
        </div>
      )}

    </div>
  );
};
