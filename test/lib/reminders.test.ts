import { expect, it } from "vitest";
import {
  reminderAction,
  reminderNotification,
  relativeReminderFacts,
  scheduleAtMs
} from "../../src/lib/reminders";
import { newTask } from "../../src/lib/tasks";
import type { Reminder } from "../../src/lib/types";
import { formatLocalDateTime } from "../../src/lib/time";
const task = newTask({ title: "Report" }, "task", 0);
const reminder: Reminder = {
  id: "reminder",
  task_id: "task",
  remind_at: 100,
  schedule_id: "schedule",
  fired: 0,
  cancelled: 0
};
it("only notifies an open task with an unfired and uncancelled reminder", () => {
  expect(reminderAction(reminder, task)).toBe("notify");
  expect(reminderAction({ ...reminder, fired: 1 }, task)).toBe("ignore");
  expect(reminderAction({ ...reminder, cancelled: 1 }, task)).toBe("ignore");
  expect(reminderAction(undefined, task)).toBe("ignore");
  expect(reminderAction(reminder, undefined)).toBe("skip");
  expect(reminderAction(reminder, { ...task, status: "done" })).toBe("skip");
  expect(reminderAction(reminder, { ...task, status: "dropped" })).toBe("skip");
});
it("builds a persisted unread notification with code-owned ID/time", () => {
  expect(reminderNotification(task, "notification", 123)).toEqual({
    id: "notification",
    task_id: "task",
    message: "Reminder: Report",
    created_at: 123,
    read_at: null
  });
});
it("computes relative reminder instants across DST instead of letting the model add time", () => {
  const now = Date.parse("2026-10-25T00:59:00Z");
  expect(
    relativeReminderFacts("remind me in 2 minutes", now, "Europe/Prague")
  ).toEqual(["in 2 minutes => 2026-10-25T02:01:00.000+01:00"]);
  expect(
    relativeReminderFacts("in 1.5 hours and in 30 seconds", 0, "UTC")
  ).toEqual([
    "in 1.5 hours => 1970-01-01T01:30:00.000+00:00",
    "in 30 seconds => 1970-01-01T00:00:30.000+00:00"
  ]);
  expect(
    relativeReminderFacts(
      "in -2 minutes and in 0 minutes and in 2500000000 hours",
      now,
      "UTC"
    )
  ).toEqual([]);
  expect(
    formatLocalDateTime(Date.parse("2026-11-06T16:00:00Z"), "Europe/Prague")
  ).toBe("6 Nov 2026, 17:00");
});

it("rounds schedule times up to the SDK's second resolution", () => {
  expect(scheduleAtMs(1234)).toBe(2000);
  expect(scheduleAtMs(2000)).toBe(2000);
});
