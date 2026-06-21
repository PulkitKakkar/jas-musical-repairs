create extension if not exists pgcrypto;

create type public.repair_status as enum ('RECEIVED', 'DONE', 'COLLECTED', 'CANCELLED');

create or replace function public.normalize_phone(input_phone text, default_country_code text default '+44')
returns text
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  trimmed text := trim(input_phone);
  country text := regexp_replace(coalesce(default_country_code, '+44'), '\D', '', 'g');
  digits text := regexp_replace(trim(input_phone), '\D', '', 'g');
begin
  if trimmed = '' then
    raise exception 'Phone number is required';
  end if;

  if trimmed like '+%' then
    return '+' || digits;
  elsif digits like '00%' then
    return '+' || substring(digits from 3);
  elsif digits like country || '%' and length(digits) > length(country) + 6 then
    return '+' || digits;
  elsif digits like '0%' then
    return '+' || country || substring(digits from 2);
  end if;

  return '+' || country || digits;
end;
$$;

create or replace function public.normalize_uk_phone(input_phone text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select public.normalize_phone(input_phone, '+44');
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  full_name text generated always as (trim(first_name || ' ' || last_name)) stored,
  phone_number text not null unique
    check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.normalize_customer_phone()
returns trigger language plpgsql set search_path = public as $$
begin
  new.phone_number = public.normalize_phone(new.phone_number, '+44');
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
  payment_status text not null default 'UNPAID'
    check (payment_status in ('UNPAID', 'PARTIAL', 'PAID')),
  alternate_phone_number text
    check (alternate_phone_number is null or alternate_phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  status public.repair_status not null default 'RECEIVED',
  received_date timestamptz not null default now(),
  completed_date timestamptz,
  collected_date timestamptz,
  cancelled_date timestamptz,
  collection_reminder_sent_at timestamptz,
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

create or replace function public.normalize_repair_alternate_phone()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.alternate_phone_number is not null and trim(new.alternate_phone_number) <> '' then
    new.alternate_phone_number = public.normalize_phone(new.alternate_phone_number, '+44');
  else
    new.alternate_phone_number = null;
  end if;
  return new;
end;
$$;

create trigger repairs_normalize_alternate_phone before insert or update of alternate_phone_number
on public.repairs for each row execute function public.normalize_repair_alternate_phone();

create sequence public.hire_number_seq start 1;

create or replace function public.generate_hire_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'HIR-' || extract(year from current_date)::text || '-' ||
         lpad(nextval('public.hire_number_seq')::text, 6, '0');
$$;

create table public.hires (
  id uuid primary key default gen_random_uuid(),
  hire_number text not null unique default public.generate_hire_number(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  instrument text not null,
  hire_date timestamptz not null,
  return_due_date timestamptz not null,
  returned_date timestamptz,
  hire_duration_days integer generated always as (
    greatest(1, ((return_due_date at time zone 'UTC')::date - (hire_date at time zone 'UTC')::date) + 1)
  ) stored,
  hire_cost numeric(10,2) not null default 0 check (hire_cost >= 0),
  hire_vat numeric(10,2) generated always as (round(hire_cost * 0.20, 2)) stored,
  hire_total numeric(10,2) generated always as (round(hire_cost * 1.20, 2)) stored,
  security_deposit numeric(10,2) not null default 0 check (security_deposit >= 0),
  payment_method text not null default 'CASH' check (payment_method in ('CASH', 'CARD')),
  card_processing_fee numeric(10,2) generated always as (
    case when payment_method = 'CARD' then round(security_deposit * 0.015, 2) else 0 end
  ) stored,
  extra_charge numeric(10,2) not null default 0 check (extra_charge >= 0),
  return_amount numeric(10,2) generated always as (
    round(
      security_deposit -
      case when payment_method = 'CARD' then security_deposit * 0.015 else 0 end -
      (hire_cost * 1.20) -
      extra_charge,
      2
    )
  ) stored,
  status text not null default 'HIRED' check (status in ('HIRED', 'RETURNED')),
  hire_sms_sent_at timestamptz,
  return_reminder_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_due_date >= hire_date),
  check ((status = 'RETURNED' and returned_date is not null) or (status = 'HIRED' and returned_date is null))
);

create index hires_customer_id_idx on public.hires(customer_id);
create index hires_status_idx on public.hires(status);
create index hires_hire_date_idx on public.hires(hire_date desc);
create index hires_return_due_date_idx on public.hires(return_due_date);

create trigger hires_updated_at before update on public.hires
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
alter table public.hires enable row level security;
alter table public.audit_logs enable row level security;

create policy "Authenticated admins manage customers" on public.customers
for all to authenticated using (true) with check (true);
create policy "Authenticated admins manage repairs" on public.repairs
for all to authenticated using (true) with check (true);
create policy "Authenticated admins manage hires" on public.hires
for all to authenticated using (true) with check (true);
create policy "Authenticated admins view audit logs" on public.audit_logs
for select to authenticated using (true);

revoke all on public.customers from anon;
revoke all on public.repairs from anon;
revoke all on public.hires from anon;
revoke all on public.audit_logs from anon;
