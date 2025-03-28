import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send } from "lucide-react";

// Types for conversation and message
interface Conversation {
  otherUser: {
    id: number;
    username: string;
    email: string;
    university: string;
  };
  listing: {
    id: number;
    title: string;
    price: number;
    images?: string[];
  };
  lastMessage: {
    id: number;
    content: string;
    createdAt: string;
    read: boolean;
    senderId: number;
    receiverId: number;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  read: boolean;
  senderId: number;
  receiverId: number;
  listingId: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  // Fetch messages for active conversation
  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [
      `/api/messages/${activeConversation?.otherUser.id}/${activeConversation?.listing.id}`,
    ],
    enabled: !!activeConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeConversation) return;
      
      const message = {
        receiverId: activeConversation.otherUser.id,
        listingId: activeConversation.listing.id,
        content,
      };
      
      await apiRequest("POST", "/api/messages", message);
    },
    onSuccess: () => {
      setMessageContent("");
      // Refetch messages and conversations
      queryClient.invalidateQueries({ 
        queryKey: [
          `/api/messages/${activeConversation?.otherUser.id}/${activeConversation?.listing.id}`,
        ] 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !activeConversation) return;
    
    try {
      await sendMessageMutation.mutateAsync(messageContent);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Format date for display
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this week, show day
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  // Format date for conversation list
  const formatConversationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this week, show day
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pb-16 sm:pb-8">
        <Card className="h-[calc(100vh-220px)]">
          <CardHeader className="p-4 border-b">
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 h-full">
            {/* Conversations list */}
            <div className="border-r">
              <div className="p-4 border-b">
                <Input
                  type="text"
                  placeholder="Search messages..."
                  className="w-full"
                />
              </div>
              
              <Tabs defaultValue="all" className="w-full">
                <div className="px-4 pt-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="unread" className="flex-1">Unread</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="all" className="m-0">
                  <ScrollArea className="h-[calc(100vh-340px)]">
                    {isLoadingConversations ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : conversations && conversations.length > 0 ? (
                      conversations.map((conversation) => (
                        <div 
                          key={`${conversation.otherUser.id}-${conversation.listing.id}`}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            activeConversation && 
                            activeConversation.otherUser.id === conversation.otherUser.id && 
                            activeConversation.listing.id === conversation.listing.id
                              ? 'bg-gray-100'
                              : ''
                          }`}
                          onClick={() => setActiveConversation(conversation)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src="" alt={conversation.otherUser.username} />
                              <AvatarFallback>
                                {conversation.otherUser.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h3 className="font-medium truncate">{conversation.otherUser.username}</h3>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatConversationDate(conversation.lastMessage.createdAt)}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600 truncate">
                                {conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}
                                {truncateText(conversation.lastMessage.content, 30)}
                              </p>
                              
                              <div className="flex items-center mt-1">
                                <p className="text-xs text-gray-500 truncate mr-2">
                                  {truncateText(conversation.listing.title, 20)}
                                </p>
                                
                                {conversation.unreadCount > 0 && (
                                  <Badge className="ml-auto bg-primary text-white">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <p>No messages yet</p>
                        <p className="text-sm">Start browsing listings to connect with sellers</p>
                        <Link href="/">
                          <Button className="mt-4">Browse Listings</Button>
                        </Link>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="unread" className="m-0">
                  <ScrollArea className="h-[calc(100vh-340px)]">
                    {isLoadingConversations ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : conversations && conversations.filter(c => c.unreadCount > 0).length > 0 ? (
                      conversations
                        .filter(conversation => conversation.unreadCount > 0)
                        .map((conversation) => (
                          <div 
                            key={`unread-${conversation.otherUser.id}-${conversation.listing.id}`}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                              activeConversation && 
                              activeConversation.otherUser.id === conversation.otherUser.id && 
                              activeConversation.listing.id === conversation.listing.id
                                ? 'bg-gray-100'
                                : ''
                            }`}
                            onClick={() => setActiveConversation(conversation)}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src="" alt={conversation.otherUser.username} />
                                <AvatarFallback>
                                  {conversation.otherUser.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-medium truncate">{conversation.otherUser.username}</h3>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatConversationDate(conversation.lastMessage.createdAt)}
                                  </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 truncate font-medium">
                                  {truncateText(conversation.lastMessage.content, 30)}
                                </p>
                                
                                <div className="flex items-center mt-1">
                                  <p className="text-xs text-gray-500 truncate mr-2">
                                    {truncateText(conversation.listing.title, 20)}
                                  </p>
                                  
                                  <Badge className="ml-auto bg-primary text-white">
                                    {conversation.unreadCount}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <p>No unread messages</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Message thread */}
            <div className="md:col-span-2 flex flex-col h-full">
              {activeConversation ? (
                <>
                  {/* Conversation header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src="" alt={activeConversation.otherUser.username} />
                        <AvatarFallback>
                          {activeConversation.otherUser.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{activeConversation.otherUser.username}</h3>
                        <p className="text-xs text-gray-500">{activeConversation.otherUser.university}</p>
                      </div>
                    </div>
                    
                    <Link href={`/listings/${activeConversation.listing.id}`}>
                      <Button variant="outline" size="sm">View Listing</Button>
                    </Link>
                  </div>
                  
                  {/* Listing info */}
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center">
                      <div 
                        className="h-12 w-12 rounded bg-center bg-cover mr-3" 
                        style={{ 
                          backgroundImage: `url(${
                            activeConversation.listing.images && activeConversation.listing.images.length > 0
                              ? activeConversation.listing.images[0]
                              : 'https://via.placeholder.com/100?text=No+Image'
                          })` 
                        }}
                      />
                      <div>
                        <h4 className="font-medium">{truncateText(activeConversation.listing.title, 40)}</h4>
                        <p className="text-sm text-primary font-medium">
                          {formatCurrency(activeConversation.listing.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isCurrentUser = message.senderId === user?.id;
                          
                          return (
                            <div 
                              key={message.id} 
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div 
                                className={`max-w-[75%] rounded-lg p-3 ${
                                  isCurrentUser 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p 
                                  className={`text-xs mt-1 ${
                                    isCurrentUser ? 'text-primary-foreground/70' : 'text-gray-500'
                                  }`}
                                >
                                  {formatMessageDate(message.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col justify-center items-center text-center text-gray-500">
                        <p>Start the conversation with {activeConversation.otherUser.username}</p>
                        <p className="text-sm mt-1">
                          Ask questions about {truncateText(activeConversation.listing.title, 30)}
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Message input */}
                  <div className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Textarea 
                        placeholder={`Message ${activeConversation.otherUser.username}...`}
                        className="resize-none min-h-[60px]"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        className="h-[60px] w-[60px]"
                        disabled={!messageContent.trim() || sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col justify-center items-center p-8 text-center text-gray-500">
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p>Choose a conversation from the list to view messages</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </main>
      <MobileNav />
    </div>
  );
}
