import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertFavoriteSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket";
import apiRoutes from "./routes/index";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Register new API routes
  app.use('/api', apiRoutes);

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

  // Conversations endpoints
  
  // Get all conversations for the current user
  app.get("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const conversations = await storage.getConversationsByUserId(userId);
      
      // Get more details for each conversation
      const conversationsWithDetails = await Promise.all(
        conversations.map(async (conversation) => {
          // Get the listing
          const listing = await storage.getListing(conversation.listingId || 0);
          
          // Get the participants
          const participants = await storage.getConversationParticipants(conversation.id);
          
          // Get user details for all participants except current user
          const otherParticipants = await Promise.all(
            participants
              .filter(p => p.userId !== userId)
              .map(async (p) => {
                const user = await storage.getUser(p.userId);
                if (user) {
                  // Remove password from response
                  const { password, ...safeUser } = user;
                  return safeUser;
                }
                return null;
              })
          );
          
          // Get the latest message
          const messages = await storage.getMessagesByConversationId(conversation.id, 1);
          const latestMessage = messages.length > 0 ? messages[0] : null;
          
          // Count unread messages
          let unreadCount = 0;
          if (latestMessage && latestMessage.senderId !== userId && !latestMessage.readAt) {
            // This is just a rough estimate - we'd need to count all unread messages in a real implementation
            unreadCount = 1;
          }
          
          return {
            ...conversation,
            listing,
            participants: otherParticipants.filter(Boolean),
            latestMessage,
            unreadCount
          };
        })
      );
      
      res.json(conversationsWithDetails);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages for a specific conversation
  app.get("/api/messages/:conversationId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const conversationId = parseInt(req.params.conversationId);
      
      // Make sure the user is a participant in this conversation
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some(p => p.userId === userId);
      
      if (!isParticipant) {
        return res.status(403).json({ error: "Not authorized to view this conversation" });
      }
      
      // Get messages for this conversation
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      
      const messages = await storage.getMessagesByConversationId(conversationId, limit, before);
      
      // Mark the conversation as read by the current user
      await storage.updateParticipantLastRead(conversationId, userId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Create or get a conversation between two users for a listing
  app.post("/api/conversations", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const { otherUserId, listingId } = req.body;
      
      if (!otherUserId || !listingId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Check if conversation already exists
      let conversation = await storage.getConversationByListingAndUsers(
        listingId,
        userId,
        otherUserId
      );
      
      // If not, create a new conversation
      if (!conversation) {
        conversation = await storage.createConversation({ listingId });
        
        // Add both participants
        await storage.addParticipantToConversation(conversation.id, userId);
        await storage.addParticipantToConversation(conversation.id, otherUserId);
      }
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  
  // Send a message to a conversation
  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const senderId = req.user.id;
      const { conversationId, content } = req.body;
      
      if (!conversationId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Make sure the user is a participant in this conversation
      const participants = await storage.getConversationParticipants(conversationId);
      const isParticipant = participants.some(p => p.userId === senderId);
      
      if (!isParticipant) {
        return res.status(403).json({ error: "Not authorized to send messages in this conversation" });
      }
      
      // Create the message
      const newMessage = await storage.createMessage({
        conversationId,
        senderId,
        content,
        hasAttachment: false
      });
      
      res.status(201).json(newMessage);
    } catch (error) {
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

  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  setupWebSocketServer(httpServer);
  
  return httpServer;
}
