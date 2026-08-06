import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, Search, Smile, Paperclip, Send, Mic, CheckCheck, Check, MoreVertical } from 'lucide-react';
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
  const messagesEndRef = useRef(null);

  const isContactOnline = onlineUsers.has(contact.id) || contact.status === 'online';

  const fetchMessages = async () => {
    if (!activeChat) return;
    try {
      const res = await fetch(`/api/messages/${activeChat.chatId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (socket && activeChat) {
      socket.emit('mark_read', { chatId: activeChat.chatId, userId: user.id, senderId: contact.id });

      const handleNewMsg = (msg) => {
        if (msg.chat_id === activeChat.chatId) {
          setMessages(prev => [...prev, msg]);
          socket.emit('mark_read', { chatId: activeChat.chatId, userId: user.id, senderId: contact.id });
        }
      };

      const handleSentMsg = (msg) => {
        if (msg.chat_id === activeChat.chatId) {
          setMessages(prev => [...prev, msg]);
        }
      };

      const handleUserTyping = ({ chatId }) => {
        if (chatId === activeChat.chatId) setIsTyping(true);
      };

      const handleUserStopTyping = ({ chatId }) => {
        if (chatId === activeChat.chatId) setIsTyping(false);
      };

      socket.on('new_message', handleNewMsg);
      socket.on('message_sent', handleSentMsg);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stop_typing', handleUserStopTyping);

      return () => {
        socket.off('new_message', handleNewMsg);
        socket.off('message_sent', handleSentMsg);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stop_typing', handleUserStopTyping);
      };
    }
  }, [activeChat, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputText.trim();
    if (!text || !socket || !activeChat) return;

    socket.emit('send_message', {
      chatId: activeChat.chatId,
      senderId: user.id,
      recipientId: contact.id,
      text: text,
      type: 'text'
    });

    if (!textToSend) setInputText('');
    setShowEmojis(false);
  };

  const handleOptionClick = (optionText) => {
    handleSendMessage(optionText);
  };

  return (
    <div className="chat-window">
      {/* Header - Teal WhatsApp Support Header */}
      <header className="support-header">
        <div className="support-header-info">
          <img src={contact.avatar} alt={contact.name} className="avatar" />
          <div>
            <div className="support-name">
              {contact.name}
              {contact.name.includes('Support') && (
                <span className="verified-badge" title="Verified Support Account">✓</span>
              )}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.85 }}>
              {isTyping ? 'typing...' : isContactOnline ? 'online' : 'last seen today'}
            </div>
          </div>
        </div>

        <div className="header-icons" style={{ color: 'white' }}>
          <button className="icon-btn" style={{ color: 'white' }} title="Search">
            <Search size={20} />
          </button>
          <button className="icon-btn" style={{ color: 'white' }} title="Call" onClick={() => onStartCall('voice')}>
            <Phone size={20} />
          </button>
          <button className="icon-btn" style={{ color: 'white' }} title="Menu">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Messages Container with WhatsApp Doodle background */}
      <div className="messages-container doodle-bg">
        <div className="date-divider">Today</div>

        {messages.map((msg) => {
          const isOutgoing = msg.sender_id === user.id;

          let templateObj = null;
          if (msg.type === 'template' && msg.template_data) {
            try { templateObj = JSON.parse(msg.template_data); } catch(e){}
          }

          let optionsObj = null;
          if (msg.type === 'options' && msg.options_data) {
            try { optionsObj = JSON.parse(msg.options_data); } catch(e){}
          }

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOutgoing ? 'flex-end' : 'flex-start' }}>
              {/* Rich Promo Card Template (Matching SS) */}
              {msg.type === 'template' && templateObj ? (
                <div className="promo-card">
                  <div className="promo-card-title">
                    <span>{templateObj.title}</span>
                  </div>
                  <div className="promo-card-row" style={{ color: '#25d366', fontWeight: 600 }}>
                    ✅ {templateObj.subtitle}
                  </div>
                  <div className="promo-card-row">
                    🌐 Official: <a href={`https://${templateObj.officialUrl}`} target="_blank" rel="noreferrer" className="promo-card-link">{templateObj.officialUrl}</a>
                  </div>
                  <div className="promo-card-row">
                    📹 ID Guide: <a href={templateObj.guideUrl} target="_blank" rel="noreferrer" className="promo-card-link">{templateObj.guideUrl}</a>
                  </div>
                  <div className="promo-card-divider" />
                  <div className="promo-card-row" style={{ whiteSpace: 'pre-line' }}>
                    💰 {templateObj.points}
                  </div>
                  <div className="promo-card-divider" />
                  <div className="promo-card-row" style={{ color: '#f7b731', fontWeight: 600 }}>
                    {templateObj.verifiedNotice}
                  </div>
                  {templateObj.verifiedSites && templateObj.verifiedSites.map((site, i) => (
                    <div key={i} className="promo-card-row">
                      🌐 <a href={`https://${site}`} target="_blank" rel="noreferrer" className="promo-card-link">{site}</a>
                    </div>
                  ))}
                  <div className="promo-card-divider" />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {templateObj.footer}
                  </div>
                </div>
              ) : msg.type === 'options' && optionsObj ? (
                /* Interactive Choice Option Buttons Card (Matching SS) */
                <div className="options-card">
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                    {optionsObj.prompt}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {optionsObj.hint}
                  </div>
                  {optionsObj.buttons && optionsObj.buttons.map((btnText, i) => (
                    <button key={i} className="options-btn" onClick={() => handleOptionClick(btnText)}>
                      {btnText}
                    </button>
                  ))}
                </div>
              ) : msg.type === 'alert' ? (
                /* Error alert message bubble (Matching SS) */
                <div className="error-alert-bubble">
                  ⚠️ {msg.text}
                </div>
              ) : (
                /* Standard Message Bubble */
                <div className={`message ${isOutgoing ? 'outgoing' : 'incoming'}`}>
                  {msg.text}
                  <div className="message-meta">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isOutgoing && <CheckCheck size={15} color="var(--tick-blue)" />}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="message incoming" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            Support is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
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

        <div className="input-box-wrapper">
          <input 
            type="text" 
            className="input-box" 
            placeholder="Message" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
          />
        </div>

        <button className="icon-btn" title="Attach" onClick={() => setShowEmojis(!showEmojis)}>
          <Paperclip size={20} />
        </button>

        <button className="send-circle-btn" onClick={() => handleSendMessage()}>
          <Send size={20} />
        </button>
      </footer>
    </div>
  );
}
