
create extension if not exists pgcrypto;

-- =========================================================
-- ORGANIZATION APPLICATIONS
-- =========================================================

create table if not exists public.organization_applications (
  id uuid primary key default gen_random_uuid(),

  organization_name text not null,
  bin text not null,
  city text not null,
  address text null,

  contact_email text not null,
  contact_phone text not null,
  admin_name text not null,

  status text not null default 'pending'
    constraint organization_applications_status_check
    check (
      status in (
        'pending',
        'approved',
        'rejected'
      )
    ),

  rejection_reason text null,
  reviewed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Добавляем отсутствующие столбцы, если таблица уже существовала

alter table public.organization_applications
  add column if not exists organization_name text;

alter table public.organization_applications
  add column if not exists bin text;

alter table public.organization_applications
  add column if not exists city text;

alter table public.organization_applications
  add column if not exists address text;

alter table public.organization_applications
  add column if not exists contact_email text;

alter table public.organization_applications
  add column if not exists contact_phone text;

alter table public.organization_applications
  add column if not exists admin_name text;

alter table public.organization_applications
  add column if not exists status text default 'pending';

alter table public.organization_applications
  add column if not exists rejection_reason text;

alter table public.organization_applications
  add column if not exists reviewed_at timestamptz;

alter table public.organization_applications
  add column if not exists created_at timestamptz default now();

alter table public.organization_applications
  add column if not exists updated_at timestamptz default now();

-- Нормализация старых статусов

update public.organization_applications
set status = 'pending'
where status is null
   or status in ('new', 'submitted', 'waiting');

update public.organization_applications
set status = 'approved'
where status in ('accepted', 'active');

update public.organization_applications
set status = 'rejected'
where status in ('declined', 'denied');

update public.organization_applications
set status = 'pending'
where status not in (
  'pending',
  'approved',
  'rejected'
);

-- Проверка статусов

alter table public.organization_applications
  drop constraint if exists organization_applications_status_check;

alter table public.organization_applications
  add constraint organization_applications_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected'
    )
  );

-- Проверка БИН

alter table public.organization_applications
  drop constraint if exists organization_applications_bin_check;

alter table public.organization_applications
  add constraint organization_applications_bin_check
  check (
    bin is null
    or bin ~ '^[0-9]{12}$'
  );

-- Индексы

create index if not exists organization_applications_status_idx
on public.organization_applications(status);

create index if not exists organization_applications_created_idx
on public.organization_applications(created_at desc);

create index if not exists organization_applications_email_idx
on public.organization_applications(lower(contact_email));

create index if not exists organization_applications_bin_idx
on public.organization_applications(bin);

-- Нельзя иметь две активные заявки с одинаковым БИН

create unique index if not exists organization_applications_active_bin_unique_idx
on public.organization_applications(bin)
where status in ('pending', 'approved');

-- Автоматическое обновление updated_at

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organization_applications_set_updated_at
on public.organization_applications;

create trigger organization_applications_set_updated_at
before update on public.organization_applications
for each row
execute function public.set_updated_at();

-- =========================================================
-- SECURITY
-- Заявки создаются и читаются только через backend.
-- =========================================================

alter table public.organization_applications
enable row level security;

revoke all
on table public.organization_applications
from anon, authenticated;

