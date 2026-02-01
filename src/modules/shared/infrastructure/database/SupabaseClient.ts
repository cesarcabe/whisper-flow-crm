import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { env } from '@/config/env';

let supabaseInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient<Database>(env.supabase.url, env.supabase.anonKey, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}

/**
 * @deprecated Use getSupabaseClient() from shared module instead.
 * This re-export maintains backward compatibility during migration.
 */
export const supabase = getSupabaseClient();
