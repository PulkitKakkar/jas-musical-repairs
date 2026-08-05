alter type public.repair_status add value if not exists 'CANCELLED';

alter table public.repairs
add column if not exists cancelled_date timestamptz;
