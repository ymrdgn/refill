/**
 * orgs.ts — kurum (aile / işletme) işlemleri.
 *
 * Aile = Duolingo tipi koltuk paketi: satın alan kişi (sahip) üyeleri davet
 * eder, her üye sınırsız fotoğraf kağıdı hakkı kazanır. Kağıtlar aile içinde
 * PAYLAŞILMAZ. Planın kaynağı sahibinin entitlements satırıdır
 * (plan = 'family'); aile kaydı satın alma sonrası istemcide kendiliğinden
 * açılır (create_organization aile için idempotenttir).
 *
 * Kurum oluşturma ve davetle katılma sunucudaki `security definer` RPC'lerle
 * yapılır (bkz. supabase/schema_orgs.sql): koltuk limiti, plan kontrolü ve
 * üyelik yazımı orada tek işlemde olur, istemci atlatamaz.
 *
 * Okuma tarafı offline-first: kurum ve üyelik listesi her senkronda yerele
 * iner (lib/db/sync.ts), ekranlar yerelden okur.
 */
import { supabase } from './supabase';
import * as local from './db/local';
import type { Organization, OrgMember } from './database.types';

/** Aile paketindeki koltuk sayısı, sahip dahil (sunucudaki seat_limit ile aynı olmalı). */
export const FAMILY_SEATS = 5;

/* ------------------------------------------------------------------ */
/*  Yerel okuma                                                        */
/* ------------------------------------------------------------------ */

/** Kullanıcının üyesi olduğu kurumlar (yerelden, çevrimdışı çalışır). */
export async function listMyOrgs(userId: string): Promise<Organization[]> {
  const [orgs, members] = await Promise.all([
    local.getAll('organizations'),
    local.getAll('org_members'),
  ]);
  const mine = new Set(
    members.filter((m) => m.user_id === userId).map((m) => m.org_id)
  );
  return orgs.filter((o) => mine.has(o.id));
}

/**
 * Kullanıcının ailesi: önce sahibi olduğu, yoksa üyesi olduğu ilk aile.
 * (Başkasının ailesindeyken kendi planını alan kişi kendi ailesini görür.)
 */
export async function getMyFamily(userId: string): Promise<Organization | null> {
  const families = (await listMyOrgs(userId)).filter((o) => o.kind === 'family');
  return families.find((o) => o.owner_id === userId) ?? families[0] ?? null;
}

export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const members = await local.getAll('org_members');
  return members
    .filter((m) => m.org_id === orgId)
    .sort((a, b) => (a.joined_at < b.joined_at ? -1 : 1));
}

export async function myRole(
  orgId: string,
  userId: string
): Promise<OrgMember['role'] | null> {
  const members = await local.getAll('org_members');
  return (
    members.find((m) => m.org_id === orgId && m.user_id === userId)?.role ?? null
  );
}

/**
 * Kurumun planı şu an geçerli mi? Sunucuda hesaplanır (plan_active alanı):
 * aile için sahibinin aboneliğine, işletme için org.plan'a bakar.
 */
export function isPlanActive(org: Organization | null): boolean {
  return !!org?.plan_active;
}

/* ------------------------------------------------------------------ */
/*  Sunucu işlemleri (ağ gerekir)                                      */
/* ------------------------------------------------------------------ */

/**
 * Yeni kurum açar ve kurucuyu üye yapar; kurumun id'sini döner.
 * Aile için idempotent: zaten sahibi olduğun aile varsa onun id'si döner.
 */
export async function createOrganization(
  name: string,
  kind: 'family' | 'business' = 'family'
): Promise<string> {
  const { data, error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_kind: kind,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Davet bağlantısını kullanır. Hata kodları sunucudan gelir:
 *  invalid_invite      → bağlantı geçersiz/süresi dolmuş/iptal edilmiş
 *  seat_limit_exceeded → koltuklar dolu (ya da ailede plan yok)
 */
export async function redeemInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_org_invite', {
    p_token: token,
  });
  if (error) throw error;
  return data as string;
}

/** Yönetici için yeni davet bağlantısı üretir; token'ı döner. */
export async function createInvite(
  orgId: string,
  userId: string,
  opts?: { expiresInDays?: number; maxUses?: number }
): Promise<string> {
  const token = randomToken();
  const expires =
    opts?.expiresInDays != null
      ? new Date(Date.now() + opts.expiresInDays * 86400_000).toISOString()
      : null;

  const { error } = await supabase.from('org_invites').insert({
    org_id: orgId,
    token,
    created_by: userId,
    expires_at: expires,
    max_uses: opts?.maxUses ?? null,
  });
  if (error) throw error;
  return token;
}

/** Aileden ayrıl (ya da yönetici olarak birini çıkar). */
export async function removeMember(
  orgId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** Kurum adını değiştirir (yalnızca yönetici). */
export async function renameOrg(orgId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', orgId);
  if (error) throw error;
}

/** URL'de taşınabilir, okunaklı, tahmin edilmesi zor kısa token. */
function randomToken(len = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I,O,0,1 yok
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
