-- P0: RLS chooses rows, not columns. The old prof_update policy allowed an
-- authenticated user to UPDATE their own rol/gimnasio_id (and thus change
-- current_gimnasio_id() / is_dueno()). Keep the existing profile writes used
-- by password onboarding and owner recovery-email settings, but deny every
-- other column to the Data API. service_role-backed actions retain their
-- existing privileges for owner/staff administration.
--
-- 0058 has three historical files with the same prefix. 0072 is the first
-- unused, unambiguous number after 0071; do not invoke the old runner with
-- only a duplicated prefix.

revoke update on table public.profiles from public, anon, authenticated;
grant update (debe_cambiar_clave, email_recuperacion)
  on table public.profiles to authenticated;
grant update on table public.profiles to service_role;

-- The direct authenticated writes above are only for the caller's own row.
-- Existing owner operations on other profiles use checked server actions
-- with service_role; an owner must not get broader direct column privileges.
drop policy if exists "prof_update" on public.profiles;
drop policy if exists "prof_update_self" on public.profiles;
create policy "prof_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
