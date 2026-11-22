-- =============================================================================
-- Quinzo — Migration 3 : plusieurs établissements par gérant, convention collective.
-- =============================================================================

-- Convention collective de l'établissement (numéro IDCC, ou « code » = Code du travail seul)
alter table public.establishments add column if not exists convention text not null default 'code'
  check (char_length(convention) <= 20);

-- Un gérant peut créer plusieurs établissements (limite de sécurité : 30)
create or replace function public.create_establishment(p_name text, p_activity text default 'restaurant')
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if (select count(*) from public.members where user_id = auth.uid() and role = 'owner') >= 30 then
    raise exception 'Nombre maximum d''établissements atteint';
  end if;
  insert into public.establishments (name, activity, created_by) values (p_name, coalesce(p_activity, 'restaurant'), auth.uid()) returning id into new_id;
  insert into public.members (establishment_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.rules (establishment_id) values (new_id);
  return new_id;
end $$;
revoke all on function public.create_establishment(text, text) from public, anon;
grant execute on function public.create_establishment(text, text) to authenticated;
