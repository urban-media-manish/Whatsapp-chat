import React, { useState, useRef, useEffect } from 'react';
import { Smile, Mic, ArrowUp, Image, FileText, Music, X, Zap, Camera, Plus } from 'lucide-react';
import { EmojiPickerModal } from './EmojiPickerModal';
import { VoiceRecorder } from './VoiceRecorder';
import { PastedImageModal } from './PastedImageModal';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useChatStore } from '../../store/useChatStore';
import { sounds } from '../../utils/audio';
import type { Message } from '../../types';

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
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [pastedPreviewUrl, setPastedPreviewUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<any | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const socket = getSocket();

  useEffect(() => {
    if (isAgentView) {
      fetchQuickReplies();
    }
  }, [isAgentView]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        socket.emit('typing_stop', { conversationId, senderType });
        isTypingRef.current = false;
      }
    };
  }, [conversationId, senderType]);

  const startTyping = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', { conversationId, senderName, senderType });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2500);
  };

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing_stop', { conversationId, senderType });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (isAgentView && val.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }

    if (val.trim() === '') {
      stopTyping();
    } else {
      startTyping();
    }
  };

  const handleSendText = async () => {
    if (!text.trim()) return;

    const contentToSend = text;
    setText('');
    setShowQuickReplies(false);
    stopTyping();

    // 1. Instant Optimistic Render (0ms)
    const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 6);
    const optimisticMsg: Message = {
      _id: tempId,
      conversation: conversationId,
      senderType,
      senderId,
      senderName,
      content: contentToSend,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
      replyTo: replyToMessage ? {
        _id: replyToMessage._id,
        content: replyToMessage.content || replyToMessage.fileName || 'Attachment',
        senderName: replyToMessage.senderName,
        type: replyToMessage.type
      } as any : undefined
    };

    addMessage(optimisticMsg);
    sounds.playSent();
    setReplyToMessage(null);

    // 2. Real-time WebSocket emission (instant ~10ms)
    socket.emit('send_message', optimisticMsg);

    // 3. Background DB Save
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

  const handleSendPastedImage = async (caption: string) => {
    if (!pastedFile) return;
    setIsUploading(true);
    try {
      const res = await api.uploadFile(pastedFile);
      const contentText = caption.trim()
        ? caption.trim()
        : `[Attached ${res.type.toUpperCase()}: ${res.fileName}]`;

      const msg = await api.sendMessage({
        conversationId,
        senderType,
        senderId,
        senderName,
        content: contentText,
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
      setPastedFile(null);
      setPastedPreviewUrl('');
    } catch (err) {
      console.error('Pasted image upload error:', err);
      alert('Failed to send pasted screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement> | ClipboardEvent) => {
    const items = (e as ClipboardEvent).clipboardData?.items || (e as React.ClipboardEvent).clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setPastedFile(file);
          setPastedPreviewUrl(URL.createObjectURL(file));
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
      <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-black/[0.06] dark:border-white/[0.08]">
        <VoiceRecorder
          onRecorded={handleVoiceRecorded}
          onCancel={() => setIsRecordingVoice(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative bg-[#f0f2f5]/90 dark:bg-[#202c33]/90 backdrop-blur-2xl px-3 py-2.5 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-2 select-none w-full transition-colors">
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
        <div className="flex items-center justify-between bg-black/[0.04] dark:bg-white/[0.06] border-l-3 border-[#00a884] px-3 py-2 rounded-r-xl text-xs backdrop-blur-md">
          <div>
            <span className="font-semibold text-[#00a884]">Replying to {replyToMessage.senderName}</span>
            <p className="truncate text-[#667781] dark:text-[#8696a0] text-[11px] mt-0.5">{replyToMessage.content || replyToMessage.fileName}</p>
          </div>
          <button onClick={() => setReplyToMessage(null)} className="p-1 rounded-full text-[#8696a0] hover:text-[#111b21] dark:hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Canned Quick Replies Menu */}
      {showQuickReplies && quickReplies.length > 0 && (
        <div className="absolute bottom-16 left-4 right-4 z-40 bg-white/95 dark:bg-[#233138]/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] p-2 max-h-48 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider px-2.5 py-1.5 border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Canned Shortcuts
          </div>
          {quickReplies.map((qr) => (
            <button
              key={qr._id}
              onClick={() => {
                setText(qr.content);
                setShowQuickReplies(false);
              }}
              className="w-full text-left p-2.5 rounded-xl hover:bg-[#00a884]/10 dark:hover:bg-white/10 transition-colors flex justify-between items-center"
            >
              <div>
                <span className="font-semibold text-xs text-[#00a884]">/{qr.shortcut}</span>
                <p className="text-xs text-[#111b21] dark:text-[#e9edef] truncate mt-0.5">{qr.content}</p>
              </div>
              <span className="text-[10px] text-[#8696a0] bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 rounded-md font-medium">{qr.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* iOS Action Sheet Attachment Menu */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-3 z-40 bg-white/95 dark:bg-[#233138]/95 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] flex flex-col gap-1 min-w-[210px] animate-in fade-in slide-in-from-bottom-2 duration-150">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors text-xs font-semibold text-[#111b21] dark:text-[#e9edef]"
          >
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-sm"><Image className="w-4 h-4" /></div>
            <span>Photos & Videos</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors text-xs font-semibold text-[#111b21] dark:text-[#e9edef]"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm"><FileText className="w-4 h-4" /></div>
            <span>Document / PDF</span>
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors text-xs font-semibold text-[#111b21] dark:text-[#e9edef]"
          >
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm"><Camera className="w-4 h-4" /></div>
            <span>Take Photo</span>
          </button>
          <button
            onClick={() => {
              setShowAttachMenu(false);
              setIsRecordingVoice(true);
            }}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors text-xs font-semibold text-[#111b21] dark:text-[#e9edef]"
          >
            <div className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-sm"><Music className="w-4 h-4" /></div>
            <span>Audio Message</span>
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

      {/* iOS Floating Capsule Input Row */}
      <div className="flex items-center gap-2 w-full">
        {/* Plus / Attach Button (Apple iOS Action Sheet Trigger) */}
        <button
          type="button"
          onClick={() => setShowAttachMenu(!showAttachMenu)}
          className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.09] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white flex items-center justify-center transition-all duration-200 active:scale-90 flex-shrink-0"
          title="Attachments"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Input Capsule Box */}
        <div className="flex-1 flex items-center bg-white dark:bg-[#2a3942] rounded-full px-3.5 py-1.5 border border-black/[0.08] dark:border-white/[0.08] focus-within:border-[#00a884] focus-within:ring-2 focus-within:ring-[#00a884]/20 shadow-xs min-w-0 transition-all">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder || "Type a message..."}
            className="w-full bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-[13px] sm:text-[14px] outline-none border-none pr-1.5 font-normal"
          />

          {/* Emoji Button inside capsule */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors focus:outline-none flex-shrink-0"
            title="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Green Send Arrow / Mic Button */}
        {text.trim() ? (
          <button
            type="button"
            onClick={handleSendText}
            disabled={isUploading}
            className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#008f70] text-white transition-all active:scale-90 shadow-md flex items-center justify-center flex-shrink-0"
            title="Send"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsRecordingVoice(true)}
            className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.09] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white flex items-center justify-center transition-all duration-200 active:scale-90 flex-shrink-0"
            title="Voice Note"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pasted Screenshot Preview Modal */}
      {pastedFile && pastedPreviewUrl && (
        <PastedImageModal
          file={pastedFile}
          previewUrl={pastedPreviewUrl}
          onSend={(caption) => handleSendPastedImage(caption)}
          onCancel={() => {
            setPastedFile(null);
            setPastedPreviewUrl('');
          }}
          isUploading={isUploading}
        />
      )}
    </div>
  );
};
