import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  unreadCountCustomer: {
    type: Number,
    default: 0
  },
  lastMessage: {
    content: { type: String, default: '' },
    senderType: { type: String, enum: ['customer', 'agent', 'system'], default: 'customer' },
    type: { type: String, default: 'text' },
    timestamp: { type: Date, default: Date.now }
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'frustrated', 'urgent'],
    default: 'neutral'
  },
  intent: {
    type: String,
    default: 'General Inquiry'
  },
  summary: {
    type: String,
    default: ''
  }
}, { timestamps: true });

conversationSchema.index({ isArchived: 1, isPinned: -1, updatedAt: -1 });
conversationSchema.index({ customer: 1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });
conversationSchema.index({ assignedAgent: 1 });
conversationSchema.index({ status: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
