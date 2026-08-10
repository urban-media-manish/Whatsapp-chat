import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Mic, Send, Image, FileText, Music, X, Zap, Camera } from 'lucide-react';
import { EmojiPickerModal } from './EmojiPickerModal';
import { VoiceRecorder } from './VoiceRecorder';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useChatStore } from '../../store/useChatStore';
import { sounds } from '../../utils/audio';

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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
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
      sounds.playSent();
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

  const handlePasteImageFile = async (file: File) => {
    setIsUploading(true);
    try {
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
      sounds.playSent();
      setReplyToMessage(null);
    } catch (err) {
      console.error('Pasted image upload error:', err);
      alert('Failed to send pasted screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement> | ClipboardEvent) => {
    const items = (e as ClipboardEvent).clipboardData?.items || (e as React.ClipboardEvent).clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handlePasteImageFile(file);
        }
        break;
      }
    }
  };

  useEffect(() => {
    const windowPasteHandler = (e: ClipboardEvent) => {
      handlePaste(e);
    };
    window.addEventListener('paste', windowPasteHandler);
    return () => {
      window.removeEventListener('paste', windowPasteHandler);
    };
  }, [conversationId, senderType, senderId, senderName]);

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
      if (cameraInputRef.current) cameraInputRef.current.value = '';
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
    <div className="relative bg-[#f0f2f5] dark:bg-[#202c33] px-3 py-2 border-t border-gray-200/80 dark:border-gray-700/60 flex flex-col gap-2 select-none w-full">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*"
        capture="environment"
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
        <div className="absolute bottom-16 left-12 z-40 bg-white dark:bg-[#233138] p-3 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-2 min-w-[190px] animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            <div className="p-2 rounded-full bg-purple-500 text-white"><Image className="w-4 h-4" /></div> Photos & Videos
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            <div className="p-2 rounded-full bg-blue-500 text-white"><FileText className="w-4 h-4" /></div> PDF Document
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            <div className="p-2 rounded-full bg-rose-500 text-white"><Camera className="w-4 h-4" /></div> Camera Photo
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              setIsRecordingVoice(true);
            }}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-white/10 transition-colors text-xs font-medium text-gray-700 dark:text-gray-200"
          >
            <div className="p-2 rounded-full bg-amber-500 text-white"><Music className="w-4 h-4" /></div> Voice Note
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

      {/* Main WhatsApp Input Row */}
      <div className="flex items-center gap-2 w-full">
        {/* Emoji Button (Left side of input pill) */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors focus:outline-none flex-shrink-0"
          title="Emoji"
        >
          <Smile className="w-6 h-6" />
        </button>

        {/* Input Capsule Box */}
        <div className="flex-1 flex items-center bg-white dark:bg-[#2a3942] rounded-full px-4 py-2 border border-transparent focus-within:ring-1 focus-within:ring-[#00a884]/30 shadow-xs min-w-0 transition-all">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder || "Type your message..."}
            className="w-full bg-transparent text-gray-900 dark:text-[#e9edef] placeholder-gray-500 dark:placeholder-[#8696a0] text-sm md:text-base outline-none border-none pr-2 font-medium"
          />

          {/* Paperclip attachment icon INSIDE right side of input capsule */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-1 text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors focus:outline-none flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 -rotate-45" />
          </button>
        </div>

        {/* Camera Icon (Right outside capsule) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#54656f] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors focus:outline-none flex-shrink-0"
          title="Camera"
        >
          <Camera className="w-6 h-6" />
        </button>

        {/* Green Circle Voice/Send Button */}
        {text.trim() ? (
          <button
            type="button"
            onClick={handleSendText}
            disabled={isUploading}
            className="w-10 h-10 rounded-full bg-[#00a884] text-white hover:bg-[#008f70] transition-transform active:scale-95 shadow-md flex items-center justify-center flex-shrink-0"
            title="Send message"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsRecordingVoice(true)}
            className="w-10 h-10 rounded-full bg-[#00a884] text-white hover:bg-[#008f70] transition-transform active:scale-95 shadow-md flex items-center justify-center flex-shrink-0"
            title="Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
