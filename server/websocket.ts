import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import { storage } from './storage';

// Message types
enum MessageType {
  CONNECT = 'connect',
  MESSAGE = 'message',
  READ_RECEIPT = 'read_receipt',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  TYPING = 'typing',
  STOPPED_TYPING = 'stopped_typing',
  ATTACHMENT = 'attachment',
  ERROR = 'error'
}

// Interface for WebSocket clients with user information
interface Client {
  ws: WebSocket;
  userId: number;
  lastActive: number;
}

export function setupWebSocketServer(server: Server) {
  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws' 
  });
  
  console.log('WebSocket server initialized');
  
  // Track connected clients by userId
  const clients: Map<number, Client> = new Map();
  
  // Heartbeat interval to detect disconnected clients (every 30 seconds)
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    
    // Check for inactive clients (inactive for more than 60 seconds)
    for (const [userId, client] of clients.entries()) {
      if (now - client.lastActive > 60000) {
        console.log(`Client ${userId} inactive, terminating connection`);
        client.ws.terminate();
        clients.delete(userId);
        
        // Broadcast offline status
        broadcastUserStatus(userId, false);
      }
    }
  }, 30000);
  
  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    // Parse query parameters from URL
    const { query } = parse(req.url || '', true);
    const userId = parseInt(query.userId as string);
    
    if (!userId) {
      console.error('Connection attempt without userId');
      ws.close(1008, 'Missing userId');
      return;
    }
    
    console.log(`User ${userId} connected to WebSocket`);
    
    // Register client
    clients.set(userId, {
      ws,
      userId,
      lastActive: Date.now()
    });
    
    // Broadcast online status to all clients
    broadcastUserStatus(userId, true);
    
    // Send pending messages if any
    // TODO: Implement this with the new schema
    
    // Handle messages
    ws.on('message', async (data) => {
      try {
        const client = clients.get(userId);
        if (!client) return;
        
        // Update last active timestamp
        client.lastActive = Date.now();
        
        // Parse message
        const message = JSON.parse(data.toString());
        
        // Process message based on type
        switch (message.type) {
          case MessageType.MESSAGE:
            await handleChatMessage(userId, message);
            break;
            
          case MessageType.READ_RECEIPT:
            await handleReadReceipt(userId, message);
            break;
            
          case MessageType.TYPING:
          case MessageType.STOPPED_TYPING:
            handleTypingStatus(userId, message);
            break;
            
          case MessageType.ATTACHMENT:
            // Attachment handling will be implemented separately
            ws.send(JSON.stringify({
              type: MessageType.ERROR,
              payload: {
                error: 'Attachment uploading requires using the /api/messages/attachment endpoint'
              }
            }));
            break;
            
          default:
            ws.send(JSON.stringify({
              type: MessageType.ERROR,
              payload: {
                error: 'Unknown message type'
              }
            }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        
        // Send error message back to client
        ws.send(JSON.stringify({
          type: MessageType.ERROR,
          payload: {
            error: 'Failed to process message'
          }
        }));
      }
    });
    
    // Handle disconnections
    ws.on('close', () => {
      console.log(`User ${userId} disconnected from WebSocket`);
      
      // Remove client from registry
      clients.delete(userId);
      
      // Broadcast offline status
      broadcastUserStatus(userId, false);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      clients.delete(userId);
    });
    
    // Send initial connection success message
    ws.send(JSON.stringify({
      type: MessageType.CONNECT,
      payload: {
        message: 'Connected to CampusSwap messaging service'
      }
    }));
  });
  
  // When server closes, clean up
  server.on('close', () => {
    clearInterval(heartbeatInterval);
    
    // Close all connections
    for (const client of clients.values()) {
      client.ws.terminate();
    }
    
    clients.clear();
  });
  
  // Function to handle incoming chat messages
  async function handleChatMessage(senderId: number, message: any) {
    try {
      const { receiverId, listingId, content, attachmentUrl } = message.payload;
      
      // Find or create conversation
      let conversation = await storage.getConversationByListingAndUsers(
        listingId,
        senderId,
        receiverId
      );
      
      // If conversation doesn't exist, create a new one
      if (!conversation) {
        conversation = await storage.createConversation({ listingId });
        
        // Add both participants
        await storage.addParticipantToConversation(conversation.id, senderId);
        await storage.addParticipantToConversation(conversation.id, receiverId);
      }
      
      // Create the new message
      const newMessage = await storage.createMessage({
        conversationId: conversation.id,
        senderId,
        content,
        hasAttachment: !!attachmentUrl,
        attachmentUrl: attachmentUrl || null
      });
      
      // Get all participants in this conversation
      const participants = await storage.getConversationParticipants(conversation.id);
      
      // Send the message to all participants
      for (const participant of participants) {
        // Get the client for this participant
        const client = clients.get(participant.userId);
        
        // Skip if client not found or not connected
        if (!client || client.ws.readyState !== WebSocket.OPEN) continue;
        
        // Send the message
        client.ws.send(JSON.stringify({
          type: MessageType.MESSAGE,
          payload: newMessage
        }));
      }
    } catch (error) {
      console.error('Error handling chat message:', error);
      const client = clients.get(senderId);
      
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({
          type: MessageType.ERROR,
          payload: {
            error: 'Failed to process message'
          }
        }));
      }
    }
  }
  
  // Function to handle read receipts
  async function handleReadReceipt(userId: number, message: any) {
    try {
      const { conversationId, messageId } = message.payload;
      
      // Mark message as read
      if (messageId) {
        await storage.markMessageAsRead(messageId);
      }
      
      // Update participant's last read timestamp
      if (conversationId) {
        await storage.updateParticipantLastRead(conversationId, userId);
      }
      
      // Notify other participants that message was read
      const participants = await storage.getConversationParticipants(conversationId);
      
      for (const participant of participants) {
        // Skip the current user
        if (participant.userId === userId) continue;
        
        // Send read receipt to the participant if they're online
        const client = clients.get(participant.userId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: MessageType.READ_RECEIPT,
            payload: {
              conversationId,
              userId,
              messageId
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error handling read receipt:', error);
    }
  }
  
  // Function to handle typing status
  async function handleTypingStatus(userId: number, message: any) {
    try {
      const { receiverId, listingId, conversationId } = message.payload;
      
      // If we have a conversation ID, use that to find all participants
      if (conversationId) {
        const participants = await storage.getConversationParticipants(conversationId);
        
        // Send typing status to all participants except the sender
        for (const participant of participants) {
          // Skip the user who is typing
          if (participant.userId === userId) continue;
          
          const client = clients.get(participant.userId);
          if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
              type: message.type, // TYPING or STOPPED_TYPING
              payload: {
                senderId: userId,
                conversationId
              }
            }));
          }
        }
      } 
      // If we only have receiverId/listingId, send directly to the receiver
      else if (receiverId && listingId) {
        // First try to find an existing conversation
        const conversation = await storage.getConversationByListingAndUsers(
          listingId,
          userId,
          receiverId
        );
        
        // If conversation exists, use that ID in the typing status
        const typingPayload = conversation 
          ? { senderId: userId, conversationId: conversation.id }
          : { senderId: userId, listingId };
        
        // Send to the specific recipient
        const recipient = clients.get(receiverId);
        if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
          recipient.ws.send(JSON.stringify({
            type: message.type, // TYPING or STOPPED_TYPING
            payload: typingPayload
          }));
        }
      }
    } catch (error) {
      console.error('Error handling typing status:', error);
    }
  }
  
  // Function to broadcast user status (online/offline)
  function broadcastUserStatus(userId: number, isOnline: boolean) {
    const statusType = isOnline ? MessageType.USER_ONLINE : MessageType.USER_OFFLINE;
    
    // Broadcast to all connected clients
    for (const client of clients.values()) {
      // Skip broadcasting to the user themself
      if (client.userId === userId) continue;
      
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({
          type: statusType,
          payload: {
            userId
          }
        }));
      }
    }
  }
  
  return wss;
}