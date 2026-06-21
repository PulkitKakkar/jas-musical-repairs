alter table public.hires
add column if not exists late_return_daily_charge numeric(10,2) not null default 0
check (late_return_daily_charge >= 0);
