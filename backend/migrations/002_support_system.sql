
create extension if not exists pgcrypto;

-- =========================================================
-- ORGANIZATIONS
-- =========================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bin text null,
  city text null,
  email text null,
  phone text null,
  address text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations
  add column if not exists name text;

alter table public.organizations
  add column if not exists bin text;

alter table public.organizations
  add column if not exists city text;

alter table public.organizations
  add column if not exists email text;

alter table public.organizations
  add column if not exists phone text;

alter table public.organizations
  add column if not exists address text;

alter table public.organizations
  add column if not exists status text default 'active';

alter table public.organizations
  add column if not exists created_at timestamptz default now();

alter table public.organizations
  add column if not exists updated_at timestamptz default now();

alter table public.organizations
  drop constraint if exists organizations_status_check;

update public.organizations
set status = 'active'
where status is null
   or status not in (
     'active',
     'blocked',
     'pending',
     'waiting_first_login',
     'archived'
   );

alter table public.organizations
  add constraint organizations_status_check
  check (
    status in (
      'active',
      'blocked',
      'pending',
      'waiting_first_login',
      'archived'
    )
  );

create index if not exists organizations_status_idx
on public.organizations(status);

create index if not exists organizations_bin_idx
on public.organizations(bin);

-- =========================================================
-- PROFILE ORGANIZATION CONNECTION
-- =========================================================

alter table public.profiles
  add column if not exists organization_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_organization_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete set null;
  end if;
end
$$;

create index if not exists profiles_organization_id_idx
on public.profiles(organization_id);

-- =========================================================
-- SUPPORT CONVERSATIONS
-- =========================================================

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    constraint support_conversations_organization_id_fkey
    references public.organizations(id)
    on delete cascade,

  created_by uuid null
    constraint support_conversations_created_by_fkey
    references public.profiles(id)
    on delete set null,

  subject text not null,
  description text null,

  status text not null default 'open'
    constraint support_conversations_status_check
    check (
      status in (
        'open',
        'in_progress',
        'resolved',
        'closed'
      )
    ),

  resolved_at timestamptz null,

  resolved_by uuid null
    constraint support_conversations_resolved_by_fkey
    references public.profiles(id)
    on delete set null,

  closed_at timestamptz null,

  closed_by uuid null
    constraint support_conversations_closed_by_fkey
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_conversations
  add column if not exists organization_id uuid;

alter table public.support_conversations
  add column if not exists created_by uuid;

alter table public.support_conversations
  add column if not exists subject text;

alter table public.support_conversations
  add column if not exists description text;

alter table public.support_conversations
  add column if not exists status text default 'open';

alter table public.support_conversations
  add column if not exists resolved_at timestamptz;

alter table public.support_conversations
  add column if not exists resolved_by uuid;

alter table public.support_conversations
  add column if not exists closed_at timestamptz;

alter table public.support_conversations
  add column if not exists closed_by uuid;

alter table public.support_conversations
  add column if not exists created_at timestamptz default now();

alter table public.support_conversations
  add column if not exists updated_at timestamptz default now();

alter table public.support_conversations
  drop constraint if exists support_conversations_status_check;

update public.support_conversations
set status = 'in_progress'
where status = 'in_work';

update public.support_conversations
set status = 'open'
where status is null
   or status not in (
     'open',
     'in_progress',
     'resolved',
     'closed'
   );

alter table public.support_conversations
  add constraint support_conversations_status_check
  check (
    status in (
      'open',
      'in_progress',
      'resolved',
      'closed'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_conversations_organization_id_fkey'
  ) then
    alter table public.support_conversations
      add constraint support_conversations_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_conversations_created_by_fkey'
  ) then
    alter table public.support_conversations
      add constraint support_conversations_created_by_fkey
      foreign key (created_by)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_conversations_resolved_by_fkey'
  ) then
    alter table public.support_conversations
      add constraint support_conversations_resolved_by_fkey
      foreign key (resolved_by)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_conversations_closed_by_fkey'
  ) then
    alter table public.support_conversations
      add constraint support_conversations_closed_by_fkey
      foreign key (closed_by)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;

create index if not exists support_conversations_organization_idx
on public.support_conversations(organization_id);

create index if not exists support_conversations_status_idx
on public.support_conversations(status);

create index if not exists support_conversations_updated_idx
on public.support_conversations(updated_at desc);

-- =========================================================
-- SUPPORT MESSAGES
-- =========================================================

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    constraint support_messages_conversation_id_fkey
    references public.support_conversations(id)
    on delete cascade,

  sender_id uuid null
    constraint support_messages_sender_id_fkey
    references public.profiles(id)
    on delete set null,

  sender_role text null
    constraint support_messages_sender_role_check
    check (
      sender_role in (
        'organization_admin',
        'support'
      )
    ),

  message_text text not null default '',

  attachment_path text null,
  attachment_name text null,
  attachment_type text null,
  attachment_size bigint null,
  attachment_url text null,

  is_read boolean not null default false,
  read_at timestamptz null,

  created_at timestamptz not null default now()
);

