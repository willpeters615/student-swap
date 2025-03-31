import { supabase } from './supabase';
import { IStorage } from './storage';
import {
  User, InsertUser,
  Listing, InsertListing,
  Favorite, InsertFavorite,
  Message, InsertMessage
} from '@shared/schema';
import connectPg from 'connect-pg-simple';
import session from 'express-session';
import { pool } from './db';

// Initialize PostgreSQL session store
const PostgresSessionStore = connectPg(session);

// Map Supabase snake_case to our camelCase schema
function mapUserFromSupabase(user: any): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password: user.password,
    university: user.university,
    verified: user.verified,
    createdAt: user.created_at ? new Date(user.created_at) : null
  };
}

function mapListingFromSupabase(listing: any): Listing {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    condition: listing.condition,
    category: listing.category,
    type: listing.type,
    images: listing.images,
    location: listing.location,
    userId: listing.user_id,
    createdAt: listing.created_at ? new Date(listing.created_at) : null,
    status: listing.status,
    date: listing.date ? new Date(listing.date) : null,
    duration: listing.duration
  };
}

function mapFavoriteFromSupabase(favorite: any): Favorite {
  return {
    id: favorite.id,
    userId: favorite.user_id,
    listingId: favorite.listing_id,
    createdAt: favorite.created_at ? new Date(favorite.created_at) : null
  };
}

function mapMessageFromSupabase(message: any): Message {
  return {
    id: message.id,
    content: message.content,
    listingId: message.listing_id,
    senderId: message.sender_id,
    receiverId: message.receiver_id,
    read: message.read,
    createdAt: message.created_at ? new Date(message.created_at) : null
  };
}

// Prepare data for Supabase (camelCase to snake_case)
function prepareUserForSupabase(user: InsertUser) {
  return {
    username: user.username,
    email: user.email,
    password: user.password,
    university: user.university || null,
    verified: false // Default to false for new users
  };
}

function prepareListingForSupabase(listing: InsertListing) {
  return {
    title: listing.title,
    description: listing.description || null,
    price: listing.price,
    condition: listing.condition || null,
    category: listing.category,
    type: listing.type || 'item', // Default to 'item' if not specified
    images: listing.images || [],
    location: listing.location || null,
    user_id: listing.userId || null,
    status: 'active', // Default to 'active'
    date: listing.date || null,
    duration: listing.duration || null
  };
}

function prepareFavoriteForSupabase(favorite: InsertFavorite) {
  return {
    user_id: favorite.userId || null,
    listing_id: favorite.listingId || null
  };
}

function prepareMessageForSupabase(message: InsertMessage) {
  return {
    content: message.content,
    listing_id: message.listingId || null,
    sender_id: message.senderId || null,
    receiver_id: message.receiverId || null,
    read: false // Default to false for new messages
  };
}

export class SupabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return mapUserFromSupabase(data);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) return undefined;
    return mapUserFromSupabase(data);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return undefined;
    return mapUserFromSupabase(data);
  }

  async createUser(user: InsertUser): Promise<User> {
    const preparedUser = prepareUserForSupabase(user);
    const { data, error } = await supabase
      .from('users')
      .insert(preparedUser)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapUserFromSupabase(data);
  }

  // Listing operations
  async getListing(id: number): Promise<Listing | undefined> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return mapListingFromSupabase(data);
  }

  async getListings(filter?: Partial<Listing>): Promise<Listing[]> {
    let query = supabase.from('listings').select('*');

    // Apply filters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Convert camelCase to snake_case for keys
          const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          
          if (Array.isArray(value)) {
            query = query.in(snakeCaseKey, value);
          } else if (typeof value === 'string' && (key === 'title' || key === 'description')) {
            query = query.ilike(snakeCaseKey, `%${value}%`);
          } else {
            query = query.eq(snakeCaseKey, value);
          }
        }
      });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(mapListingFromSupabase);
  }

  async getListingsByUserId(userId: number): Promise<Listing[]> {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return (data || []).map(mapListingFromSupabase);
  }

  async createListing(listing: InsertListing): Promise<Listing> {
    const preparedListing = prepareListingForSupabase(listing);
    const { data, error } = await supabase
      .from('listings')
      .insert(preparedListing)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapListingFromSupabase(data);
  }

  async updateListing(id: number, updatedFields: Partial<Listing>): Promise<Listing | undefined> {
    // Convert camelCase to snake_case for Supabase
    const updateData: any = {};
    Object.entries(updatedFields).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'userId') {
          updateData['user_id'] = value;
        } else if (key === 'createdAt') {
          updateData['created_at'] = value;
        } else {
          // Handle other keys that might need conversion
          const snakeCaseKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateData[snakeCaseKey] = value;
        }
      }
    });

    const { data, error } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapListingFromSupabase(data);
  }

  async deleteListing(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    return !error;
  }

  // Favorite operations
  async getFavorite(userId: number, listingId: number): Promise<Favorite | undefined> {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    if (error || !data) return undefined;
    return mapFavoriteFromSupabase(data);
  }

  async getFavoritesByUserId(userId: number): Promise<Favorite[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return (data || []).map(mapFavoriteFromSupabase);
  }

  async createFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const preparedFavorite = prepareFavoriteForSupabase(favorite);
    const { data, error } = await supabase
      .from('favorites')
      .insert(preparedFavorite)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapFavoriteFromSupabase(data);
  }

  async deleteFavorite(userId: number, listingId: number): Promise<boolean> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);

    return !error;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return mapMessageFromSupabase(data);
  }

  async getMessagesByUserId(userId: number): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapMessageFromSupabase);
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number, listingId?: number): Promise<Message[]> {
    let query = supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`);

    if (listingId) {
      query = query.eq('listing_id', listingId);
    }

    const { data, error } = await query.order('created_at');
    if (error) throw new Error(error.message);
    return (data || []).map(mapMessageFromSupabase);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const preparedMessage = prepareMessageForSupabase(message);
    const { data, error } = await supabase
      .from('messages')
      .insert(preparedMessage)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapMessageFromSupabase(data);
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapMessageFromSupabase(data);
  }
}