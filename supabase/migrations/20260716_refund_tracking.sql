alter table public.orders
  add column if not exists refund_status text,
  add column if not exists refund_reference text,
  add column if not exists refund_amount numeric,
  add column if not exists refunded_at timestamptz;

create unique index if not exists orders_refund_reference_unique
  on public.orders (refund_reference)
  where refund_reference is not null;
