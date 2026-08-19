// Socket presence & Real-time WhatsApp tick tracker
export const onlineAgents = new Map(); // userId -> socketId
export const onlineCustomers = new Map(); // customerId/sessionId -> socketId
export const activeChatRooms = new Map(); // socketId -> conversationId

export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 New Socket Connection: ${socket.id}`);

    // Send initial agent presence to newly connected socket
    socket.emit('agent_presence', {
      status: onlineAgents.size > 0 ? 'online' : 'offline',
      onlineCount: onlineAgents.size
    });

    // Join Agent global admin stream
    socket.on('join_agent_workspace', ({ userId }) => {
      socket.join('agent_workspace_room');
      onlineAgents.set(userId, socket.id);
      console.log(`🟢 Agent ${userId} is ONLINE (Socket: ${socket.id})`);
      io.emit('agent_presence', { status: 'online', onlineCount: onlineAgents.size });
      // Send all current online customer IDs to this admin
      socket.emit('online_customers_list', {
        onlineCustomers: Array.from(onlineCustomers.keys())
      });
    });

    // Join specific conversation room (Chat opened on screen)
    socket.on('join_conversation', async ({ conversationId, role, userId }) => {
      socket.join(`conv_${conversationId}`);
      activeChatRooms.set(socket.id, conversationId);
      console.log(`👤 Socket ${socket.id} (${role}) joined & opened conv_${conversationId}`);

      if (role === 'agent' && userId) {
        onlineAgents.set(userId, socket.id);
        io.emit('agent_presence', { status: 'online', onlineCount: onlineAgents.size });
      } else if (role === 'customer' && userId) {
        onlineCustomers.set(userId, socket.id);
        // Broadcast to admin workspace that customer is online
        io.to('agent_workspace_room').emit('customer_presence', {
          customerId: userId,
          status: 'online',
          onlineCustomers: Array.from(onlineCustomers.keys())
        });
        // Reply with current agent presence status
        socket.emit('agent_presence', {
          status: onlineAgents.size > 0 ? 'online' : 'offline',
          onlineCount: onlineAgents.size
        });
      }

      // Automatically mark all messages as READ when room is opened
      try {
        const { Message } = await import('../models/Message.js');
        const { Conversation } = await import('../models/Conversation.js');

        await Message.updateMany(
          { conversation: conversationId, status: { $ne: 'read' } },
          { $set: { status: 'read' } }
        );

        if (role === 'agent') {
          await Conversation.findByIdAndUpdate(conversationId, { unreadCount: 0 });
        } else if (role === 'customer') {
          await Conversation.findByIdAndUpdate(conversationId, { unreadCountCustomer: 0 });
        }

        io.emit('messages_read_ack', { conversationId, readerType: role });
      } catch (err) {
        console.error('Error marking messages read on room join:', err);
      }
    });

    // Leave specific conversation room (Chat closed on screen)
    socket.on('leave_conversation', ({ conversationId }) => {
      socket.leave(`conv_${conversationId}`);
      activeChatRooms.delete(socket.id);
      console.log(`👤 Socket ${socket.id} closed & left conv_${conversationId}`);
    });

    // Typing Status Broadcasting
    socket.on('typing_start', ({ conversationId, senderName, senderType }) => {
      socket.to(`conv_${conversationId}`).emit('user_typing', {
        conversationId,
        senderName,
        senderType,
        isTyping: true
      });
      io.to('agent_workspace_room').emit('user_typing', {
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
      io.to('agent_workspace_room').emit('user_typing', {
        conversationId,
        senderType,
        isTyping: false
      });
    });

    // Real-time message dispatch & Tick status evaluation
    socket.on('send_message', async (messageData) => {
      try {
        const { Message } = await import('../models/Message.js');
        let finalStatus = messageData.status || 'sent';

        if (messageData.senderType === 'customer') {
          // Customer sent message -> evaluate Agent presence & active room
          const isAnyAgentOnline = onlineAgents.size > 0;

          if (!isAnyAgentOnline) {
            // Agent Offline -> Single Gray Tick (sent)
            finalStatus = 'sent';
          } else {
            // Agent Online -> Check if an AGENT socket has THIS conversation open on screen
            let isAgentInThisRoom = false;
            const agentSocketIds = new Set(onlineAgents.values());
            for (const [sId, convId] of activeChatRooms.entries()) {
              if (convId === messageData.conversation && agentSocketIds.has(sId)) {
                isAgentInThisRoom = true;
                break;
              }
            }

            if (isAgentInThisRoom) {
              // Agent is viewing this chat -> Double Blue Cyan Tick (read)
              finalStatus = 'read';
            } else {
              // Agent is online but chat is not open -> Double Gray Tick (delivered)
              finalStatus = 'delivered';
            }
          }
        } else if (messageData.senderType === 'agent') {
          // Agent sent message -> evaluate Customer presence
          let isCustomerInThisRoom = false;
          const customerSocketIds = new Set(onlineCustomers.values());
          for (const [sId, convId] of activeChatRooms.entries()) {
            if (convId === messageData.conversation && customerSocketIds.has(sId)) {
              isCustomerInThisRoom = true;
              break;
            }
          }

          if (isCustomerInThisRoom) {
            finalStatus = 'read';
          } else {
            finalStatus = 'delivered';
          }
        }

        // Update DB status if changed
        if (messageData._id && !messageData._id.startsWith('temp_') && finalStatus !== messageData.status) {
          await Message.findByIdAndUpdate(messageData._id, { status: finalStatus });
          messageData.status = finalStatus;
        }

        // Keep Conversation and Customer state synced
        if (messageData.conversation) {
          const { Conversation } = await import('../models/Conversation.js');
          const { Customer } = await import('../models/Customer.js');
          const conv = await Conversation.findById(messageData.conversation);
          if (conv) {
            conv.lastMessage = {
              content: messageData.content || messageData.fileName || `[${messageData.type || 'text'}]`,
              senderType: messageData.senderType,
              type: messageData.type || 'text',
              timestamp: new Date()
            };
            conv.updatedAt = new Date();
            if (messageData.senderType === 'customer' && finalStatus !== 'read') {
              conv.unreadCount = (conv.unreadCount || 0) + 1;
            }
            await conv.save();

            if (messageData.senderType === 'customer' && conv.customer) {
              await Customer.findByIdAndUpdate(conv.customer, {
                $set: { isGuest: false, lastSeen: new Date() }
              });
            }
          }
        }

        // Broadcast message to everyone in conversation room except sender
        socket.to(`conv_${messageData.conversation}`).emit('receive_message', messageData);

        // Notify sender of status update (Single tick / Double tick / Blue tick)
        socket.emit('message_status_update', { messageId: messageData._id, status: finalStatus, conversationId: messageData.conversation });

        // Broadcast update to global agent workspace list
        io.to('agent_workspace_room').emit('conversation_activity', messageData);
        io.to('agent_workspace_room').emit('new_conversation');
      } catch (err) {
        console.error('Error evaluating message tick status:', err);
        socket.to(`conv_${messageData.conversation}`).emit('receive_message', messageData);
      }
    });

    // Reaction update
    socket.on('message_reaction', ({ conversationId, messageId, reactions }) => {
      io.to(`conv_${conversationId}`).emit('reaction_updated', { messageId, reactions });
    });

    // Explicit Read receipt (Blue Ticks)
    socket.on('mark_read', async ({ conversationId, readerType }) => {
      try {
        const { Message } = await import('../models/Message.js');
        const { Conversation } = await import('../models/Conversation.js');

        await Message.updateMany(
          { conversation: conversationId, status: { $ne: 'read' } },
          { $set: { status: 'read' } }
        );

        if (readerType === 'agent') {
          await Conversation.findByIdAndUpdate(conversationId, { unreadCount: 0 });
        } else if (readerType === 'customer') {
          await Conversation.findByIdAndUpdate(conversationId, { unreadCountCustomer: 0 });
        }

        io.emit('messages_read_ack', { conversationId, readerType });
      } catch (err) {
        console.error('Error updating read status:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ Socket Disconnected: ${socket.id}`);
      
      // Clean up maps
      for (const [uId, sId] of onlineAgents.entries()) {
        if (sId === socket.id) {
          onlineAgents.delete(uId);
          console.log(`🔴 Agent ${uId} is OFFLINE`);
          io.emit('agent_presence', { status: 'offline', onlineCount: onlineAgents.size });
          break;
        }
      }

      for (const [cId, sId] of onlineCustomers.entries()) {
        if (sId === socket.id) {
          onlineCustomers.delete(cId);
          console.log(`🔴 Customer ${cId} is OFFLINE`);
          io.to('agent_workspace_room').emit('customer_presence', {
            customerId: cId,
            status: 'offline',
            onlineCustomers: Array.from(onlineCustomers.keys())
          });
          break;
        }
      }

      activeChatRooms.delete(socket.id);
    });
  });
};
