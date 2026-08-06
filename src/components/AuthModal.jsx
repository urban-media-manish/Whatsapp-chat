import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isAdminLogin }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" 
            alt="WhatsApp Logo" 
            style={{ width: '48px', height: '48px' }} 
          />
        </div>
        <h2>Agent & Admin Portal</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>
          Management Sign In required to access Customer Dashboard
        </p>

        {error && (
          <div style={{ color: '#ea4335', fontSize: '13px', textAlign: 'center', background: 'rgba(234, 67, 53, 0.1)', padding: '8px', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Admin Username</label>
            <input 
              type="text" 
              className="auth-input" 
              placeholder="Username (e.g. support)" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div>
            <label>Admin Password</label>
            <input 
              type="password" 
              className="auth-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In to Management'}
          </button>
        </form>

        <div style={{ background: '#111b21', padding: '10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-muted)', textAlignment: 'center', textAlign: 'center' }}>
          🔑 Default Admin Login:<br/>
          Username: <strong style={{ color: '#00a884' }}>support</strong> | Password: <strong style={{ color: '#00a884' }}>support123</strong>
        </div>
      </div>
    </div>
  );
}
