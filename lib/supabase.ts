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

// Tải API key từ tài khoản Supabase
export const loadApiKeyFromAccount = async (userId: string): Promise<string | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('gemini_api_key')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return (data as any).gemini_api_key || null;
};

// Lưu API key vào tài khoản Supabase
export const saveApiKeyToAccount = async (userId: string, apiKey: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      gemini_api_key: apiKey,
      updated_at: new Date().toISOString(),
    } as any, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error saving API key to account:', error);
    return false;
  }
  return true;
};
