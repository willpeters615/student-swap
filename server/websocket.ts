import { Server } from 'http';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import * as ws from 'ws';
import { log } from './vite';
import { storage } from './storage';
import { Message, InsertMessage } from '@shared/schema';
import { db } from './db';
import { eq, and } from 'drizzle-orm/expressions';
import { conversationParticipants, messages } from '@shared/schema';

// Message types for our WebSocket protocol
export enum MessageType {
  CONNECT = 'connect',
  MESSAGE = 'message',
  READ_RECEIPT = 'read_receipt',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  TYPING = 'typing',
  STOPPED_TYPING = 'stopped_typing',
  ERROR = 'error',
  NEW_MESSAGE = 'new_message',
  MESSAGES_CLEARED = 'messages_cleared' // Add message clearing type
}

// Interface for WebSocket message format
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
}

// For tracking active connections
interface Connection {
  userId: number;
  socket: WebSocket;
  isAlive: boolean;
  subscribedConversations: Set<number>;
}

export class WebSocketServer {
  private wss: WSServer;
  private connections: Map<number, Connection> = new Map();
  
  constructor(server: Server) {
    this.wss = new WSServer({ 
      server, 
      path: '/ws' // Set a specific path to avoid conflicts with Vite's WebSocket
    });
    this.init();
    log('WebSocket server initialized on path: /ws', 'websocket');
  }
  
  private init() {
    this.wss.on('connection', async (socket, request) => {
      log('New WebSocket connection', 'websocket');
      
      // Set a timeout for authentication
      const authTimeout = setTimeout(() => {
        socket.close(1008, 'Authentication timeout');
      }, 10000); // 10 seconds to authenticate
      
      // Parse userId from query params
      const userId = this.getUserIdFromRequest(request);
      if (!userId) {
        log('Authentication failed - no userId', 'websocket');
        socket.close(1008, 'Authentication required');
        clearTimeout(authTimeout);
        return;
      }
      
      // Find all conversations this user participates in
      const userConversations = await this.getUserConversations(userId);
      
      // Store connection
      this.connections.set(userId, {
        userId,
        socket,
        isAlive: true,
        subscribedConversations: new Set(userConversations)
      });
      
      // Clear authentication timeout
      clearTimeout(authTimeout);
      
      // Setup ping/pong for connection health check
      socket.on('pong', () => {
        const connection = this.connections.get(userId);
        if (connection) {
          connection.isAlive = true;
        }
      });
      
      // Send connect message to client
      this.sendToUser(userId, {
        type: MessageType.CONNECT,
        payload: {
          userId,
          conversations: Array.from(userConversations)
        }
      });
      
      // Broadcast user online
      this.broadcastUserStatus(userId, true);
      
      // Handle incoming messages
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleIncomingMessage(userId, message);
        } catch (error) {
          log(`Error handling message: ${error}`, 'websocket');
          this.sendError(socket, 'Invalid message format');
        }
      });
      
