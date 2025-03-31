import { log } from './vite';
import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';
import { pool } from './db';

export async function setupSupabaseTables() {
  try {
    log('Setting up Supabase tables...');
    
    // Read the SQL file to check if tables need to be created
    const sqlPath = path.join(process.cwd(), 'server', 'setup-supabase.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    try {
      // Force creation of tables - we know they're missing
      log('Creating database tables via direct SQL...');
      // Execute the SQL statements directly against the database
      await pool.query(sqlContent);
      log('Tables created successfully');
      
      // Verify tables were created
      const verifyResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'listings', 'favorites', 'messages')
      `);
      
      log(`Table verification: Found ${verifyResult.rowCount || 0} tables`);
      if (verifyResult.rows) {
        log(`Tables: ${verifyResult.rows.map((r: any) => r.table_name).join(', ')}`);
      }
      
      log('Supabase tables setup completed');
      return true;
    } catch (dbError) {
      console.error('Error setting up tables via direct SQL:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error setting up Supabase tables:', error);
    return false;
  }
}