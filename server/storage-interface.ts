import { 
  User, InsertUser, 
  Listing, InsertListing, 
  Favorite, InsertFavorite, 
  Message, InsertMessage,
  Conversation, InsertConversation,
  ConversationParticipant, InsertConversationParticipant
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
  
  // Message operations (old system - legacy)
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByUserId(userId: number): Promise<Message[]>;
  getMessagesBetweenUsers(userId1: number, userId2: number, listingId?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
  
  // Conversation operations (new messaging system)
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  getConversationByParticipants(userId1: number, userId2: number, listingId?: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addParticipantToConversation(participant: InsertConversationParticipant): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: number): Promise<ConversationParticipant[]>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  markConversationAsRead(conversationId: number, userId: number): Promise<ConversationParticipant | undefined>;
  updateConversationTimestamp(conversationId: number): Promise<Conversation | undefined>;
  deleteConversationMessages(conversationId: number): Promise<boolean>;
  
  // Session store
  sessionStore: any; // Express session store
}