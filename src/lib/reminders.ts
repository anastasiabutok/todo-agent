import type { Reminder, Task, Notification } from "./types";
export function reminderAction(
  reminder: Reminder | undefined,
  task: Task | undefined
): "ignore" | "skip" | "notify" {
  if (!reminder || reminder.fired || reminder.cancelled) return "ignore";
  return task?.status === "open" ? "notify" : "skip";
}
export function reminderNotification(
  task: Task,
  id: string,
  now: number
): Notification {
  return {
    id,
    task_id: task.id,
    message: `Reminder: ${task.title}`,
    created_at: now,
    read_at: null
  };
}
export function relativeReminderFacts(
  text: string,
  now: number,
  timezone: string
): string[] {
  return [
    ...text.matchAll(
      /\bin\s+(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi
    )
  ].flatMap((match) => {
    const unit = match[2].toLowerCase();
    const ms =
      Number(match[1]) *
      (unit.startsWith("h") ? 3600000 : unit.startsWith("m") ? 60000 : 1000);
    return ms > 0 &&
      Number.isSafeInteger(ms) &&
      Number.isFinite(new Date(now + ms).getTime())
      ? [`${match[0]} => ${msToLocalIso(now + ms, timezone)}`]
      : [];
  });
}
import { msToLocalIso } from "./time";
// Agents schedule(Date) truncates to seconds. Round up to avoid early delivery.
export function scheduleAtMs(ms: number): number {
  return Math.ceil(ms / 1000) * 1000;
}
