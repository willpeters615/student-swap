import { Server } from 'http';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import * as ws from 'ws';
import { log } from './vite';
import { storage } from './storage';
import { Message } from '@shared/schema';

// Message types for our WebSocket protocol
export enum MessageType {
  CONNECT = 'connect',
  MESSAGE = 'message',
  READ_RECEIPT = 'read_receipt',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  TYPING = 'typing',
  STOPPED_TYPING = 'stopped_typing',
  ERROR = 'error'
}

// Interface for WebSocket message format
interface WebSocketMessage {
  type: MessageType;
  payload: any;
}

// For tracking active connections
interface Connection {
  userId: number;
  socket: any; // WebSocket instance
  isAlive: boolean;
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
    this.wss.on('connection', (socket, request) => {
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
      
      // Store connection
      this.connections.set(userId, {
        userId,
        socket,
        isAlive: true
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
      const { receiverId, listingId, content } = payload;
      
      if (!receiverId || !listingId || !content) {
        log('Invalid message payload', 'websocket');
        return;
      }
      
      // Save message to database
      const message = await storage.createMessage({
        senderId,
        receiverId,
        listingId,
        content
      });
      
      // Send to recipient if online
      this.sendToUser(receiverId, {
        type: MessageType.MESSAGE,
        payload: message
      });
      
      // Also send back to sender for confirmation
      this.sendToUser(senderId, {
        type: MessageType.MESSAGE,
        payload: message
      });
      
      log(`Message from user ${senderId} to ${receiverId} sent`, 'websocket');
    } catch (error) {
      log(`Error sending message: ${error}`, 'websocket');
    }
  }
  
  private async handleReadReceipt(userId: number, payload: any) {
    try {
      const { messageId } = payload;
      
      if (!messageId) {
        log('Invalid read receipt payload', 'websocket');
        return;
      }
      
      // Update message read status
      const message = await storage.markMessageAsRead(messageId);
      
      if (message && message.senderId !== null && message.senderId !== undefined) {
        // Notify the original sender their message was read
        this.sendToUser(message.senderId as number, {
          type: MessageType.READ_RECEIPT,
          payload: { messageId }
        });
      }
    } catch (error) {
      log(`Error processing read receipt: ${error}`, 'websocket');
    }
  }
  
  private handleTypingIndicator(senderId: number, payload: any, isTyping: boolean) {
    try {
      const { receiverId, listingId } = payload;
      
      if (!receiverId || !listingId) {
        log('Invalid typing indicator payload', 'websocket');
        return;
      }
      
      // Send typing indicator to recipient
      this.sendToUser(receiverId, {
        type: isTyping ? MessageType.TYPING : MessageType.STOPPED_TYPING,
        payload: { senderId, listingId }
      });
    } catch (error) {
      log(`Error sending typing indicator: ${error}`, 'websocket');
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
  
  private sendToUser(userId: number, message: WebSocketMessage) {
    const connection = this.connections.get(userId);
    const OPEN = 1; // WebSocket.OPEN constant value
    
    if (connection && connection.socket.readyState === OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  }
  
  private sendError(socket: any, errorMessage: string) {
    const OPEN = 1; // WebSocket.OPEN constant value
    
    if (socket.readyState === OPEN) {
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