import { db } from './db';
import { 
  users, 
  listings, 
  conversations, 
  conversationParticipants,
  messages as newMessages
} from '../shared/schema';
import { sql } from 'drizzle-orm';
import { eq, and, desc, asc } from 'drizzle-orm/expressions';

/**
 * Migrates the database schema for the new messaging system.
 * 1. Creates the necessary tables (conversations, conversation_participants, new messages)
 * 2. Migrates old message data to the new structure
 */
export async function migrateMessagingSystem() {
  console.log('Starting messaging system migration...');

  try {
    // Step 1: Check if the new tables exist, create them if not
    await createTablesIfNotExist();
    
    // Step 2: Check if old messages table exists and has data to migrate
    const oldMessagesExist = await checkOldMessagesTable();
    
    if (oldMessagesExist) {
      // Step 3: Migrate old messages to the new structure
      await migrateOldMessages();
      
      // Step 4: Rename old messages table to keep as backup
      await renameOldMessagesTable();
    } else {
      console.log('No old messages table or no data to migrate. Migration completed.');
    }
    
    console.log('Messaging system migration completed successfully.');
    return true;
  } catch (error) {
    console.error('Error during messaging system migration:', error);
    return false;
  }
}

async function createTablesIfNotExist() {
  try {
    // Execute the migration SQL directly
    console.log('Creating new messaging tables if they don\'t exist...');
    
    // Check if conversations table exists
    const conversationsTableExists = await checkTableExists('conversations');
    if (!conversationsTableExists) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "conversations" (
          "id" serial PRIMARY KEY NOT NULL,
          "listing_id" integer,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        )
      `);
      console.log('Created conversations table');
    }

    // Check if conversation_participants table exists
    const participantsTableExists = await checkTableExists('conversation_participants');
    if (!participantsTableExists) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "conversation_participants" (
          "conversation_id" integer,
          "user_id" integer,
          "last_read_at" timestamp,
          CONSTRAINT "conversation_participants_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
        )
      `);
      console.log('Created conversation_participants table');
    }

    // Rename the old messages table if it exists but doesn't have the new schema
    const messagesTableExists = await checkTableExists('messages');
    if (messagesTableExists) {
      // Check if it has the new schema by checking for conversation_id column
      const hasNewSchema = await checkColumnExists('messages', 'conversation_id');
      
      if (!hasNewSchema) {
        // Rename the old messages table
        await db.execute(sql`ALTER TABLE "messages" RENAME TO "old_messages"`);
        console.log('Renamed old messages table to old_messages');
        
        // Create the new messages table
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "messages" (
            "id" serial PRIMARY KEY NOT NULL,
            "conversation_id" integer NOT NULL,
            "sender_id" integer NOT NULL,
            "content" text NOT NULL,
            "has_attachment" boolean DEFAULT false,
            "attachment_url" text,
            "created_at" timestamp DEFAULT now(),
            "read_at" timestamp
          )
        `);
        console.log('Created new messages table');
      }
    } else {
      // Create the new messages table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "messages" (
          "id" serial PRIMARY KEY NOT NULL,
          "conversation_id" integer NOT NULL,
          "sender_id" integer NOT NULL,
          "content" text NOT NULL,
          "has_attachment" boolean DEFAULT false,
          "attachment_url" text,
          "created_at" timestamp DEFAULT now(),
          "read_at" timestamp
        )
      `);
      console.log('Created new messages table');
    }
    
    // Add foreign key constraints
    await addForeignKeyConstraints();
    
    console.log('Tables created or verified successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    )
  `);
  
  return result.rows && result.rows[0] && result.rows[0].exists === true;
}

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
      AND column_name = ${columnName}
    )
  `);
  
  return result.rows && result.rows[0] && result.rows[0].exists === true;
}

async function addForeignKeyConstraints() {
  try {
    // Add foreign key constraints if they don't exist
    // First check if the constraints exist
    const conversationParticipantsFkExists = await checkForeignKeyExists('conversation_participants_conversation_id_conversations_id_fk');
    if (!conversationParticipantsFkExists) {
      await db.execute(sql`
        ALTER TABLE "conversation_participants" 
        ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" 
        FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
      `);
      
      await db.execute(sql`
        ALTER TABLE "conversation_participants" 
        ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      `);
    }
    
    const conversationsFkExists = await checkForeignKeyExists('conversations_listing_id_listings_id_fk');
    if (!conversationsFkExists) {
      await db.execute(sql`
        ALTER TABLE "conversations" 
        ADD CONSTRAINT "conversations_listing_id_listings_id_fk" 
        FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL
      `);
    }
    
    const messagesFkExists = await checkForeignKeyExists('messages_conversation_id_conversations_id_fk');
    if (!messagesFkExists) {
      await db.execute(sql`
        ALTER TABLE "messages" 
        ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" 
        FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
      `);
      
      await db.execute(sql`
        ALTER TABLE "messages" 
        ADD CONSTRAINT "messages_sender_id_users_id_fk" 
        FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE
      `);
    }
    
    console.log('Foreign key constraints added');
  } catch (error) {
    console.error('Error adding foreign key constraints:', error);
    throw error;
  }
}

