import { favorites, listings, messages, users } from "@shared/schema";
import type { User, InsertUser, Listing, InsertListing, Favorite, InsertFavorite, Message, InsertMessage } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Listing operations
  getListing(id: number): Promise<Listing | undefined>;
  getListings(filter?: Partial<Listing>): Promise<Listing[]>;
  getListingsByUserId(userId: number): Promise<Listing[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: number, listing: Partial<Listing>): Promise<Listing | undefined>;
  deleteListing(id: number): Promise<boolean>;
  
  // Favorite operations
  getFavorite(userId: number, listingId: number): Promise<Favorite | undefined>;
  getFavoritesByUserId(userId: number): Promise<Favorite[]>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  deleteFavorite(userId: number, listingId: number): Promise<boolean>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByUserId(userId: number): Promise<Message[]>;
  getMessagesBetweenUsers(userId1: number, userId2: number, listingId?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private listings: Map<number, Listing>;
  private favorites: Map<string, Favorite>;
  private messages: Map<number, Message>;
  private userCurrentId: number;
  private listingCurrentId: number;
  private favoriteCurrentId: number;
  private messageCurrentId: number;
  sessionStore: session.SessionStore;

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
    const user: User = { ...insertUser, id, verified: false, createdAt: now };
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
      status: "active",
      images: insertListing.images || []
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
    const favorite: Favorite = { ...insertFavorite, id, createdAt: now };
    const key = `${insertFavorite.userId}-${insertFavorite.listingId}`;
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
    const message: Message = { ...insertMessage, id, createdAt: now, read: false };
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

export const storage = new MemStorage();
