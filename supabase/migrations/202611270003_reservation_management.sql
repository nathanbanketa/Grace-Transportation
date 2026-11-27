begin;

create table public.drivers (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  active boolean not null default true
);
create unique index one_active_driver on public.drivers (active) where active;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
insert into public.customers (email, name, phone)
select distinct on (lower(trim(customer_email))) lower(trim(customer_email)), customer_name, customer_phone
from public.bookings order by lower(trim(customer_email)), created_at desc, id;

alter table public.bookings
  add column customer_id uuid references public.customers(id),
  add column driver_id uuid references public.drivers(id),
  add column updated_by uuid references public.drivers(id),
  add column duration_minutes integer not null default 60 check (duration_minutes between 15 and 1440),
  add column revision integer not null default 0,
  add column updated_at timestamptz not null default now(),
  add column request_fingerprint text,
  add column square_link_id text unique,
  add column checkout_revision integer,
  add constraint booking_in_progress_paid check (status <> 'in_progress' or
    (price_cents is not null and square_order_id is not null and square_payment_id is not null and confirmed_at is not null));

update public.bookings b set customer_id = c.id from public.customers c where c.email = lower(trim(b.customer_email));
alter table public.bookings alter column customer_id set not null;
create index bookings_fingerprint_time on public.bookings (request_fingerprint, created_at desc);
create index bookings_customer_time on public.bookings (customer_id, pickup_at desc);
create index bookings_status_time on public.bookings (status, pickup_at, id);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.drivers(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text not null default '' check (length(note) <= 160),
  check (starts_at < ends_at)
);

-- Grace operates one vehicle. The same exclusion constraint arbitrates driver blocks,
-- pending checkouts and occupied trips, including concurrent writes.
create table public.reserved_slots (
  id uuid not null,
  source text not null check (source in ('booking','availability')),
  slot tstzrange not null,
  primary key (source, id),
  exclude using gist (slot with &&)
);

insert into public.reserved_slots (id, source, slot)
select id, 'booking', tstzrange(pickup_at, pickup_at + make_interval(mins => duration_minutes), '[)')
from public.bookings where status in ('awaiting_deposit','confirmed','in_progress');

create table public.checkout_attempts (
  square_order_id text primary key,
  booking_id uuid not null references public.bookings(id),
  square_link_id text,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);
insert into public.checkout_attempts (square_order_id,booking_id,amount_cents,created_at)
select square_order_id,id,deposit_cents,created_at from public.bookings where square_order_id is not null;

create table public.payments (
  square_payment_id text primary key,
  booking_id uuid not null references public.bookings(id),
  square_order_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  refunded_cents integer not null default 0 check (refunded_cents between 0 and amount_cents),
  disposition text not null check (disposition in ('accepted','review')),
  created_at timestamptz not null default now()
);
create unique index payments_one_accepted on public.payments (booking_id) where disposition = 'accepted';
create index payments_booking on public.payments (booking_id);
insert into public.payments (square_payment_id, booking_id, square_order_id, amount_cents, disposition, created_at)
select square_payment_id, id, square_order_id, deposit_cents, 'accepted', confirmed_at
from public.bookings where square_payment_id is not null;

create table public.booking_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id),
  actor_id uuid references public.drivers(id),
  event text not null,
  previous_status public.booking_status,
  status public.booking_status not null,
  revision integer not null,
  before_values jsonb,
  after_values jsonb not null,
  created_at timestamptz not null default now(),
  unique (booking_id, revision)
);
insert into public.booking_history (booking_id, event, status, revision, after_values)
select id, 'imported', status, revision, to_jsonb(bookings) - 'request_fingerprint' - 'deposit_url'
from public.bookings;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  revision integer not null,
  kind text not null check (kind in ('new_request','approved','payment_link','declined','modified','confirmed','cancelled')),
  channel text not null check (channel in ('email','push','sms')),
  payload jsonb not null,
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_token uuid,
  delivered_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (booking_id, revision, kind, channel)
);
create index notifications_due on public.notifications (next_attempt_at) where delivered_at is null and failed_at is null;

