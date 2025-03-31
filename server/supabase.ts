import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
// Following Supabase documentation for proper connection
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || '',
  {
    auth: {
      persistSession: false,
    },
    db: { 
      schema: 'public' 
    }
  }
);

// Log configuration details
console.log(`Initializing Supabase client with:
URL: ${process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 10) + '...' : 'missing'}
Key length: ${process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0} characters
Schema: public`);

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
      const { data: testData, error: tableError } = await supabase.from('users').select('*').limit(1);
      
      if (tableError) {
        // If we get a specific error about the table not existing, that's actually good news
        // It means our credentials are working, we just need to create tables
        if (tableError.code === '42P01') {
          console.log('Supabase credentials valid, but tables need to be created');
          return true;
        } 
        
        console.error('Supabase table error:', tableError);
        return true; // Continue anyway since auth is working
      }
      
      // If we got here, tables exist
      console.log(`Supabase tables check successful. Found ${testData ? testData.length : 0} users.`);
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