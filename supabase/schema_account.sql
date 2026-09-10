-- =====================================================================
--  Refill — Hesap silme (mağaza zorunluluğu: Apple 5.1.1(v), Google Play)
--
--  Kullanıcı kendi hesabını uygulama içinden siler. auth.users satırı
--  silinince sheets / sessions / strokes / entitlements / organizations /
--  org_members / share_grants "on delete cascade" ile gider.
--
--  Storage: dosyaları İSTEMCİ önce Storage API ile siler (lib/account.ts);
--  storage.objects satırını SQL ile silmek dosyayı depodan kaldırmaz.
--  Burada yalnızca artık metadata satırları temizlenir.
--
--  Supabase SQL editöründe çalıştır. Tekrar çalıştırmak güvenlidir.
-- =====================================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from storage.objects
   where bucket_id = 'sheets'
     and (storage.foldername(name))[1] = uid::text;

  delete from auth.users where id = uid;
end;
$$;

-- Supabase varsayılan yetkileri public fonksiyonları anon'a da açar; geri al.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- DOĞRULAMA:
-- select to_regprocedure('public.delete_my_account()') is not null as delete_fn_ok;
