/**
 * links.ts — uygulama dışına verilen bağlantılar (aile daveti; ileride QR).
 *
 * Bağlantı https olmalı: özel şema (refill://) uygulama kurulu değilse
 * açılmaz, mesajlaşma uygulamalarında tıklanabilir bile olmayabilir.
 * EXPO_PUBLIC_LINK_BASE altındaki sayfa (web/join.html, GitHub Pages'te
 * 404.html kopyası) uygulamayı açmayı dener, açamazsa mağazaya yönlendirir ve
 * "kurduktan sonra bağlantıyı tekrar aç" der. Aynı taban yasal sayfaları da
 * taşır (privacy.html, terms.html, account-deletion.html). Yol yapısı uygulama rotasıyla AYNIDIR (/org/join/<token>) ki
 * ileride universal/app link eklenince sayfa hiç görünmeden rota açılsın.
 *
 * Taban adres tanımlı değilse (geliştirme) Expo'nun kendi derin bağlantısı
 * üretilir: Expo Go'da exp://..., derlenmiş uygulamada refill://...
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const LINK_BASE = (process.env.EXPO_PUBLIC_LINK_BASE ?? '').replace(/\/+$/, '');

/** Uygulamanın derin bağlantı olarak tanıdığı yollar (başlangıç öneki). */
const DEEP_LINK_PATHS = ['org/join/'];

/** Uygulama içi bir yola dışarıdan açılabilir bağlantı üretir. */
export function appLink(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return LINK_BASE ? `${LINK_BASE}/${clean}` : Linking.createURL(clean);
}

/** Aile davet bağlantısı. */
export function inviteLink(token: string): string {
  return appLink(`org/join/${token}`);
}

/** Bir URL'nin uygulama içi yolunu çıkarır (şema/host'tan bağımsız). */
function pathOf(url: string): string {
  const rest = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  // http(s)/exp: ilk parça host'tur; özel şemada (refill://) tamamı yoldur.
  const withHost = /^(https?|exp|exps):\/\//i.test(url);
  const path = withHost ? rest.split('/').slice(1).join('/') : rest;
  return path.replace(/^--\//, '').replace(/^\/+/, '').split(/[?#]/)[0];
}

/**
 * Uygulama tanıdığı bir derin bağlantıyla mı açıldı? Öyleyse expo-router
 * rotayı zaten kurmuştur; açılış yönlendirmesi üzerine yazmamalı.
 */
export async function openedWithDeepLink(): Promise<boolean> {
  try {
    const url = await Linking.getInitialURL();
    if (!url) return false;
    const path = pathOf(url);
    return DEEP_LINK_PATHS.some((p) => path.startsWith(p));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Bekleyen davet: giriş yapmamış kullanıcı bağlantıya tıkladığında  */
/*  token saklanır, girişten sonra katılma ekranı otomatik açılır.     */
/* ------------------------------------------------------------------ */

const PENDING_INVITE_KEY = 'refill:pendingInvite';

export async function setPendingInvite(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
  } catch {}
}

/** Bekleyen daveti döner ve siler (tek kullanımlık). */
export async function takePendingInvite(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (token) await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    return token;
  } catch {
    return null;
  }
}
