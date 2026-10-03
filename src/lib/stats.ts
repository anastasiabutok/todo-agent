import type { Task, TaskKind } from "./types";
export const KINDS: TaskKind[] = ["deep", "admin", "quick", "meeting"];
export const BUCKETS = ["morning", "afternoon", "evening", "night"] as const;
export type HourBucket = (typeof BUCKETS)[number];
export type EstimateRatios = Partial<
  Record<TaskKind, { ratio: number; sample_size: number }>
>;
export type CompletionStats =
  | { enough_data: false; completed_count: number; message: string }
  | {
      enough_data: true;
      completed_count: number;
      by_hour: Record<string, number>;
      by_kind_and_hour_bucket: Partial<
        Record<TaskKind, Partial<Record<HourBucket, number>>>
      >;
      estimate_ratio_by_kind: EstimateRatios;
      underestimation_warning: TaskKind[];
    };
export function hourBucket(hour: number): HourBucket {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18) return "evening";
  return "night";
}
export function estimateRatio(rows: Task[], kind: TaskKind) {
  const values = rows
    .filter(
      (row) =>
        row.status === "done" &&
        row.kind === kind &&
        row.est_minutes !== null &&
        row.actual_minutes !== null &&
        row.est_minutes > 0 &&
        row.actual_minutes > 0
    )
    .map((row) => row.actual_minutes! / row.est_minutes!)
    .sort((a, b) => a - b);
  if (values.length < 5) return undefined;
  const middle = Math.floor(values.length / 2);
  const median =
    values.length % 2
      ? values[middle]
      : (values[middle - 1] + values[middle]) / 2;
  return { ratio: Math.round(median * 100) / 100, sample_size: values.length };
}
export function completionStats(
  rows: Task[],
  timezone: string
): CompletionStats {
  const done = rows.filter(
    (row) => row.status === "done" && row.completed_at !== null
  );
  if (done.length < 10)
    return {
      enough_data: false,
      completed_count: done.length,
      message: `Not enough history yet (${done.length}/10 completed tasks).`
    };
  const byHour: Record<string, number> = {};
  const byKind: Partial<Record<TaskKind, Partial<Record<HourBucket, number>>>> =
    {};
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hourCycle: "h23"
  });
  for (const row of done) {
    const hour = Number(formatter.format(row.completed_at!));
    byHour[hour] = (byHour[hour] ?? 0) + 1;
    if (row.kind) {
      const counts = (byKind[row.kind] ??= {});
      const bucket = hourBucket(hour);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }
  }
  const ratios: EstimateRatios = {};
  for (const kind of KINDS) {
    const ratio = estimateRatio(done, kind);
    if (ratio) ratios[kind] = ratio;
  }
  return {
    enough_data: true,
    completed_count: done.length,
    by_hour: byHour,
    by_kind_and_hour_bucket: byKind,
    estimate_ratio_by_kind: ratios,
    underestimation_warning: KINDS.filter(
      (kind) => (ratios[kind]?.ratio ?? 0) >= 1.3
    )
  };
}
export function bestBuckets(
  stats: CompletionStats
): Partial<Record<TaskKind, HourBucket>> {
  const best: Partial<Record<TaskKind, HourBucket>> = {};
  if (!stats.enough_data) return best;
  for (const kind of KINDS) {
    const counts = stats.by_kind_and_hour_bucket[kind];
    if (!counts) continue;
    const bucket = BUCKETS.reduce((a, b) =>
      (counts[b] ?? 0) > (counts[a] ?? 0) ? b : a
    );
    if ((counts[bucket] ?? 0) > 0) best[kind] = bucket;
  }
  return best;
}
export function historyCutoff(now: number, days: number): number {
  return now - days * 86400000;
}
