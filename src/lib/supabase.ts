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

/**
 * Safely creates a Supabase channel by cleaning up any existing channel with the same topic first
 * preventing "cannot add callbacks after subscribe()" errors.
 */
export function safeCreateChannel(topic: string, opts?: any) {
  if (!isSupabaseConfigured()) return null;
  try {
    const existingChannels = supabase.getChannels();
    existingChannels.forEach((c) => {
      if (c.topic === topic) {
        supabase.removeChannel(c);
      }
    });
  } catch (e) {
    console.debug('[Supabase] safeCreateChannel cleanup warning:', e);
  }
  return opts ? supabase.channel(topic, opts) : supabase.channel(topic);
}

export default supabase;
