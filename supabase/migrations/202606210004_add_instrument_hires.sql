create sequence if not exists public.hire_number_seq start 1;

create or replace function public.generate_hire_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'HIR-' || extract(year from current_date)::text || '-' ||
         lpad(nextval('public.hire_number_seq')::text, 6, '0');
$$;

create table if not exists public.hires (
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
  late_return_daily_charge numeric(10,2) not null default 0 check (late_return_daily_charge >= 0),
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

create index if not exists hires_customer_id_idx on public.hires(customer_id);
create index if not exists hires_status_idx on public.hires(status);
create index if not exists hires_hire_date_idx on public.hires(hire_date desc);
create index if not exists hires_return_due_date_idx on public.hires(return_due_date);

drop trigger if exists hires_updated_at on public.hires;
create trigger hires_updated_at before update on public.hires
for each row execute function public.set_updated_at();

alter table public.hires enable row level security;

drop policy if exists "Authenticated admins manage hires" on public.hires;
create policy "Authenticated admins manage hires" on public.hires
for all to authenticated using (true) with check (true);

revoke all on public.hires from anon;
