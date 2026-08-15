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

const renderFormattedText = (content: string, isSentByMe: boolean) => {
  if (!content) return null;

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
          className={`${
            isSentByMe
              ? 'text-white underline decoration-white/60 hover:decoration-white'
              : 'text-[#0071e3] dark:text-[#409cff] underline decoration-blue-400/50 hover:decoration-blue-500'
          } font-semibold break-all`}
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
        <div className="bg-black/[0.04] dark:bg-white/[0.08] text-[#6e6e73] dark:text-[#a1a1a6] border border-black/[0.04] dark:border-white/[0.06] text-[11px] font-medium px-3.5 py-1.5 rounded-full text-center max-w-md backdrop-blur-md select-text">
          {message.content}
        </div>
      </div>
    );
  }

  const senderInitial = message.senderName ? message.senderName.charAt(0).toUpperCase() : (isSentByMe ? 'U' : 'A');

  return (
    <div className={`flex w-full mb-3 ${isSentByMe ? 'justify-end' : 'justify-start'} group items-end`}>

      {/* Received Avatar (Left side) */}
      {!isSentByMe && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#409cff] text-white font-semibold flex items-center justify-center text-[11px] flex-shrink-0 mr-2 mb-0.5 shadow-sm">
          {senderInitial}
        </div>
      )}

      {/* ── Action Buttons for Sent (Left of Bubble) ── */}
      {isSentByMe && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all mr-1.5 mb-1 flex-shrink-0 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl p-1 rounded-xl shadow-md border border-black/[0.06] dark:border-white/[0.1]">
          <button onClick={() => setReplyToMessage(message)} title="Reply"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowReactors(!showReactors)} title="React"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
            <Smile className="w-3.5 h-3.5" />
          </button>
          {message.content && (
            <button onClick={handleCopyText} title="Copy Text"
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {message.fileUrl && (
            <button onClick={handleDownloadFile} title="Save / Download Media"
              className="p-1 hover:bg-blue-500/10 rounded-lg text-blue-500">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleForwardMessage} title="Forward"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          {!message.isDeleted && (
            <>
              <button onClick={() => setIsEditing(true)} title="Edit"
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDelete} title="Delete"
                className="p-1 hover:bg-red-500/10 rounded-lg text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ── iMessage Style Bubble ── */}
      <div
        style={{ maxWidth: '72%', minWidth: '120px' }}
        className={`relative px-4 py-2.5 shadow-sm break-words transition-all duration-200 ${
          isSentByMe
            ? 'bg-[#0071e3] dark:bg-[#0a84ff] text-white rounded-[20px] rounded-br-[6px]'
            : 'bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7] rounded-[20px] rounded-bl-[6px] border border-black/[0.06] dark:border-white/[0.08]'
        }`}
      >
        {/* Toast Copied Notification */}
        {showCopiedToast && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 dark:bg-white/90 text-white dark:text-black text-[10px] font-semibold px-3 py-1 rounded-full shadow-lg z-40 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
            Copied to clipboard ✓
          </div>
        )}

        {/* Apple Tapbacks Quick Reactions Popover */}
        {showReactors && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-30 bg-white/90 dark:bg-[#2c2c2e]/90 backdrop-blur-2xl px-3 py-1.5 rounded-full shadow-xl border border-black/[0.06] dark:border-white/[0.1] flex items-center gap-2 animate-in fade-in zoom-in-90 duration-150">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-base hover:scale-125 transition-transform p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Sender Name Label */}
        {!isSentByMe && (
          <p className="text-[11px] font-semibold text-[#0071e3] dark:text-[#409cff] mb-1">
            {message.senderName || 'Support Agent'}
          </p>
        )}

        {/* Quoted Reply Snippet */}
        {message.replyToSnippet && (
          <div className={`mb-2 p-2 rounded-xl text-xs border-l-2 ${
            isSentByMe
              ? 'bg-black/15 border-white/80 text-white/90'
              : 'bg-black/[0.03] dark:bg-white/[0.06] border-[#0071e3] dark:border-[#0a84ff] text-[#6e6e73] dark:text-[#a1a1a6]'
          }`}>
            <p className="font-semibold text-[10px] opacity-90">
              {message.replyToSnippet.senderName}
            </p>
            <p className="truncate text-[11px] mt-0.5">
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
              className="w-full bg-white/20 border border-white/40 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:ring-2 focus:ring-white/50"
            />
            <div className="flex gap-2 mt-1.5 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-[10px] text-white/80 hover:underline">Cancel</button>
              <button onClick={handleSaveEdit} className="text-[10px] text-white font-bold hover:underline">Save</button>
            </div>
          </div>
        ) : (
          !(message.type !== 'text' && (message.content.startsWith('[Attached ') || message.content === '[Voice Note]' || message.content === '')) && (
            <p className="text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-wrap select-text" style={{ overflowWrap: 'anywhere' }}>
              {renderFormattedText(message.content, isSentByMe)}
              {message.isEdited && <span className="text-[9px] opacity-70 ml-1 italic">(edited)</span>}
            </p>
          )
        )}

        {/* Timestamp & Read Status Ticks */}
        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
          isSentByMe ? 'text-white/70' : 'text-[#86868b]'
        }`}>
          <span>{formattedTime}</span>
          {isSentByMe && (
            <span>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-white inline" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/70 inline" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/70 inline" />
              )}
            </span>
          )}
        </div>

        {/* Apple Tapbacks Reactions Badge */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`absolute -bottom-3 ${isSentByMe ? 'right-2' : 'left-2'} flex gap-0.5 bg-white dark:bg-[#2c2c2e] border border-black/[0.08] dark:border-white/[0.1] rounded-full px-2 py-0.5 shadow-md text-[11px]`}>
            {message.reactions.map((r, idx) => (
              <span key={idx} title={r.byName}>{r.emoji}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Action Buttons for Received (Right of Bubble) ── */}
      {!isSentByMe && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ml-1.5 mb-1 flex-shrink-0 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl p-1 rounded-xl shadow-md border border-black/[0.06] dark:border-white/[0.1]">
          <button onClick={() => setReplyToMessage(message)} title="Reply"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowReactors(!showReactors)} title="React"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
            <Smile className="w-3.5 h-3.5" />
          </button>
          {message.content && (
            <button onClick={handleCopyText} title="Copy Text"
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {message.fileUrl && (
            <button onClick={handleDownloadFile} title="Save / Download Media"
              className="p-1 hover:bg-blue-500/10 rounded-lg text-blue-500">
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={handleForwardMessage} title="Forward"
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-[#86868b]">
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
