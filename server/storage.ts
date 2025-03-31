import { favorites, listings, messages, users } from "@shared/schema";
import type { User, InsertUser, Listing, InsertListing, Favorite, InsertFavorite, Message, InsertMessage } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, desc, or, asc } from "drizzle-orm";
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
  private userCurrentId: number;
  private listingCurrentId: number;
  private favoriteCurrentId: number;
  private messageCurrentId: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.listings = new Map();
    this.favorites = new Map();
    this.messages = new Map();
    this.userCurrentId = 1;
    this.listingCurrentId = 1;
    this.favoriteCurrentId = 1;
    this.messageCurrentId = 1;
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

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.senderId === userId || message.receiverId === userId)
      .sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number, listingId?: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => {
        const userMatch = 
          (message.senderId === userId1 && message.receiverId === userId2) ||
          (message.senderId === userId2 && message.receiverId === userId1);
        
        if (listingId) {
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
    const message: Message = { 
      ...insertMessage, 
      id, 
      createdAt: now, 
      read: insertMessage.read ?? false,
      listingId: insertMessage.listingId ?? null,
      senderId: insertMessage.senderId ?? null,
      receiverId: insertMessage.receiverId ?? null
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) {
      return undefined;
    }

    const updatedMessage = { ...message, read: true };
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

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number, listingId?: number): Promise<Message[]> {
    // Get all messages first
    const allMessages = await this.db.select().from(messages);
    
    // Filter in memory
    let result = allMessages.filter(message => {
      const userMatch = 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1);
        
      if (listingId) {
        return userMatch && message.listingId === listingId;
      }
      
      return userMatch;
    });
    
    // Sort by createdAt ascending
    return result.sort((a, b) => 
      (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db
      .insert(messages)
      .values({ ...message, read: false })
      .returning();
    return result[0];
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const result = await this.db
      .update(messages)
      .set({ read: true })
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