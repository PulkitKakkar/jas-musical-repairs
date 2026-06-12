insert into public.customers (first_name, last_name, phone_number, email) values
  ('Amelia', 'Hart', '+447700900101', 'amelia@example.com'),
  ('Noah', 'Williams', '+447700900102', 'noah@example.com'),
  ('Olivia', 'Singh', '+447700900103', 'olivia@example.com');

insert into public.repairs (customer_id, instrument, issue_description, amount, status, completed_date)
select id, 'Violin', 'Bridge replacement and setup', 85.00, 'DONE', now()
from public.customers where phone_number = '+447700900101';

insert into public.repairs (customer_id, instrument, issue_description, amount)
select id, 'Clarinet', 'Sticky keys and full service', 120.00
from public.customers where phone_number = '+447700900102';

insert into public.repairs (customer_id, instrument, issue_description, amount, status, completed_date, collected_date)
select id, 'Acoustic Guitar', 'Replace strings and repair output jack', 65.00, 'COLLECTED', now() - interval '2 days', now()
from public.customers where phone_number = '+447700900103';
