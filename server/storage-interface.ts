import { 
  User, InsertUser, 
  Listing, InsertListing, 
  Favorite, InsertFavorite, 
  Conversation, InsertConversation,
  ConversationParticipant, InsertConversationParticipant,
  Message, InsertMessage 
} from '@shared/schema';

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
  
  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  getConversationByListingAndUsers(listingId: number, userId1: number, userId2: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addParticipantToConversation(conversationId: number, userId: number): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]>;
  updateParticipantLastRead(conversationId: number, userId: number): Promise<ConversationParticipant | undefined>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: number, limit?: number, before?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Session store
  sessionStore: any; // Express session store
}