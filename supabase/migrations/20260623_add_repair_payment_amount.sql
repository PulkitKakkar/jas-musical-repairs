alter table public.repairs
add column if not exists payment_amount numeric(10,2) not null default 0
check (payment_amount >= 0);
