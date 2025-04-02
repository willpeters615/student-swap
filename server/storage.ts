import { 
  favorites, 
  listings, 
  messages, 
  users, 
  conversations, 
  conversationParticipants, 
  // Also import types directly
  type User, type InsertUser, 
  type Listing, type InsertListing, 
  type Favorite, type InsertFavorite, 
  type Message, type InsertMessage,
  type Conversation, type InsertConversation,
  type ConversationParticipant, type InsertConversationParticipant
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, desc, or, asc, isNull, ne, inArray } from "drizzle-orm";
import { Pool } from "pg"; // Add Pool import for PostgreSQL
import postgres from "postgres";
import { IStorage } from './storage-interface';
import { SupabaseStorage } from './supabase-storage';

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private listings: Map<number, Listing>;
  private favorites: Map<string, Favorite>;
  private messages: Map<number, Message>;
  private conversations: Map<number, Conversation>;
  private conversationParticipants: Map<string, ConversationParticipant>;
  private userCurrentId: number;
  private listingCurrentId: number;
  private favoriteCurrentId: number;
  private messageCurrentId: number;
  private conversationCurrentId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.listings = new Map();
    this.favorites = new Map();
    this.messages = new Map();
    this.conversations = new Map();
    this.conversationParticipants = new Map();
    this.userCurrentId = 1;
    this.listingCurrentId = 1;
    this.favoriteCurrentId = 1;
    this.messageCurrentId = 1;
    this.conversationCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      verified: insertUser.verified ?? false,
      createdAt: now,
      university: insertUser.university ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  // Listing methods
  async getListing(id: number): Promise<Listing | undefined> {
    return this.listings.get(id);
  }

  async getListings(filter?: Partial<Listing>): Promise<Listing[]> {
    const allListings = Array.from(this.listings.values());
    
    if (!filter) {
      return allListings.sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
    }
    
    return allListings.filter(listing => {
      for (const [key, value] of Object.entries(filter)) {
        if (Array.isArray(value)) {
          if (key === 'category' && filter.category) {
            if (!filter.category.includes(listing.category as any)) {
              return false;
            }
          }
          continue;
        }
        
        if (key === 'price') {
          if (filter.price !== undefined && listing.price !== filter.price) {
            return false;
          }
          continue;
        }
        
        if (listing[key as keyof Listing] !== value) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getListingsByUserId(userId: number): Promise<Listing[]> {
    return Array.from(this.listings.values())
      .filter(listing => listing.userId === userId)
      .sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const id = this.listingCurrentId++;
    const now = new Date();
    const listing: Listing = { 
      ...insertListing, 
      id, 
      createdAt: now, 
      status: insertListing.status ?? "active",
      images: insertListing.images ?? [],
      description: insertListing.description ?? null,
      condition: insertListing.condition ?? null,
      type: insertListing.type ?? "item",
      location: insertListing.location ?? null,
      userId: insertListing.userId ?? null,
      date: insertListing.date ?? null,
      duration: insertListing.duration ?? null
    };
    this.listings.set(id, listing);
    return listing;
  }

  async updateListing(id: number, updatedFields: Partial<Listing>): Promise<Listing | undefined> {
    const listing = this.listings.get(id);
    if (!listing) {
      return undefined;
    }

    const updatedListing = { ...listing, ...updatedFields };
    this.listings.set(id, updatedListing);
    return updatedListing;
  }

  async deleteListing(id: number): Promise<boolean> {
    return this.listings.delete(id);
  }

  // Favorite methods
  async getFavorite(userId: number, listingId: number): Promise<Favorite | undefined> {
    const key = `${userId}-${listingId}`;
    return this.favorites.get(key);
  }

  async getFavoritesByUserId(userId: number): Promise<Favorite[]> {
    return Array.from(this.favorites.values())
      .filter(favorite => favorite.userId === userId)
      .sort((a, b) => 
        (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
      );
  }

  async createFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.favoriteCurrentId++;
    const now = new Date();
    const favorite: Favorite = { 
      ...insertFavorite, 
      id, 
      createdAt: now,
      userId: insertFavorite.userId ?? null,
      listingId: insertFavorite.listingId ?? null
    };
    const key = `${favorite.userId}-${favorite.listingId}`;
    this.favorites.set(key, favorite);
    return favorite;
  }

  async deleteFavorite(userId: number, listingId: number): Promise<boolean> {
    const key = `${userId}-${listingId}`;
    return this.favorites.delete(key);
  }

  // Legacy Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    // First try the new conversation-based approach
    const conversations = await this.getConversationsByUserId(userId);
    if (conversations.length > 0) {
      // Get all messages from these conversations
      const allMessages: Message[] = [];
      for (const conversation of conversations) {
        const messages = await this.getConversationMessages(conversation.id);
        allMessages.push(...messages);
      }
      return allMessages.sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
    }
    
    // Fall back to legacy approach
    return Array.from(this.messages.values())
      .filter(message => {
        // @ts-ignore - For legacy message structure
        return message.senderId === userId || message.receiverId === userId;
      })
      .sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number, listingId?: number): Promise<Message[]> {
    // First try to find an existing conversation between these users for this listing
    const conversation = await this.getConversationByParticipants(userId1, userId2, listingId);
    
    if (conversation) {
      // If a conversation exists, return its messages
      return this.getConversationMessages(conversation.id);
    }
    
    // Fall back to legacy method
    return Array.from(this.messages.values())
      .filter(message => {
        // @ts-ignore - For legacy message structure
        const userMatch = (message.senderId === userId1 && message.receiverId === userId2) ||
          // @ts-ignore - For legacy message structure
          (message.senderId === userId2 && message.receiverId === userId1);
        
        if (listingId) {
          // @ts-ignore - For legacy message structure
          return userMatch && message.listingId === listingId;
        }
        
        return userMatch;
      })
      .sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const now = new Date();
    
    // Check if this is for the legacy system or the new system
    // @ts-ignore - For legacy message structure
    if (insertMessage.receiverId !== undefined) {
      // Legacy message creation
      // @ts-ignore - For legacy message structure
      const message: Message = { 
        ...insertMessage, 
        id, 
        createdAt: now, 
        // @ts-ignore - For legacy message structure
        read: insertMessage.read ?? false,
        // @ts-ignore - For legacy message structure
        listingId: insertMessage.listingId ?? null,
        // @ts-ignore - For legacy message structure
        senderId: insertMessage.senderId ?? null,
        // @ts-ignore - For legacy message structure
        receiverId: insertMessage.receiverId ?? null
      };
      this.messages.set(id, message);
      return message;
    } else {
      // New message system
      const message: Message = {
        ...insertMessage,
        id,
        createdAt: now,
        readAt: null,
        hasAttachment: insertMessage.hasAttachment ?? false,
        attachmentUrl: insertMessage.attachmentUrl ?? null
      };
      this.messages.set(id, message);
      
      // Update conversation timestamp
      if (insertMessage.conversationId) {
        this.updateConversationTimestamp(insertMessage.conversationId);
      }
      
      return message;
    }
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) {
      return undefined;
    }

    // Check if it's a legacy message
    // @ts-ignore - For legacy message structure
    if (message.read !== undefined) {
      // Legacy message
      // @ts-ignore - For legacy message structure
      const updatedMessage = { ...message, read: true };
      this.messages.set(id, updatedMessage);
      return updatedMessage;
    } else {
      // New message system
      const updatedMessage = { ...message, readAt: new Date() };
      this.messages.set(id, updatedMessage);
      return updatedMessage;
    }
  }
  
  // Conversation methods (new messaging system)
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    // Find all conversation IDs this user is part of
    const participations = Array.from(this.conversationParticipants.values())
      .filter(p => p.userId === userId);
    
    if (!participations.length) {
      return [];
    }
    
    // Get all conversations for these IDs
    const conversationIds = participations.map(p => p.conversationId);
    return Array.from(this.conversations.values())
      .filter(c => conversationIds.includes(c.id))
      .sort((a, b) => 
        (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
      );
  }
  
  async getConversationByParticipants(userId1: number, userId2: number, listingId?: number): Promise<Conversation | undefined> {
    // Get all conversations that userId1 participates in
    const user1ConversationIds = new Set(
      Array.from(this.conversationParticipants.values())
        .filter(p => p.userId === userId1)
        .map(p => p.conversationId)
    );
    
    if (!user1ConversationIds.size) {
      return undefined;
    }
    
    // Get all conversations that userId2 participates in
    const user2Participations = Array.from(this.conversationParticipants.values())
      .filter(p => p.userId === userId2);
    
    if (!user2Participations.length) {
      return undefined;
    }
    
    // Find conversation IDs that both users participate in
    const commonConversationIds = user2Participations
      .map(p => p.conversationId)
      .filter(id => user1ConversationIds.has(id));
    
    if (!commonConversationIds.length) {
      return undefined;
    }
    
    // Find conversations that match the IDs and listing ID if provided
    const matchingConversations = Array.from(this.conversations.values())
      .filter(c => commonConversationIds.includes(c.id))
      .filter(c => !listingId || c.listingId === listingId)
      .sort((a, b) => 
        (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
      );
    
    return matchingConversations[0];
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationCurrentId++;
    const now = new Date();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: now,
      updatedAt: now,
      listingId: insertConversation.listingId ?? null
    };
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  async addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    // Make sure we have non-null userId and conversationId
    if (!participant.userId || !participant.conversationId) {
      throw new Error("User ID and Conversation ID must be provided for a conversation participant");
    }
    
    const key = `${participant.conversationId}-${participant.userId}`;
    const conversationParticipant: ConversationParticipant = {
      userId: participant.userId,
      conversationId: participant.conversationId,
      lastReadAt: participant.lastReadAt ?? null
    };
    this.conversationParticipants.set(key, conversationParticipant);
    return conversationParticipant;
  }
  
  async getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]> {
    return Array.from(this.conversationParticipants.values())
      .filter(p => p.conversationId === conversationId);
  }
  
  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
  }
  
  async markConversationAsRead(conversationId: number, userId: number): Promise<ConversationParticipant | undefined> {
    const key = `${conversationId}-${userId}`;
    const participant = this.conversationParticipants.get(key);
    if (!participant) {
      return undefined;
    }
    
    const updatedParticipant = { ...participant, lastReadAt: new Date() };
    this.conversationParticipants.set(key, updatedParticipant);
    return updatedParticipant;
  }
  
  async updateConversationTimestamp(conversationId: number): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return undefined;
    }
    
    const updatedConversation = { ...conversation, updatedAt: new Date() };
    this.conversations.set(conversationId, updatedConversation);
    return updatedConversation;
  }
  
  async deleteConversationMessages(conversationId: number): Promise<boolean> {
    try {
      // Find all messages in this conversation
      const conversationMessages = Array.from(this.messages.values())
        .filter(message => message.conversationId === conversationId);
      
      // Delete each message
      for (const message of conversationMessages) {
        if (message.id !== undefined) {
          this.messages.delete(message.id);
        }
      }
      
      // Update conversation timestamp
      await this.updateConversationTimestamp(conversationId);
      
      return true;
    } catch (error) {
      console.error("Error deleting conversation messages:", error);
      return false;
    }
  }
}

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  sessionStore: any;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not defined");
    }

    const client = postgres(process.env.DATABASE_URL);
    this.db = drizzle(client);
    
    // Initialize session store
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Listing methods
  async getListing(id: number): Promise<Listing | undefined> {
    const result = await this.db.select().from(listings).where(eq(listings.id, id));
    return result[0];
  }

  async getListings(filter?: Partial<Listing>): Promise<Listing[]> {
    if (!filter) {
      return this.db.select().from(listings).orderBy(desc(listings.createdAt));
    }

    // Apply individual filters as we need to handle them conditionally
    let result = await this.db.select().from(listings);
    
    if (filter.category && Array.isArray(filter.category)) {
      result = result.filter(listing => 
        filter.category!.includes(listing.category as any)
      );
    } else if (filter.category) {
      result = result.filter(listing => 
        listing.category === filter.category
      );
    }
    
    if (filter.type) {
      result = result.filter(listing => 
        listing.type === filter.type
      );
    }
    
    if (filter.condition) {
      result = result.filter(listing => 
        listing.condition === filter.condition
      );
    }
    
    if (filter.userId) {
      result = result.filter(listing => 
        listing.userId === filter.userId
      );
    }
    
    if (filter.status) {
      result = result.filter(listing => 
        listing.status === filter.status
      );
    }
    
    // Sort by createdAt descending
    return result.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getListingsByUserId(userId: number): Promise<Listing[]> {
    return this.db
      .select()
      .from(listings)
      .where(eq(listings.userId, userId))
      .orderBy(desc(listings.createdAt));
  }

  async createListing(listing: InsertListing): Promise<Listing> {
    const result = await this.db
      .insert(listings)
      .values({
        ...listing,
        status: "active",
        images: listing.images || [],
      })
      .returning();
    return result[0];
  }

  async updateListing(id: number, updatedFields: Partial<Listing>): Promise<Listing | undefined> {
    const result = await this.db
      .update(listings)
      .set(updatedFields)
      .where(eq(listings.id, id))
      .returning();
    return result[0];
  }

  async deleteListing(id: number): Promise<boolean> {
    const result = await this.db.delete(listings).where(eq(listings.id, id));
    return result.count > 0;
  }

  // Favorite methods
  async getFavorite(userId: number, listingId: number): Promise<Favorite | undefined> {
    const result = await this.db
      .select()
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.listingId, listingId)
        )
      );
    return result[0];
  }

  async getFavoritesByUserId(userId: number): Promise<Favorite[]> {
    return this.db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const result = await this.db.insert(favorites).values(favorite).returning();
    return result[0];
  }

  async deleteFavorite(userId: number, listingId: number): Promise<boolean> {
    const result = await this.db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.listingId, listingId)
        )
      );
    return result.count > 0;
  }

  // Message methods (legacy)
  async getMessage(id: number): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id));
    return result[0];
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    // First try to find conversations this user is part of
    const participants = await this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    if (participants.length > 0) {
      // Get all conversations this user is part of (filter out null values)
      const conversationIds = participants
        .map(p => p.conversationId)
        .filter((id): id is number => id !== null);
      
      if (conversationIds.length === 0) {
        return [];
      }
      
      // Get all messages from these conversations
      const messagesPromises = conversationIds.map(id => 
        this.getConversationMessages(id)
      );
      
      const conversationMessages = await Promise.all(messagesPromises);
      
      // Flatten the array of message arrays
      return conversationMessages.flat().sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
    }
    
    // Fall back to legacy method
    return this.db
      .select()
      .from(messages)
      .orderBy(asc(messages.createdAt));
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number, listingId?: number): Promise<Message[]> {
    // First try to find an existing conversation between these users for this listing
    const conversation = await this.getConversationByParticipants(userId1, userId2, listingId);
    
    if (conversation) {
      // If a conversation exists, return its messages
      return this.getConversationMessages(conversation.id);
    }
    
    // If there's no conversation, return an empty array 
    // (legacy data would have been migrated if it existed)
    console.log(`No conversation found between users ${userId1} and ${userId2}${listingId ? ` for listing ${listingId}` : ''}`);
    return [];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db
      .insert(messages)
      .values({ 
        ...message, 
        readAt: null 
      })
      .returning();
    return result[0];
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const result = await this.db
      .update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }
  
  // Conversation methods (new messaging system)
  async getConversation(id: number): Promise<Conversation | undefined> {
    const result = await this.db.select().from(conversations).where(eq(conversations.id, id));
    return result[0];
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    // Find all conversation IDs this user is part of
    const participations = await this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    if (!participations.length) {
      return [];
    }
    
    // Get all conversations for these IDs
    const conversationIds = participations
      .map(p => p.conversationId)
      .filter((id): id is number => id !== null);
    
    if (conversationIds.length === 0) {
      return [];
    }
    
    // Use inArray for Drizzle's type safety
    return this.db
      .select()
      .from(conversations)
      .where(
        inArray(conversations.id, conversationIds)
      )
      .orderBy(desc(conversations.updatedAt));
  }
  
  async getConversationByParticipants(userId1: number, userId2: number, listingId?: number): Promise<Conversation | undefined> {
    // Get all conversations that userId1 participates in
    const user1Conversations = await this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId1));
    
    if (!user1Conversations.length) {
      return undefined;
    }
    
    // Get all conversations that userId2 participates in
    const user2Conversations = await this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId2));
    
    if (!user2Conversations.length) {
      return undefined;
    }
    
    // Filter out null conversationIds and find common IDs
    const user1ConversationIds = new Set(
      user1Conversations
        .map(p => p.conversationId)
        .filter((id): id is number => id !== null)
    );
    
    const commonConversationIds = user2Conversations
      .map(p => p.conversationId)
      .filter((id): id is number => id !== null && user1ConversationIds.has(id));
    
    if (!commonConversationIds.length) {
      return undefined;
    }
    
    // Generate the correct query with all conditions
    let query;
    if (listingId) {
      // Include both the ID list and the listing ID in a single query
      query = this.db
        .select()
        .from(conversations)
        .where(
          and(
            inArray(conversations.id, commonConversationIds),
            eq(conversations.listingId, listingId)
          )
        )
        .orderBy(desc(conversations.updatedAt));
    } else {
      // Just filter by the ID list
      query = this.db
        .select()
        .from(conversations)
        .where(inArray(conversations.id, commonConversationIds))
        .orderBy(desc(conversations.updatedAt));
    }
    
    // Execute the query
    const results = await query;
    
    return results[0];
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await this.db
      .insert(conversations)
      .values({
        ...conversation,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return result[0];
  }
  
  async addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant> {
    // Ensure the values are properly defined for the insert
    if (!participant.userId || !participant.conversationId) {
      throw new Error("User ID and Conversation ID must be provided for a conversation participant");
    }
    
    const participantData = {
      userId: participant.userId as number, // Type assertion after validation
      conversationId: participant.conversationId as number, // Type assertion after validation
      lastReadAt: participant.lastReadAt ?? null
    };
    
    const result = await this.db
      .insert(conversationParticipants)
      .values(participantData)
      .returning();
    return result[0];
  }
  
  async getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]> {
    return this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  }
  
  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }
  
  async markConversationAsRead(conversationId: number, userId: number): Promise<ConversationParticipant | undefined> {
    const result = await this.db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .returning();
    return result[0];
  }
  
  async updateConversationTimestamp(conversationId: number): Promise<Conversation | undefined> {
    const result = await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning();
    return result[0];
  }
  
  async deleteConversationMessages(conversationId: number): Promise<boolean> {
    try {
      // Delete all messages from this conversation
      const result = await this.db
        .delete(messages)
        .where(eq(messages.conversationId, conversationId));
      
      // Update conversation timestamp
      await this.updateConversationTimestamp(conversationId);
      
      return true;
    } catch (error) {
      console.error("Error deleting conversation messages:", error);
      return false;
    }
  }
}

// Comment these out to disable them
// Use Postgres database storage (direct)
export const storage = new DatabaseStorage();

// Use in-memory storage for development
// export const storage = new MemStorage();

// Use Supabase storage (preferred for production)
// export const storage = new SupabaseStorage();