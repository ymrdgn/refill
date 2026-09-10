import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
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

/* ------------------------------------------------------------------ */
/*  Google (Gmail) native sign-in                                      */
/* ------------------------------------------------------------------ */
/**
 * google-signin bir NATIVE modüldür ve Expo Go'nun ikili dosyasında yoktur.
 * Dosyanın tepesinden import edilirse Expo Go uygulamayı daha açarken
 * "TurboModuleRegistry... 'RNGoogleSignin' could not be found" ile çöker.
 * Bu yüzden modülü ilk kullanımda (butona basınca) yükleriz — dev build ve
 * mağaza sürümünde davranış aynıdır, sadece Expo Go'da buton gizlenir
 * (bkz. app/(auth)/login.tsx) ve uygulama çökmeden açılır.
 */
export const isGoogleSignInAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let googleModule: GoogleModule | null = null;

/** Modülü tembel yükler ve yalnızca bir kez configure eder. */
function loadGoogle(): GoogleModule {
  if (!googleModule) {
    const mod: GoogleModule = require('@react-native-google-signin/google-signin');
    // Client ID'leri Google Cloud Console'dan alınır (README'deki kurulum adımları).
    mod.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
    googleModule = mod;
  }
  return googleModule;
}

export const signInWithGoogle = async () => {
  if (!isGoogleSignInAvailable) {
    return {
      data: null,
      error: { message: 'Google ile giriş Expo Go’da kullanılamaz.' },
      cancelled: false,
    };
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
    loadGoogle();
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

/* ------------------------------------------------------------------ */
/*  Apple native sign-in (yalnızca iOS)                                */
/* ------------------------------------------------------------------ */
/**
 * expo-apple-authentication Expo SDK'nın parçasıdır ve Expo Go'da da vardır;
 * tembel yüklemeye gerek yok. Apple, Google gibi üçüncü taraf girişi sunan
 * iOS uygulamalarında kendi girişini zorunlu tutar (App Store 4.8).
 * Supabase tarafında Apple sağlayıcısı açık ve client id = bundle id olmalı.
 */
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
};

export const signInWithApple = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      return {
        data: null,
        error: { message: 'Apple kimlik belirteci alınamadı.' },
        cancelled: false,
      };
    }
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    // Apple adı yalnızca İLK girişte verir; varsa kullanıcı adı olarak sakla.
    const given = credential.fullName?.givenName;
    if (!error && given) {
      await supabase.auth
        .updateUser({ data: { username: given } })
        .catch(() => {});
    }
    return { data, error, cancelled: false };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      return { data: null, error: null, cancelled: true };
    }
    return {
      data: null,
      error: { message: e?.message ?? 'Apple ile giriş başarısız.' },
      cancelled: false,
    };
  }
};

export const signOut = async () => {
  // Google oturumunu da kapat (varsa) ki hesap seçici tekrar sorsun.
  if (isGoogleSignInAvailable) {
    try {
      await loadGoogle().GoogleSignin.signOut();
    } catch {
      // Google ile giriş yapılmamışsa ya da modül yüklenemediyse yok sayılır.
    }
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
