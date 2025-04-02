import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import Header from "@/components/layout/header";
import MobileNav from "@/components/layout/mobile-nav";
import { ChatInterface } from "@/components/messages/chat-interface";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// Types for conversation and message
interface Conversation {
  id: number;
  otherUser: {
    id: number;
    username: string;
    email: string;
    university: string;
    verified: boolean | null;
    createdAt: Date | null;
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
    createdAt: string | null;
    read: boolean;
    senderId: number;
    receiverId: number;
  };
  unreadCount: number;
  updatedAt?: string;
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
  const { onlineUsers } = useWebSocket();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch conversations
  const { data: conversations, isLoading: isLoadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/messages"],
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds as fallback
  });

  // Format date for conversation list
  const formatConversationDate = (dateString: string | null) => {
    // Return a placeholder if dateString is null or undefined
    if (!dateString) {
      return "Recent";
    }
    
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
                      conversations
                        .filter(conv => conv && conv.lastMessage) // Filter out conversations with missing lastMessage
                        .map((conversation) => (
                        <div 
                          key={`conversation-${conversation.id}`}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                            activeConversation && 
                            activeConversation.id === conversation.id
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
                                  {conversation.listing ? truncateText(conversation.listing.title, 20) : "No listing"}
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
                    ) : conversations && conversations.filter(c => c && c.lastMessage && c.unreadCount > 0).length > 0 ? (
                      conversations
                        .filter(conversation => conversation && conversation.lastMessage && conversation.unreadCount > 0)
                        .map((conversation) => (
                          <div 
                            key={`unread-conversation-${conversation.id}`}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                              activeConversation && 
                              activeConversation.id === conversation.id
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
                                    {conversation.listing ? truncateText(conversation.listing.title, 20) : "No listing"}
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
            <div className={`md:col-span-2 flex flex-col h-full ${activeConversation && isMobileView ? 'fixed inset-0 z-50 bg-white' : ''}`}>
              {isMobileView && activeConversation && (
                <div className="md:hidden p-2 bg-background border-b">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setActiveConversation(null)}
                    className="flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2"><path d="m15 18-6-6 6-6"></path></svg>
                    Back to conversations
                  </Button>
                </div>
              )}
              
              {activeConversation && activeConversation.otherUser && activeConversation.listing ? (
                <ChatInterface 
                  otherUser={activeConversation.otherUser}
                  listingId={activeConversation.listing.id}
                  listingTitle={activeConversation.listing.title}
                  onBack={() => setActiveConversation(null)} 
                />
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
