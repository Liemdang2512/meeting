// DEPRECATED: File nay chuyen sang Express + JWT. Giu lai de backward compat.
// Tat ca imports tu lib/supabase se hoat dong nho re-export nay.
export { login as signInWithEmail, logout as signOut, loadApiKeyFromAccount, saveApiKeyToAccount } from './auth';
export type { AuthState } from './auth';

// Cac exports cu khong con dung — tra ve no-op
export const supabase = null;
export const isSupabaseConfigured = () => false;
export const getInitialAuthState = async () => ({ session: null, user: null });
