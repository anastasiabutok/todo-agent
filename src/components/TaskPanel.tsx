import { useState } from "react";
import { Badge, Surface } from "@cloudflare/kumo";
import type { TaskView } from "../lib/types";
import { formatLocalDateTime } from "../lib/time";
export function TaskPanel({
  tasks,
  timezone,
  connected,
  onComplete
}: {
  tasks: TaskView[];
  timezone: string;
  connected: boolean;
  onComplete: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  return (
    <section aria-label="Open tasks" className="p-4 min-w-0">
      <h2 className="text-lg font-semibold mb-1">
        Open tasks <Badge variant="secondary">{tasks.length}</Badge>
      </h2>
      <p className="text-xs text-kumo-subtle mb-4 break-words">
        {timezone} · Edit tasks in chat
      </p>
      {error && (
        <p role="alert" className="text-kumo-danger mb-3">
          {error}
        </p>
      )}
      {tasks.length === 0 ? (
        <p className="text-sm text-kumo-subtle">No open tasks.</p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <Surface className="p-3 min-w-0">
                <label className="flex gap-3 items-start cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    aria-label={`Complete ${task.title}`}
                    disabled={!connected || pending !== null}
                    checked={false}
                    onChange={async () => {
                      setPending(task.id);
                      setError("");
                      try {
                        const result = await onComplete(task.id);
                        if (!result.ok)
                          setError(result.error ?? "Could not complete task");
                      } catch {
                        setError("Could not complete task. Please try again.");
                      } finally {
                        setPending(null);
                      }
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">
                      {task.title}
                    </span>
                    <span
                      className={`block text-xs mt-1 ${task.isOverdue ? "text-kumo-danger" : "text-kumo-subtle"}`}
                    >
                      {task.isOverdue ? "Overdue · " : ""}
                      {task.due_at === null
                        ? "No deadline"
                        : formatLocalDateTime(task.due_at, timezone)}
                    </span>
                    {task.owner && (
                      <span className="block text-xs text-kumo-subtle break-words">
                        Owner: {task.owner}
                      </span>
                    )}
                    {task.needsAttention && (
                      <Badge variant="secondary">Needs attention</Badge>
                    )}
                  </span>
                </label>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
