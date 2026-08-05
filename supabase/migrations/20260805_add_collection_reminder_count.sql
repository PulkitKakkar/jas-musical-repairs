alter table public.repairs
add column if not exists collection_reminder_count integer not null default 0
check (collection_reminder_count >= 0);

update public.repairs
set collection_reminder_count = 1
where collection_reminder_sent_at is not null
  and collection_reminder_count = 0;
