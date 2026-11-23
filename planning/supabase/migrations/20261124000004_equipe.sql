-- =============================================================================
-- Quinzo — Migration 4 : l'équipe dans l'application.
-- * Champs de la phase 1 (verrous, préférences, publication, CA prévu…).
-- * Comptes salariés reliés par un lien d'invitation.
-- * Demandes (congés, échanges, disponibilités, créneaux libres), accusés de
--   lecture, abonnements aux notifications.
-- Principe de sécurité : un salarié ne lit JAMAIS les tables du gérant. Il passe
-- par get_my_space(), qui ne renvoie que les semaines PUBLIÉES, ses propres
-- informations et le prénom de ses collègues (jamais un taux horaire).
-- =============================================================================

-- ---- Phase 1 -------------------------------------------------------------------
alter table public.shifts
  add column if not exists locked boolean not null default false,
  add column if not exists manual boolean not null default false,
  add column if not exists reason text[];

alter table public.employees
  add column if not exists prefs jsonb not null default '{}'::jsonb,
  add column if not exists email text check (email is null or (char_length(email) <= 200 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists invite_code text unique,
  add column if not exists invite_expires_at timestamptz;
create unique index if not exists employees_user_est_idx on public.employees (establishment_id, user_id) where user_id is not null;
create index if not exists employees_user_idx on public.employees (user_id) where user_id is not null;

alter table public.rules
  add column if not exists notice_part_time_days integer not null default 7 check (notice_part_time_days between 0 and 30),
  add column if not exists notice_full_time_days integer not null default 7 check (notice_full_time_days between 0 and 30),
  add column if not exists labor_target_percent numeric not null default 30 check (labor_target_percent between 0 and 100),
  add column if not exists employer_charges_percent numeric not null default 0 check (employer_charges_percent between 0 and 100);

alter table public.weeks
  add column if not exists changes jsonb not null default '[]'::jsonb,
  add column if not exists locked_employees text[] not null default '{}',
  add column if not exists revenue jsonb,
  add column if not exists open_shifts jsonb not null default '[]'::jsonb;

-- ---- Demandes de l'équipe ------------------------------------------------------------
create table if not exists public.requests (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  id text not null check (char_length(id) <= 60),
  employee_id text not null,
  type text not null check (type in ('leave', 'swap', 'availability', 'claim')),
  status text not null default 'pending' check (status in ('peer', 'pending', 'accepted', 'refused', 'cancelled')),
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) < 8000),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  primary key (establishment_id, id),
  foreign key (establishment_id, employee_id) references public.employees (establishment_id, id) on delete cascade
);
create index if not exists requests_est_idx on public.requests (establishment_id, created_at desc);

-- ---- Accusés de lecture : quelle version publiée chaque salarié a ouverte ---------------
create table if not exists public.week_reads (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  employee_id text not null,
  week date not null,
  version timestamptz not null,
  read_at timestamptz not null default now(),
  primary key (establishment_id, employee_id, week),
  foreign key (establishment_id, employee_id) references public.employees (establishment_id, id) on delete cascade
);

