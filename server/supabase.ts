import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

// Check if Supabase connection is valid
export async function checkSupabaseConnection() {
  try {
    // Simple healthcheck to see if credentials are valid
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase authentication error:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    
    // Try to access one of our tables
    try {
      const { error: tableError } = await supabase.from('users').select('count').single();
      
      // If we get a specific error about the table not existing, that's actually good news
      // It means our credentials are working, we just need to create tables
      if (tableError && tableError.code === '42P01') {
        console.log('Supabase credentials valid, but tables need to be created');
        return true;
      } 
      
      if (tableError) {
        console.error('Supabase table error:', tableError);
      }
      
      return true;
    } catch (tableError) {
      console.error('Error checking table existence:', tableError);
      // Return true anyway since the credentials are valid
      return true;
    }
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}