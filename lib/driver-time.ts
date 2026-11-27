import { DateTime } from "luxon";

export const driverZone = "America/Chicago";

export function parseDriverTime(value: string) {
  const time = DateTime.fromISO(value, { zone: driverZone });
  return time.isValid && time.toFormat("yyyy-MM-dd'T'HH:mm") === value && time.getPossibleOffsets().length === 1
    ? time.toUTC().toISO() : null;
}

export function localInput(value: string) {
  return DateTime.fromISO(value, { zone: driverZone }).toFormat("yyyy-MM-dd'T'HH:mm");
}

export function formatPickup(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: driverZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
