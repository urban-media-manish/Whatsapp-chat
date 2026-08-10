import express from 'express';
import { Conversation } from '../models/Conversation.js';
import { Customer } from '../models/Customer.js';
import { Note } from '../models/Note.js';
import { QuickReply } from '../models/QuickReply.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route GET /api/conversations
// Fetch conversations for Admin sidebar with filters
router.get('/', protect, async (req, res) => {
  try {
    const { status, filter, priority, tag, search, agentId } = req.query;

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (tag) {
      query.tags = tag;
    }

    if (filter === 'unread') {
      query.unreadCount = { $gt: 0 };
    } else if (filter === 'archived') {
      query.isArchived = true;
    } else if (filter === 'pinned') {
      query.isPinned = true;
    } else if (filter === 'mine') {
      query.assignedAgent = req.user._id;
    } else {
      query.isArchived = false; // Default: exclude archived unless specified
    }

    if (agentId) {
      query.assignedAgent = agentId;
    }

    let conversations = await Conversation.find(query)
      .populate('customer')
      .populate('assignedAgent', 'name avatar role email phone status')
      .sort({ isPinned: -1, updatedAt: -1 });

    if (search && search.trim() !== '') {
      const s = search.toLowerCase();
      conversations = conversations.filter(conv => {
        const custName = conv.customer?.name?.toLowerCase() || '';
        const custPhone = conv.customer?.phone?.toLowerCase() || '';
        const lastMsg = conv.lastMessage?.content?.toLowerCase() || '';
        return custName.includes(s) || custPhone.includes(s) || lastMsg.includes(s);
      });
    }

    // Deduplicate conversations by unique customer name / phone number
    const seenKeys = new Set();
    const deduplicatedConvs = [];

    for (const conv of conversations) {
      const custName = (conv.customer?.name || '').toLowerCase().trim();
      const firstName = custName.split(' ')[0];
      const key = (firstName && firstName !== 'anonymous' && !firstName.startsWith('guest_'))
        ? firstName
        : (conv.customer?.phone ? conv.customer.phone.trim() : conv._id.toString());

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduplicatedConvs.push(conv);
      }
    }

    res.json(deduplicatedConvs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/conversations/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('customer')
      .populate('assignedAgent', 'name avatar role email phone status');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Reset unread count for agents
    conversation.unreadCount = 0;
    await conversation.save();

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/conversations/:id/assign
router.put('/:id/assign', protect, async (req, res) => {
  try {
    const { agentId } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    conversation.assignedAgent = agentId || null;
    await conversation.save();

    const updated = await Conversation.findById(req.params.id)
      .populate('customer')
      .populate('assignedAgent', 'name avatar role email phone status');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/conversations/:id/status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, priority } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    if (status) conversation.status = status;
    if (priority) conversation.priority = priority;

    await conversation.save();
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/conversations/:id/toggle-pin
router.put('/:id/toggle-pin', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    conversation.isPinned = !conversation.isPinned;
    await conversation.save();
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/conversations/:id/toggle-archive
router.put('/:id/toggle-archive', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    conversation.isArchived = !conversation.isArchived;
    await conversation.save();
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/conversations/:id/customer-actions (Block / Mute)
router.put('/:id/customer-actions', protect, async (req, res) => {
  try {
    const { blocked, muted } = req.body;
    const conversation = await Conversation.findById(req.params.id).populate('customer');
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    if (typeof blocked !== 'undefined') conversation.customer.blocked = blocked;
    if (typeof muted !== 'undefined') conversation.customer.muted = muted;
    await conversation.customer.save();

    res.json({ blocked: conversation.customer.blocked, muted: conversation.customer.muted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/conversations/:id/tags
router.post('/:id/tags', protect, async (req, res) => {
  try {
    const { tag } = req.body;
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    if (!conversation.tags.includes(tag)) {
      conversation.tags.push(tag);
      await conversation.save();
    }
    res.json(conversation.tags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route DELETE /api/conversations/:id/tags/:tag
router.delete('/:id/tags/:tag', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    conversation.tags = conversation.tags.filter(t => t !== req.params.tag);
    await conversation.save();
    res.json(conversation.tags);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET & POST /api/conversations/:id/notes (Internal Notes)
router.get('/:id/notes', protect, async (req, res) => {
  try {
    const notes = await Note.find({ conversation: req.params.id }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/notes', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const note = await Note.create({
      conversation: req.params.id,
      agent: req.user._id,
      agentName: req.user.name,
      content
    });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET & POST /api/conversations/quick-replies
router.get('/meta/quick-replies', protect, async (req, res) => {
  try {
    let replies = await QuickReply.find({});
    if (replies.length === 0) {
      replies = await QuickReply.insertMany([
        { title: 'Welcome Greeting', shortcut: 'welcome', content: 'Hello! Thank you for reaching out to us. How can I assist you today?' },
        { title: 'Pricing & Plans', shortcut: 'pricing', content: 'You can check out our standard pricing and subscription tiers at domain.com/pricing.' },
        { title: 'Technical Support', shortcut: 'tech', content: 'Could you please provide your account ID and a screenshot of the error you are seeing?' },
        { title: 'Closing Ticket', shortcut: 'close', content: 'Glad we could resolve your query today! I am going to mark this ticket as resolved. Have a great day!' }
      ]);
    }
    res.json(replies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route DELETE /api/conversations/:id
// Delete complete conversation chat and all its messages
router.delete('/:id', protect, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const { Message } = await import('../models/Message.js');
    await Message.deleteMany({ conversation: conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    // Broadcast socket event
    if (req.io) {
      req.io.emit('conversation_deleted', { conversationId });
    }

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
