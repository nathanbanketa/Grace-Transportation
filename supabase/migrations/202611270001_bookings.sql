create type public.booking_status as enum (
  'pending', 'approved', 'awaiting_deposit', 'confirmed', 'declined', 'cancelled', 'completed'
);

create table public.bookings (
  id uuid primary key,
  status public.booking_status not null default 'pending',
  pickup text not null,
  destination text not null,
  pickup_at timestamptz not null,
  trip_type text not null check (trip_type in (
    'Airport transfer', 'Executive transportation', 'Family transportation', 'Private event', 'Hourly booking'
  )),
  passengers integer not null check (passengers between 1 and 100),
  luggage integer not null check (luggage between 0 and 100),
  airport text,
  airport_direction text,
  flight text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  price_cents integer,
  deposit_cents integer,
  square_order_id text unique,
  square_payment_id text unique,
  deposit_url text,
  deposit_email_at timestamptz,
  confirmation_email_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (trip_type = 'Airport transfer' and airport is not null and airport_direction is not null and flight is not null)
    or (trip_type <> 'Airport transfer' and airport is null and airport_direction is null and flight is null)
  ),
  check ((price_cents is null and deposit_cents is null) or
    (price_cents is not null and deposit_cents is not null and deposit_cents > 0 and deposit_cents <= price_cents)),
  check (status not in ('approved', 'awaiting_deposit', 'confirmed', 'completed') or price_cents is not null),
  check (status not in ('awaiting_deposit', 'confirmed', 'completed') or
    (square_order_id is not null and deposit_url is not null)),
  check (status not in ('confirmed', 'completed') or (square_payment_id is not null and confirmed_at is not null))
);

create index bookings_created_idx on public.bookings (created_at desc, id desc);
alter table public.bookings enable row level security;
revoke all on public.bookings from anon, authenticated;
grant select, insert, update on public.bookings to service_role;

create function public.enforce_booking_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then raise exception 'New bookings must be pending'; end if;
    return new;
  end if;
  if old.status <> new.status and not (
    (old.status = 'pending' and new.status in ('approved', 'declined', 'cancelled')) or
    (old.status = 'approved' and new.status in ('awaiting_deposit', 'declined', 'cancelled')) or
    (old.status = 'awaiting_deposit' and new.status = 'confirmed') or
    (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
  ) then raise exception 'Invalid booking transition'; end if;
  return new;
end;
$$;

create trigger booking_transition before insert or update on public.bookings
for each row execute function public.enforce_booking_transition();
