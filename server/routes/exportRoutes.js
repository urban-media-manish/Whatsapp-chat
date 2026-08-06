import express from 'express';
import { protect } from '../middleware/auth.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

// @route GET /api/export/csv/:conversationId
router.get('/csv/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId).populate('customer');
    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });

    let csvContent = 'Timestamp,Sender Type,Sender Name,Content,Type,Status\n';

    messages.forEach(msg => {
      const time = new Date(msg.createdAt).toISOString();
      const senderType = msg.senderType;
      const senderName = `"${(msg.senderName || '').replace(/"/g, '""')}"`;
      const content = `"${(msg.content || msg.fileName || '').replace(/"/g, '""')}"`;
      const type = msg.type;
      const status = msg.status;
      csvContent += `${time},${senderType},${senderName},${content},${type},${status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${conversationId}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route GET /api/export/pdf/:conversationId
router.get('/pdf/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId).populate('customer').populate('assignedAgent');
    const messages = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="chat-transcript-${conversationId}.pdf"`);
    doc.pipe(res);

    // Document Header
    doc.fontSize(20).fillColor('#005c4b').text('Live Support Chat Transcript', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#444').text(`Customer: ${conversation?.customer?.name || 'N/A'} (${conversation?.customer?.phone || 'N/A'})`);
    doc.text(`Assigned Agent: ${conversation?.assignedAgent?.name || 'Unassigned'}`);
    doc.text(`Status: ${conversation?.status?.toUpperCase()} | Priority: ${conversation?.priority?.toUpperCase()}`);
    doc.text(`Export Date: ${new Date().toLocaleString()}`);
    doc.moveDown();
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown();

    // Messages
    messages.forEach(msg => {
      const isCustomer = msg.senderType === 'customer';
      const color = isCustomer ? '#075e54' : '#128c7e';
      const sender = msg.senderName || (isCustomer ? 'Customer' : 'Support Agent');
      const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      doc.fontSize(10).fillColor(color).text(`${sender} [${time}]:`, { continued: false });
      doc.fontSize(9).fillColor('#222222').text(msg.content || `[Attachment: ${msg.fileName || msg.type}]`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
