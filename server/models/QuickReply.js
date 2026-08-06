import mongoose from 'mongoose';

const quickReplySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  shortcut: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  }
}, { timestamps: true });

export const QuickReply = mongoose.model('QuickReply', quickReplySchema);
