import express from 'express';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { onlineAgents, onlineCustomers, activeChatRooms } from '../socket/index.js';

const router = express.Router();

// @route GET /api/messages/:conversationId
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversation: conversationId })
      .populate('replyTo')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/messages
router.post('/', async (req, res) => {
  try {
    const {
      conversationId,
      senderType,
      senderId,
      senderName,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      replyToId
    } = req.body;

    let replyToSnippet = null;
    if (replyToId) {
      const origMsg = await Message.findById(replyToId);
      if (origMsg) {
        replyToSnippet = {
          content: origMsg.content || origMsg.fileName || 'Attachment',
          senderName: origMsg.senderName,
          type: origMsg.type
        };
      }
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    let initialStatus = 'sent';
    if (senderType === 'customer') {
      const isAgentOnline = onlineAgents.size > 0;
      if (isAgentOnline) {
        let isAgentInThisRoom = false;
        const agentSocketIds = new Set(onlineAgents.values());
        for (const [sId, convId] of activeChatRooms.entries()) {
          if (convId === conversationId && agentSocketIds.has(sId)) {
            isAgentInThisRoom = true;
            break;
          }
        }
        initialStatus = isAgentInThisRoom ? 'read' : 'delivered';
      } else {
        initialStatus = 'sent';
      }
    } else if (senderType === 'agent') {
      const custId = conversation.customer.toString();
      const customerSocketId = onlineCustomers.get(custId);
      if (customerSocketId) {
        const openConvId = activeChatRooms.get(customerSocketId);
        initialStatus = openConvId === conversationId ? 'read' : 'delivered';
      } else {
        initialStatus = 'sent';
      }
    }

    const message = await Message.create({
      conversation: conversationId,
      senderType,
      senderId,
      senderName,
      content: content || '',
      type: type || 'text',
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      mimeType: mimeType || '',
      replyTo: replyToId || null,
      replyToSnippet,
      status: initialStatus
    });

    // Update conversation lastMessage & unread counts
    if (conversation) {
      conversation.lastMessage = {
        content: content || fileName || `[${type || 'attachment'}]`,
        senderType,
        type: type || 'text',
        timestamp: new Date()
      };

      if (senderType === 'customer') {
        if (initialStatus === 'read') {
          conversation.unreadCount = 0;
        } else {
          conversation.unreadCount += 1;
        }
      } else if (senderType === 'agent') {
        if (initialStatus === 'read') {
          conversation.unreadCountCustomer = 0;
        } else {
          conversation.unreadCountCustomer += 1;
        }
      }

      await conversation.save();
    }

    const populatedMsg = await Message.findById(message._id).populate('replyTo');

    res.status(201).json(populatedMsg);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/messages/:id/edit
router.put('/:id/edit', async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.content = content;
    message.isEdited = true;
    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route DELETE /api/messages/:id
router.delete('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.isDeleted = true;
    message.content = 'This message was deleted';
    message.fileUrl = '';
    await message.save();

    if (req.io) {
      req.io.emit('message_deleted', { messageId: message._id, conversationId: message.conversation });
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route POST /api/messages/:id/react
router.post('/:id/react', async (req, res) => {
  try {
    const { emoji, by, byName } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const existingIdx = message.reactions.findIndex(r => r.by === by && r.emoji === emoji);
    if (existingIdx > -1) {
      // Toggle off reaction
      message.reactions.splice(existingIdx, 1);
    } else {
      // Filter out previous reaction by same user if any, then add new one
      message.reactions = message.reactions.filter(r => r.by !== by);
      message.reactions.push({ emoji, by, byName });
    }

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route PUT /api/messages/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body; // 'delivered' | 'read'
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.status = status;
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
