/**
 * purchases.ts — satın alma (RevenueCat bağlantı noktası).
 *
 * Paywall yalnızca bu dosyayı çağırır. RevenueCat entegre edilince
 * (SHARING_PLAN.md Faz E) yalnızca burası değişir:
 *   - buyPlan: Purchases.purchasePackage(...) → başarılıysa true
 *   - restorePurchases: Purchases.restorePurchases() → aktif hak varsa true
 * Sunucu tarafı webhook `entitlements` satırını (is_pro, pro_until, plan)
 * günceller; aile kaydı bunu gören aile ekranında kendiliğinden açılır.
 */
export type PlanId = 'individual' | 'family';

/** Satın alma henüz bağlı değil: her zaman false (paywall "yakında" der). */
export async function buyPlan(_plan: PlanId): Promise<boolean> {
  return false;
}

/** Geri yükleme henüz bağlı değil. */
export async function restorePurchases(): Promise<boolean> {
  return false;
}