      // Handle disconnection
      socket.on('close', () => {
        log(`User ${userId} disconnected`, 'websocket');
        this.connections.delete(userId);
        this.broadcastUserStatus(userId, false);
      });
    });
    
    // Set up interval to check connection health
    setInterval(() => {
      this.wss.clients.forEach((socket) => {
        if ((socket as any).isAlive === false) {
          return socket.terminate();
        }
        
        (socket as any).isAlive = false;
        socket.ping();
      });
    }, 30000); // Check every 30 seconds
  }
  
  private getUserIdFromRequest(request: any): number | null {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const userId = url.searchParams.get('userId');
      if (!userId) return null;
      
      const parsedId = parseInt(userId);
      if (isNaN(parsedId)) return null;
      
      return parsedId;
    } catch (error) {
      log(`Error parsing userId: ${error}`, 'websocket');
      return null;
    }
  }
  
  private async getUserConversations(userId: number): Promise<number[]> {
    try {
      // Use storage layer to get all conversations for this user
      const conversations = await storage.getConversationsByUserId(userId);
      return conversations.map(c => c.id).filter((id): id is number => id !== null);
    } catch (error) {
      log(`Error getting user conversations: ${error}`, 'websocket');
      return [];
    }
  }
  
  private async handleIncomingMessage(senderId: number, wsMessage: WebSocketMessage) {
    switch (wsMessage.type) {
      case MessageType.MESSAGE:
        await this.handleChatMessage(senderId, wsMessage.payload);
        break;
      case MessageType.READ_RECEIPT:
        await this.handleReadReceipt(senderId, wsMessage.payload);
        break;
      case MessageType.TYPING:
        this.handleTypingIndicator(senderId, wsMessage.payload, true);
        break;
      case MessageType.STOPPED_TYPING:
        this.handleTypingIndicator(senderId, wsMessage.payload, false);
        break;
      default:
        log(`Unknown message type: ${wsMessage.type}`, 'websocket');
    }
  }
  
  private async handleChatMessage(senderId: number, payload: any) {
    try {
      // Extract message data
      const { conversationId, receiverId, listingId, content, attachment } = payload;
      
      // Handle the message differently based on whether we have a conversation ID or not
      let effectiveConversationId = conversationId;
      
      // If no conversationId is provided but we have receiverId, try to find or create a conversation
      if (!effectiveConversationId && receiverId) {
        log(`No conversationId provided, looking up conversation between ${senderId} and ${receiverId}`, 'websocket');
        
        // Try to find an existing conversation between these users for this listing
        const existingConversation = await storage.getConversationByParticipants(senderId, receiverId, listingId);
        
        if (existingConversation) {
          // Use the existing conversation
          effectiveConversationId = existingConversation.id;
          log(`Found existing conversation ${effectiveConversationId}`, 'websocket');
        } else {
          // Create a new conversation
          log(`Creating new conversation between ${senderId} and ${receiverId}`, 'websocket');
          const newConversation = await storage.createConversation({
            listingId: listingId || null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Add participants
          await storage.addParticipantToConversation({
            conversationId: newConversation.id,
            userId: senderId,
            lastReadAt: new Date()
          });
          
          await storage.addParticipantToConversation({
            conversationId: newConversation.id,
            userId: receiverId,
            lastReadAt: null
          });
          
          effectiveConversationId = newConversation.id;
          log(`Created new conversation ${effectiveConversationId}`, 'websocket');
        }
      }
      
      if (!effectiveConversationId || !content) {
        log('Invalid message payload: missing conversationId or content', 'websocket');
        return;
      }
      
      // Verify sender is part of the conversation
      const isParticipant = await this.isUserInConversation(senderId, effectiveConversationId);
      if (!isParticipant) {
        log(`User ${senderId} attempted to send message to conversation ${effectiveConversationId} they're not part of`, 'websocket');
        
        const connection = this.connections.get(senderId);
        if (connection) {
          this.sendError(connection.socket, 'Not authorized to send messages in this conversation');
        }
        return;
      }
      
      // Process attachment if present
      let attachmentUrl = null;
      let hasAttachment = false;
      
      if (attachment && attachment.data) {
        // This would normally handle file uploads, but for simplicity we're
        // just setting a flag that an attachment exists
        hasAttachment = true;
        attachmentUrl = attachment.url || null;
      }
      
      // Save message to database using storage layer
      const messageData: InsertMessage = {
        conversationId: effectiveConversationId,
        senderId,
        content,
        hasAttachment,
        attachmentUrl,
        readAt: null
      };
      
      console.log(`Creating message in conversation ${effectiveConversationId} from user ${senderId}: ${content}`);
      
      // Insert message
      const message = await storage.createMessage(messageData);
      
      // Update conversation's updatedAt timestamp
      await storage.updateConversationTimestamp(effectiveConversationId);
      
      // Get all participants in this conversation
      const participants = await storage.getConversationParticipants(effectiveConversationId);
      
      // Broadcast message to all participants
      for (const participant of participants) {
        // Skip sender
        if (participant.userId === senderId) continue;
        
        // Send to participant if online and userId is not null
        if (participant.userId !== null) {
          this.sendToUser(participant.userId, {
            type: MessageType.MESSAGE,
            payload: {
              message,
              conversationId: effectiveConversationId
            }
          });
        }
      }
      
      // Also send back to sender for confirmation
      this.sendToUser(senderId, {
        type: MessageType.MESSAGE,
        payload: {
          message,
          conversationId: effectiveConversationId
        }
      });
      
      log(`Message in conversation ${effectiveConversationId} from user ${senderId} sent`, 'websocket');
    } catch (error) {
      log(`Error sending message: ${error}`, 'websocket');
    }
  }
  
  private async isUserInConversation(userId: number, conversationId: number): Promise<boolean> {
    try {
      // Use storage layer to get participants
      const participants = await storage.getConversationParticipants(conversationId);
      return participants.some(p => p.userId === userId);
    } catch (error) {
      log(`Error checking if user is in conversation: ${error}`, 'websocket');
      return false;
    }
  }
  
  private async handleReadReceipt(userId: number, payload: any) {
    try {
      const { conversationId } = payload;
      
      if (!conversationId) {
        log('Invalid read receipt payload', 'websocket');
        return;
      }
      
      // Verify user is part of the conversation
      const isParticipant = await this.isUserInConversation(userId, conversationId);
      if (!isParticipant) {
        log(`User ${userId} attempted to mark messages as read in conversation ${conversationId} they're not part of`, 'websocket');
        return;
      }
      
      // Update last read timestamp
      await storage.markConversationAsRead(conversationId, userId);
      
      // Get all participants in this conversation
      const participants = await storage.getConversationParticipants(conversationId);
      
      // Notify other participants
      for (const participant of participants) {
        // Skip the user who marked as read
        if (participant.userId === userId) continue;
        
        // Send read receipt to participant if online
        this.sendToUser(participant.userId, {
          type: MessageType.READ_RECEIPT,
          payload: {
            conversationId,
            userId
          }
        });
      }
    } catch (error) {
      log(`Error processing read receipt: ${error}`, 'websocket');
    }
  }
  
  private handleTypingIndicator(senderId: number, payload: any, isTyping: boolean) {
    try {
      // Support both targetId (which can be conversationId) and legacy conversationId
      const targetId = payload.targetId || payload.conversationId;
      
      if (!targetId) {
        log('Invalid typing indicator payload', 'websocket');
        return;
      }
      
      // Send typing indicator to all participants in the conversation
      this.broadcastToConversation(targetId, senderId, {
        type: isTyping ? MessageType.TYPING : MessageType.STOPPED_TYPING,
        payload: {
          targetId, // Using the same consistent field as from the client
          userId: senderId
        }
      });
    } catch (error) {
      log(`Error sending typing indicator: ${error}`, 'websocket');
    }
  }
  
  private async broadcastToConversation(
    conversationId: number, 
    excludeUserId: number, 
    message: WebSocketMessage
  ) {
    try {
      // Get all participants in this conversation
      const participants = await storage.getConversationParticipants(conversationId);
      
      // Send to all participants except the excluded user
      for (const participant of participants) {
        if (participant.userId !== excludeUserId) {
          this.sendToUser(participant.userId, message);
        }
      }
    } catch (error) {
      log(`Error broadcasting to conversation: ${error}`, 'websocket');
    }
  }
  
  private broadcastUserStatus(userId: number, isOnline: boolean) {
    const messageType = isOnline ? MessageType.USER_ONLINE : MessageType.USER_OFFLINE;
    
    // Broadcast to all connected users
    this.connections.forEach((connection) => {
      if (connection.userId !== userId) {
        this.sendToUser(connection.userId, {
          type: messageType,
          payload: { userId }
        });
      }
    });
  }
  
  public sendToUser(userId: number | null, message: WebSocketMessage) {
    if (userId === null) return;
    
    const connection = this.connections.get(userId);
    
    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  }
  
  private sendError(socket: WebSocket, errorMessage: string) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: MessageType.ERROR,
        payload: { message: errorMessage }
      }));
    }
  }
  
  public isUserOnline(userId: number): boolean {
    return this.connections.has(userId);
  }
  
  public getOnlineUsers(): number[] {
    return Array.from(this.connections.keys());
  }
  
  public addUserToConversation(userId: number, conversationId: number) {
    const connection = this.connections.get(userId);
    if (connection) {
      connection.subscribedConversations.add(conversationId);
    }
  }
  
  // Broadcast a message to all connected clients
  public broadcast(message: WebSocketMessage) {
    this.connections.forEach((connection) => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.send(JSON.stringify(message));
      }
    });
  }
}

// Create and export the WebSocket service
let wsServer: WebSocketServer | null = null;

export function setupWebSocketServer(server: Server): WebSocketServer {
  if (!wsServer) {
    wsServer = new WebSocketServer(server);
  }
  return wsServer;
}

export function getWebSocketServer(): WebSocketServer | null {
  return wsServer;
}