alter table public.support_messages
  add column if not exists conversation_id uuid;

alter table public.support_messages
  add column if not exists sender_id uuid;

alter table public.support_messages
  add column if not exists sender_role text;

alter table public.support_messages
  add column if not exists message_text text default '';

alter table public.support_messages
  add column if not exists attachment_path text;

alter table public.support_messages
  add column if not exists attachment_name text;

alter table public.support_messages
  add column if not exists attachment_type text;

alter table public.support_messages
  add column if not exists attachment_size bigint;

alter table public.support_messages
  add column if not exists attachment_url text;

alter table public.support_messages
  add column if not exists is_read boolean default false;

alter table public.support_messages
  add column if not exists read_at timestamptz;

alter table public.support_messages
  add column if not exists created_at timestamptz default now();

alter table public.support_messages
  drop constraint if exists support_messages_sender_role_check;

update public.support_messages sm
set sender_role = p.role
from public.profiles p
where sm.sender_id = p.id
  and sm.sender_role is null
  and p.role in (
    'organization_admin',
    'support'
  );

alter table public.support_messages
  add constraint support_messages_sender_role_check
  check (
    sender_role is null
    or sender_role in (
      'organization_admin',
      'support'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_messages_conversation_id_fkey'
  ) then
    alter table public.support_messages
      add constraint support_messages_conversation_id_fkey
      foreign key (conversation_id)
      references public.support_conversations(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_messages_sender_id_fkey'
  ) then
    alter table public.support_messages
      add constraint support_messages_sender_id_fkey
      foreign key (sender_id)
      references public.profiles(id)
      on delete set null;
  end if;
end
$$;

create index if not exists support_messages_conversation_idx
on public.support_messages(conversation_id, created_at);

create index if not exists support_messages_unread_idx
on public.support_messages(conversation_id, is_read)
where is_read = false;

-- =========================================================
-- NOTIFICATIONS
-- =========================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),

  profile_id uuid null
    constraint notifications_profile_id_fkey
    references public.profiles(id)
    on delete cascade,

  recipient_role text null,
  organization_id uuid null
    constraint notifications_organization_id_fkey
    references public.organizations(id)
    on delete cascade,

  title text not null,
  message text not null,

  type text null,
  link text null,

  is_read boolean not null default false,
  read_at timestamptz null,

  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists profile_id uuid;

alter table public.notifications
  add column if not exists recipient_role text;

alter table public.notifications
  add column if not exists organization_id uuid;

alter table public.notifications
  add column if not exists title text;

alter table public.notifications
  add column if not exists message text;

alter table public.notifications
  add column if not exists type text;

alter table public.notifications
  add column if not exists link text;

alter table public.notifications
  add column if not exists is_read boolean default false;

alter table public.notifications
  add column if not exists read_at timestamptz;

alter table public.notifications
  add column if not exists created_at timestamptz default now();

alter table public.notifications
  alter column profile_id drop not null;

alter table public.notifications
  drop constraint if exists notifications_recipient_role_check;

alter table public.notifications
  add constraint notifications_recipient_role_check
  check (
    recipient_role is null
    or recipient_role in (
      'patient',
      'doctor',
      'organization_admin',
      'support'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_profile_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_profile_id_fkey
      foreign key (profile_id)
      references public.profiles(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_organization_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_organization_id_fkey
      foreign key (organization_id)
      references public.organizations(id)
      on delete cascade;
  end if;
end
$$;

create index if not exists notifications_profile_idx
on public.notifications(profile_id, created_at desc);

create index if not exists notifications_role_idx
on public.notifications(recipient_role, created_at desc);

create index if not exists notifications_organization_idx
on public.notifications(organization_id, created_at desc);

create index if not exists notifications_unread_idx
on public.notifications(is_read, created_at desc)
where is_read = false;

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at
on public.organizations;

create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists support_conversations_set_updated_at
on public.support_conversations;

create trigger support_conversations_set_updated_at
before update on public.support_conversations
for each row
execute function public.set_updated_at();

-- =========================================================
-- STORAGE BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'support-attachments',
  'support-attachments',
  false,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =========================================================
-- SECURITY
-- Backend uses the Supabase service role.
-- Frontend must not access these tables directly.
-- =========================================================

alter table public.support_conversations
enable row level security;

alter table public.support_messages
enable row level security;

alter table public.notifications
enable row level security;

revoke all
on table public.support_conversations
from anon, authenticated;

revoke all
on table public.support_messages
from anon, authenticated;

revoke all
on table public.notifications
from anon, authenticated;

