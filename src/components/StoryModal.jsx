import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function StoryModal({ onClose }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onClose]);

  return (
    <div className="modal-overlay">
      <div style={{ position: 'relative', width: '90%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden', background: '#111b21' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer', zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#00a884', borderRadius: '2px', transition: 'width 0.1s linear' }} />
        </div>

        <div style={{ padding: '24px 16px 12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80" 
            alt="Status User" 
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
          />
          <div>
            <div style={{ color: '#e9edef', fontWeight: 600, fontSize: '15px' }}>Status Story</div>
            <div style={{ color: '#8696a0', fontSize: '12px' }}>Today at 10:30 AM</div>
          </div>
        </div>

        <img 
          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80" 
          alt="Status Story Content" 
          style={{ width: '100%', height: '450px', objectFit: 'cover' }}
        />
      </div>
    </div>
  );
}
