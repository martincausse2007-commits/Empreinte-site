-- =============================================================================
-- Quinzo — schéma de la base de données (PostgreSQL / Supabase)
-- Migration 1 : tables.
-- Les identifiants des objets métier (postes, employés, créneaux…) sont des textes
-- générés par l'application ; ils sont uniques À L'INTÉRIEUR d'un établissement
-- (clé primaire = établissement + id).
-- =============================================================================

create extension if not exists pgcrypto;

-- Établissement (un par compte en V1)
create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  activity text not null default 'restaurant',
  organisation text not null default 'coupure' check (organisation in ('coupure', 'continu', 'equipes', 'libre')),
  opening jsonb not null default '[]'::jsonb,
  prep_minutes integer not null default 0 check (prep_minutes between 0 and 240),
  close_minutes integer not null default 0 check (close_minutes between 0 and 240),
  closed_holidays text[] not null default '{}',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Qui a accès à quel établissement : propriétaire ou manager
create table public.members (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  primary key (establishment_id, user_id)
);
create index members_user_idx on public.members (user_id);

-- Règles de planning (une ligne par établissement)
create table public.rules (
  establishment_id uuid primary key references public.establishments (id) on delete cascade,
  rest_days_per_week integer not null default 2 check (rest_days_per_week between 1 and 3),
  consecutive_rest_days boolean not null default true,
  min_rest_hours numeric not null default 11 check (min_rest_hours between 0 and 24),
  max_hours_per_day numeric not null default 10 check (max_hours_per_day between 1 and 24),
  max_amplitude_hours numeric not null default 13 check (max_amplitude_hours between 1 and 24),
  split_shifts text not null default 'never' check (split_shifts in ('never', 'limited', 'often')),
  max_splits_per_week integer not null default 2 check (max_splits_per_week between 0 and 7),
  overtime_hours numeric not null default 0 check (overtime_hours between 0 and 48),
  weekend_fairness boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.posts (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) <= 60),
  color text not null default 'slate',
  position integer not null default 0,
  primary key (establishment_id, id)
);

-- Créneaux types (midi, soir, ouverture…)
create table public.services (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) <= 60),
  start_time text not null check (start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  end_time text not null check (end_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  break_minutes integer check (break_minutes between 0 and 240),
  overrides jsonb,
  days smallint[],
  position integer not null default 0,
  primary key (establishment_id, id)
);

-- Besoins : nombre de personnes par jour, créneau et poste
create table public.needs (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  day smallint not null check (day between 0 and 6),
  service_id text not null,
  post_id text not null,
  count integer not null check (count between 0 and 99),
  primary key (establishment_id, day, service_id, post_id)
);

create table public.employees (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  id text not null,
  first_name text not null check (char_length(first_name) <= 60),
  last_name text not null default '' check (char_length(last_name) <= 60),
  post_ids text[] not null default '{}',
  contract_hours numeric not null check (contract_hours between 0 and 60),
  unavailability jsonb not null default '[]'::jsonb,
  weekend_history integer not null default 0,
  hourly_rate numeric check (hourly_rate is null or hourly_rate between 0 and 1000),
  archived boolean not null default false,
  position integer not null default 0,
  primary key (establishment_id, id)
);

-- Semaines : statut de publication et copie publiée (ce que voit l'équipe)
create table public.weeks (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  week date not null check (extract(isodow from week) = 1),
  status text not null default 'draft' check (status in ('draft', 'published', 'modified')),
  published_at timestamptz,
  published_snapshot jsonb,
  updated_at timestamptz not null default now(),
  primary key (establishment_id, week)
);

-- Créneaux planifiés
create table public.shifts (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  id text not null,
  week date not null check (extract(isodow from week) = 1),
  employee_id text not null,
  day smallint not null check (day between 0 and 6),
  start_time text not null check (start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  end_time text not null check (end_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  post_id text not null,
  break_minutes integer check (break_minutes between 0 and 240),
  extra boolean not null default false,
  primary key (establishment_id, id),
  foreign key (establishment_id, employee_id) references public.employees (establishment_id, id) on delete cascade
);
create index shifts_week_idx on public.shifts (establishment_id, week);

create table public.templates (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  id text not null,
  name text not null check (char_length(name) <= 80),
  weeks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (establishment_id, id)
);

-- Absences : type et dates uniquement (jamais de motif, jamais d'information médicale)
create table public.absences (
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  id text not null,
  employee_id text not null,
  type text not null check (type in ('cp', 'repos', 'absence', 'arret', 'formation')),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  primary key (establishment_id, id),
  foreign key (establishment_id, employee_id) references public.employees (establishment_id, id) on delete cascade
);

-- Liens de partage en lecture seule pour l'équipe (jeton long, révocable)
create table public.share_links (
  token text primary key default translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_'),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index share_links_est_idx on public.share_links (establishment_id);

-- Journal des modifications (qui a fait quoi, quand)
create table public.audit_log (
  id bigserial primary key,
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  created_at timestamptz not null default now()
);
create index audit_log_est_idx on public.audit_log (establishment_id, created_at desc);

-- Consentements (CGU, CGV, accord de sous-traitance…) horodatés
create table public.consents (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  establishment_id uuid references public.establishments (id) on delete set null,
  document text not null check (document in ('cgu', 'cgv', 'dpa', 'privacy')),
  version text not null,
  accepted_at timestamptz not null default now()
);
