alter table public.orders
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed')),
  add column if not exists payment_reference text;

create unique index if not exists orders_payment_reference_unique
  on public.orders (payment_reference)
  where payment_reference is not null;