create table public.booking_request_limits (
  scope text not null check (scope in ('ip','email')),
  key text not null,
  bucket bigint not null,
  hits integer not null,
  primary key (scope, key, bucket)
);
create index booking_request_limits_bucket on public.booking_request_limits (bucket);

create table public.driver_push_subscriptions (
  endpoint text primary key,
  driver_id uuid not null references public.drivers(id),
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table public.driver_feed (
  id boolean primary key default true check (id),
  revision bigint not null default 0
);
insert into public.driver_feed default values;

do $$
declare relation text;
begin
  foreach relation in array array['drivers','customers','availability','reserved_slots','payments',
    'booking_history','notifications','checkout_attempts','booking_request_limits','driver_push_subscriptions','driver_feed']
  loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on public.%I from public, anon, authenticated', relation);
    execute format('grant select, insert, update, delete on public.%I to service_role', relation);
  end loop;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime' and not puballtables) then
    alter publication supabase_realtime add table public.driver_feed;
  end if;
end;
$$;

grant usage on sequence public.booking_history_id_seq to service_role;
grant select on public.drivers, public.driver_feed to authenticated;
create policy own_active_driver on public.drivers for select to authenticated using (id = (select auth.uid()) and active);
create policy driver_feed_read on public.driver_feed for select to authenticated
using (exists (select 1 from public.drivers where id = (select auth.uid()) and active));

create or replace function public.enforce_booking_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then raise exception 'New bookings must be pending'; end if;
    return new;
  end if;
  if old.status <> new.status and not (
    (old.status = 'pending' and new.status in ('approved','declined','cancelled')) or
    (old.status = 'approved' and new.status in ('awaiting_deposit','declined','cancelled')) or
    (old.status = 'awaiting_deposit' and new.status in ('approved','confirmed','cancelled')) or
    (old.status = 'confirmed' and new.status in ('in_progress','cancelled')) or
    (old.status = 'in_progress' and new.status in ('completed','cancelled'))
  ) then raise exception 'Invalid booking transition'; end if;
  if old.status = 'awaiting_deposit' and new.status = 'approved' and
    (new.square_order_id is not null or new.square_link_id is not null or new.deposit_url is not null or new.checkout_revision is not null) then
    raise exception 'Clear the retired checkout when repricing';
  end if;
  if old.status not in ('pending','approved') and not (old.status = 'awaiting_deposit' and new.status = 'approved') and
    (new.price_cents, new.deposit_cents) is distinct from (old.price_cents, old.deposit_cents) then
    raise exception 'Issued payment amounts are locked';
  end if;
  if new.status = 'confirmed' and old.status = 'awaiting_deposit' and not exists (
    select 1 from public.payments
    where booking_id = new.id and square_payment_id = new.square_payment_id and disposition = 'accepted'
  ) then raise exception 'A verified accepted payment is required'; end if;
  if new.status in ('approved','awaiting_deposit') and new.pickup_at <= now() then
    raise exception 'Pickup must be in the future';
  end if;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

create function public.sync_availability_slot() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.reserved_slots where source = 'availability' and id = old.id;
    return old;
  end if;
  insert into public.reserved_slots (source, id, slot)
  values ('availability', new.id, tstzrange(new.starts_at, new.ends_at, '[)'))
  on conflict (source,id) do update set slot = excluded.slot;
  return new;
end;
$$;
create trigger sync_availability after insert or update or delete on public.availability
for each row execute function public.sync_availability_slot();

create function public.record_booking_event() returns trigger language plpgsql set search_path = '' as $$
declare
  event_kind text;
  before_values jsonb;
  snapshot jsonb := to_jsonb(new) - 'request_fingerprint';
  email_payload jsonb := jsonb_build_object('id', new.id, 'pickup',new.pickup,'destination',new.destination,
    'pickup_at',new.pickup_at,'price_cents',new.price_cents,'deposit_cents',new.deposit_cents,'customer_email',new.customer_email,
    'duration_minutes',new.duration_minutes,'passengers',new.passengers,'luggage',new.luggage,'flight',new.flight);
  route_changed boolean := false;
begin
  if tg_op = 'UPDATE' then
    before_values := to_jsonb(old) - 'request_fingerprint' - 'deposit_url';
    route_changed := (new.pickup_at, new.duration_minutes, new.pickup, new.destination, new.price_cents, new.deposit_cents, new.passengers, new.luggage, new.flight)
      is distinct from (old.pickup_at, old.duration_minutes, old.pickup, old.destination, old.price_cents, old.deposit_cents, old.passengers, old.luggage, old.flight);
  end if;

  if new.status in ('awaiting_deposit','confirmed','in_progress') or (new.status = 'approved' and new.driver_id is not null) then
    insert into public.reserved_slots (source, id, slot)
    values ('booking', new.id, tstzrange(new.pickup_at, new.pickup_at + make_interval(mins => new.duration_minutes), '[)'))
    on conflict (source,id) do update set slot = excluded.slot
    where public.reserved_slots.slot is distinct from excluded.slot;
  else
    delete from public.reserved_slots where source = 'booking' and id = new.id;
  end if;

  if new.status = 'awaiting_deposit' and old.status <> 'awaiting_deposit' then
    insert into public.checkout_attempts (square_order_id,booking_id,square_link_id,amount_cents)
    values (new.square_order_id,new.id,new.square_link_id,new.deposit_cents);
  end if;

  if tg_op = 'INSERT' then
    event_kind := 'new_request';
  elsif old.status <> new.status then
    event_kind := case new.status
      when 'awaiting_deposit' then 'payment_link'
      when 'approved' then 'approved'
      when 'confirmed' then 'confirmed'
      when 'declined' then 'declined'
      when 'cancelled' then 'cancelled'
      else new.status::text end;
  elsif route_changed then
    event_kind := 'modified';
  else
    event_kind := 'updated';
  end if;

  insert into public.booking_history (booking_id, actor_id, event, previous_status, status, revision, before_values, after_values)
  values (new.id, new.updated_by, event_kind, case when tg_op = 'UPDATE' then old.status end,
    new.status, new.revision, before_values, snapshot - 'deposit_url');

  if event_kind in ('new_request','approved','payment_link','declined','modified','confirmed','cancelled') then
    insert into public.notifications (booking_id, revision, kind, channel, payload)
    values (new.id, new.revision, event_kind, 'email', case
      when event_kind = 'new_request' then '{}'::jsonb
      when event_kind = 'payment_link' then email_payload || jsonb_build_object('deposit_url', new.deposit_url)
      else email_payload end);
  end if;
  if event_kind = 'new_request' then
    insert into public.notifications (booking_id, revision, kind, channel, payload) values
    (new.id, new.revision, event_kind, 'push', '{}'::jsonb),
    (new.id, new.revision, event_kind, 'sms', '{}'::jsonb);
  end if;
  update public.driver_feed set revision = revision + 1 where id;
  return new;
end;
$$;
create trigger audit_booking after insert or update on public.bookings
for each row execute function public.record_booking_event();

create function public.submit_booking(p_booking jsonb, p_ip_key text, p_email_key text, p_fingerprint text)
returns uuid language plpgsql set search_path = '' as $$
declare
  request_id uuid := (p_booking->>'id')::uuid;
  existing_fingerprint text;
  customer uuid;
  bucket_id bigint := floor(extract(epoch from now()) / 900);
  source text;
  total_hits integer;
  normalized_email text := lower(trim(p_booking->>'customer_email'));
begin
  perform pg_advisory_xact_lock(hashtextextended(request_id::text, 1));
  select request_fingerprint into existing_fingerprint from public.bookings where id = request_id;
  if found then
    if existing_fingerprint is distinct from p_fingerprint then raise exception 'REQUEST_MISMATCH'; end if;
    return request_id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint, 2));
  select id into request_id from public.bookings where request_fingerprint = p_fingerprint
    and created_at > now() - interval '10 minutes' order by created_at desc limit 1;
  if found then return request_id; end if;
  request_id := (p_booking->>'id')::uuid;

  foreach source in array array['ip','email'] loop
    insert into public.booking_request_limits as limits (scope,key,bucket,hits)
    values (source,case when source = 'ip' then p_ip_key else p_email_key end,bucket_id,1)
    on conflict (scope,key,bucket) do update set hits = limits.hits + 1
    returning hits into total_hits;
    if total_hits > (case when source = 'ip' then 20 else 5 end) then
      return null;
    end if;
  end loop;

  insert into public.customers (email,name,phone)
  values (normalized_email,p_booking->>'customer_name',p_booking->>'customer_phone')
  on conflict (email) do nothing;
  select id into customer from public.customers where email = normalized_email;

  insert into public.bookings (id,customer_id,pickup,destination,pickup_at,trip_type,passengers,luggage,
    airport,airport_direction,flight,customer_name,customer_email,customer_phone,request_fingerprint)
  values (request_id,customer,p_booking->>'pickup',p_booking->>'destination',(p_booking->>'pickup_at')::timestamptz,
    p_booking->>'trip_type',(p_booking->>'passengers')::integer,(p_booking->>'luggage')::integer,
    p_booking->>'airport',p_booking->>'airport_direction',p_booking->>'flight',
    p_booking->>'customer_name',normalized_email,p_booking->>'customer_phone',p_fingerprint);
  return request_id;
