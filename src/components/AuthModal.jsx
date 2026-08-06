import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80"
];

export default function AuthModal() {
  const { login, register } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATARS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isSignUp) {
        await register(username, password, name, avatar);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message);
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
        <h2>{isSignUp ? 'Create WhatsApp Account' : 'Sign in to WhatsApp Web'}</h2>
        
        {error && (
          <div style={{ color: '#ea4335', fontSize: '13px', textAlign: 'center', background: 'rgba(234, 67, 53, 0.1)', padding: '8px', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Username</label>
            <input 
              type="text" 
              className="auth-input" 
              placeholder="e.g. rahul123" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>

          <div>
            <label>Password</label>
            <input 
              type="password" 
              className="auth-input" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          {isSignUp && (
            <>
              <div>
                <label>Display Name</label>
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder="e.g. Rahul Sharma" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>

              <div>
                <label>Choose Avatar Profile</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {DEFAULT_AVATARS.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img} 
                      alt="Avatar" 
                      onClick={() => setAvatar(img)}
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '50%', 
                        cursor: 'pointer',
                        border: avatar === img ? '3px solid #00a884' : '2px solid transparent'
                      }} 
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? (
            <>Already have an account? <span>Sign In</span></>
          ) : (
            <>New to Realtime WhatsApp? <span>Create an Account</span></>
          )}
        </div>
      </div>
    </div>
  );
}