-- ---- Abonnements aux notifications du navigateur (web push, gratuit) ---------------------
create table if not exists public.push_subscriptions (
  endpoint text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---- Fonctions d'appartenance côté salarié -----------------------------------------------
create or replace function public.my_employee_id(est uuid)
returns text language sql stable security definer set search_path = public as $$
  select e.id from public.employees e
  where e.establishment_id = est and e.user_id = auth.uid() and not e.archived and auth.uid() is not null
  limit 1;
$$;

-- ---- Sécurité ----------------------------------------------------------------------------
alter table public.requests enable row level security;
alter table public.week_reads enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on public.requests, public.week_reads, public.push_subscriptions from anon;
grant select, insert, update, delete on public.requests, public.week_reads, public.push_subscriptions to authenticated;

-- Gérant : tout sur les demandes et lecture des accusés de son établissement
create policy requests_members on public.requests for all to authenticated using (public.is_member(establishment_id)) with check (public.is_member(establishment_id));
create policy week_reads_members on public.week_reads for select to authenticated using (public.is_member(establishment_id));

-- Salarié : voit ses demandes et les échanges qu'on lui propose
create policy requests_employee_select on public.requests for select to authenticated using (
  employee_id = public.my_employee_id(establishment_id)
  or (type = 'swap' and payload ->> 'toEmployeeId' = public.my_employee_id(establishment_id))
);
-- Salarié : crée une demande pour lui-même uniquement, jamais déjà « acceptée ».
-- Un échange commence toujours « en attente du collègue ».
create policy requests_employee_insert on public.requests for insert to authenticated with check (
  employee_id = public.my_employee_id(establishment_id)
  and answered_at is null
  and ((type = 'swap' and status = 'peer') or (type <> 'swap' and status = 'pending'))
);

-- Salarié : enregistre qu'il a ouvert le planning publié (pour lui seulement)
create policy week_reads_employee_select on public.week_reads for select to authenticated using (employee_id = public.my_employee_id(establishment_id));
create policy week_reads_employee_insert on public.week_reads for insert to authenticated with check (employee_id = public.my_employee_id(establishment_id));
create policy week_reads_employee_update on public.week_reads for update to authenticated
  using (employee_id = public.my_employee_id(establishment_id)) with check (employee_id = public.my_employee_id(establishment_id));

-- Salarié : voit sa propre fiche (pour savoir où il travaille), sans pouvoir la modifier
create policy employees_self_select on public.employees for select to authenticated using (user_id = auth.uid());

-- Abonnements : chacun gère les siens ; le gérant lit ceux de ses salariés reliés (pour les prévenir)
create policy push_own on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_managers on public.push_subscriptions for select to authenticated using (
  exists (select 1 from public.employees e where e.user_id = push_subscriptions.user_id and not e.archived and public.is_member(e.establishment_id))
);

-- Le compte relié et le code d'invitation ne changent QUE par les fonctions prévues.
-- Le gérant peut seulement retirer l'accès (user_id remis à vide).
create or replace function public.guard_employee_link()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('quinzo.trusted', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    if new.user_id is not null or new.invite_code is not null then raise exception 'Lien de compte interdit ici'; end if;
    return new;
  end if;
  if new.user_id is distinct from old.user_id and new.user_id is not null then raise exception 'Lien de compte interdit ici'; end if;
  if new.invite_code is distinct from old.invite_code and new.invite_code is not null then raise exception 'Code d''invitation interdit ici'; end if;
  if new.invite_expires_at is distinct from old.invite_expires_at and new.invite_code is not null then raise exception 'Code d''invitation interdit ici'; end if;
  return new;
end $$;
drop trigger if exists employees_guard_link on public.employees;
create trigger employees_guard_link before insert or update on public.employees for each row execute function public.guard_employee_link();

-- ---- Invitation d'un salarié ----------------------------------------------------------------
create or replace function public.create_invite(p_est uuid, p_employee text)
returns text language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not public.is_member(p_est) then raise exception 'Accès refusé'; end if;
  code := translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_');
  perform set_config('quinzo.trusted', 'on', true);
  update public.employees set invite_code = code, invite_expires_at = now() + interval '14 days'
    where establishment_id = p_est and id = p_employee and not archived;
  if not found then raise exception 'Salarié introuvable'; end if;
  perform set_config('quinzo.trusted', '', true);
  return code;
end $$;

-- Ce que montre la page d'invitation avant connexion : le commerce et le prénom, rien d'autre
create or replace function public.invite_info(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('establishment', est.name, 'first_name', e.first_name)
  from public.employees e join public.establishments est on est.id = e.establishment_id
  where e.invite_code = p_code and e.invite_expires_at > now() and e.user_id is null and not e.archived and char_length(p_code) >= 20;
$$;

create or replace function public.accept_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select establishment_id, id into r from public.employees
    where invite_code = p_code and invite_expires_at > now() and user_id is null and not archived and char_length(p_code) >= 20;
  if not found then raise exception 'Invitation invalide ou expirée'; end if;
  if exists (select 1 from public.employees where establishment_id = r.establishment_id and user_id = auth.uid()) then
    raise exception 'Ce compte est déjà relié à un salarié de cet établissement';
  end if;
  perform set_config('quinzo.trusted', 'on', true);
  update public.employees set user_id = auth.uid(), invite_code = null, invite_expires_at = null
    where establishment_id = r.establishment_id and id = r.id;
  perform set_config('quinzo.trusted', '', true);
  return r.establishment_id;
end $$;

-- ---- L'espace du salarié : uniquement ce qu'il a le droit de voir -------------------------------
create or replace function public.get_my_space()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'establishment', jsonb_build_object('id', est.id, 'name', est.name),
    'me', jsonb_build_object('id', me.id, 'first_name', me.first_name, 'last_name', me.last_name, 'post_ids', me.post_ids,
                             'contract_hours', me.contract_hours, 'unavailability', me.unavailability, 'prefs', me.prefs),
    'colleagues', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'first_name', c.first_name, 'post_ids', c.post_ids) order by c.position), '[]'::jsonb)
                   from public.employees c where c.establishment_id = est.id and not c.archived),
    'posts', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'color', p.color) order by p.position), '[]'::jsonb)
              from public.posts p where p.establishment_id = est.id),
    'services', (select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'start', v.start_time, 'end', v.end_time) order by v.position), '[]'::jsonb)
              from public.services v where v.establishment_id = est.id),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object(
                'week', w.week, 'published_at', w.published_at, 'snapshot', w.published_snapshot,
                -- Créneaux libres : seulement ceux qui lui sont proposés
                'open_shifts', (select coalesce(jsonb_agg(o), '[]'::jsonb) from jsonb_array_elements(w.open_shifts) o where o -> 'offeredTo' ? me.id)
              ) order by w.week), '[]'::jsonb)
              from public.weeks w
              where w.establishment_id = est.id and w.status in ('published', 'modified')
                and w.week between current_date - 42 and current_date + 70),
    'requests', (select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'employee_id', r.employee_id, 'type', r.type, 'status', r.status, 'payload', r.payload, 'created_at', r.created_at) order by r.created_at), '[]'::jsonb)
                 from public.requests r where r.establishment_id = est.id
                   and (r.employee_id = me.id or (r.type = 'swap' and r.payload ->> 'toEmployeeId' = me.id))
                   and r.created_at > now() - interval '120 days'),
    'absences', (select coalesce(jsonb_agg(jsonb_build_object('type', a.type, 'start', a.start_date, 'end', a.end_date)), '[]'::jsonb)
                 from public.absences a where a.establishment_id = est.id and a.employee_id = me.id and a.end_date >= current_date - 42),
    'reads', (select coalesce(jsonb_object_agg(r.week, r.version), '{}'::jsonb) from public.week_reads r where r.establishment_id = est.id and r.employee_id = me.id)
  ) order by est.name), '[]'::jsonb)
  from public.employees me join public.establishments est on est.id = me.establishment_id
  where me.user_id = auth.uid() and auth.uid() is not null and not me.archived;