async function checkForeignKeyExists(constraintName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name = ${constraintName}
    )
  `);
  
  return result.rows && result.rows[0] && result.rows[0].exists === true;
}

async function checkOldMessagesTable(): Promise<boolean> {
  try {
    // Check if old_messages table exists
    const oldMessagesExists = await checkTableExists('old_messages');
    if (oldMessagesExists) {
      // Check if it has data
      const result = await db.execute(sql`SELECT COUNT(*) FROM old_messages`);
      return result.rows && result.rows[0] && parseInt(result.rows[0].count as string) > 0;
    }
    
    // Check if original messages table exists with old schema
    const messagesExists = await checkTableExists('messages');
    if (messagesExists) {
      // Check if it has old schema (has receiver_id column)
      const hasOldSchema = await checkColumnExists('messages', 'receiver_id');
      
      if (hasOldSchema) {
        // Check if it has data
        const result = await db.execute(sql`SELECT COUNT(*) FROM messages`);
        return result.rows && result.rows[0] && parseInt(result.rows[0].count as string) > 0;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking old messages table:', error);
    return false;
  }
}

async function migrateOldMessages() {
  try {
    console.log('Migrating old messages to new structure...');
    
    // Determine which table to use
    const oldMessagesExists = await checkTableExists('old_messages');
    const tableName = oldMessagesExists ? 'old_messages' : 'messages';
    
    // Get all unique combinations of sender, receiver, and listing
    const conversationGroups: { 
      senderId: number; 
      receiverId: number; 
      listingId: number;
    }[] = [];
    
    const result = await db.execute(sql`
      SELECT DISTINCT sender_id, receiver_id, listing_id 
      FROM ${sql.identifier(tableName)}
      WHERE sender_id IS NOT NULL 
      AND receiver_id IS NOT NULL 
      AND listing_id IS NOT NULL
    `);
    
    if (result.rows && result.rows.length > 0) {
      for (const row of result.rows) {
        conversationGroups.push({
          senderId: parseInt(row.sender_id as string),
          receiverId: parseInt(row.receiver_id as string),
          listingId: parseInt(row.listing_id as string)
        });
      }
    }
    
    console.log(`Found ${conversationGroups.length} conversation groups to migrate`);
    
    // Process each conversation group
    for (const group of conversationGroups) {
      // Create a conversation for this group
      const [conversation] = await db.insert(conversations)
        .values({
          listingId: group.listingId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log(`Created conversation ${conversation.id} for listing ${group.listingId}`);
      
      // Add participants to the conversation
      await db.insert(conversationParticipants)
        .values([
          {
            conversationId: conversation.id,
            userId: group.senderId,
            lastReadAt: null
          },
          {
            conversationId: conversation.id,
            userId: group.receiverId,
            lastReadAt: null
          }
        ]);
      
      console.log(`Added participants ${group.senderId} and ${group.receiverId} to conversation ${conversation.id}`);
      
      // Get all messages between these users for this listing
      const messagesResult = await db.execute(sql`
        SELECT id, sender_id, content, created_at, read
        FROM ${sql.identifier(tableName)}
        WHERE ((sender_id = ${group.senderId} AND receiver_id = ${group.receiverId})
        OR (sender_id = ${group.receiverId} AND receiver_id = ${group.senderId}))
        AND listing_id = ${group.listingId}
        ORDER BY created_at ASC
      `);
      
      if (messagesResult.rows && messagesResult.rows.length > 0) {
        // Migrate each message to the new structure
        for (const msg of messagesResult.rows) {
          await db.insert(newMessages)
            .values({
              conversationId: conversation.id,
              senderId: parseInt(msg.sender_id as string),
              content: msg.content as string,
              hasAttachment: false,
              attachmentUrl: null,
              createdAt: new Date(msg.created_at as string | number),
              readAt: msg.read ? new Date() : null
            });
        }
        
        console.log(`Migrated ${messagesResult.rows.length} messages to conversation ${conversation.id}`);
      }
    }
    
    console.log('All messages migrated successfully');
  } catch (error) {
    console.error('Error migrating old messages:', error);
    throw error;
  }
}

async function renameOldMessagesTable() {
  try {
    // Check if old_messages table exists
    const oldMessagesExists = await checkTableExists('old_messages');
    
    if (!oldMessagesExists) {
      // Only rename if we haven't already renamed it
      const messagesExists = await checkTableExists('messages');
      const hasOldSchema = messagesExists && await checkColumnExists('messages', 'receiver_id');
      
      if (hasOldSchema) {
        await db.execute(sql`ALTER TABLE "messages" RENAME TO "old_messages_backup"`);
        console.log('Renamed old messages table to old_messages_backup');
      }
    }
  } catch (error) {
    console.error('Error renaming old messages table:', error);
    throw error;
  }
}