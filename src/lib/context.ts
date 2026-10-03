import { msToLocalIso } from "./time";
// Give the model code-computed duration conversions, including decimal hours.
export function durationFacts(text: string): string[] {
  return [
    ...text.matchAll(
      /(?<![\w.-])(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?)\b/gi
    )
  ].flatMap((match) => {
    const minutes = Number(match[1]) * (/^h/i.test(match[2]) ? 60 : 1);
    return Number.isInteger(minutes) && minutes > 0 && minutes <= 1440
      ? [`${match[0]} = ${minutes} minutes`]
      : [];
  });
}
export function clockContext(now: number, timezone: string) {
  return {
    nowIso: msToLocalIso(now, timezone),
    weekday: new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "long"
    }).format(now),
    timezone
  };
}
