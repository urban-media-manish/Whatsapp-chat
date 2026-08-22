import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { Customer } from '../models/Customer.js';

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

      // Automatically mark all messages as READ when room is opened (non-blocking)
      Message.updateMany(
        { conversation: conversationId, status: { $ne: 'read' } },
        { $set: { status: 'read' } }
      ).then(() => {
        if (role === 'agent') {
          Conversation.findByIdAndUpdate(conversationId, { unreadCount: 0 }).catch(() => {});
        } else if (role === 'customer') {
          Conversation.findByIdAndUpdate(conversationId, { unreadCountCustomer: 0 }).catch(() => {});
        }
        io.emit('messages_read_ack', { conversationId, readerType: role });
      }).catch(err => console.error('Error marking messages read on room join:', err));
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

    // Real-time message dispatch & Tick status evaluation (0ms INSTANT)
    socket.on('send_message', (messageData) => {
      try {
        let finalStatus = messageData.status || 'sent';

        if (messageData.senderType === 'customer') {
          // Customer sent message -> evaluate Agent presence & active room in-memory
          const isAnyAgentOnline = onlineAgents.size > 0;

          if (!isAnyAgentOnline) {
            finalStatus = 'sent';
          } else {
            let isAgentInThisRoom = false;
            const agentSocketIds = new Set(onlineAgents.values());
            for (const [sId, convId] of activeChatRooms.entries()) {
              if (convId === messageData.conversation && agentSocketIds.has(sId)) {
                isAgentInThisRoom = true;
                break;
              }
            }
            finalStatus = isAgentInThisRoom ? 'read' : 'delivered';
          }
        } else if (messageData.senderType === 'agent') {
          let isCustomerInThisRoom = false;
          const customerSocketIds = new Set(onlineCustomers.values());
          for (const [sId, convId] of activeChatRooms.entries()) {
            if (convId === messageData.conversation && customerSocketIds.has(sId)) {
              isCustomerInThisRoom = true;
              break;
            }
          }
          finalStatus = isCustomerInThisRoom ? 'read' : 'delivered';
        }

        messageData.status = finalStatus;

        // 1. INSTANT BROADCAST (<1ms): Broadcast to open chat room and admin workspace immediately
        socket.to(`conv_${messageData.conversation}`).emit('receive_message', messageData);
        io.to('agent_workspace_room').emit('conversation_activity', messageData);
        socket.emit('message_status_update', {
          messageId: messageData._id,
          status: finalStatus,
          conversationId: messageData.conversation
        });

        // 2. BACKGROUND NON-BLOCKING DB SYNC:
        (async () => {
          try {
            if (messageData._id && !messageData._id.startsWith('temp_')) {
              await Message.findByIdAndUpdate(messageData._id, { status: finalStatus });
            }
            if (messageData.conversation) {
              const now = new Date();
              const updatePayload = {
                lastMessage: {
                  content: messageData.content || messageData.fileName || `[${messageData.type || 'text'}]`,
                  senderType: messageData.senderType,
                  type: messageData.type || 'text',
                  timestamp: now
                },
                updatedAt: now
              };

              if (messageData.senderType === 'customer' && finalStatus !== 'read') {
                await Conversation.findByIdAndUpdate(messageData.conversation, {
                  $set: updatePayload,
                  $inc: { unreadCount: 1 }
                });
              } else {
                await Conversation.findByIdAndUpdate(messageData.conversation, {
                  $set: updatePayload
                });
              }

              if (messageData.senderType === 'customer') {
                const conv = await Conversation.findById(messageData.conversation).select('customer');
                if (conv?.customer) {
                  await Customer.findByIdAndUpdate(conv.customer, {
                    $set: { isGuest: false, lastSeen: now }
                  });
                }
              }
            }
          } catch (dbErr) {
            console.error('Background DB sync error in send_message:', dbErr);
          }
        })();
      } catch (err) {
        console.error('Error in send_message socket handler:', err);
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
