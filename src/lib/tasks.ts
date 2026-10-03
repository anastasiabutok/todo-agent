import type { Task, TaskView } from "./types";
import type { AddInput, UpdateInput } from "./inputs";
import { parseIsoToMs, msToLocalIso } from "./time";
import { computePostpone } from "./postpone";
export function newTask(input: AddInput, id: string, now: number): Task {
  return {
    id,
    title: input.title,
    notes: input.notes ?? null,
    status: "open",
    priority: input.priority ?? 2,
    kind: input.kind ?? null,
    owner: input.owner ?? null,
    due_at: input.due_at ? parseIsoToMs(input.due_at) : null,
    est_minutes: input.est_minutes ?? null,
    actual_minutes: null,
    parent_id: input.parent_id ?? null,
    source: "chat",
    postponed_count: 0,
    created_at: now,
    completed_at: null
  };
}
export function editTask(task: Task, input: UpdateInput): Task {
  const { id: _id, due_at, ...fields } = input;
  const provided = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  );
  const newDue =
    due_at === undefined
      ? task.due_at
      : due_at === null
        ? null
        : parseIsoToMs(due_at);
  return {
    ...task,
    ...provided,
    due_at: newDue,
    postponed_count: computePostpone(task.due_at, newDue, task.postponed_count)
  };
}
export function taskViews(tasks: Task[], now: number): TaskView[] {
  return tasks
    .map((task) => ({
      ...task,
      isOverdue: task.due_at !== null && task.due_at < now,
      needsAttention: task.postponed_count >= 3
    }))
    .sort(
      (a, b) =>
        Number(b.isOverdue) - Number(a.isOverdue) ||
        (a.due_at ?? Infinity) - (b.due_at ?? Infinity) ||
        a.priority - b.priority ||
        a.created_at - b.created_at ||
        a.id.localeCompare(b.id)
    );
}
export function taskSummary(task: Task, timezone: string) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    kind: task.kind,
    owner: task.owner,
    due_at_local:
      task.due_at === null ? null : msToLocalIso(task.due_at, timezone),
    est_minutes: task.est_minutes,
    postponed_count: task.postponed_count,
    needs_attention: task.postponed_count >= 3
  };
}
export function finishedTask(
  task: Task,
  status: "done" | "dropped",
  now: number,
  actual?: number
): Task {
  return {
    ...task,
    status,
    completed_at: status === "done" ? now : null,
    actual_minutes: actual ?? task.actual_minutes
  };
}
export function reopenedTask(task: Task): Task {
  return { ...task, status: "open", completed_at: null };
}
export function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
