import { pgTable, text, serial, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  university: text("university"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  condition: text("condition").notNull(),
  category: text("category").notNull(),
  images: text("images").array(),
  location: text("location").default("On Campus"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").default("active"),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  listingId: integer("listing_id").references(() => listings.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  listingId: integer("listing_id").references(() => listings.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  read: boolean("read").default(false),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  university: true,
});

export const insertListingSchema = createInsertSchema(listings).pick({
  title: true,
  description: true,
  price: true,
  condition: true,
  category: true,
  images: true,
  location: true,
  userId: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  listingId: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  listingId: true,
  content: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Listing conditions and categories
export const listingConditions = ["New", "Like New", "Good", "Fair"] as const;
export const listingCategories = ["Chairs", "Desks", "Sofas", "Beds", "Storage", "Lamps", "Tables", "Other"] as const;

export type ListingCondition = typeof listingConditions[number];
export type ListingCategory = typeof listingCategories[number];
