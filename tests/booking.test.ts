import assert from "node:assert/strict";
import test from "node:test";
import { DateTime } from "luxon";
import { airports, bookingSchema, pricingSchema, transitions } from "../lib/booking";

const future = DateTime.now().setZone("America/Chicago").plus({ days: 2 }).toISODate();
const payload = {
  requestId: "8765e763-e577-4967-8ccb-a07a9b9a64a9",
  pickup: "Dallas Love Field",
  destination: "Downtown Dallas",
  date: future,
  time: "12:30",
  tripType: "Family transportation",
  passengers: "3",
  luggage: "0",
  airport: "",
  airportName: "",
  airportDirection: "",
  flight: "",
  name: "Example Rider",
  email: "rider@example.com",
  phone: "+1 555 010 1024",
};

test("parses a trip request and preserves zero bags", () => {
  const result = bookingSchema.parse(payload);
  assert.equal(result.passengers, 3);
  assert.equal(result.luggage, 0);
});

test("requires arrival or departure and flight details for airport trips", () => {
  const request = { ...payload, tripType: "Airport transfer" };
  const invalid = bookingSchema.safeParse(request);
  assert.equal(invalid.success, false);
  if (!invalid.success) assert.deepEqual(invalid.error.issues.map(({ path }) => path[0]), ["airport", "airportDirection", "flight"]);
  assert.equal(bookingSchema.safeParse({ ...request, airport: airports[1], airportDirection: "Arrival pickup", flight: "WN 171" }).success, true);
});

test("rejects past, nonexistent and ambiguous Dallas pickup times", () => {
  assert.equal(bookingSchema.safeParse({ ...payload, date: "2000-01-01" }).success, false);
  assert.equal(bookingSchema.safeParse({ ...payload, date: "2099-03-08", time: "02:30" }).success, false);
  assert.equal(bookingSchema.safeParse({ ...payload, date: "2099-11-01", time: "01:30" }).success, false);
});

test("rejects blank luggage and invalid contact details", () => {
  assert.equal(bookingSchema.safeParse({ ...payload, luggage: "" }).success, false);
  assert.equal(bookingSchema.safeParse({ ...payload, phone: "-------" }).success, false);
  assert.equal(bookingSchema.safeParse({ ...payload, email: "invalid" }).success, false);
});

test("uses cents and disallows deposits above the approved price", () => {
  assert.deepEqual(pricingSchema.parse({ price: "225.50", deposit: "30.01" }), { price: 22550, deposit: 3001 });
  assert.equal(pricingSchema.safeParse({ price: "20", deposit: "20.01" }).success, false);
  assert.equal(pricingSchema.safeParse({ price: "20", deposit: "0" }).success, false);
});

test("requires the deposit state before confirmation", () => {
  assert.deepEqual(Object.entries(transitions).filter(([, next]) => next.some((status) => status === "confirmed")).map(([status]) => status), ["awaiting_deposit"]);
});
