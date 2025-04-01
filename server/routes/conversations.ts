import { z } from 'zod';
import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { insertMessageSchema } from '@shared/schema';

const router = Router();

// Get all conversations for the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;
    const conversations = await storage.getConversationsByUserId(userId);
    
    // Enrich conversations with additional data
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        // Get conversation participants
        const participants = await storage.getConversationParticipants(conversation.id);
        
        // Find the other user in the conversation
        const otherParticipant = participants.find(p => p.userId !== userId);
        if (!otherParticipant) {
          return null; // Skip conversations where we can't find the other user
        }
        
        // Get the other user's data
        const otherUser = await storage.getUser(otherParticipant.userId);
        if (!otherUser) {
          return null; // Skip if other user doesn't exist
        }
        
        // Get listing data if there is a listing ID
        let listing = null;
        if (conversation.listingId !== null && conversation.listingId !== undefined) {
          listing = await storage.getListing(conversation.listingId);
          if (!listing) {
            // Create a placeholder listing if the original was deleted
            listing = {
              id: conversation.listingId,
              title: "Unknown Listing (Deleted)",
              price: 0,
              description: "",
              condition: null,
              category: null,
              type: "item",
              userId: 0,
              status: "deleted",
              createdAt: new Date(),
              updatedAt: new Date(),
              location: null,
              images: []
            };
          }
        }
        
        // Get latest messages
        const messages = await storage.getMessagesByConversationId(conversation.id, 1);
        const lastMessage = messages.length > 0 ? messages[0] : null;
        
        // Count unread messages
        const unreadCount = messages.filter(
          m => m.senderId !== userId && !m.readAt
        ).length;
        
        // Remove password from the other user's data
        const { password, ...safeOtherUser } = otherUser;
        
        return {
          id: conversation.id,
          otherUser: safeOtherUser,
          listing: listing !== null ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            images: listing.images,
            type: listing.type
          } : {
            id: 0,
            title: "Unknown Listing",
            price: 0,
            images: [],
            type: "item"
          },
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            hasAttachment: lastMessage.hasAttachment
          } : null,
          unreadCount
        };
      })
    );
    
    // Filter out null results and sort by most recent message
    const validConversations = enrichedConversations
      .filter(c => c !== null)
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime; // Descending order (newest first)
      });
    
    res.json(validConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get a specific conversation by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;
    
    // Get the conversation
    const conversation = await storage.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Verify that the user is a participant
    const participants = await storage.getConversationParticipants(conversationId);
    const isParticipant = participants.some(p => p.userId === userId);
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }
    
    // Get the listing if there is a listing ID
    let listing = null;
    if (conversation.listingId !== null) {
      listing = await storage.getListing(conversation.listingId);
      if (!listing) {
        // Create a placeholder listing if the original was deleted
        listing = {
          id: conversation.listingId,
          title: "Unknown Listing (Deleted)",
          price: 0,
          description: "",
          condition: null,
          category: null,
          type: "item",
          userId: 0,
          status: "deleted",
          createdAt: new Date(),
          updatedAt: new Date(),
          location: null,
          images: []
        };
      }
    } else {
      // Create a generic placeholder for conversations without listings
      listing = {
        id: 0,
        title: "General Conversation",
        price: 0,
        description: "",
        condition: null,
        category: null,
        type: "item",
        userId: 0,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        location: null,
        images: []
      };
    }
    
    // Find the other participant
    const otherParticipant = participants.find(p => p.userId !== userId);
    
    if (!otherParticipant) {
      return res.status(500).json({ error: 'Cannot find other participant' });
    }
    
    // Get the other user's data
    const otherUser = await storage.getUser(otherParticipant.userId);
    
    if (!otherUser) {
      return res.status(404).json({ error: 'Other user not found' });
    }
    
    // Remove password from the other user's data
    const { password, ...safeOtherUser } = otherUser;
    
    // Update user's last read timestamp
    await storage.updateParticipantLastRead(conversationId, userId);
    
    res.json({
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      listing,
      otherUser: safeOtherUser
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create or get a conversation between two users for a specific listing
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const userId = req.user.id;
    
    // Validate request body
    const schema = z.object({
      otherUserId: z.number(),
      listingId: z.number()
    });
    
    const { otherUserId, listingId } = schema.parse(req.body);
    
    // Check if the users and listing exist
    const otherUser = await storage.getUser(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Other user not found' });
    }
    
    const listing = await storage.getListing(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    // Check if a conversation already exists
    let conversation = await storage.getConversationByListingAndUsers(
      listingId,
      userId,
      otherUserId
    );
    
    // If no conversation exists, create one
    if (!conversation) {
      conversation = await storage.createConversation({ listingId });
      
      // Add both users as participants
      await storage.addParticipantToConversation(conversation.id, userId);
      await storage.addParticipantToConversation(conversation.id, otherUserId);
    }
    
    // Remove password from other user data
    const { password, ...safeOtherUser } = otherUser;
    
    res.status(201).json({
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      listing,
      otherUser: safeOtherUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

export default router;