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

do $$
begin
  if exists (
    select public.normalize_uk_phone(phone_number)
    from public.customers
    group by public.normalize_uk_phone(phone_number)
    having count(*) > 1
  ) then
    raise exception 'Phone normalization would create duplicate customers. Resolve duplicates before running this migration.';
  end if;
end;
$$;

update public.customers
set phone_number = public.normalize_uk_phone(phone_number)
where phone_number is distinct from public.normalize_uk_phone(phone_number);

create or replace function public.normalize_customer_phone()
returns trigger language plpgsql set search_path = public as $$
begin
  new.phone_number = public.normalize_uk_phone(new.phone_number);
  return new;
end;
$$;

drop trigger if exists customers_normalize_phone on public.customers;
create trigger customers_normalize_phone before insert or update of phone_number
on public.customers for each row execute function public.normalize_customer_phone();

alter table public.customers
drop constraint if exists customers_phone_number_uk_e164_check;

alter table public.customers
add constraint customers_phone_number_uk_e164_check
check (phone_number = public.normalize_uk_phone(phone_number));