end;
$$;

create function public.record_square_payment(p_order text, p_payment text, p_amount integer, p_refunded integer, p_paid_at timestamptz)
returns uuid language plpgsql set search_path = '' as $$
declare
  booking public.bookings;
  result text;
begin
  select b.* into booking from public.bookings b join public.checkout_attempts c on c.booking_id = b.id
    where c.square_order_id = p_order for update of b;
  if not found then return null; end if;
  result := case when booking.status = 'awaiting_deposit' and booking.square_order_id = p_order
    and booking.deposit_cents = p_amount and p_refunded = 0 and p_paid_at <= booking.pickup_at
    then 'accepted' else 'review' end;
  insert into public.payments (square_payment_id,booking_id,square_order_id,amount_cents,refunded_cents,disposition,created_at)
  values (p_payment,booking.id,p_order,p_amount,p_refunded,result,p_paid_at)
  on conflict (square_payment_id) do update set refunded_cents = greatest(public.payments.refunded_cents,excluded.refunded_cents)
    where public.payments.booking_id = excluded.booking_id and public.payments.refunded_cents < excluded.refunded_cents;
  if found then update public.driver_feed set revision = revision + 1 where id; end if;
  if result = 'accepted' and exists (select 1 from public.payments where square_payment_id = p_payment and booking_id = booking.id and disposition = 'accepted') then
    update public.bookings set status = 'confirmed', square_payment_id = p_payment, confirmed_at = now(), updated_by = null where id = booking.id;
  end if;
  return booking.id;
