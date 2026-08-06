export const setupSocket = (io) => {
  // Store connected users / socket mappings
  const onlineAgents = new Map(); // userId -> socketId
  const onlineCustomers = new Map(); // customerId/sessionId -> socketId

  io.on('connection', (socket) => {
    console.log(`🔌 New Socket Connection: ${socket.id}`);

    // Join conversation room
    socket.on('join_conversation', ({ conversationId, role, userId }) => {
      socket.join(`conv_${conversationId}`);
      console.log(`👤 Socket ${socket.id} (${role}) joined conv_${conversationId}`);

      if (role === 'agent') {
        onlineAgents.set(userId, socket.id);
        io.emit('agent_status_change', { userId, status: 'online' });
      } else if (role === 'customer') {
        onlineCustomers.set(userId, socket.id);
        io.emit('customer_presence', { customerId: userId, status: 'online' });
      }
    });

    // Join Agent global admin stream
    socket.on('join_agent_workspace', ({ userId }) => {
      socket.join('agent_workspace_room');
      onlineAgents.set(userId, socket.id);
    });

    // Typing Status Broadcasting
    socket.on('typing_start', ({ conversationId, senderName, senderType }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        senderName,
        senderType,
        isTyping: true
      });
    });

    socket.on('typing_stop', ({ conversationId, senderType }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        senderType,
        isTyping: false
      });
    });

    // Real-time message dispatch
    socket.on('send_message', (messageData) => {
      // Broadcast message to everyone in conversation room except sender
      socket.to(`conv_${messageData.conversation}`).emit('receive_message', messageData);

      // Broadcast update to global agent workspace list (for sidebar unread badges and live updates)
      io.to('agent_workspace_room').emit('conversation_activity', messageData);
    });

    // Reaction update
    socket.on('message_reaction', ({ conversationId, messageId, reactions }) => {
      io.to(`conv_${conversationId}`).emit('reaction_updated', { messageId, reactions });
    });

    // Read receipt
    socket.on('mark_read', ({ conversationId, readerType }) => {
      io.to(`conv_${conversationId}`).emit('messages_read_ack', { conversationId, readerType });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Socket Disconnected: ${socket.id}`);
    });
  });
};
