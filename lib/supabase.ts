import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Missing Supabase credentials. Copy .env.example to .env and fill in:\n' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Fallback client so the app boots even without credentials configured.
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-key';

export const supabase = createClient<Database>(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Auth helpers
export const signUp = async (
  email: string,
  password: string,
  username: string
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

// Google (Gmail) native sign-in
// Client ID'leri Google Cloud Console'dan alınır (README'deki kurulum adımları).
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      // Kullanıcı hesap seçiciyi kapattı / iptal etti.
      return { data: null, error: null, cancelled: true };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return {
        data: null,
        error: { message: 'Google ID token alınamadı.' },
        cancelled: false,
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    return { data, error, cancelled: false };
  } catch (e: any) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      return { data: null, error: null, cancelled: true };
    }
    if (isErrorWithCode(e) && e.code === statusCodes.IN_PROGRESS) {
      return { data: null, error: null, cancelled: true };
    }
    return {
      data: null,
      error: { message: e?.message ?? 'Google ile giriş başarısız.' },
      cancelled: false,
    };
  }
};

export const signOut = async () => {
  // Google oturumunu da kapat (varsa) ki hesap seçici tekrar sorsun.
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google ile giriş yapılmamışsa yok sayılır.
  }
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user ?? null, error };
};

export const resetPassword = async (email: string) => {
  const redirectUrl = 'refill://reset-password';
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  return { data, error };
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};
