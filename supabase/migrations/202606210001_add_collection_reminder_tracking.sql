alter table public.repairs
add column if not exists collection_reminder_sent_at timestamptz;
