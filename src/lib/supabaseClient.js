import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    'Supabase',
    'Supabase connection details are missing. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// Resilient initialization that prevents compile-time crashes if environment variables are missing during setup
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// Helper to ensure supabase is initialized before making a call
export const getSupabaseClient = () => {
  if (!supabase) {
    const errorMsg = 'Supabase client is not initialized. Please verify your environment variables.';
    logger.error('Supabase', errorMsg);
    throw new Error(errorMsg);
  }
  return supabase;
};
