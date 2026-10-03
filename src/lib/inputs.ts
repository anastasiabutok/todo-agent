import { z } from "zod";
const datetime = z.iso.datetime({ offset: true });
const title = z.string().trim().min(1).max(200);
const minutes = z.number().int().min(1).max(1440);
const kind = z.enum(["deep", "admin", "quick", "meeting"]);
const priority = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const listInput = z.object({
  status: z.enum(["open", "done", "all"]).default("open"),
  due_before: datetime.optional(),
  query: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20)
});
export const addInput = z.object({
  title,
  notes: z.string().optional(),
  due_at: datetime.optional(),
  priority: priority.optional(),
  kind: kind.optional(),
  est_minutes: minutes.optional(),
  parent_id: z.string().min(1).optional(),
  owner: z.string().trim().min(1).optional()
});
export const updateInput = z.object({
  id: z.string().min(1),
  title: title.optional(),
  notes: z.string().nullable().optional(),
  due_at: datetime.nullable().optional(),
  priority: priority.optional(),
  kind: kind.nullable().optional(),
  est_minutes: minutes.nullable().optional(),
  owner: z.string().trim().min(1).nullable().optional()
});
export const idInput = z.object({ id: z.string().min(1) });
export const completeInput = idInput.extend({
  actual_minutes: minutes.optional()
});
export const actualInput = idInput.extend({ actual_minutes: minutes });
export const dropInput = idInput.extend({ reason: z.string().optional() });
export const timezoneInput = z.object({ timezone: z.string().min(1) });
export type AddInput = z.infer<typeof addInput>;
export type UpdateInput = z.infer<typeof updateInput>;
export type ListInput = z.infer<typeof listInput>;
export const reminderInput = z.object({
  task_id: z.string().min(1),
  remind_at: datetime
});
export const cancelReminderInput = z.object({ reminder_id: z.string().min(1) });
export const notificationIdsInput = z.array(z.string().min(1)).max(100);
