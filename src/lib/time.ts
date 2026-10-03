import { z } from "zod";

const offsetDateTime = z.iso.datetime({ offset: true });
const localDate = z.iso.date();
export function parseIsoToMs(iso: string): number {
  const ms = Date.parse(offsetDateTime.parse(iso));
  if (!Number.isFinite(ms)) throw new RangeError("Invalid datetime");
  return ms;
}

function localParts(ms: number, timezone: string) {
  if (!Number.isFinite(ms)) throw new RangeError("Invalid timestamp");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(ms);
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}
function localWallMs(ms: number, timezone: string): number {
  const p = localParts(ms, timezone);
  return Date.parse(
    `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`
  );
}
export function msToLocalIso(ms: number, timezone: string): string {
  const p = localParts(ms, timezone);
  const offsetMinutes = Math.round(
    (localWallMs(ms, timezone) - Math.floor(ms / 1000) * 1000) / 60000
  );
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fraction = String(((ms % 1000) + 1000) % 1000).padStart(3, "0");
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${fraction}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

export function startOfLocalDate(date: string, timezone: string): number {
  localDate.parse(date);
  // Find the first instant belonging to this date. Searching by calendar date
  // also handles zones that skip midnight, and days lasting 23 or 25 hours.
  const nominal = Date.parse(`${date}T00:00:00Z`);
  let low = nominal - 36 * 3600000;
  let high = nominal + 36 * 3600000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const p = localParts(mid, timezone);
    if (`${p.year}-${p.month}-${p.day}` < date) low = mid + 1;
    else high = mid;
  }
  const p = localParts(low, timezone);
  if (`${p.year}-${p.month}-${p.day}` !== date)
    throw new RangeError("Local date does not exist in timezone");
  return low;
}
export function startOfLocalDay(ms: number, timezone: string): number {
  const p = localParts(ms, timezone);
  return startOfLocalDate(`${p.year}-${p.month}-${p.day}`, timezone);
}
export function endOfLocalDay(ms: number, timezone: string): number {
  const p = localParts(ms, timezone);
  const nextDate = new Date(
    Date.parse(`${p.year}-${p.month}-${p.day}T12:00:00Z`) + 86400000
  )
    .toISOString()
    .slice(0, 10);
  return startOfLocalDate(nextDate, timezone) - 1;
}
