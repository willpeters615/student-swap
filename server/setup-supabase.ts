import { log } from './vite';
import fs from 'fs';
import path from 'path';
import { pool } from './db';

export async function setupSupabaseTables() {
  try {
    log('Setting up database tables...');
    
    const client = await pool.connect();
    
    try {
      // Read the SQL file using a relative path since __dirname is not available in ESM
      const sqlPath = path.join(process.cwd(), 'server', 'setup-supabase.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      
      // Execute SQL statements
      log('Executing SQL to create tables...');
      await client.query(sqlContent);
      
      log('Database tables created successfully');
      return true;
    } catch (error) {
      console.error('Error creating database tables:', error);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error connecting to database:', error);
    return false;
  }
}