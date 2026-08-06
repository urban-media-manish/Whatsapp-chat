import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  avatar: {
    type: String,
    default: ''
  },
  isGuest: {
    type: Boolean,
    default: false
  },
  blocked: {
    type: Boolean,
    default: false
  },
  muted: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    default: ''
  },
  metadata: {
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    location: { type: String, default: 'Unknown' },
    browser: { type: String, default: 'Web Browser' }
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export const Customer = mongoose.model('Customer', customerSchema);
