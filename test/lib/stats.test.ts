import { expect, it } from "vitest";
import {
  completionStats,
  estimateRatio,
  hourBucket,
  bestBuckets
} from "../../src/lib/stats";
import { newTask } from "../../src/lib/tasks";
import type { Task } from "../../src/lib/types";
const rows = (n: number, patch: Partial<Task> = {}) =>
  Array.from({ length: n }, (_, i) => ({
    ...newTask({ title: "Work", kind: "deep", est_minutes: 60 }, String(i), 0),
    status: "done" as const,
    completed_at: Date.parse("2026-11-03T09:00:00Z"),
    actual_minutes: 90,
    ...patch
  }));
it("requires ten completed tasks and ignores unfinished rows", () => {
  expect(completionStats(rows(9), "UTC")).toEqual({
    enough_data: false,
    completed_count: 9,
    message: "Not enough history yet (9/10 completed tasks)."
  });
  expect(
    completionStats([...rows(9), ...rows(1, { status: "open" })], "UTC")
      .enough_data
  ).toBe(false);
  expect(completionStats(rows(10), "UTC").enough_data).toBe(true);
});
it("uses median, both odd/even samples, rounding, and per-kind minimum sample count", () => {
  expect(estimateRatio(rows(4), "deep")).toBeUndefined();
  expect(
    estimateRatio(
      rows(5).map((r, i) => ({
        ...r,
        est_minutes: 3,
        actual_minutes: [1, 2, 4, 5, 6][i]
      })),
      "deep"
    )
  ).toEqual({ ratio: 1.33, sample_size: 5 });
  expect(
    estimateRatio(
      rows(6).map((r, i) => ({
        ...r,
        est_minutes: 10,
        actual_minutes: [10, 10, 12, 14, 15, 1000][i]
      })),
      "deep"
    )
  ).toEqual({ ratio: 1.3, sample_size: 6 });
  expect(
    estimateRatio([...rows(4), ...rows(3, { actual_minutes: null })], "deep")
  ).toBeUndefined();
  const stats = completionStats(
    [...rows(6), ...rows(4, { kind: "admin", actual_minutes: 60 })],
    "UTC"
  );
  expect(stats.enough_data && stats.estimate_ratio_by_kind).toEqual({
    deep: { ratio: 1.5, sample_size: 6 }
  });
  expect(stats.enough_data && stats.underestimation_warning).toEqual(["deep"]);
});
it.each([
  [0, "night"],
  [5, "night"],
  [6, "morning"],
  [11, "morning"],
  [12, "afternoon"],
  [17, "afternoon"],
  [18, "evening"],
  [23, "evening"]
] as const)("buckets hour %i into %s", (hour, bucket) =>
  expect(hourBucket(hour)).toBe(bucket)
);
it("counts local hours and buckets across the Prague repeated DST hour", () => {
  const stats = completionStats(
    [
      ...rows(5, { completed_at: Date.parse("2026-10-25T00:30:00Z") }),
      ...rows(5, { completed_at: Date.parse("2026-10-25T01:30:00Z") })
    ],
    "Europe/Prague"
  );
  expect(stats.enough_data && stats.by_hour).toEqual({ 2: 10 });
  expect(stats.enough_data && stats.by_kind_and_hour_bucket).toEqual({
    deep: { night: 10 }
  });
  expect(bestBuckets(stats)).toEqual({ deep: "night" });
  const shifted = completionStats(
    rows(10, { completed_at: Date.parse("2026-11-03T23:30:00Z") }),
    "Asia/Tokyo"
  );
  expect(bestBuckets(shifted)).toEqual({ deep: "morning" });
});
it("chooses deterministic bucket ties and never invents patterns below threshold", () => {
  const stats = completionStats(
    [
      ...rows(5),
      ...rows(5, { completed_at: Date.parse("2026-11-03T14:00:00Z") })
    ],
    "UTC"
  );
  expect(bestBuckets(stats)).toEqual({ deep: "morning" });
  expect(bestBuckets(completionStats([], "UTC"))).toEqual({});
});

it("warns at the 1.3 ratio threshold but not below it", () => {
  const stats = completionStats(
    [
      ...rows(5, { actual_minutes: 130, est_minutes: 100 }),
      ...rows(5, { kind: "admin", actual_minutes: 129, est_minutes: 100 })
    ],
    "UTC"
  );
  expect(stats.enough_data && stats.underestimation_warning).toEqual(["deep"]);
});
