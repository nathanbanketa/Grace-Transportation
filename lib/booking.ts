import { DateTime } from "luxon";
import { z } from "zod";

export const tripTypes = ["Airport transfer", "Executive transportation", "Family transportation", "Private event", "Hourly booking"] as const;
export const airports = ["Dallas Fort Worth International (DFW)", "Dallas Love Field (DAL)", "Other airport"] as const;
export const statuses = ["pending", "approved", "awaiting_deposit", "confirmed", "declined", "cancelled", "completed"] as const;
export type Status = (typeof statuses)[number];
export const transitions = {
  pending: ["approved", "declined", "cancelled"],
  approved: ["awaiting_deposit", "declined", "cancelled"],
  awaiting_deposit: ["confirmed"],
  confirmed: ["completed", "cancelled"],
  declined: [],
  cancelled: [],
  completed: [],
} satisfies Record<Status, Status[]>;

export const tripSchema = z.object({
  pickup: z.string().trim().min(3).max(250),
  destination: z.string().trim().min(3).max(250),
  date: z.iso.date(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  tripType: z.enum(tripTypes),
  passengers: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)),
  luggage: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(0).max(100)),
  airport: z.string().trim().max(100),
  airportName: z.string().trim().max(100),
  airportDirection: z.string().trim().max(25),
  flight: z.string().trim().max(25),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).pipe(z.email()),
  phone: z.string().trim().regex(/^\+?[\d() .-]{7,25}$/).refine((value) => value.replace(/\D/g, "").length >= 7),
});

export function validateTrip(input: z.infer<typeof tripSchema>, context: z.RefinementCtx) {
  const local = DateTime.fromISO(`${input.date}T${input.time}`, { zone: "America/Chicago" });
  if (!local.isValid || local.toFormat("yyyy-MM-dd'T'HH:mm") !== `${input.date}T${input.time}`
    || local.getPossibleOffsets().length > 1 || local.toMillis() <= Date.now()) {
    context.addIssue({ code: "custom", path: ["time"], message: "Choose a future, unambiguous Dallas pickup time." });
  }
  if (input.tripType === "Airport transfer") {
    if (!airports.some((airport) => airport === input.airport)) context.addIssue({ code: "custom", path: ["airport"], message: "Select the airport." });
    if (input.airport === "Other airport" && input.airportName.length < 3) context.addIssue({ code: "custom", path: ["airportName"], message: "Enter the airport name or code." });
    if (!["Arrival pickup", "Departure drop-off"].includes(input.airportDirection)) context.addIssue({ code: "custom", path: ["airportDirection"], message: "Select arrival or departure." });
    if (!/^[A-Z0-9][A-Z0-9 -]{1,24}$/i.test(input.flight)) context.addIssue({ code: "custom", path: ["flight"], message: "Enter the flight number." });
  }
}

export const tripStepSchema = tripSchema.superRefine(validateTrip);
export const bookingSchema = tripSchema.extend(contactSchema.shape).extend({ requestId: z.uuid() }).superRefine(validateTrip);
export const pricingSchema = z.object({
  price: z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/).transform((amount) => Math.round(Number(amount) * 100)),
  deposit: z.string().regex(/^\d{1,6}(?:\.\d{1,2})?$/).transform((amount) => Math.round(Number(amount) * 100)),
}).refine(({ price, deposit }) => deposit > 0 && deposit <= price);
