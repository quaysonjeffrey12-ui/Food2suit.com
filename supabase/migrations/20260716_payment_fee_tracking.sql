alter table public.orders
  add column if not exists payment_fee numeric not null default 0,
  add column if not exists payment_net numeric;

comment on column public.orders.payment_fee is 'Actual Paystack fee in GHS returned when payment was verified.';
comment on column public.orders.payment_net is 'Gross payment total less the recorded Paystack fee, in GHS.';
