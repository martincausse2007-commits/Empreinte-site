-- =============================================================================
-- Quinzo — Migration 2 : sécurité (Row Level Security), fonctions et journal.
-- Principe : un utilisateur ne voit et ne modifie QUE les établissements dont il
-- est membre. Les visiteurs anonymes n'ont accès à aucune table : seulement à la
-- fonction get_public_planning(jeton), qui renvoie la semaine PUBLIÉE.
-- =============================================================================

-- ---- Fonctions d'appartenance ----------------------------------------------------
create or replace function public.is_member(est uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.establishment_id = est and m.user_id = auth.uid());
$$;

create or replace function public.is_owner(est uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members m where m.establishment_id = est and m.user_id = auth.uid() and m.role = 'owner');
$$;

-- ---- Activation de la RLS sur TOUTES les tables -----------------------------------
alter table public.establishments enable row level security;
alter table public.members enable row level security;
alter table public.rules enable row level security;
alter table public.posts enable row level security;
alter table public.services enable row level security;
alter table public.needs enable row level security;
alter table public.employees enable row level security;
alter table public.weeks enable row level security;
alter table public.shifts enable row level security;
alter table public.templates enable row level security;
alter table public.absences enable row level security;
alter table public.share_links enable row level security;
alter table public.audit_log enable row level security;
alter table public.consents enable row level security;

-- Personne d'anonyme ne touche aux tables
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---- Établissements : création uniquement via create_establishment() ----------------
create policy est_select on public.establishments for select to authenticated using (public.is_member(id));
create policy est_update on public.establishments for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy est_delete on public.establishments for delete to authenticated using (public.is_owner(id));

-- ---- Membres : visibles par les membres, gérés par le propriétaire -----------------
create policy members_select on public.members for select to authenticated using (public.is_member(establishment_id));
create policy members_insert on public.members for insert to authenticated with check (public.is_owner(establishment_id));
create policy members_update on public.members for update to authenticated using (public.is_owner(establishment_id)) with check (public.is_owner(establishment_id));
create policy members_delete on public.members for delete to authenticated using (public.is_owner(establishment_id));

-- ---- Données de l'établissement : réservées à ses membres ---------------------------
do $$
declare t text;
begin
  foreach t in array array['rules', 'posts', 'services', 'needs', 'employees', 'weeks', 'shifts', 'templates', 'absences', 'share_links'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_member(establishment_id)) with check (public.is_member(establishment_id))', t || '_members', t);
  end loop;
end $$;

-- Journal : lecture par les membres ; écriture uniquement par les déclencheurs
create policy audit_select on public.audit_log for select to authenticated using (public.is_member(establishment_id));
revoke insert, update, delete on public.audit_log from authenticated;

-- Consentements : chacun ne voit et n'ajoute que les siens (jamais modifiés ni supprimés)
create policy consents_select on public.consents for select to authenticated using (user_id = auth.uid());
create policy consents_insert on public.consents for insert to authenticated with check (user_id = auth.uid());
revoke update, delete on public.consents from authenticated;

-- ---- Création d'un établissement (le créateur en devient propriétaire) --------------
create or replace function public.create_establishment(p_name text, p_activity text default 'restaurant')
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if (select count(*) from public.members where user_id = auth.uid() and role = 'owner') >= 1 then
    raise exception 'Un seul établissement par compte';
  end if;
  insert into public.establishments (name, activity, created_by) values (p_name, coalesce(p_activity, 'restaurant'), auth.uid()) returning id into new_id;
  insert into public.members (establishment_id, user_id, role) values (new_id, auth.uid(), 'owner');
  insert into public.rules (establishment_id) values (new_id);
  return new_id;
end $$;
revoke all on function public.create_establishment(text, text) from public, anon;
grant execute on function public.create_establishment(text, text) to authenticated;

-- ---- Statut des semaines : toute modification après publication = « modifié » ------
create or replace function public.touch_week()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  r := coalesce(new, old);
  insert into public.weeks (establishment_id, week) values (r.establishment_id, r.week)
    on conflict (establishment_id, week) do update
    set updated_at = now(),
        status = case when public.weeks.status = 'published' then 'modified' else public.weeks.status end;
  if tg_op = 'UPDATE' and old.week <> new.week then
    update public.weeks set updated_at = now(), status = case when status = 'published' then 'modified' else status end
    where establishment_id = old.establishment_id and week = old.week;
  end if;
  return null;
end $$;
create trigger shifts_touch_week after insert or update or delete on public.shifts for each row execute function public.touch_week();

-- ---- Journal des modifications -------------------------------------------------------
create or replace function public.log_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  r := coalesce(new, old);
  insert into public.audit_log (establishment_id, user_id, action, entity, entity_id)
  -- Jamais le jeton d'un lien de partage dans le journal
  values (r.establishment_id, auth.uid(), lower(tg_op), tg_table_name, case when tg_table_name = 'share_links' then null else (to_jsonb(r) ->> 'id') end);
  return null;
end $$;
create trigger employees_log after insert or update or delete on public.employees for each row execute function public.log_change();
create trigger absences_log after insert or update or delete on public.absences for each row execute function public.log_change();
create trigger shifts_log after insert or update or delete on public.shifts for each row execute function public.log_change();
create trigger share_links_log after insert or update or delete on public.share_links for each row execute function public.log_change();

-- ---- Mise à jour automatique de updated_at --------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger establishments_updated before update on public.establishments for each row execute function public.set_updated_at();
create trigger rules_updated before update on public.rules for each row execute function public.set_updated_at();
