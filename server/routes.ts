import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertFavoriteSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import { setupWebSocketServer, getWebSocketServer } from "./websocket";

export async function registerRoutes(app: Express): Promise<Server> {
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
  
  // Get all conversations for the current user
  app.get("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = req.user.id;
      const messages = await storage.getMessagesByUserId(userId);
      
      // Get unique conversations by grouping messages by the other user
      const conversations = new Map();
      
      for (const message of messages) {
        const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
        const listingId = message.listingId || 0;
        const key = `${otherUserId || 0}-${listingId}`;
        
        if (!conversations.has(key)) {
          const otherUser = await storage.getUser(otherUserId || 0);
          const listing = await storage.getListing(listingId);
          
          if (otherUser && listing) {
            const { password, ...safeUser } = otherUser;
            conversations.set(key, {
              otherUser: safeUser,
              listing,
              lastMessage: message,
              unreadCount: message.receiverId === userId && !message.read ? 1 : 0
            });
          }
        } else {
          const conversation = conversations.get(key);
          // Update last message if this one is newer
          const messageTimestamp = message.createdAt ? new Date(message.createdAt).getTime() : 0;
          const lastMessageTimestamp = conversation.lastMessage.createdAt ? 
            new Date(conversation.lastMessage.createdAt).getTime() : 0;
          if (messageTimestamp > lastMessageTimestamp) {
            conversation.lastMessage = message;
          }
          // Count unread messages
          if (message.receiverId === userId && !message.read) {
            conversation.unreadCount++;
          }
        }
      }
      
      res.json(Array.from(conversations.values()));
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get messages between users for a specific listing
  app.get("/api/messages/:userId/:listingId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const currentUserId = req.user.id;
      const otherUserId = parseInt(req.params.userId);
      const listingId = parseInt(req.params.listingId);
      
      const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId, listingId);
      
      // Mark received messages as read
      for (const message of messages) {
        if (message.receiverId === currentUserId && !message.read) {
          await storage.markMessageAsRead(message.id);
        }
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post("/api/messages", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const senderId = req.user.id;
      
      // Validate message data
      const messageData = insertMessageSchema.parse({
        senderId,
        receiverId: req.body.receiverId,
        listingId: req.body.listingId,
        content: req.body.content
      });
      
      const newMessage = await storage.createMessage(messageData);
      res.status(201).json(newMessage);
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

  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  setupWebSocketServer(httpServer);
  
  return httpServer;
}
