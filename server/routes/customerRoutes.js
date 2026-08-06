import express from 'express';
import { Customer } from '../models/Customer.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// @route POST /api/customer/init
// Register or restore customer session and get or create active conversation
router.post('/init', async (req, res) => {
  try {
    let { sessionId, name, phone, isGuest, metadata } = req.body;

    let customer = null;

    if (sessionId) {
      customer = await Customer.findOne({ sessionId });
    }

    if (!customer) {
      sessionId = sessionId || uuidv4();
      const defaultName = isGuest ? `Guest_${Math.floor(1000 + Math.random() * 9000)}` : (name || 'Anonymous User');
      const defaultPhone = phone || `+1 (${Math.floor(100 + Math.random() * 899)}) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`;

      customer = await Customer.create({
        sessionId,
        name: defaultName,
        phone: defaultPhone,
        isGuest: isGuest || false,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(defaultName)}`,
        metadata: metadata || {}
      });
    } else {
      // Update customer details if provided
      if (name && name !== customer.name) customer.name = name;
      if (phone && phone !== customer.phone) customer.phone = phone;
      customer.lastSeen = new Date();
      await customer.save();
    }

    // Find or create active conversation for this customer
    let conversation = await Conversation.findOne({ customer: customer._id })
      .populate('assignedAgent', 'name avatar role email phone status');

    if (!conversation) {
      conversation = await Conversation.create({
        customer: customer._id,
        status: 'open',
        priority: 'medium',
        lastMessage: {
          content: 'Hello! How can we help you today?',
          senderType: 'system',
          timestamp: new Date()
        }
      });

      // Send initial welcome message
      await Message.create({
        conversation: conversation._id,
        senderType: 'system',
        senderId: 'system',
        senderName: 'Support System',
        content: `👋 Welcome to our Live Support, ${customer.name}! An agent will be with you shortly. Feel free to describe your issue or ask any questions.`
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('assignedAgent', 'name avatar role email phone status');

      if (req.io) {
        req.io.to('agent_workspace_room').emit('new_conversation', conversation);
      }
    }

    res.json({
      customer,
      conversation
    });
  } catch (error) {
    console.error('Customer init error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/customer/session/:sessionId
router.get('/session/:sessionId', async (req, res) => {
  try {
    const customer = await Customer.findOne({ sessionId: req.params.sessionId });
    if (!customer) {
      return res.status(404).json({ message: 'Session not found' });
    }
    const conversation = await Conversation.findOne({ customer: customer._id })
      .populate('assignedAgent', 'name avatar role email phone status');

    res.json({ customer, conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