$$;

-- Le collègue répond à une proposition d'échange
create or replace function public.answer_peer(p_est uuid, p_id text, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.requests set status = case when p_accept then 'pending' else 'refused' end
  where establishment_id = p_est and id = p_id and type = 'swap' and status = 'peer'
    and payload ->> 'toEmployeeId' = public.my_employee_id(p_est);
  if not found then raise exception 'Demande introuvable'; end if;
end $$;

-- Le salarié annule sa propre demande tant qu'elle n'a pas de réponse
create or replace function public.cancel_request(p_est uuid, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.requests set status = 'cancelled'
  where establishment_id = p_est and id = p_id and status in ('peer', 'pending') and employee_id = public.my_employee_id(p_est);
  if not found then raise exception 'Demande introuvable'; end if;
end $$;

-- ---- Lien de partage en lecture seule (sans compte) : semaines PUBLIÉES uniquement -------------
create or replace function public.get_public_planning(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'establishment', est.name,
    'posts', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'color', p.color) order by p.position), '[]'::jsonb) from public.posts p where p.establishment_id = est.id),
    'employees', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'first_name', e.first_name) order by e.position), '[]'::jsonb) from public.employees e where e.establishment_id = est.id and not e.archived),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'published_at', w.published_at, 'snapshot', w.published_snapshot) order by w.week), '[]'::jsonb)
              from public.weeks w where w.establishment_id = est.id and w.status in ('published', 'modified') and w.week between current_date - 21 and current_date + 56)
  )
  from public.share_links l join public.establishments est on est.id = l.establishment_id
  where l.token = p_token and l.revoked_at is null and char_length(p_token) >= 20;
$$;

revoke all on function public.my_employee_id(uuid), public.create_invite(uuid, text), public.invite_info(text), public.accept_invite(text),
  public.get_my_space(), public.answer_peer(uuid, text, boolean), public.cancel_request(uuid, text), public.get_public_planning(text) from public, anon;
grant execute on function public.my_employee_id(uuid), public.create_invite(uuid, text), public.invite_info(text), public.accept_invite(text),
  public.get_my_space(), public.answer_peer(uuid, text, boolean), public.cancel_request(uuid, text), public.get_public_planning(text) to authenticated;
grant execute on function public.invite_info(text), public.get_public_planning(text) to anon;

-- Journal : demandes et changements de compte relié
drop trigger if exists requests_log on public.requests;
create trigger requests_log after insert or update or delete on public.requests for each row execute function public.log_change();
