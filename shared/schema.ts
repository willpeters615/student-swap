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
  condition: text("condition"),
  category: text("category").notNull(),
  type: text("type").notNull().default("item"),  // 'item', 'service', or 'experience'
  images: text("images").array(),
  location: text("location").default("On Campus"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").default("active"),
  // For services & experiences
  date: timestamp("date"),
  duration: text("duration"),
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
  verified: true,
}).extend({
  university: z.string().nullable().optional(),
  verified: z.boolean().nullable().optional().default(false),
  createdAt: z.date().nullable().optional(),
});

export const insertListingSchema = createInsertSchema(listings).pick({
  title: true,
  description: true,
  price: true,
  condition: true,
  category: true,
  type: true,
  images: true,
  location: true,
  userId: true,
  date: true,
  duration: true,
  status: true,
}).extend({
  description: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  type: z.string().default("item"),
  images: z.array(z.string()).optional().default([]),
  location: z.string().nullable().optional(),
  userId: z.number().nullable().optional(),
  date: z.date().nullable().optional(),
  duration: z.string().nullable().optional(),
  status: z.string().nullable().optional().default("active"),
  createdAt: z.date().nullable().optional(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  listingId: true,
}).extend({
  userId: z.number().nullable().optional(),
  listingId: z.number().nullable().optional(),
  createdAt: z.date().nullable().optional(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  listingId: true,
  content: true,
  read: true,
}).extend({
  senderId: z.number().nullable().optional(),
  receiverId: z.number().nullable().optional(),
  listingId: z.number().nullable().optional(),
  read: z.boolean().nullable().optional().default(false),
  createdAt: z.date().nullable().optional(),
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

// Listing types, conditions and categories
export const listingTypes = ["item", "service", "experience"] as const;

export const listingConditions = ["New", "Like New", "Good", "Fair"] as const;

// Item categories
export const itemCategories = [
  // Furniture
  "Chairs", 
  "Desks", 
  "Sofas", 
  "Beds", 
  "Storage", 
  "Lamps", 
  "Tables", 
  // Other categories
  "Clothing and Accessories",
  "School Supplies",
  "Sports Equipment",
  "Dining Credits",
  "Other"
] as const;

// Service categories
export const serviceCategories = [
  // Academic Services
  "Tutoring", 
  "Essay Editing", 
  "Note-taking", 
  "Research Assistance", 
  "Language Translation", 
  "Coding Help",
  "Design Services",
  // Personal Services
  "Cooking Lessons",
  "Fitness Training",
  "Music Lessons",
  "Photography",
  "Graphic Design",
  "Moving Assistance",
  "Tech Support",
  "Cleaning Services",
  "Video Editing",
  // Other
  "Other"
] as const;

// Experience categories
export const experienceCategories = [
  "Event Tickets",
  "Sports Games",
  "Concerts",
  "Campus Events",
  "Local Performances",
  "Workshop Passes",
  "Club Events",
  "Travel Experiences",
  "Group Activities",
  "Dining Experiences",
  "Other"
] as const;

// Helper function to get categories based on type
export const getCategoriesByType = (type: ListingType) => {
  switch (type) {
    case "item":
      return itemCategories;
    case "service":
      return serviceCategories;
    case "experience":
      return experienceCategories;
    default:
      return itemCategories;
  }
};

export type ListingType = typeof listingTypes[number];
export type ListingCondition = typeof listingConditions[number];
export type ItemCategory = typeof itemCategories[number];
export type ServiceCategory = typeof serviceCategories[number];
export type ExperienceCategory = typeof experienceCategories[number];
export type ListingCategory = ItemCategory | ServiceCategory | ExperienceCategory;
