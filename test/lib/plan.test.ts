import { expect, it } from "vitest";
import { correctEstimates, dayPlan, planDateEnd } from "../../src/lib/plan";
import { newTask } from "../../src/lib/tasks";
import { completionStats, historyCutoff } from "../../src/lib/stats";
import { demoTasks } from "../../src/lib/demo";
import type { Task } from "../../src/lib/types";
const task = (id: string, patch: Partial<Task> = {}) => ({
  ...newTask({ title: id, kind: "deep", est_minutes: 100 }, id, 0),
  ...patch
});
it("clamps ratios, rounds corrected estimates, defaults to one, and preserves null estimates", () => {
  expect(
    correctEstimates([task("low")], { deep: { ratio: 0.1, sample_size: 5 } })[0]
      .corrected_est_minutes
  ).toBe(50);
  expect(
    correctEstimates([task("high")], { deep: { ratio: 9, sample_size: 5 } })[0]
      .corrected_est_minutes
  ).toBe(300);
  expect(
    correctEstimates([task("round", { est_minutes: 15 })], {
      deep: { ratio: 1.5, sample_size: 5 }
    })[0].corrected_est_minutes
  ).toBe(23);
  expect(correctEstimates([task("default")], {})[0].corrected_est_minutes).toBe(
    100
  );
  expect(
    correctEstimates([task("unknown", { est_minutes: null })], {
      deep: { ratio: 2, sample_size: 5 }
    })[0].corrected_est_minutes
  ).toBeNull();
});
it("sorts overdue first, then priority, then deadline; totals exclude unknown estimates", () => {
  const plan = dayPlan(
    [
      task("future", { due_at: 300, priority: 1 }),
      task("overdue", { due_at: 50, priority: 3 }),
      task("earlier", { due_at: 200, priority: 1 }),
      task("unknown", { due_at: null, priority: 1, est_minutes: null })
    ],
    { enough_data: false, completed_count: 0, message: "Not enough" },
    100,
    "UTC"
  );
  expect(plan.tasks.map((t) => t.id)).toEqual([
    "overdue",
    "earlier",
    "future",
    "unknown"
  ]);
  expect(plan.total_corrected_minutes).toBe(300);
  expect(plan.unestimated_count).toBe(1);
  expect(plan.best_bucket_by_kind).toEqual({});
  expect(plan.underestimation_warning).toEqual([]);
});
it("uses the end of the local date, including a 25-hour day", () => {
  expect(planDateEnd("2026-10-25", "Europe/Prague")).toBe(
    Date.parse("2026-10-25T22:59:59.999Z")
  );
  expect(() => planDateEnd("2026-02-30", "UTC")).toThrow();
});
it("builds repeatable demo fixtures with 40 completed tasks and real patterns", () => {
  const now = Date.parse("2026-11-03T18:00:00Z");
  const rows = demoTasks(
    now,
    "Europe/Prague",
    Array.from({ length: 42 }, (_, i) => `demo-${i}`)
  );
  const completed = rows.filter((t) => t.status === "done");
  expect(completed).toHaveLength(40);
  expect(
    completed.every(
      (t) => t.completed_at! >= historyCutoff(now, 30) && t.completed_at! <= now
    )
  ).toBe(true);
  const stats = completionStats(completed, "Europe/Prague");
  expect(stats.enough_data && stats.estimate_ratio_by_kind.deep?.ratio).toBe(
    1.5
  );
  const plan = dayPlan(
    rows.filter((t) => t.status === "open"),
    stats,
    now,
    "Europe/Prague"
  );
  expect(plan.best_bucket_by_kind).toMatchObject({
    deep: "morning",
    admin: "afternoon"
  });
  expect(plan.underestimation_warning).toEqual(["deep"]);
  expect(plan.tasks.find((t) => t.kind === "deep")?.corrected_est_minutes).toBe(
    180
  );
  expect(plan.total_corrected_minutes).toBe(210);
  expect(
    demoTasks(
      now,
      "Europe/Prague",
      Array.from({ length: 42 }, (_, i) => `demo-${i}`)
    )
  ).toEqual(rows);
});

import { planningContext } from "../../src/lib/plan";
it("provides only remaining local time windows for today's plan", () => {
  const now = Date.parse("2026-11-03T18:00:00Z");
  expect(
    planningContext("2026-11-03", now, "Europe/Prague").available_buckets
  ).toEqual(["evening"]);
  expect(
    planningContext("2026-11-04", now, "Europe/Prague").available_buckets
  ).toEqual(["night", "morning", "afternoon", "evening"]);
  expect(
    planningContext("2026-11-02", now, "Europe/Prague").available_buckets
  ).toEqual([]);
});
