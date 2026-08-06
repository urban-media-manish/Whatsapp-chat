import React, { useState } from 'react';

export default function CustomerInitModal({ onSubmit }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    onSubmit(name.trim(), phone.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="auth-card">
        <div style={{ textAlign: 'center' }}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
            alt="WhatsApp Logo" 
            style={{ width: '56px', height: '56px', marginBottom: '12px', filter: 'drop-shadow(0 4px 8px rgba(0,168,132,0.4))' }} 
          />
          <h2 style={{ fontSize: '22px', color: 'var(--text-primary)', fontWeight: 800 }}>Welcome to Live Support!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '6px', lineHeight: 1.5 }}>
            Please enter your name & WhatsApp mobile number to start chatting with <strong>Support ✓</strong>
          </p>
        </div>

        {error && (
          <div style={{ color: '#ea4335', fontSize: '13px', textAlign: 'center', background: 'rgba(234, 67, 53, 0.12)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(234, 67, 53, 0.3)' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Your Name</label>
            <input 
              type="text" 
              className="auth-input" 
              placeholder="e.g. Ramesh Kumar" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              autoFocus
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>WhatsApp Mobile Number</label>
            <input 
              type="tel" 
              className="auth-input" 
              placeholder="e.g. 9876543210" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="auth-btn" style={{ marginTop: '6px' }}>
            💬 Start Live Support Chat
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          🔒 Safe & Encrypted Customer Support Session
        </div>
      </div>
    </div>
  );
}
