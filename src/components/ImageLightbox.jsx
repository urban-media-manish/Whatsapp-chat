import React from 'react';
import { X } from 'lucide-react';

export default function ImageLightbox({ imageUrl, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'rgba(0,0,0,0.6)',
          border: 'none',
          color: '#fff',
          borderRadius: '50%',
          padding: '10px',
          cursor: 'pointer'
        }}
      >
        <X size={24} />
      </button>

      <img 
        src={imageUrl} 
        alt="Enlarged preview" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}
