import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

export default function CallModal({ contact, callType, onEndCall }) {
  const [status, setStatus] = useState('Ringing...');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('Connected (0:00)');
      const interval = setInterval(() => {
        setCallSeconds(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  return (
    <div className="modal-overlay">
      <div className="call-card">
        <img src={contact.avatar} alt={contact.name} className="call-avatar" />
        <div className="call-name">{contact.name}</div>
        <div className="call-status">
          {callType === 'video' ? '📹 Video Call' : '📞 Voice Call'} - {callSeconds > 0 ? `Connected (${formatTime(callSeconds)})` : status}
        </div>

        {callType === 'video' && !isCamOff && (
          <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" 
              alt="Video Stream" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        <div className="call-controls">
          <button 
            className="call-btn mute" 
            style={{ backgroundColor: isMuted ? '#ea4335' : '#3c4043' }}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {callType === 'video' && (
            <button 
              className="call-btn mute" 
              style={{ backgroundColor: isCamOff ? '#ea4335' : '#3c4043' }}
              onClick={() => setIsCamOff(!isCamOff)}
            >
              {isCamOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>
          )}

          <button className="call-btn end" onClick={onEndCall} title="End Call">
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
