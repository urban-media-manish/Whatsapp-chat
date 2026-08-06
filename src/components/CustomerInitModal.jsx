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
      <div className="auth-card" style={{ maxWidth: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
            alt="WhatsApp Logo" 
            style={{ width: '48px', height: '48px', marginBottom: '8px' }} 
          />
          <h2 style={{ fontSize: '20px', color: 'var(--text-primary)' }}>Welcome to Live Support!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Please enter your name & WhatsApp number to start chatting with Support ✓
          </p>
        </div>

        {error && (
          <div style={{ color: '#ea4335', fontSize: '13px', textAlign: 'center', background: 'rgba(234, 67, 53, 0.1)', padding: '8px', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Your Name</label>
            <input 
              type="text" 
              className="auth-input" 
              placeholder="e.g. Ramesh Kumar" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>

          <div>
            <label>WhatsApp Mobile Number</label>
            <input 
              type="tel" 
              className="auth-input" 
              placeholder="e.g. 9876543210" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="auth-btn">
            💬 Start Live Support Chat
          </button>
        </form>
      </div>
    </div>
  );
}
