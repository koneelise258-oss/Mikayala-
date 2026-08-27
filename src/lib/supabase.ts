import { createClient, SupabaseClient } from '@supabase/supabase-js';

const envObj = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
const supabaseUrl: string = envObj?.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = envObj?.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks if Supabase credentials are configured in the environment
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('http') && 
    supabaseAnonKey.length > 10 &&
    !supabaseUrl.includes('placeholder')
  );
};

/**
 * Supabase Client singleton instance configured with auto-refresh and persistent session storage
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

export default supabase;
