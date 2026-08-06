import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Mic, Send, Image, FileText, Music, X, Zap } from 'lucide-react';
import { EmojiPickerModal } from './EmojiPickerModal';
import { VoiceRecorder } from './VoiceRecorder';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useChatStore } from '../../store/useChatStore';

interface MessageInputProps {
  conversationId: string;
  senderType: 'customer' | 'agent';
  senderId: string;
  senderName: string;
  isAgentView?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  senderType,
  senderId,
  senderName,
  isAgentView,
  placeholder
}) => {
  const { replyToMessage, setReplyToMessage, addMessage, quickReplies, fetchQuickReplies } = useChatStore();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socket = getSocket();

  useEffect(() => {
    if (isAgentView) {
      fetchQuickReplies();
    }
  }, [isAgentView]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    // Check for `/` quick reply trigger in agent view
    if (isAgentView && val.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }

    // Emit typing status
    socket.emit('typing_start', { conversationId, senderName, senderType });
  };

  const handleSendText = async () => {
    if (!text.trim()) return;

    const contentToSend = text;
    setText('');
    setShowQuickReplies(false);
    socket.emit('typing_stop', { conversationId, senderType });

    try {
      const msg = await api.sendMessage({
        conversationId,
        senderType,
        senderId,
        senderName,
        content: contentToSend,
        replyToId: replyToMessage?._id
      });

      addMessage(msg);
      socket.emit('send_message', msg);
      setReplyToMessage(null);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setShowAttachMenu(false);

    try {
      const file = files[0];
      const res = await api.uploadFile(file);

      const msg = await api.sendMessage({
        conversationId,
        senderType,
        senderId,
        senderName,
        content: `[Attached ${res.type.toUpperCase()}: ${res.fileName}]`,
        type: res.type,
        fileUrl: res.fileUrl,
        fileName: res.fileName,
        fileSize: res.fileSize,
        mimeType: res.mimeType,
        replyToId: replyToMessage?._id
      });

      addMessage(msg);
      socket.emit('send_message', msg);
      setReplyToMessage(null);
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVoiceRecorded = async (fileData: any) => {
    setIsRecordingVoice(false);
    try {
      const msg = await api.sendMessage({
        conversationId,
        senderType,
        senderId,
        senderName,
        content: '[Voice Note]',
        type: 'audio',
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType
      });

      addMessage(msg);
      socket.emit('send_message', msg);
    } catch (err) {
      console.error('Failed to send voice note:', err);
    }
  };

  if (isRecordingVoice) {
    return (
      <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-gray-200 dark:border-gray-700/60">
        <VoiceRecorder
          onRecorded={handleVoiceRecorded}
          onCancel={() => setIsRecordingVoice(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 border-t border-gray-200 dark:border-gray-700/60 flex flex-col gap-2">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
      />

      {/* Quoted Reply Banner */}
      {replyToMessage && (
        <div className="flex items-center justify-between bg-black/5 dark:bg-black/30 border-l-4 border-[#00a884] p-2 rounded-r-lg text-xs">
          <div>
            <span className="font-semibold text-[#00a884]">Replying to {replyToMessage.senderName}</span>
            <p className="truncate text-gray-600 dark:text-gray-300 text-[11px]">{replyToMessage.content || replyToMessage.fileName}</p>
          </div>
          <button onClick={() => setReplyToMessage(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Canned Quick Replies Menu */}
      {showQuickReplies && quickReplies.length > 0 && (
        <div className="absolute bottom-16 left-4 right-4 z-40 bg-white dark:bg-[#202c33] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 max-h-48 overflow-y-auto">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 border-b border-gray-100 dark:border-gray-700 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Canned Quick Replies
          </div>
          {quickReplies.map((qr) => (
            <button
              key={qr._id}
              onClick={() => {
                setText(qr.content);
                setShowQuickReplies(false);
              }}
              className="w-full text-left p-2 rounded-lg hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors flex justify-between items-center"
            >
              <div>
                <span className="font-semibold text-xs text-[#00a884]">/{qr.shortcut}</span>
                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{qr.content}</p>
              </div>
              <span className="text-[10px] text-gray-400">{qr.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Attachment Options Menu */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-12 z-40 bg-white dark:bg-[#233138] p-3 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-2 min-w-[180px]">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            <div className="p-2 rounded-full bg-purple-500 text-white"><Image className="w-4 h-4" /></div> Photos & Videos
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            <div className="p-2 rounded-full bg-blue-500 text-white"><FileText className="w-4 h-4" /></div> PDF Document
          </button>
          <button
            onClick={() => setIsRecordingVoice(true)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            <div className="p-2 rounded-full bg-red-500 text-white"><Music className="w-4 h-4" /></div> Voice Note
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <EmojiPickerModal
          onSelect={(emoji) => setText((prev: string) => prev + emoji)}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Main Input Row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (isAgentView ? "Type a reply or '/' for templates..." : "Type your message...")}
            className="w-full bg-white dark:bg-[#2a3942] text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-xl px-4 py-2.5 text-sm outline-none border border-transparent focus:border-[#00a884] transition-colors"
          />
        </div>

        {text.trim() ? (
          <button
            onClick={handleSendText}
            disabled={isUploading}
            className="p-2.5 rounded-full bg-[#00a884] text-white hover:bg-[#008f70] transition-transform active:scale-95 shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setIsRecordingVoice(true)}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
