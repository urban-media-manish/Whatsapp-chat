import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, Search, Smile, Paperclip, Send, Mic, Play, Pause, Check, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const EMOJIS = ['😀', '😂', '😍', '😎', '🔥', '👍', '❤️', '🎉', '🙏', '🚀', '✨', '💯', '☕', '🥳'];

export default function ChatWindow({ activeChat, contact, onStartCall, onOpenLightbox }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const isContactOnline = onlineUsers.has(contact.id) || contact.status === 'online';

  // Fetch message history for active chat
  const fetchMessages = async () => {
    if (!activeChat) return;
    try {
      const res = await fetch(`/api/messages/${activeChat.chatId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (socket && activeChat) {
      // Mark unread messages as read
      socket.emit('mark_read', { chatId: activeChat.chatId, userId: user.id, senderId: contact.id });

      const handleNewMessage = (msg) => {
        if (msg.chat_id === activeChat.chatId) {
          setMessages(prev => [...prev, msg]);
          socket.emit('mark_read', { chatId: activeChat.chatId, userId: user.id, senderId: contact.id });
        }
      };

      const handleMessageSent = (msg) => {
        if (msg.chat_id === activeChat.chatId) {
          setMessages(prev => [...prev, msg]);
        }
      };

      const handleUserTyping = ({ chatId }) => {
        if (chatId === activeChat.chatId) {
          setIsTyping(true);
        }
      };

      const handleUserStopTyping = ({ chatId }) => {
        if (chatId === activeChat.chatId) {
          setIsTyping(false);
        }
      };

      const handleMessagesReadUpdate = ({ chatId }) => {
        if (chatId === activeChat.chatId) {
          setMessages(prev => prev.map(m => ({ ...m, status: 'read' })));
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_sent', handleMessageSent);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);
      socket.on('messages_read_update', handleMessagesReadUpdate);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('message_sent', handleMessageSent);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stop_typing', handleUserStopTyping);
        socket.off('messages_read_update', handleMessagesReadUpdate);
      };
    }
  }, [activeChat, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle typing status emission
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket || !activeChat) return;

    socket.emit('typing', { chatId: activeChat.chatId, recipientId: contact.id, senderName: user.name });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { chatId: activeChat.chatId, recipientId: contact.id });
    }, 1500);
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputText.trim() || !socket || !activeChat) return;

    socket.emit('send_message', {
      chatId: activeChat.chatId,
      senderId: user.id,
      recipientId: contact.id,
      text: inputText.trim(),
      type: 'text'
    });

    socket.emit('stop_typing', { chatId: activeChat.chatId, recipientId: contact.id });
    setInputText('');
    setShowEmojis(false);
  };

  // Handle keydown Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat || !socket) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        socket.emit('send_message', {
          chatId: activeChat.chatId,
          senderId: user.id,
          recipientId: contact.id,
          text: '',
          type: 'image',
          mediaUrl: data.url
        });
      }
    } catch (err) {
      console.error('Image upload error:', err);
    }
  };

  // Handle Voice Recording simulation
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingIntervalRef.current);
      setIsRecording(false);

      if (socket && activeChat) {
        const mins = Math.floor(recordingSeconds / 60);
        const secs = recordingSeconds % 60;
        const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        socket.emit('send_message', {
          chatId: activeChat.chatId,
          senderId: user.id,
          recipientId: contact.id,
          text: '',
          type: 'audio',
          duration: durationStr || '0:05'
        });
      }
    }
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-info">
          <img src={contact.avatar} alt={contact.name} className="avatar" />
          <div className="chat-header-details">
            <span className="chat-header-name">{contact.name}</span>
            <span className={`chat-header-status ${isTyping || isContactOnline ? 'online' : ''}`}>
              {isTyping ? 'typing...' : isContactOnline ? 'online' : 'offline'}
            </span>
          </div>
        </div>

        <div className="header-icons">
          <button className="icon-btn" title="Start Video Call" onClick={() => onStartCall('video')}>
            <Video size={20} />
          </button>
          <button className="icon-btn" title="Start Voice Call" onClick={() => onStartCall('voice')}>
            <Phone size={20} />
          </button>
          <button className="icon-btn" title="Search in Chat">
            <Search size={20} />
          </button>
        </div>
      </header>

      {/* Messages Flow */}
      <div className="messages-container">
        <div className="date-divider">Today</div>

        {messages.map((msg) => {
          const isOutgoing = msg.sender_id === user.id;

          return (
            <div key={msg.id} className={`message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
              {msg.type === 'image' && (
                <div className="message-image" onClick={() => onOpenLightbox(msg.media_url)}>
                  <img src={msg.media_url} alt="Shared Photo" />
                </div>
              )}

              {msg.type === 'audio' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
                  <button className="icon-btn" style={{ background: 'var(--accent)', color: '#fff' }}>
                    <Play size={16} fill="white" />
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Voice Note ({msg.duration || '0:05'})</span>
                </div>
              )}

              {msg.text && <div className="message-text">{msg.text}</div>}

              <div className="message-meta">
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isOutgoing && (
                  msg.status === 'read' ? (
                    <CheckCheck size={15} color="var(--tick-blue)" />
                  ) : (
                    <Check size={15} color="var(--text-muted)" />
                  )
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="message incoming" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            {contact.name} is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <footer className="chat-input-bar">
        {showEmojis && (
          <div className="emoji-popover">
            {EMOJIS.map((emoji, idx) => (
              <button 
                key={idx} 
                className="emoji-btn"
                onClick={() => { setInputText(prev => prev + emoji); setShowEmojis(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button className="icon-btn" title="Emojis" onClick={() => setShowEmojis(!showEmojis)}>
          <Smile size={22} />
        </button>

        <label className="icon-btn" title="Attach Image" style={{ cursor: 'pointer' }}>
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*" 
            style={{ display: 'none' }} 
            onChange={handleImageUpload}
          />
          <Paperclip size={22} />
        </label>

        {isRecording ? (
          <div className="input-box-wrapper" style={{ justifyContent: 'space-between', color: '#ea4335' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>🎙️ Recording Voice Note ({recordingSeconds}s)...</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click Mic to Stop & Send</span>
          </div>
        ) : (
          <div className="input-box-wrapper">
            <input 
              type="text" 
              className="input-box" 
              placeholder="Type a message"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}

        {inputText.trim().length > 0 ? (
          <button className="icon-btn" title="Send Message" onClick={handleSendMessage} style={{ color: 'var(--accent)' }}>
            <Send size={22} />
          </button>
        ) : (
          <button 
            className="icon-btn" 
            title={isRecording ? "Stop & Send Audio" : "Record Audio Note"} 
            onClick={toggleRecording}
            style={{ color: isRecording ? '#ea4335' : 'var(--icon-color)' }}
          >
            <Mic size={22} />
          </button>
        )}
      </footer>
    </div>
  );
}
