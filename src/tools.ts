import { tool } from "ai";
import type { ChatAgent } from "./agent";
import {
  listInput,
  addInput,
  updateInput,
  idInput,
  completeInput,
  actualInput,
  dropInput,
  timezoneInput,
  reminderInput,
  cancelReminderInput
} from "./lib/inputs";
export function createTools(agent: ChatAgent) {
  const foundIds = new Set<string>();
  const requireLookup = (id: string) =>
    foundIds.has(id)
      ? null
      : {
          ok: false as const,
          error:
            "Call listTasks in this turn to find this task before changing it."
        };
  return {
    listTasks: tool({
      description:
        "Always call this first to find a task's id before changing a task the user refers to by name. If several tasks match, ask the user which one.",
      inputSchema: listInput,
      execute: async (input) => {
        const result = agent.findTasks(input);
        for (const task of result.tasks) foundIds.add(task.id);
        return result;
      }
    }),
    addTask: tool({
      description:
        "Add a task with an optional offset datetime, priority, kind, owner and estimate in minutes. Use only code-provided duration conversions.",
      inputSchema: addInput,
      execute: async (input) => agent.addTask(input)
    }),
    updateTask: tool({
      description:
        "Update an open task. Find the ID with listTasks first. Moving a deadline later counts as postponement; reminders stay unchanged.",
      inputSchema: updateInput,
      execute: async (input) =>
        requireLookup(input.id) ?? agent.updateTask(input)
    }),
    completeTask: tool({
      description:
        "Complete an open task. Supply actual_minutes only from the user's duration using code-provided conversions.",
      inputSchema: completeInput,
      execute: async ({ id, actual_minutes }) =>
        requireLookup(id) ?? agent.completeTask(id, actual_minutes)
    }),
    logActualMinutes: tool({
      description: "Record time spent on an already completed task.",
      inputSchema: actualInput,
      execute: async ({ id, actual_minutes }) =>
        requireLookup(id) ?? agent.logActualMinutes(id, actual_minutes)
    }),
    dropTask: tool({
      description: "Drop an open task reversibly. No hard deletion.",
      inputSchema: dropInput,
      execute: async ({ id, reason }) =>
        requireLookup(id) ?? agent.dropTask(id, reason)
    }),
    reopenTask: tool({
      description: "Reopen a done or dropped task.",
      inputSchema: idInput,
      execute: async ({ id }) => requireLookup(id) ?? agent.reopenTask(id)
    }),
    setReminder: tool({
      description:
        "Set a reminder for an open task. Call listTasks first. For relative times use the code-computed reminder datetime from the system prompt; never calculate it yourself.",
      inputSchema: reminderInput,
      execute: async ({ task_id, remind_at }) =>
        requireLookup(task_id) ?? agent.setReminder(task_id, remind_at)
    }),
    cancelReminder: tool({
      description:
        "Cancel a reminder by its reminder_id returned by setReminder.",
      inputSchema: cancelReminderInput,
      execute: async ({ reminder_id }) => agent.cancelReminder(reminder_id)
    }),
    setTimezone: tool({
      description: "Set the user's IANA timezone, for example Europe/Prague.",
      inputSchema: timezoneInput,
      execute: async ({ timezone }) => agent.setTimezone(timezone)
    })
  };
}
