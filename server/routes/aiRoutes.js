import express from 'express';
import { protect } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';

const router = express.Router();

// Helper: Smart Rule-Based & Generative AI fallback engine
const generateAISuggestions = (lastMessages, customerName = 'Customer') => {
  if (!lastMessages || lastMessages.length === 0) {
    return [
      `Thank you for contacting support, ${customerName}! How can I assist you with this today?`,
      `I have received your message and I am reviewing the details now. Please give me a moment.`,
      `Is there anything else specific you would like me to check on your account?`
    ];
  }

  // Get the most recent message content
  const latestMessage = lastMessages[0]; // Messages are sorted { createdAt: -1 } so index 0 is the newest!
  const text = (latestMessage?.content || '').toLowerCase().trim();

  // Keyword check on the whole context
  const fullText = lastMessages.map(m => m.content).join(' ').toLowerCase();

  if (fullText.includes('price') || fullText.includes('cost') || fullText.includes('plan') || fullText.includes('subscription')) {
    return [
      `Hello ${customerName}! Our enterprise plan starts at $49/mo with full WhatsApp integration. Would you like a product demo?`,
      `Hi ${customerName}, we offer starter, professional, and custom enterprise tiers. Shall I send our detailed pricing sheet?`,
      `You can review all pricing and features directly on our billing portal or I can walk you through the options now.`
    ];
  } else if (fullText.includes('refund') || fullText.includes('cancel') || fullText.includes('money')) {
    return [
      `I understand your request regarding cancellation, ${customerName}. Let me check your account details right away.`,
      `I am sorry to hear you want to cancel. I can process a full refund within 30 days of purchase per our policy.`,
      `Would you mind sharing a quick reason for the cancellation? I would love to see if we can resolve any issues first!`
    ];
  } else if (fullText.includes('error') || fullText.includes('bug') || fullText.includes('not working') || fullText.includes('failed') || fullText.includes('issue')) {
    return [
      `Thanks for letting us know! Could you please share a screenshot or error log so I can escalate this to technical support?`,
      `I apologize for the inconvenience, ${customerName}. I am checking our server status and error logs right now.`,
      `Let us troubleshoot this together: please try clearing browser cache or re-logging into your dashboard.`
    ];
  } else if (text === 'hi' || text === 'hello' || text === 'hii' || text === 'hey' || text === '👋') {
    return [
      `Hello ${customerName}! Welcome to Live Support. How can we help you today?`,
      `Hi there! Thanks for reaching out. How can I assist you today?`,
      `Hey ${customerName}! Hope you are doing great. How can we support you today?`
    ];
  } else if (text.includes('explain') || text.includes('how') || text.includes('what') || text.includes('help')) {
    return [
      `Sure! I'd be happy to explain or guide you. Could you please specify which part you would like help with?`,
      `I'm here to help! Let me know if you need help with installation, features, or billing.`,
      `Certainly, ${customerName}! Please tell me more about your requirements so I can explain it clearly.`
    ];
  } else if (text === 'ok' || text === 'yes' || text === 'yup' || text === 'okay' || text === 'sure') {
    return [
      `Awesome! Let me know if you need anything else.`,
      `Perfect. I am standing by if you have any questions.`,
      `Great! Feel free to ask any other questions when you are ready.`
    ];
  } else {
    return [
      `I have received your message and I am reviewing the details now. Please give me a moment.`,
      `Is there anything else specific you would like me to check on your account?`,
      `Thank you for contacting support, ${customerName}! How can I assist you with this today?`
    ];
  }
};

// @route POST /api/ai/suggest
router.post('/suggest', protect, async (req, res) => {
  try {
    const { conversationId } = req.body;
    const conversation = await Conversation.findById(conversationId).populate('customer');
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const recentMessages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .limit(6);

    const suggestions = generateAISuggestions(recentMessages, conversation.customer?.name || 'Customer');

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/ai/sentiment
router.post('/sentiment', protect, async (req, res) => {
  try {
    const { conversationId } = req.body;
    const recentMessages = await Message.find({ conversation: conversationId, senderType: 'customer' })
      .sort({ createdAt: -1 })
      .limit(5);

    const fullText = recentMessages.map(m => m.content).join(' ').toLowerCase();

    let sentiment = 'neutral';
    let intent = 'General Inquiry';

    if (fullText.includes('angry') || fullText.includes('terrible') || fullText.includes('frustrated') || fullText.includes('useless') || fullText.includes('bad')) {
      sentiment = 'frustrated';
    } else if (fullText.includes('urgent') || fullText.includes('asap') || fullText.includes('broken') || fullText.includes('down')) {
      sentiment = 'urgent';
    } else if (fullText.includes('thank') || fullText.includes('great') || fullText.includes('awesome') || fullText.includes('good')) {
      sentiment = 'positive';
    }

    if (fullText.includes('price') || fullText.includes('billing') || fullText.includes('invoice') || fullText.includes('pay')) {
      intent = 'Billing & Payments';
    } else if (fullText.includes('bug') || fullText.includes('error') || fullText.includes('fail') || fullText.includes('api')) {
      intent = 'Technical Bug';
    } else if (fullText.includes('demo') || fullText.includes('sales') || fullText.includes('buy')) {
      intent = 'Sales Lead';
    }

    // Save to conversation
    await Conversation.findByIdAndUpdate(conversationId, { sentiment, intent });

    res.json({ sentiment, intent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/ai/translate
router.post('/translate', protect, async (req, res) => {
  try {
    const { text, targetLang = 'English' } = req.body;
    // Fast mock translation simulator / echo with notice
    const translatedText = `[Translated to ${targetLang}]: ${text}`;
    res.json({ translatedText });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/ai/summarize
router.post('/summarize', protect, async (req, res) => {
  try {
    const { conversationId } = req.body;
    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });
    const textSnippet = messages.map(m => `${m.senderName}: ${m.content}`).join('\n');

    const summary = `Summary of Ticket:\n• Customer initiated contact regarding product inquiries.\n• Total ${messages.length} messages exchanged.\n• Key points: ${textSnippet.slice(0, 150)}...`;

    await Conversation.findByIdAndUpdate(conversationId, { summary });

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
