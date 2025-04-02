import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { User, Message } from '@shared/schema';
import { Send, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';
import { MessageType } from '@/hooks/use-websocket';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatInterfaceProps {
  otherUser: Omit<User, 'password'>;
  listingId: number;
  listingTitle: string;
  onBack?: () => void;
}

export function ChatInterface({ otherUser, listingId, listingTitle, onBack }: ChatInterfaceProps) {
  // Ensure verified is non-undefined
  const safeOtherUser: Omit<User, 'password'> = {
    ...otherUser,
    verified: otherUser.verified === undefined ? null : otherUser.verified,
    university: otherUser.university === undefined ? null : otherUser.university,
    createdAt: otherUser.createdAt === undefined ? null : otherUser.createdAt,
  };
  const { user } = useAuth();
  const { sendMessage, markAsRead, setTyping, clearMessages, onlineUsers, typingUsers } = useWebSocket();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Fetch messages
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${safeOtherUser.id}/${listingId}`],
    refetchInterval: 5000, // Fallback polling in case WebSocket fails
  });
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Mark messages as read - using the message schema from the database
  interface NewMessage {
    id: number;
    createdAt: Date | null;
    conversationId: number;
    senderId: number;
    content: string;
    hasAttachment: boolean | null;
    attachmentUrl: string | null;
    readAt: Date | null;
  }
  
  useEffect(() => {
    if (messages && user) {
      // Create a Set to track processed messages and avoid duplicates
      const processedMessageIds = new Set<number>();
      
      messages.forEach(msg => {
        // Skip if we've already processed this message
        if (processedMessageIds.has(msg.id)) return;
        
        // Add to processed set
        processedMessageIds.add(msg.id);
        
        // Only mark other people's unread messages as read
        if (msg.senderId !== user.id && !(msg as unknown as NewMessage).readAt) {
          markAsRead(msg.id);
        }
      });
    }
  }, [messages, user, markAsRead]);
  
  // Handle message input changes with typing indicators
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Use conversation ID if available, otherwise fall back to listing ID
    const targetId = conversationId || listingId;
    
    // Set typing status to true
    setTyping(safeOtherUser.id, targetId, true);
    
    // Set a timeout to set typing status to false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(safeOtherUser.id, targetId, false);
    }, 2000);
  };
  
  // Send a message
  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    // Use conversation ID if available, otherwise fall back to listing ID
    const targetId = conversationId || listingId;
    
    sendMessage(safeOtherUser.id, listingId, message.trim());
    setMessage('');
    
    // Clear typing indicator immediately after sending
    setTyping(safeOtherUser.id, targetId, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
  
  // Handle Enter key to send message
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Clear all messages in the conversation
  const handleClearMessages = () => {
    if (conversationId) {
      clearMessages(conversationId);
    }
  };
  
  // Get the first initial for avatar
  const getInitial = (name: string) => name.charAt(0).toUpperCase();
  
  // Check if the other user is currently typing in this conversation
  // First try conversation-based format, then fall back to the legacy user-listing format
  const conversationId = messages && messages.length > 0 ? messages[0].conversationId : null;
  const isOtherUserTyping = conversationId 
    ? typingUsers[`${safeOtherUser.id}-${conversationId}`] 
    : typingUsers[`${safeOtherUser.id}-${listingId}`];
  
  // Check if the other user is online
  const isOtherUserOnline = onlineUsers[safeOtherUser.id] || false;
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Avatar className="h-10 w-10">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${safeOtherUser.username}`} />
          <AvatarFallback>{getInitial(safeOtherUser.username)}</AvatarFallback>
        </Avatar>
        
        <div className="ml-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{safeOtherUser.username}</span>
            {isOtherUserOnline && (
              <Badge variant="outline" className="bg-green-500 h-2 w-2 rounded-full p-0" />
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            <Link href={`/listings/${listingId}`} className="hover:underline">
              {listingTitle}
            </Link>
          </div>
        </div>
        
        {/* Clear messages button with confirmation dialog */}
        {conversationId && messages && messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Clear messages">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all messages in this conversation. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearMessages}>Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          // Loading state
          Array.from({ length: 5 }).map((_, index) => (
            <div key={`skeleton-${index}`} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] ${index % 2 === 0 ? 'mr-auto' : 'ml-auto'}`}>
                <Skeleton className="h-16 w-64 rounded-xl" />
              </div>
            </div>
          ))
        ) : messages && messages.length > 0 ? (
          // Messages
          messages.map((msg) => {
            const isSentByMe = msg.senderId === user?.id;
            const messageDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
            
            return (
              <div key={`msg-${msg.id}`} className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${isSentByMe ? 'ml-auto' : 'mr-auto'}`}>
                  <div 
                    className={cn(
                      "p-3 rounded-xl", 
                      isSentByMe 
                        ? "bg-primary text-primary-foreground rounded-br-none" 
                        : "bg-muted rounded-bl-none"
                    )}
                  >
                    {msg.content}
                  </div>
                  <div className={`text-xs text-muted-foreground mt-1 ${isSentByMe ? 'text-right' : 'text-left'}`}>
                    {format(messageDate, 'p')}
                    {isSentByMe && (msg as unknown as NewMessage).readAt && <span className="ml-1">✓</span>}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>No messages yet.</p>
            <p>Start a conversation about {listingTitle}!</p>
          </div>
        )}
        
        {/* Typing indicator */}
        {isOtherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-xl max-w-[80%] mr-auto rounded-bl-none">
              <div className="flex space-x-1">
                {/* Use an array to create the dots to avoid duplicate key issues */}
                {[0, 1, 2].map((i) => (
                  <div 
                    key={`typing-dot-${i}`} 
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" 
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-3 border-t">
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none min-h-[60px] max-h-[120px] flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon" 
            className="h-[60px]"
            disabled={!message.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}