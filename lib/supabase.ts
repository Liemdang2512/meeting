import { createClient, type Session, type User } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

export interface AuthState {
  session: Session | null;
  user: User | null;
}

export const getInitialAuthState = async (): Promise<AuthState> => {
  if (!supabase) {
    return { session: null, user: null };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    return { session: null, user: null };
  }

  return {
    session: data.session,
    user: data.session.user,
  };
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình. Vui lòng thiết lập biến môi trường.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};
