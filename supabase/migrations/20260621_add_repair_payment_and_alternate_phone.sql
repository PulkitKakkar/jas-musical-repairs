alter table public.repairs
add column if not exists payment_status text not null default 'UNPAID'
  check (payment_status in ('UNPAID', 'PARTIAL', 'PAID')),
add column if not exists alternate_phone_number text
  check (alternate_phone_number is null or alternate_phone_number = public.normalize_uk_phone(alternate_phone_number));

create or replace function public.normalize_repair_alternate_phone()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.alternate_phone_number is not null and trim(new.alternate_phone_number) <> '' then
    new.alternate_phone_number = public.normalize_uk_phone(new.alternate_phone_number);
  else
    new.alternate_phone_number = null;
  end if;
  return new;
end;
$$;

drop trigger if exists repairs_normalize_alternate_phone on public.repairs;
create trigger repairs_normalize_alternate_phone before insert or update of alternate_phone_number
on public.repairs for each row execute function public.normalize_repair_alternate_phone();
