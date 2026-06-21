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

alter table public.customers
drop constraint if exists customers_phone_number_uk_e164_check;

alter table public.customers
drop constraint if exists customers_phone_number_check;

alter table public.customers
drop constraint if exists customers_phone_number_e164_check;

alter table public.customers
add constraint customers_phone_number_e164_check
check (phone_number ~ '^\+[1-9][0-9]{7,14}$');

alter table public.repairs
add column if not exists alternate_phone_number text;

alter table public.repairs
drop constraint if exists repairs_alternate_phone_number_check;

alter table public.repairs
drop constraint if exists repairs_alternate_phone_number_e164_check;

alter table public.repairs
add constraint repairs_alternate_phone_number_e164_check
check (alternate_phone_number is null or alternate_phone_number ~ '^\+[1-9][0-9]{7,14}$');

create or replace function public.normalize_customer_phone()
returns trigger language plpgsql set search_path = public as $$
begin
  new.phone_number = public.normalize_phone(new.phone_number, '+44');
  return new;
end;
$$;

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

drop trigger if exists customers_normalize_phone on public.customers;

create trigger customers_normalize_phone
before insert or update of phone_number on public.customers
for each row execute function public.normalize_customer_phone();

drop trigger if exists repairs_normalize_alternate_phone on public.repairs;

create trigger repairs_normalize_alternate_phone
before insert or update of alternate_phone_number on public.repairs
for each row execute function public.normalize_repair_alternate_phone();
