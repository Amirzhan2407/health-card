
create extension if not exists pgcrypto;

-- Пользователи системы
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),

  username text null,
  email text null,
  iin text null,

  full_name text not null,
  gender text not null default 'unknown'
    check (gender in ('male', 'female', 'unknown')),

  password_hash text not null,

  role text not null default 'patient'
    check (
      role in (
        'patient',
        'doctor',
        'organization_admin',
        'support'
      )
    ),

  status text not null default 'active'
    check (
      status in (
        'active',
        'blocked',
        'archived'
      )
    ),

  preferred_language text not null default 'ru'
    check (
      preferred_language in ('ru', 'kz', 'en')
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique_idx
on public.profiles (lower(username))
where username is not null;

create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

create unique index if not exists profiles_iin_unique_idx
on public.profiles (iin)
where iin is not null;

-- Refresh-токены
create table if not exists public.user_refresh_tokens (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid not null
    references public.profiles(id)
    on delete cascade,

  token_hash text not null unique,
  family_id uuid not null,

  expires_at timestamptz not null,

  is_revoked boolean not null default false,
  revoked_at timestamptz null,

  replaced_by uuid null
    references public.user_refresh_tokens(id)
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists user_refresh_tokens_profile_idx
on public.user_refresh_tokens (profile_id);

create index if not exists user_refresh_tokens_family_idx
on public.user_refresh_tokens (family_id);

create index if not exists user_refresh_tokens_expires_idx
on public.user_refresh_tokens (expires_at);

-- Одноразовые коды регистрации
create table if not exists public.patient_registration_codes (
  id uuid primary key default gen_random_uuid(),

  username text not null,
  email text not null,
  full_name text not null,

  password_hash text not null,
  code_hash text not null,

  preferred_language text not null default 'ru'
    check (
      preferred_language in ('ru', 'kz', 'en')
    ),

  attempts integer not null default 0
    check (attempts >= 0 and attempts <= 10),

  expires_at timestamptz not null,
  used_at timestamptz null,

  created_at timestamptz not null default now()
);

create index if not exists patient_registration_codes_email_idx
on public.patient_registration_codes (lower(email));

create index if not exists patient_registration_codes_expires_idx
on public.patient_registration_codes (expires_at);

create index if not exists patient_registration_codes_active_idx
on public.patient_registration_codes (
  lower(email),
  created_at desc
)
where used_at is null;

-- Закрываем служебные таблицы от прямого доступа frontend
alter table public.user_refresh_tokens
enable row level security;

alter table public.patient_registration_codes
enable row level security;

revoke all
on table public.user_refresh_tokens
from anon, authenticated;

revoke all
on table public.patient_registration_codes
from anon, authenticated;

