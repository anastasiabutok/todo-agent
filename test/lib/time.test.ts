import { describe, expect, it } from "vitest";
import {
  parseIsoToMs,
  msToLocalIso,
  startOfLocalDay,
  startOfLocalDate,
  endOfLocalDay
} from "../../src/lib/time";

describe("offset parsing", () => {
  it("distinguishes both occurrences of Prague's repeated hour", () => {
    expect(parseIsoToMs("2026-10-25T02:30:00+02:00")).toBe(
      Date.parse("2026-10-25T00:30:00Z")
    );
    expect(
      parseIsoToMs("2026-10-25T02:30:00+01:00") -
        parseIsoToMs("2026-10-25T02:30:00+02:00")
    ).toBe(3600000);
  });
  it.each(["2026-10-25T02:30:00", "2026-02-30T12:00:00Z", "not a date"])(
    "rejects %s",
    (value) => {
      expect(() => parseIsoToMs(value)).toThrow();
    }
  );
  it.each(["2026-10-25T00:30:00.123Z", "2026-10-25T01:30:00.456Z"])(
    "roundtrips %s",
    (iso) => {
      const ms = Date.parse(iso);
      expect(parseIsoToMs(msToLocalIso(ms, "Europe/Prague"))).toBe(ms);
    }
  );
  it("formats DST offsets and fractional-hour offsets", () => {
    expect(
      msToLocalIso(Date.parse("2026-10-25T00:30:00Z"), "Europe/Prague")
    ).toBe("2026-10-25T02:30:00.000+02:00");
    expect(
      msToLocalIso(Date.parse("2026-10-25T01:30:00Z"), "Europe/Prague")
    ).toBe("2026-10-25T02:30:00.000+01:00");
    expect(msToLocalIso(0, "Asia/Kathmandu")).toBe(
      "1970-01-01T05:30:00.000+05:30"
    );
    expect(msToLocalIso(-1, "UTC")).toBe("1969-12-31T23:59:59.999+00:00");
  });
});
describe("local days", () => {
  it.each([
    ["2026-10-25", 25],
    ["2026-03-29", 23],
    ["2026-11-03", 24]
  ] as const)("%s lasts %i hours in Prague", (date, hours) => {
    const ms = Date.parse(`${date}T12:00:00Z`);
    expect(
      endOfLocalDay(ms, "Europe/Prague") -
        startOfLocalDay(ms, "Europe/Prague") +
        1
    ).toBe(hours * 3600000);
  });
  it("uses local calendar date across UTC midnight", () => {
    expect(
      startOfLocalDay(Date.parse("2026-10-24T23:30:00Z"), "Europe/Prague")
    ).toBe(Date.parse("2026-10-24T22:00:00Z"));
  });
  it("supports a skipped midnight and rejects a skipped date", () => {
    expect(
      msToLocalIso(
        startOfLocalDate("2018-11-04", "America/Sao_Paulo"),
        "America/Sao_Paulo"
      )
    ).toBe("2018-11-04T01:00:00.000-02:00");
    expect(() => startOfLocalDate("2011-12-30", "Pacific/Apia")).toThrow();
  });
  it("rejects invalid timezone and timestamp", () => {
    expect(() => msToLocalIso(0, "Invalid/Zone")).toThrow();
    expect(() => startOfLocalDay(NaN, "UTC")).toThrow();
  });
});

import { localTimeToMs } from "../../src/lib/time";
it("resolves local demo hours with season-correct offsets and rejects DST gaps", () => {
  expect(localTimeToMs("2026-10-25", "10:00:00", "Europe/Prague")).toBe(
    Date.parse("2026-10-25T09:00:00Z")
  );
  expect(localTimeToMs("2026-10-24", "10:00:00", "Europe/Prague")).toBe(
    Date.parse("2026-10-24T08:00:00Z")
  );
  expect(() =>
    localTimeToMs("2026-03-29", "02:30:00", "Europe/Prague")
  ).toThrow();
});
