create extension if not exists pgcrypto;

create type public.repair_status as enum ('RECEIVED', 'DONE', 'COLLECTED', 'CANCELLED');

create or replace function public.normalize_uk_phone(input_phone text)
returns text
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  digits text := regexp_replace(trim(input_phone), '\D', '', 'g');
begin
  if digits like '0044%' then
    digits := substring(digits from 5);
  elsif digits like '44%' then
    digits := substring(digits from 3);
  elsif trim(input_phone) like '+%' or digits like '00%' then
    raise exception 'Phone number must be a UK number';
  elsif digits like '0%' then
    digits := substring(digits from 2);
  end if;

  if digits !~ '^[0-9]{9,10}$' then
    raise exception 'Invalid UK phone number';
  end if;
  return '+44' || digits;
end;
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  full_name text generated always as (trim(first_name || ' ' || last_name)) stored,
  phone_number text not null unique
    check (phone_number = public.normalize_uk_phone(phone_number)),
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.normalize_customer_phone()
returns trigger language plpgsql set search_path = public as $$
begin
  new.phone_number = public.normalize_uk_phone(new.phone_number);
  return new;
end;
$$;

create trigger customers_normalize_phone before insert or update of phone_number
on public.customers for each row execute function public.normalize_customer_phone();

create sequence public.repair_number_seq start 1;

create or replace function public.generate_repair_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'REP-' || extract(year from current_date)::text || '-' ||
         lpad(nextval('public.repair_number_seq')::text, 6, '0');
$$;

create table public.repairs (
  id uuid primary key default gen_random_uuid(),
  repair_number text not null unique default public.generate_repair_number(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  instrument text not null,
  issue_description text not null,
  amount numeric(10,2) not null default 0 check (amount >= 0),
  status public.repair_status not null default 'RECEIVED',
  received_date timestamptz not null default now(),
  completed_date timestamptz,
  collected_date timestamptz,
  cancelled_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  old_status public.repair_status,
  new_status public.repair_status,
  created_at timestamptz not null default now()
);

create index repairs_customer_id_idx on public.repairs(customer_id);
create index repairs_status_idx on public.repairs(status);
create index repairs_received_date_idx on public.repairs(received_date desc);
create index customers_full_name_idx on public.customers using gin (to_tsvector('simple', full_name));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger repairs_updated_at before update on public.repairs
for each row execute function public.set_updated_at();

create or replace function public.log_repair_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_logs(repair_id, user_id, action, old_status, new_status)
    values (new.id, auth.uid(), 'STATUS_CHANGED', old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger repair_status_audit after update on public.repairs
for each row execute function public.log_repair_status_change();

alter table public.customers enable row level security;
alter table public.repairs enable row level security;
alter table public.audit_logs enable row level security;

create policy "Authenticated admins manage customers" on public.customers
for all to authenticated using (true) with check (true);
create policy "Authenticated admins manage repairs" on public.repairs
for all to authenticated using (true) with check (true);
create policy "Authenticated admins view audit logs" on public.audit_logs
for select to authenticated using (true);

revoke all on public.customers from anon;
revoke all on public.repairs from anon;
revoke all on public.audit_logs from anon;