end;
$$;

create function public.claim_notifications(p_booking uuid default null)
returns setof public.notifications language sql set search_path = '' as $$
  with due as (
    select id from public.notifications
    where delivered_at is null and failed_at is null and next_attempt_at <= now()
      and (lease_until is null or lease_until < now()) and (p_booking is null or booking_id = p_booking)
    order by next_attempt_at, created_at, id limit 24 for update skip locked
  )
  update public.notifications n set attempts = attempts + 1, lease_until = now() + interval '5 minutes',
    lease_token = gen_random_uuid(), first_attempt_at = coalesce(n.first_attempt_at, now())
  from due where n.id = due.id returning n.*
$$;

create function public.reservation_revenue(p_since timestamptz)
returns table (gross_cents bigint, refunded_cents bigint, accepted_net_cents bigint, review_count bigint)
language sql stable set search_path = '' as $$
  select coalesce(sum(amount_cents),0), coalesce(sum(refunded_cents),0),
    coalesce(sum(amount_cents-refunded_cents) filter (where disposition = 'accepted'),0),
    count(*) filter (where disposition = 'review')
  from public.payments where created_at >= p_since
$$;

revoke execute on function public.reservation_revenue(timestamptz), public.submit_booking(jsonb,text,text,text),
  public.record_square_payment(text,text,integer,integer,timestamptz), public.claim_notifications(uuid)
from public, anon, authenticated;
grant execute on function public.reservation_revenue(timestamptz), public.submit_booking(jsonb,text,text,text),
  public.record_square_payment(text,text,integer,integer,timestamptz), public.claim_notifications(uuid) to service_role;
commit;
