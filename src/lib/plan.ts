import type { Task } from "./types";
import {
  type EstimateRatios,
  type CompletionStats,
  bestBuckets,
  hourBucket,
  type HourBucket
} from "./stats";
import { taskSummary } from "./tasks";
import { startOfLocalDate, endOfLocalDay, msToLocalIso } from "./time";
export function planDateEnd(date: string, timezone: string): number {
  return endOfLocalDay(startOfLocalDate(date, timezone), timezone);
}
export function correctEstimates(tasks: Task[], ratios: EstimateRatios) {
  return tasks.map((task) => {
    const ratio = task.kind ? ratios[task.kind]?.ratio : undefined;
    const factor =
      ratio !== undefined && Number.isFinite(ratio)
        ? Math.max(0.5, Math.min(3, ratio))
        : 1;
    return {
      ...task,
      corrected_est_minutes:
        task.est_minutes === null ? null : Math.round(task.est_minutes * factor)
    };
  });
}
export function planningContext(date: string, now: number, timezone: string) {
  const iso = msToLocalIso(now, timezone);
  const today = iso.slice(0, 10);
  const buckets: HourBucket[] = ["night", "morning", "afternoon", "evening"];
  const current = hourBucket(Number(iso.slice(11, 13)));
  return {
    current_local_iso: iso,
    available_buckets:
      date > today
        ? buckets
        : date < today
          ? []
          : buckets.slice(buckets.indexOf(current))
  };
}
export function dayPlan(
  tasks: Task[],
  stats: CompletionStats,
  now: number,
  timezone: string,
  date = msToLocalIso(now, timezone).slice(0, 10)
) {
  const corrected = correctEstimates(
    tasks,
    stats.enough_data ? stats.estimate_ratio_by_kind : {}
  ).sort((a, b) => {
    const aOverdue = a.due_at !== null && a.due_at < now;
    const bOverdue = b.due_at !== null && b.due_at < now;
    return (
      Number(bOverdue) - Number(aOverdue) ||
      a.priority - b.priority ||
      (a.due_at ?? Infinity) - (b.due_at ?? Infinity) ||
      a.id.localeCompare(b.id)
    );
  });
  return {
    enough_data: stats.enough_data,
    planning_context: planningContext(date, now, timezone),
    tasks: corrected.map((task) => ({
      ...taskSummary(task, timezone),
      is_overdue: task.due_at !== null && task.due_at < now,
      corrected_est_minutes: task.corrected_est_minutes
    })),
    total_corrected_minutes: corrected.reduce(
      (sum, task) => sum + (task.corrected_est_minutes ?? 0),
      0
    ),
    unestimated_count: corrected.filter(
      (task) => task.corrected_est_minutes === null
    ).length,
    best_bucket_by_kind: bestBuckets(stats),
    underestimation_warning: stats.enough_data
      ? stats.underestimation_warning
      : []
  };
}
