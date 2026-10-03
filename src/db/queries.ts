import { escapeLike } from "../lib/search";
import type { Task, Reminder, Notification } from "../lib/types";
import type { Sql } from "./sql";

export function getTask(sql: Sql, id: string): Task | undefined {
  return sql<Task>`SELECT * FROM tasks WHERE id = ${id}`[0];
}
export function insertTask(sql: Sql, task: Task): void {
  sql`INSERT INTO tasks (id,title,notes,status,priority,kind,owner,due_at,est_minutes,actual_minutes,parent_id,source,postponed_count,created_at,completed_at)
      VALUES (${task.id},${task.title},${task.notes},${task.status},${task.priority},${task.kind},${task.owner},${task.due_at},${task.est_minutes},${task.actual_minutes},${task.parent_id},${task.source},${task.postponed_count},${task.created_at},${task.completed_at})`;
}
// Explicit full-row replacement prevents undefined values and dynamic SQL column names.
export function updateTask(sql: Sql, task: Task): void {
  sql`UPDATE tasks SET title=${task.title}, notes=${task.notes}, status=${task.status}, priority=${task.priority}, kind=${task.kind}, owner=${task.owner}, due_at=${task.due_at}, est_minutes=${task.est_minutes}, actual_minutes=${task.actual_minutes}, parent_id=${task.parent_id}, source=${task.source}, postponed_count=${task.postponed_count}, completed_at=${task.completed_at} WHERE id=${task.id}`;
}
export interface TaskFilters {
  status?: "open" | "done" | "all";
  dueBefore?: number | null;
  query?: string;
  limit?: number;
}
export function listTasks(
  sql: Sql,
  {
    status = "open",
    dueBefore = null,
    query = "",
    limit = 20
  }: TaskFilters = {}
): Task[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new RangeError("Limit must be 1..50");
  return sql<Task>`SELECT * FROM tasks
    WHERE (${status} = 'all' OR status = ${status})
      AND (${dueBefore} IS NULL OR due_at < ${dueBefore})
      AND title LIKE ${"%" + escapeLike(query) + "%"} ESCAPE '!' COLLATE NOCASE
    ORDER BY due_at IS NULL, due_at, priority, created_at, id LIMIT ${limit}`;
}
export function listOpenTasks(sql: Sql): Task[] {
  return sql<Task>`SELECT * FROM tasks WHERE status='open' ORDER BY due_at IS NULL, due_at, priority, created_at, id`;
}
export function listCompletedSince(sql: Sql, since: number): Task[] {
  return sql<Task>`SELECT * FROM tasks WHERE status='done' AND completed_at >= ${since}`;
}
export function getReminder(sql: Sql, id: string): Reminder | undefined {
  return sql<Reminder>`SELECT * FROM reminders WHERE id=${id}`[0];
}
export function listActiveReminders(sql: Sql, taskId: string): Reminder[] {
  return sql<Reminder>`SELECT * FROM reminders WHERE task_id=${taskId} AND fired=0 AND cancelled=0 ORDER BY remind_at`;
}
export function insertReminder(sql: Sql, reminder: Reminder): void {
  sql`INSERT INTO reminders (id,task_id,remind_at,schedule_id,fired,cancelled) VALUES (${reminder.id},${reminder.task_id},${reminder.remind_at},${reminder.schedule_id},${reminder.fired},${reminder.cancelled})`;
}
export function updateReminder(sql: Sql, reminder: Reminder): void {
  sql`UPDATE reminders SET schedule_id=${reminder.schedule_id},fired=${reminder.fired},cancelled=${reminder.cancelled} WHERE id=${reminder.id}`;
}
export function insertNotification(sql: Sql, notification: Notification): void {
  sql`INSERT INTO notifications (id,task_id,message,created_at,read_at) VALUES (${notification.id},${notification.task_id},${notification.message},${notification.created_at},${notification.read_at})`;
}
export function listUnreadNotifications(sql: Sql): Notification[] {
  return sql<Notification>`SELECT * FROM notifications WHERE read_at IS NULL ORDER BY created_at, id`;
}
export function markNotificationRead(sql: Sql, id: string, now: number): void {
  sql`UPDATE notifications SET read_at=${now} WHERE id=${id} AND read_at IS NULL`;
}
