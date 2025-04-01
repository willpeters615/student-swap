import { favorites, listings, messages, users, conversations, conversationParticipants } from "@shared/schema";
import type { User, InsertUser, Listing, InsertListing, Favorite, InsertFavorite, Message, InsertMessage, Conversation, InsertConversation, ConversationParticipant, InsertConversationParticipant } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, desc, or, asc, inArray, sql } from "drizzle-orm";
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
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    // Get all conversation IDs where this user is a participant
    const participantKeys = Array.from(this.conversationParticipants.keys())
      .filter(key => key.startsWith(`${userId}-`));
    
    // Extract conversation IDs from the keys
    const conversationIds = participantKeys.map(key => {
      const [, conversationId] = key.split('-');
      return parseInt(conversationId);
    });
    
    // Get the actual conversations
    return Array.from(this.conversations.values())
      .filter(conversation => conversationIds.includes(conversation.id))
      .sort((a, b) => 
        (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
      );
  }
  
  async getConversationByListingAndUsers(
    listingId: number,
    userId1: number,
    userId2: number
  ): Promise<Conversation | undefined> {
    // Get all conversations for this listing
    const listingConversations = Array.from(this.conversations.values())
      .filter(conversation => conversation.listingId === listingId);
    
    // If no conversations for this listing, return undefined
    if (listingConversations.length === 0) {
      return undefined;
    }
    
    // Check which of these conversations have both users as participants
    for (const conversation of listingConversations) {
      const user1ParticipantKey = `${userId1}-${conversation.id}`;
      const user2ParticipantKey = `${userId2}-${conversation.id}`;
      
      if (
        this.conversationParticipants.has(user1ParticipantKey) &&
        this.conversationParticipants.has(user2ParticipantKey)
      ) {
        return conversation;
      }
    }
    
    return undefined;
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationCurrentId++;
    const now = new Date();
    const newConversation: Conversation = {
      ...conversation,
      id,
      createdAt: now,
      updatedAt: now,
      listingId: conversation.listingId ?? null
    };
    
    this.conversations.set(id, newConversation);
    return newConversation;
  }
  
  async addParticipantToConversation(
    conversationId: number,
    userId: number
  ): Promise<ConversationParticipant> {
    const key = `${userId}-${conversationId}`;
    
    // Check if participant already exists
    const existingParticipant = this.conversationParticipants.get(key);
    if (existingParticipant) {
      return existingParticipant;
    }
    
    // Create new participant
    const newParticipant: ConversationParticipant = {
      userId,
      conversationId,
      lastReadAt: null
    };
    
    this.conversationParticipants.set(key, newParticipant);
    return newParticipant;
  }
  
  async getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]> {
    return Array.from(this.conversationParticipants.values())
      .filter(participant => participant.conversationId === conversationId);
  }
  
  async updateParticipantLastRead(
    conversationId: number,
    userId: number
  ): Promise<ConversationParticipant | undefined> {
    const key = `${userId}-${conversationId}`;
    const participant = this.conversationParticipants.get(key);
    
    if (!participant) {
      return undefined;
    }
    
    // Update the last read timestamp
    const updatedParticipant = {
      ...participant,
      lastReadAt: new Date()
    };
    
    this.conversationParticipants.set(key, updatedParticipant);
    return updatedParticipant;
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

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    // First get all conversations for this user
    const userConversations = await this.getConversationsByUserId(userId);
    const conversationIds = userConversations.map(c => c.id);
    
    // Then get all messages from these conversations
    return Array.from(this.messages.values())
      .filter(message => conversationIds.includes(message.conversationId))
      .sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageCurrentId++;
    const now = new Date();
    const message: Message = { 
      ...insertMessage, 
      id, 
      createdAt: now,
      readAt: null,
      attachmentUrl: insertMessage.attachmentUrl ?? null
    };
    this.messages.set(id, message);
    
    // Update the conversation's updatedAt timestamp
    if (insertMessage.conversationId) {
      const conversation = this.conversations.get(insertMessage.conversationId);
      if (conversation) {
        this.conversations.set(
          insertMessage.conversationId,
          { ...conversation, updatedAt: now }
        );
      }
    }
    
    return message;
  }

  async getMessagesByConversationId(
    conversationId: number, 
    limit: number = 50, 
    before?: number
  ): Promise<Message[]> {
    // Get all messages for this conversation
    let messages = Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId);
    
    // If there's a before ID, filter those out
    if (before) {
      messages = messages.filter(message => message.id < before);
    }
    
    // Sort descending by timestamp for pagination
    const sorted = messages.sort((a, b) => 
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
    
    // Take only the requested number of messages
    const limited = sorted.slice(0, limit);
    
    // Return in ascending order (oldest first) for display
    return limited.reverse();
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) {
      return undefined;
    }

    const updatedMessage = { ...message, readAt: new Date() };
    this.messages.set(id, updatedMessage);
    return updatedMessage;
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
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    const result = await this.db.select().from(conversations).where(eq(conversations.id, id));
    return result[0];
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    // Find all conversations where the user is a participant
    const participantResult = await this.db
      .select({
        conversationId: conversationParticipants.conversationId
      })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    // If no conversations found, return empty array
    if (participantResult.length === 0) {
      return [];
    }
    
    // Get all the conversation IDs
    const conversationIds = participantResult.map(p => p.conversationId);
    
    // Fetch the actual conversations
    return this.db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, conversationIds))
      .orderBy(desc(conversations.updatedAt));
  }
  
  async getConversationByListingAndUsers(
    listingId: number,
    userId1: number,
    userId2: number
  ): Promise<Conversation | undefined> {
    // Find conversations for this listing
    const listingConversations = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.listingId, listingId));
    
    // If no conversations for this listing, return undefined
    if (listingConversations.length === 0) {
      return undefined;
    }
    
    const conversationIds = listingConversations.map(c => c.id);
    
    // Find conversations where both users are participants
    const user1Participants = await this.db
      .select({
        conversationId: conversationParticipants.conversationId
      })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.userId, userId1),
          inArray(conversationParticipants.conversationId, conversationIds)
        )
      );
    
    // If user1 isn't in any of these conversations, return undefined
    if (user1Participants.length === 0) {
      return undefined;
    }
    
    const user1ConversationIds = user1Participants.map(p => p.conversationId);
    
    // Now check which of these conversations include user2
    const user2Participants = await this.db
      .select({
        conversationId: conversationParticipants.conversationId
      })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.userId, userId2),
          inArray(conversationParticipants.conversationId, user1ConversationIds)
        )
      );
    
    // If no conversation has both users, return undefined
    if (user2Participants.length === 0) {
      return undefined;
    }
    
    // Return the first matching conversation
    return this.getConversation(user2Participants[0].conversationId);
  }
  
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const now = new Date();
    const result = await this.db
      .insert(conversations)
      .values({
        ...conversation,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return result[0];
  }
  
  async addParticipantToConversation(
    conversationId: number, 
    userId: number
  ): Promise<ConversationParticipant> {
    // Check if participant already exists
    const existingParticipant = await this.db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );
    
    if (existingParticipant.length > 0) {
      return existingParticipant[0];
    }
    
    const result = await this.db
      .insert(conversationParticipants)
      .values({
        conversationId,
        userId,
        lastReadAt: null
      })
      .returning();
    return result[0];
  }
  
  async getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]> {
    return this.db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
  }
  
  async updateParticipantLastRead(
    conversationId: number, 
    userId: number
  ): Promise<ConversationParticipant | undefined> {
    const now = new Date();
    const result = await this.db
      .update(conversationParticipants)
      .set({
        lastReadAt: now
      })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .returning();
    return result[0];
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

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const result = await this.db.select().from(messages).where(eq(messages.id, id));
    return result[0];
  }

  async getMessagesByConversationId(
    conversationId: number, 
    limit: number = 50, 
    before?: number
  ): Promise<Message[]> {
    // Build the query
    let query = this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId));
    
    // If a 'before' ID is provided, add that condition
    if (before) {
      const whereClause = sql`${messages.id} < ${before}`;
      query = this.db
        .select()
        .from(messages)
        .where(and(
          eq(messages.conversationId, conversationId),
          whereClause
        ));
    }
    
    // Execute the query with ordering and limit
    const result = await query
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    // Reverse to get oldest messages first (for display)
    return result.reverse();
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // Save the message
    const result = await this.db
      .insert(messages)
      .values({
        ...message,
        hasAttachment: message.hasAttachment || false
      })
      .returning();
    
    // Update the conversation's updatedAt timestamp
    if (message.conversationId) {
      await this.db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, message.conversationId));
    }
    
    return result[0];
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const now = new Date();
    const result = await this.db
      .update(messages)
      .set({ readAt: now })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }
}

// Comment these out to disable them
// Use Postgres database storage (direct)
export const storage = new DatabaseStorage();

// Use in-memory storage for development
// export const storage = new MemStorage();

// Use Supabase storage (preferred for production)
// export const storage = new SupabaseStorage();