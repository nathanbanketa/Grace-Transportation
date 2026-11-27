import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Status } from "./booking";

export type Booking = {
  id: string;
  status: Status;
  pickup: string;
  destination: string;
  pickup_at: string;
  trip_type: string;
  passengers: number;
  luggage: number;
  airport: string | null;
  airport_direction: string | null;
  flight: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  price_cents: number | null;
  deposit_cents: number | null;
  square_order_id: string | null;
  square_payment_id: string | null;
  deposit_url: string | null;
  deposit_email_at: string | null;
  confirmation_email_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export function database() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) throw new Error("Booking storage is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
