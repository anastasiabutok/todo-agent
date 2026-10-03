import type { CompletionStats } from "./lib/stats";
import { tool } from "ai";
import type { ChatAgent } from "./agent";
import {
  batchInput,
  listInput,
  addInput,
  updateInput,
  idInput,
  completeInput,
  actualInput,
  dropInput,
  timezoneInput,
  reminderInput,
  cancelReminderInput,
  statsInput,
  planInput
} from "./lib/inputs";
export function createTools(
  agent: ChatAgent,
  policy: { batchConfirmed?: boolean; allowTaskCreation?: boolean } = {}
) {
  let planningStats: CompletionStats | undefined;
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
      execute: async (input) =>
        policy.allowTaskCreation === false
          ? {
              ok: false,
              error:
                "Task creation is not authorized in this reminder or preview turn."
            }
          : agent.addTask(input)
    }),
    addTasksBatch: tool({
      description:
        "Create exactly the brain-dump candidates explicitly confirmed by the user, at most 30. Never call before confirmation. Inserts sequentially with source braindump; reports created tasks and partial failures. Retry only failed items, never successful ones.",
      inputSchema: batchInput,
      execute: async (input) =>
        policy.batchConfirmed
          ? agent.addTasksBatch(input)
          : {
              ok: false,
              error:
                "Show candidates and wait for explicit user confirmation before creating a batch."
            }
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
    getCompletionStats: tool({
      description:
        "Get completion patterns and estimate ratios from history. For a statistics-only request, summarize this result without calling proposeDayPlan. When a day plan is requested, call this before proposeDayPlan. If enough_data is false, do not claim patterns.",
      inputSchema: statsInput,
      execute: async ({ days }) => {
        planningStats = agent.getCompletionStats(days);
        return planningStats;
      }
    }),
    proposeDayPlan: tool({
      description:
        "Propose tasks for a local YYYY-MM-DD date after getCompletionStats. Use corrected_est_minutes and total_corrected_minutes exactly; never recalculate them. Null estimates remain unknown.",
      inputSchema: planInput,
      execute: async ({ date }) =>
        planningStats
          ? agent.proposeDayPlan(date, planningStats)
          : {
              ok: false,
              error: "Call getCompletionStats before proposing a day plan."
            }
    }),
    setTimezone: tool({
      description: "Set the user's IANA timezone, for example Europe/Prague.",
      inputSchema: timezoneInput,
      execute: async ({ timezone }) => agent.setTimezone(timezone)
    })
  };
}
