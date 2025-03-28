import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Message } from '@shared/schema';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

// Define message types that match the server types
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

// Message interface
interface WebSocketMessage {
  type: MessageType;
  payload: any;
}

interface OnlineUsers {
  [userId: number]: boolean;
}

interface TypingStatus {
  [key: string]: boolean; // Format: `${userId}-${listingId}`
}

type WebSocketContextType = {
  connected: boolean;
  sendMessage: (receiverId: number, listingId: number, content: string) => void;
  markAsRead: (messageId: number) => void;
  setTyping: (receiverId: number, listingId: number, isTyping: boolean) => void;
  onlineUsers: OnlineUsers;
  typingUsers: TypingStatus;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const socket = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({});
  const [typingUsers, setTypingUsers] = useState<TypingStatus>({});
  
  // Connect to WebSocket
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) {
      setConnected(false);
      return;
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    socket.current = new WebSocket(wsUrl);
    
    // Setup event handlers
    socket.current.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };
    
    socket.current.onclose = (event) => {
      console.log('WebSocket disconnected', event);
      setConnected(false);
      
      // Reconnect after a delay if disconnected abnormally
      if (event.code !== 1000) {
        setTimeout(() => {
          // Reconnect only if user is still authenticated
          if (user) {
            console.log('Reconnecting WebSocket...');
            const newProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const newWsUrl = `${newProtocol}//${window.location.host}/ws?userId=${user.id}`;
            socket.current = new WebSocket(newWsUrl);
          }
        }, 5000);
      }
    };
    
    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to messaging service',
        variant: 'destructive',
      });
    };
    
    socket.current.onmessage = (event) => {
      handleIncomingMessage(event.data);
    };
    
    // Clean up on unmount
    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, [user, toast]);
  
  const handleIncomingMessage = (data: string) => {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      
      switch (message.type) {
        case MessageType.MESSAGE:
          handleNewMessage(message.payload);
          break;
        case MessageType.READ_RECEIPT:
          handleReadReceipt(message.payload);
          break;
        case MessageType.USER_ONLINE:
          handleUserStatus(message.payload.userId, true);
          break;
        case MessageType.USER_OFFLINE:
          handleUserStatus(message.payload.userId, false);
          break;
        case MessageType.TYPING:
          handleTypingStatus(message.payload.senderId, message.payload.listingId, true);
          break;
        case MessageType.STOPPED_TYPING:
          handleTypingStatus(message.payload.senderId, message.payload.listingId, false);
          break;
        case MessageType.ERROR:
          handleError(message.payload);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };
  
  const handleNewMessage = (message: Message) => {
    // Play sound for new messages
    const audio = new Audio('/message-notification.mp3');
    audio.play().catch(e => console.log('Error playing sound:', e));
    
    // Show toast notification if message is from someone else
    if (message.senderId !== user?.id) {
      toast({
        title: 'New Message',
        description: 'You have received a new message',
      });
    }
    
    // Invalidate cached messages to trigger a refetch
    queryClient.invalidateQueries({
      queryKey: ['/api/messages', message.senderId, message.listingId]
    });
    
    // Also invalidate conversations list
    queryClient.invalidateQueries({
      queryKey: ['/api/messages']
    });
  };
  
  const handleReadReceipt = (payload: { messageId: number }) => {
    // Update the UI to show message as read
    // This will come from the invalidated queries
    queryClient.invalidateQueries({
      queryKey: ['/api/messages']
    });
  };
  
  const handleUserStatus = (userId: number, isOnline: boolean) => {
    setOnlineUsers(prev => ({
      ...prev,
      [userId]: isOnline
    }));
  };
  
  const handleTypingStatus = (userId: number, listingId: number, isTyping: boolean) => {
    const key = `${userId}-${listingId}`;
    
    setTypingUsers(prev => ({
      ...prev,
      [key]: isTyping
    }));
    
    // Automatically clear typing indicator after 5 seconds as a fallback
    if (isTyping) {
      setTimeout(() => {
        setTypingUsers(prev => ({
          ...prev,
          [key]: false
        }));
      }, 5000);
    }
  };
  
  const handleError = (payload: { message: string }) => {
    toast({
      title: 'Messaging Error',
      description: payload.message,
      variant: 'destructive',
    });
  };
  
  // Send a message
  const sendMessage = (receiverId: number, listingId: number, content: string) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
      toast({
        title: 'Connection Error',
        description: 'Not connected to the messaging service',
        variant: 'destructive',
      });
      return;
    }
    
    const message: WebSocketMessage = {
      type: MessageType.MESSAGE,
      payload: {
        receiverId,
        listingId,
        content
      }
    };
    
    socket.current.send(JSON.stringify(message));
  };
  
  // Mark message as read
  const markAsRead = (messageId: number) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) return;
    
    const message: WebSocketMessage = {
      type: MessageType.READ_RECEIPT,
      payload: {
        messageId
      }
    };
    
    socket.current.send(JSON.stringify(message));
  };
  
  // Send typing status
  const setTyping = (receiverId: number, listingId: number, isTyping: boolean) => {
    if (!socket.current || socket.current.readyState !== WebSocket.OPEN) return;
    
    const message: WebSocketMessage = {
      type: isTyping ? MessageType.TYPING : MessageType.STOPPED_TYPING,
      payload: {
        receiverId,
        listingId
      }
    };
    
    socket.current.send(JSON.stringify(message));
  };
  
  return (
    <WebSocketContext.Provider
      value={{
        connected,
        sendMessage,
        markAsRead,
        setTyping,
        onlineUsers,
        typingUsers
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}