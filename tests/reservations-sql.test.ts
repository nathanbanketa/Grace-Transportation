import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const driver = "54aef69a-2047-4f41-bd59-6a51fea0f6e3";
const bookingOne = "15cb9626-8113-418e-92c2-eaf4cb8cf7c2";
const bookingTwo = "41ae7a30-c888-41f4-8202-dea7d90d5579";
const bookingThree = "3a1660d7-7fb0-4b49-a60e-b4a37016581c";

async function setup(seedLegacy = false) {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    insert into auth.users values ('${driver}');
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
  `);
  for (const name of ["202611270001_bookings", "202611270002_in_progress", "202611270003_reservation_management"]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8"));
    if (name === "202611270001_bookings" && seedLegacy) await db.exec(`
      insert into bookings (id,pickup,destination,pickup_at,trip_type,passengers,luggage,customer_name,customer_email,customer_phone)
      values ('${bookingOne}','Dallas','Fort Worth','2099-01-01T15:00:00Z','Family transportation',2,0,'Legacy Rider','LEGACY@example.com','5550101024');
      update bookings set status = 'approved', price_cents = 10000, deposit_cents = 3000;
      update bookings set status = 'awaiting_deposit', square_order_id = 'legacy-order', deposit_url = 'https://example.test/legacy';
      update bookings set status = 'confirmed', square_payment_id = 'legacy-payment', confirmed_at = '2098-12-01T15:00:00Z';
    `);
  }
  await db.exec(`insert into drivers (id,display_name) values ('${driver}', 'Test Driver'); set role service_role;`);
  return db;
}

function submit(db: PGlite, id: string, fingerprint: string, emailKey = "email", ipKey = "ip", pickupAt = "2099-01-01T15:00:00Z") {
  return db.query<{ id: string | null }>("select submit_booking($1, $2, $3, $4) id", [
    JSON.stringify({ id, pickup: "Dallas", destination: "Fort Worth", pickup_at: pickupAt, trip_type: "Family transportation",
      passengers: 2, luggage: 3, customer_name: "Test Rider", customer_email: "test@example.com", customer_phone: "+1 555 010 1024" }),
    ipKey, emailKey, fingerprint,
  ]);
}

test("idempotency, rate limits and driver-only data access", async () => {
  const db = await setup();
  try {
    assert.equal((await submit(db, bookingOne, "exact")).rows[0].id, bookingOne);
    assert.equal((await submit(db, bookingOne, "exact")).rows[0].id, bookingOne);
    assert.equal((await submit(db, bookingTwo, "exact")).rows[0].id, bookingOne);
    await assert.rejects(submit(db, bookingOne, "different"), /REQUEST_MISMATCH/);
    for (let index = 0; index < 5; index++) {
      const { rows } = await submit(db, crypto.randomUUID(), `distinct-${index}`);
      assert.equal(!!rows[0].id, index < 4);
    }
    assert.equal((await db.query("select * from bookings")).rows.length, 5);
    assert.equal((await db.query("select * from customers")).rows.length, 1);
    assert.equal((await db.query("select * from notifications where kind = 'new_request'")).rows.length, 15);
    await db.exec("reset role; set role anon;");
    await assert.rejects(db.query("select * from bookings"), /permission denied/);
    await assert.rejects(db.query("select claim_notifications(null)"), /permission denied/);
    await db.exec("reset role; set role authenticated;");
    assert.equal((await db.query("select * from driver_feed")).rows.length, 0);
    await db.exec(`set request.jwt.claim.sub = '${driver}';`);
    assert.equal((await db.query("select * from driver_feed")).rows.length, 1);
    await assert.rejects(db.query("select * from customers"), /permission denied/);
    await assert.rejects(db.query("select * from bookings"), /permission denied/);
  } finally {
    await db.close();
  }
});

test("schedule constraints, audited lifecycle, retired links and idempotent payments", async () => {
  const db = await setup();
  try {
    await submit(db, bookingOne, "one");
    await submit(db, bookingTwo, "two");
    await submit(db, bookingThree, "three", "email", "ip", "2099-01-01T16:00:00Z");
    const approve = (id: string) => db.query(
      "update bookings set status = 'approved', price_cents = 10000, deposit_cents = 2500, driver_id = $2, updated_by = $2 where id = $1",
      [id, driver],
    );
    const checkout = (order: string) => db.query(
      "update bookings set status = 'awaiting_deposit', square_order_id = $2, square_link_id = $2, deposit_url = 'https://example.test/pay', checkout_revision = revision+1 where id = $1",
      [bookingOne, order],
    );
    const pay = (order: string, payment: string, amount: number, refunded = 0) => db.query(
      "select record_square_payment($1,$2,$3,$4,'2098-12-01T15:00:00Z')", [order, payment, amount, refunded],
    );
    await assert.rejects(db.query("update bookings set status = 'confirmed' where id = $1", [bookingOne]), /Invalid booking transition/);
    await approve(bookingOne);
    await assert.rejects(approve(bookingTwo), { code: "23P01" });
    await approve(bookingThree);
    await assert.rejects(db.query("insert into availability (created_by,starts_at,ends_at) values ($1,'2099-01-01T14:00Z','2099-01-01T15:01Z')", [driver]), { code: "23P01" });
    await db.query("insert into availability (created_by,starts_at,ends_at) values ($1,'2099-01-01T17:00Z','2099-01-01T18:00Z')", [driver]);
    await checkout("old-order");
    await db.query(`update bookings set status = 'approved', square_order_id = null, square_link_id = null, deposit_url = null,
      checkout_revision = null, deposit_cents = 3000 where id = $1`, [bookingOne]);
    await checkout("new-order");
    await pay("old-order", "old-payment", 2500);
    await pay("new-order", "wrong-amount", 1500);
    const status = () => db.query<{ status: string }>("select status from bookings where id = $1", [bookingOne]).then(({ rows }) => rows[0].status);
    assert.equal(await status(), "awaiting_deposit");
    await pay("new-order", "deposit", 3000);
    await pay("new-order", "deposit", 3000);
    await pay("new-order", "deposit", 3000, 1000);
    assert.equal(await status(), "confirmed");
    const { rows: payments } = await db.query("select square_payment_id, refunded_cents, disposition from payments order by square_payment_id");
    assert.deepEqual(payments, [
      { square_payment_id: "deposit", refunded_cents: 1000, disposition: "accepted" },
      { square_payment_id: "old-payment", refunded_cents: 0, disposition: "review" },
      { square_payment_id: "wrong-amount", refunded_cents: 0, disposition: "review" },
    ]);
    await db.query("update bookings set status = 'in_progress', updated_by = $2 where id = $1", [bookingOne, driver]);
    await db.query("update bookings set status = 'completed' where id = $1", [bookingOne]);
    await approve(bookingTwo);
    assert.equal(await status(), "completed");
    const history = await db.query<{ event: string }>("select event from booking_history where booking_id = $1 order by revision", [bookingOne]);
    assert.deepEqual(history.rows.map(({ event }) => event), ["new_request","approved","payment_link","approved","payment_link","confirmed","in_progress","completed"]);
    const { rows: claimed } = await db.query<{ kind: string }>("select * from claim_notifications($1)", [bookingOne]);
    assert.equal(claimed.filter(({ kind }) => kind === "confirmed").length, 1);
    assert.equal((await db.query("select * from claim_notifications($1)", [bookingOne])).rows.length, 0);
  } finally {
    await db.close();
  }
});

test("upgrades a legacy paid booking without losing its customer, schedule or payment", async () => {
  const db = await setup(true);
  try {
    const { rows: [trip] } = await db.query(`
      select b.status, b.duration_minutes, c.email, p.square_payment_id, p.amount_cents, h.event
      from bookings b join customers c on c.id = b.customer_id join payments p on p.booking_id = b.id
      join booking_history h on h.booking_id = b.id join reserved_slots s on s.id = b.id and s.source = 'booking'
    `);
    assert.deepEqual(trip, {
      status: "confirmed", duration_minutes: 60, email: "legacy@example.com",
      square_payment_id: "legacy-payment", amount_cents: 3000, event: "imported",
    });
    assert.equal((await db.query("select * from notifications")).rows.length, 0);
    assert.equal((await db.query("select * from checkout_attempts where square_order_id = 'legacy-order'")).rows.length, 1);
  } finally {
    await db.close();
  }
});
