import express from 'express';
import { Customer } from '../models/Customer.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Setting } from '../models/Setting.js';
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

    // Lookup customer by Phone number or Name if sessionId not found
    if (!customer) {
      const searchConditions = [];
      if (phone && phone.trim() !== '') {
        const cleanPhone = phone.trim();
        const digitsOnly = cleanPhone.replace(/\D/g, '');
        searchConditions.push({ phone: cleanPhone });
        if (digitsOnly.length >= 6) {
          searchConditions.push({ phone: new RegExp(digitsOnly + '$', 'i') });
        }
      }
      if (name && name.trim() !== '') {
        const cleanName = name.trim();
        const firstName = cleanName.split(' ')[0];
        searchConditions.push({ name: new RegExp('^' + firstName, 'i') });
      }

      if (searchConditions.length > 0) {
        customer = await Customer.findOne({ $or: searchConditions });
        if (customer) {
          if (name && name.trim() !== '') customer.name = name.trim();
          if (phone && phone.trim() !== '') customer.phone = phone.trim();
          customer.lastSeen = new Date();
          await customer.save();
        }
      }
    }

    if (!customer) {
      sessionId = sessionId || uuidv4();
      const defaultName = isGuest ? `Guest_${Math.floor(1000 + Math.random() * 9000)}` : (name || 'Anonymous User');
      const defaultPhone = phone ? phone.trim() : `+1 (${Math.floor(100 + Math.random() * 899)}) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`;

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
      if (name && name.trim() !== '') {
        customer.name = name.trim();
        if (!name.startsWith('Guest_')) {
          customer.isGuest = false;
        }
      }
      if (phone && phone.trim() !== '') customer.phone = phone.trim();
      customer.lastSeen = new Date();
      await customer.save();
    }

    // Find or create active conversation for this customer
    let conversation = await Conversation.findOne({ customer: customer._id })
      .populate('assignedAgent', 'name avatar role email phone status');

    let welcomeMessage = `💎 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 DlAM0ND 𝐄𝐗𝐂𝐇𝐀𝐍𝐆𝐄 💎
𝐈𝐍𝐃𝐈𝐀’𝐒 𝐅𝐈𝐑𝐒𝐓 𝐌𝐄𝐓𝐀 𝐕𝐄𝐑𝐈𝐅𝐈𝐄𝐃 ✅ 𝐄𝐗𝐂𝐇𝐀𝐍𝐆𝐄 𝐁𝐑𝐀𝐍𝐃
━━━━━━━━━━━━━━━
Available site

https://allpanelexch9.game
━━━━━━━━━━━━━━━
𝐌𝐢𝐧𝐢𝐦𝐮𝐦 🆔 @ 𝟐𝟎𝟎
𝐌𝐢𝐧𝐢𝐦𝐮𝐦 𝐁€T@ 𝟏𝟎𝟎
𝐂𝐫𝐞𝐚𝐭𝐞 𝐘𝐨𝐮𝐫 🆔𝐓𝐡𝐫𝐨𝐮𝐠𝐡 𝐔𝐬 & 𝐆𝐞𝐭 𝟓% 𝐁0𝐍𝐔𝐒
⚡ 𝐅𝐚𝐬𝐭 𝐃𝐞-𝐩𝐨𝐬𝐢𝐭 & 𝐖𝐢𝐭𝐡-𝐝𝐫𝐚𝐰𝐚𝐥
🔒 𝐒𝐞𝐜𝐮𝐫𝐞 & 𝐓𝐫𝐮𝐬𝐭-𝐞𝐝 𝐏𝐥𝐚𝐭𝐟𝐨𝐫𝐦
𝟐𝟒𝐱𝟕 𝐂𝐮𝐬𝐭𝐨𝐦𝐞𝐫 𝐒𝐮𝐩𝐩𝐨𝐫𝐭
━━━━━━━━━━━━━━━
𝐈𝐍𝐃𝐈𝐀’𝐒 𝐅𝐈𝐑𝐒𝐓 𝐅𝐑𝐄𝐄 𝐏𝐑𝐄𝐃𝐈𝐂𝐓 & 𝐖𝐈𝐍 𝐒𝐈𝐓𝐄

Note :- ( Humare yaha first dep0zit pe 5% b0nu$ milega )`;

    const namePromptMessage = 'Please enter your name for Id';

    if (!conversation) {
      conversation = await Conversation.create({
        customer: customer._id,
        status: 'open',
        priority: 'medium',
        lastMessage: {
          content: namePromptMessage,
          senderType: 'agent',
          timestamp: new Date()
        }
      });

      // Send initial prompt asking for name for ID
      await Message.create({
        conversation: conversation._id,
        senderType: 'agent',
        senderId: 'agent_auto_prompt',
        senderName: 'Support Official',
        content: namePromptMessage
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('assignedAgent', 'name avatar role email phone status');

      if (req.io && !customer.isGuest && customer.name && !customer.name.startsWith('Guest_')) {
        req.io.to('agent_workspace_room').emit('new_conversation', conversation);
      }
    } else {
      // If conversation exists with 0 messages, ensure initial prompt is present
      const msgCount = await Message.countDocuments({ conversation: conversation._id });
      if (msgCount === 0) {
        await Message.create({
          conversation: conversation._id,
          senderType: 'agent',
          senderId: 'agent_auto_prompt',
          senderName: 'Support Official',
          content: namePromptMessage
        });
      }
    }

    const { Message } = await import('../models/Message.js');
    const messages = await Message.find({ conversation: conversation._id })
      .populate('replyTo')
      .sort({ createdAt: 1 });

    res.json({
      customer,
      conversation,
      messages
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
