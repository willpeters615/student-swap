import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertFavoriteSchema, insertMessageSchema, insertConversationSchema, insertConversationParticipantSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { setupWebSocketServer, getWebSocketServer, MessageType, WebSocketMessage } from "./websocket";
import { migrateMessagingSystem } from "./db-migration";

export async function registerRoutes(app: Express): Promise<Server> {
  // Run database migrations for messaging system
  try {
    console.log("Running messaging system migration...");
    const migrationResult = await migrateMessagingSystem();
    console.log(`Migration completed with result: ${migrationResult}`);
  } catch (error) {
    console.error("Error running database migration:", error);
  }

  // Set up authentication routes
  setupAuth(app);

  // Get all listings with optional filters
  app.get("/api/listings", async (req, res) => {
    try {
      const filter: Record<string, any> = {};

      // Parse query parameters for filtering
      if (req.query.category) {
        filter.category = Array.isArray(req.query.category) 
          ? req.query.category 
          : [req.query.category];
      }
      
      if (req.query.condition) {
        filter.condition = Array.isArray(req.query.condition) 
          ? req.query.condition 
          : [req.query.condition];
      }
      
      if (req.query.minPrice && req.query.maxPrice) {
        const minPrice = parseInt(req.query.minPrice as string);
        const maxPrice = parseInt(req.query.maxPrice as string);
        
        // Custom filter to handle price range
        const listings = await storage.getListings();
        const filteredListings = listings.filter(listing => 
          listing.price >= minPrice && listing.price <= maxPrice
        );
        
        return res.json(filteredListings);
      }
      
      // Enhanced search by title, description, category, or condition
      if (req.query.search) {
        const searchInput = (req.query.search as string).toLowerCase();
        // Split search input into individual terms for better matching
        const searchTerms = searchInput.split(/\s+/).filter(term => term.length > 0);
        
        const listings = await storage.getListings();
        
        // If no search terms after filtering, return all listings
        if (searchTerms.length === 0) {
          return res.json(listings);
        }
        
        const filteredListings = listings.filter(listing => {
          // Fields to search in
          const searchableText = [
            listing.title.toLowerCase(),
            listing.description ? listing.description.toLowerCase() : '',
            listing.category ? listing.category.toLowerCase() : '',
            listing.condition ? listing.condition.toLowerCase() : '',
            listing.type.toLowerCase() // Also search in listing type
          ].join(' ');
          
          // Check if any of the search terms are found in the combined text
          return searchTerms.some(term => searchableText.includes(term));
        });
        
        return res.json(filteredListings);
      }

      const listings = await storage.getListings(filter);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Get a specific listing by ID
  app.get("/api/listings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const listing = await storage.getListing(id);
      
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      // Get the owner details for the listing
      const owner = await storage.getUser(listing.userId ?? 0);
      
      // Remove password from the response
      if (owner) {
        const { password, ...safeOwner } = owner;
        return res.json({ 
          listing, 
          owner: safeOwner 
        });
      }
      
      // If no owner found, still return in expected format
      res.json({ 
        listing, 
        owner: null 
      });
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  // Create a new listing
  app.post("/api/listings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user?.id;
      
      // Validate listing data
      const listingData = insertListingSchema.parse({
        ...req.body,
        userId
      });
      
      const newListing = await storage.createListing(listingData);
      res.status(201).json(newListing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating listing:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  // Update a listing
  app.put("/api/listings/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const listing = await storage.getListing(id);
      
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      if (listing.userId !== req.user?.id) {
        return res.status(403).json({ error: "Not authorized to update this listing" });
      }
      
      // Validate and update listing
      const updatedListing = await storage.updateListing(id, req.body);
      res.json(updatedListing);
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  // Delete a listing
  app.delete("/api/listings/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const id = parseInt(req.params.id);
      const listing = await storage.getListing(id);
      
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      if (listing.userId !== req.user?.id) {
        return res.status(403).json({ error: "Not authorized to delete this listing" });
      }
      
      const deleted = await storage.deleteListing(id);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete listing" });
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  // Favorites endpoints
  
  // Get all favorites for the current user
  app.get("/api/favorites", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const favorites = await storage.getFavoritesByUserId(userId);
      
      // Get the full listing details for each favorite
      const favoritesWithListings = await Promise.all(
        favorites.map(async (favorite) => {
          const listing = await storage.getListing(favorite.listingId || 0);
          return { ...favorite, listing };
        })
      );
      
      res.json(favoritesWithListings);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  // Add a listing to favorites
  app.post("/api/favorites", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      
      // Validate favorite data
      const favoriteData = insertFavoriteSchema.parse({
        userId,
        listingId: req.body.listingId
      });
      
      // Check if already favorited
      const existingFavorite = await storage.getFavorite(userId, favoriteData.listingId || 0);
      
      if (existingFavorite) {
        return res.status(400).json({ error: "Listing already in favorites" });
      }
      
      const newFavorite = await storage.createFavorite(favoriteData);
      res.status(201).json(newFavorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error adding favorite:", error);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  // Remove a listing from favorites
  app.delete("/api/favorites/:listingId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const listingId = parseInt(req.params.listingId);
      
      const deleted = await storage.deleteFavorite(userId, listingId);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(404).json({ error: "Favorite not found" });
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Messages endpoints
  
  // Get all conversations for the current user (DEPRECATED - use /api/conversations instead)
  app.get("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Redirect to the new conversation-based API
      // This prevents TypeScript errors and maintains backward compatibility
      return res.redirect('/api/conversations');
    } catch (error) {
      console.error("Error redirecting to conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages between users for a specific listing (DEPRECATED)
  app.get("/api/messages/:userId/:listingId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const currentUserId = req.user.id;
      const otherUserId = parseInt(req.params.userId);
      const listingId = parseInt(req.params.listingId);
      
      console.log(`Using legacy API: Fetching messages between user ${currentUserId} and user ${otherUserId} for listing ${listingId}`);
      
      // Check if a conversation exists or create one
      let conversation = await storage.getConversationByParticipants(currentUserId, otherUserId, listingId);
      
      if (!conversation) {
        // Create a new conversation if it doesn't exist
        const conversationData = {
          listingId: listingId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        conversation = await storage.createConversation(conversationData);
        
        // Add participants
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId: currentUserId,
          lastReadAt: new Date()
        });
        
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId: otherUserId,
          lastReadAt: null
        });

        // No messages yet in a new conversation
        return res.json([]);
      }
      
      // Get messages for this conversation
      const messages = await storage.getConversationMessages(conversation.id);
      
      // Mark messages as read
      await storage.markConversationAsRead(conversation.id, currentUserId);
      
      // Format messages to match the old API format for compatibility
      const compatibleMessages = messages.map(message => ({
        ...message,
        // Add legacy fields to maintain compatibility
        receiverId: message.senderId !== currentUserId ? currentUserId : otherUserId,
        listingId: listingId,
        read: message.readAt !== null
      }));
      
      res.json(compatibleMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message (DEPRECATED - use /api/conversations/:id/messages instead)
  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const senderId = req.user.id;
      const receiverId = req.body.receiverId;
      const listingId = req.body.listingId || null;
      const content = req.body.content;
      
      if (!receiverId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if a conversation exists or create one
      let conversation = await storage.getConversationByParticipants(senderId, receiverId, listingId);
      
      if (!conversation) {
        // Create a new conversation
        const conversationData = {
          listingId: listingId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        conversation = await storage.createConversation(conversationData);
        
        // Add participants
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId: senderId,
          lastReadAt: new Date()
        });
        
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId: receiverId,
          lastReadAt: null
        });
      }
      
      // Now create the message with the new schema
      const messageData = insertMessageSchema.parse({
        conversationId: conversation.id,
        senderId,
        content,
        hasAttachment: false,
        attachmentUrl: null,
        createdAt: new Date()
      });
      
      const newMessage = await storage.createMessage(messageData);
      
      // Update conversation timestamp
      await storage.updateConversationTimestamp(conversation.id);
      
      // Mark as read for the sender
      await storage.markConversationAsRead(conversation.id, senderId);
      
      // Format the response to match the old API format for compatibility
      const compatibleMessage = {
        ...newMessage,
        // Add legacy fields
        receiverId,
        listingId,
        read: false
      };
      
      // Notify via WebSocket if available
      const wss = getWebSocketServer();
      if (wss) {
        // Using the WebSocket server's sendToUser method instead of direct client access
        wss.sendToUser(receiverId, {
          type: MessageType.NEW_MESSAGE,
          payload: {
            message: newMessage,
            conversationId: conversation.id
          }
        });
      }
      
      res.status(201).json(compatibleMessage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // User profile endpoint
  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Remove password from the response
      const { password, ...safeUser } = user;
      
      // Get user's listings
      const listings = await storage.getListingsByUserId(id);
      
      res.json({ ...safeUser, listings });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // NEW CONVERSATION-BASED MESSAGING ENDPOINTS
  
  // Get all conversations for the current user
  app.get("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const conversations = await storage.getConversationsByUserId(userId);
      
      // Get additional details for each conversation
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conversation) => {
          // Get participants
          const participants = await storage.getConversationParticipants(conversation.id);
          
          // Get the other user in the conversation
          const otherParticipant = participants.find(p => p.userId !== userId);
          if (!otherParticipant) return null;
          
          // Get other user details
          const otherUser = await storage.getUser(otherParticipant.userId || 0);
          if (!otherUser) return null;
          
          // Remove password from the response
          const { password, ...safeUser } = otherUser;
          
          // Get the listing if it exists
          const listing = conversation.listingId 
            ? await storage.getListing(conversation.listingId) 
            : null;
          
          // Get the last message in the conversation
          const messages = await storage.getConversationMessages(conversation.id);
          const lastMessage = messages.length > 0 ? messages[0] : null;
          
          // Count unread messages
          const unreadCount = messages.filter(m => 
            m.senderId !== userId && !m.readAt
          ).length;
          
          return {
            id: conversation.id,
            otherUser: safeUser,
            listing,
            lastMessage,
            unreadCount,
            updatedAt: conversation.updatedAt
          };
        })
      );
      
      // Filter out nulls (conversations where we couldn't get all the details)
      const validConversations = conversationsWithDetails.filter(c => c !== null);
      
      // Sort by most recent update
      validConversations.sort((a, b) => {
        const dateA = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(validConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  
  // Get messages for a specific conversation
  app.get("/api/conversations/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const conversationId = parseInt(req.params.id);
      
      // Verify user is a participant in this conversation
      const participants = await storage.getConversationParticipants(conversationId);
      const userIsParticipant = participants.some(p => p.userId === userId);
      
      if (!userIsParticipant) {
        return res.status(403).json({ error: "Not authorized to view this conversation" });
      }
      
      // Get the conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Get messages in the conversation
      const messages = await storage.getConversationMessages(conversationId);
      
      // Mark messages as read
      await storage.markConversationAsRead(conversationId, userId);
      
      // Get listing details if available
      const listing = conversation.listingId 
        ? await storage.getListing(conversation.listingId) 
        : null;
      
      // Get other participant details
      const otherParticipant = participants.find(p => p.userId !== userId);
      const otherUser = otherParticipant 
        ? await storage.getUser(otherParticipant.userId || 0) 
        : null;
      
      // Remove password from the response
      const safeOtherUser = otherUser ? { 
        ...otherUser, 
        password: undefined 
      } : null;
      
      res.json({
        conversation,
        messages,
        listing,
        otherUser: safeOtherUser
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  // Create or get a conversation with another user about a listing
  app.post("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const currentUserId = req.user.id;
      const otherUserId = parseInt(req.body.userId);
      const listingId = req.body.listingId ? parseInt(req.body.listingId) : undefined;
      
      if (currentUserId === otherUserId) {
        return res.status(400).json({ error: "Cannot create a conversation with yourself" });
      }
      
      // Check if the other user exists
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Check if listing exists if provided
      if (listingId) {
        const listing = await storage.getListing(listingId);
        if (!listing) {
          return res.status(404).json({ error: "Listing not found" });
        }
      }
      
      // Check if a conversation already exists
      let conversation = await storage.getConversationByParticipants(currentUserId, otherUserId, listingId);
      
      if (!conversation) {
        // Create a new conversation
        const conversationData = {
          listingId: listingId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        conversation = await storage.createConversation(conversationData);
        
        // Add participants
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId: currentUserId,
          lastReadAt: new Date()
        });
        
        await storage.addParticipantToConversation({
          conversationId: conversation.id,
          userId: otherUserId,
          lastReadAt: null
        });
      }
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  
  // Send a message to a conversation
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const senderId = req.user.id;
      const conversationId = parseInt(req.params.id);
      
      // Verify user is a participant in this conversation
      const participants = await storage.getConversationParticipants(conversationId);
      const userIsParticipant = participants.some(p => p.userId === senderId);
      
      if (!userIsParticipant) {
        return res.status(403).json({ error: "Not authorized to send messages in this conversation" });
      }
      
      // Validate message data
      const messageData = insertMessageSchema.parse({
        conversationId,
        senderId,
        content: req.body.content,
        hasAttachment: req.body.hasAttachment || false,
        attachmentUrl: req.body.attachmentUrl || null,
        createdAt: new Date()
      });
      
      const newMessage = await storage.createMessage(messageData);
      
      // Update conversation timestamp
      await storage.updateConversationTimestamp(conversationId);
      
      // Mark as read for the sender
      await storage.markConversationAsRead(conversationId, senderId);
      
      // Notify via WebSocket if available
      const wss = getWebSocketServer();
      if (wss) {
        // Find the other participant to notify
        const otherParticipant = participants.find(p => p.userId !== senderId);
        if (otherParticipant && otherParticipant.userId) {
          // Using the WebSocket server's sendToUser method
          wss.sendToUser(otherParticipant.userId, {
            type: MessageType.NEW_MESSAGE,
            payload: {
              message: newMessage,
              conversationId
            }
          });
        }
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Delete all conversations and messages for a user
  app.delete("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const conversations = await storage.getConversationsByUserId(userId);
      
      for (const conversation of conversations) {
        await storage.deleteConversationMessages(conversation.id);
      }
      
      res.status(200).json({ success: true, message: "All messages deleted" });
    } catch (error) {
      console.error("Error deleting all messages:", error);
      res.status(500).json({ error: "Failed to delete messages" });
    }
  });

  // Delete all messages in a conversation
  app.delete("/api/conversations/:id/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const conversationId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Verify the user is a participant in this conversation
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      
      if (!isParticipant) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }
      
      // Delete all messages in the conversation
      const success = await storage.deleteConversationMessages(conversationId);
      
      if (success) {
        // Notify other participants via WebSocket about the cleared messages
        const wss = getWebSocketServer();
        if (wss) {
          participants.forEach(participant => {
            if (participant.userId !== userId) {
              wss.sendToUser(participant.userId, {
                type: MessageType.MESSAGES_CLEARED,
                payload: {
                  conversationId,
                  clearedBy: userId
                }
              });
            }
          });
        }
        
        res.status(200).json({ success: true, message: "All messages deleted" });
      } else {
        res.status(500).json({ error: "Failed to delete messages" });
      }
    } catch (error) {
      console.error("Error deleting messages:", error);
      res.status(500).json({ error: "Failed to delete messages" });
    }
  });

  // TESTING ONLY: Drop all conversations and messages data
  app.delete("/api/test/drop-messages", async (req, res) => {
    try {
      console.log("TEST ROUTE: Dropping all conversations and messages data");
      
      // Get all conversations
      const allConversations = await storage.getConversations();
      
      if (!allConversations || allConversations.length === 0) {
        return res.status(200).json({ message: "No conversations found to delete" });
      }
      
      // Delete all messages from each conversation
      for (const conversation of allConversations) {
        await storage.deleteConversationMessages(conversation.id);
        console.log(`Deleted all messages from conversation ${conversation.id}`);
      }
      
      // Notify all connected WebSocket clients
      const wss = getWebSocketServer();
      if (wss) {
        wss.broadcast({
          type: MessageType.MESSAGES_CLEARED,
          payload: {
            message: "All conversations cleared"
          }
        });
      }
      
      res.status(200).json({ 
        success: true, 
        message: `Dropped messages from ${allConversations.length} conversations` 
      });
    } catch (error) {
      console.error("Error in test route for dropping messages:", error);
      res.status(500).json({ error: "Failed to delete test data" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  setupWebSocketServer(httpServer);
  
  return httpServer;
}
