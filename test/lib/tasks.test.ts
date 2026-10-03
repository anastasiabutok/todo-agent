import { describe, expect, it } from "vitest";
import {
  newTask,
  editTask,
  taskViews,
  finishedTask,
  reopenedTask,
  validTimezone,
  taskSummary
} from "../../src/lib/tasks";
import { addInput, updateInput } from "../../src/lib/inputs";
import { durationFacts, clockContext } from "../../src/lib/context";
const base = () => newTask({ title: "Report" }, "id", 100);
describe("task mutations", () => {
  it("keeps explicit clears distinct from omitted fields and counts postponements", () => {
    const task = newTask(
      {
        title: "Report",
        due_at: "2026-11-06T17:00:00+01:00",
        kind: "deep",
        est_minutes: 120
      },
      "id",
      100
    );
    const updated = editTask(task, {
      id: "id",
      due_at: "2026-11-09T17:00:00+01:00"
    });
    expect(updated.postponed_count).toBe(1);
    expect(updated.kind).toBe("deep");
    expect(editTask(updated, { id: "id", notes: undefined })).toEqual(updated);
    const cleared = editTask(updated, {
      id: "id",
      due_at: null,
      kind: null,
      est_minutes: null
    });
    expect(cleared).toMatchObject({
      due_at: null,
      kind: null,
      est_minutes: null,
      postponed_count: 1
    });
    expect(taskSummary(updated, "Europe/Prague").due_at_local).toBe(
      "2026-11-09T17:00:00.000+01:00"
    );
  });
  it("completes and reopens without losing recorded time", () => {
    const task = base();
    const done = finishedTask(task, "done", 500, 180);
    expect(done).toMatchObject({
      status: "done",
      completed_at: 500,
      actual_minutes: 180
    });
    expect(reopenedTask(done)).toMatchObject({
      status: "open",
      completed_at: null,
      actual_minutes: 180
    });
    expect(task.status).toBe("open");
  });
  it("sorts overdue, due time, priority and null dates and flags attention", () => {
    const rows = [
      { ...base(), id: "none", due_at: null },
      { ...base(), id: "later", due_at: 300 },
      { ...base(), id: "overdue", due_at: 50, postponed_count: 3 },
      { ...base(), id: "high", due_at: 300, priority: 1 as const }
    ];
    const views = taskViews(rows, 100);
    expect(views.map((t) => t.id)).toEqual([
      "overdue",
      "high",
      "later",
      "none"
    ]);
    expect(views[0]).toMatchObject({ isOverdue: true, needsAttention: true });
    expect(rows[0].id).toBe("none");
  });
  it("validates schemas before tools can write", () => {
    expect(
      addInput.safeParse({ title: " ", due_at: "2026-11-06T17:00:00" }).success
    ).toBe(false);
    expect(addInput.safeParse({ title: "Test", est_minutes: 0 }).success).toBe(
      false
    );
    expect(updateInput.parse({ id: "a", owner: null }).owner).toBeNull();
    expect(validTimezone("Europe/Prague")).toBe(true);
    expect(validTimezone("Europe/Imaginary")).toBe(false);
  });
});
it("computes duration facts instead of asking the model to calculate minutes", () => {
  expect(
    durationFacts("deep work, 2 hours; took 3 hours; admin 1.5 h; 25 min")
  ).toEqual([
    "2 hours = 120 minutes",
    "3 hours = 180 minutes",
    "1.5 h = 90 minutes",
    "25 min = 25 minutes"
  ]);
  expect(durationFacts("100 hours; -2 hours; 1e3 hours")).toEqual([]);
  expect(
    clockContext(Date.parse("2026-11-03T17:00:00Z"), "Europe/Prague")
  ).toEqual({
    nowIso: "2026-11-03T18:00:00.000+01:00",
    weekday: "Tuesday",
    timezone: "Europe/Prague"
  });
});
