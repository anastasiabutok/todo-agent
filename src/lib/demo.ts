import type { Task, TaskKind } from "./types";
import { localTimeToMs, msToLocalIso } from "./time";
import { newTask } from "./tasks";
export function demoTasks(
  now: number,
  timezone: string,
  ids: string[]
): Task[] {
  if (ids.length !== 42)
    throw new RangeError("Demo requires 42 code-generated IDs");
  const localDate = msToLocalIso(now, timezone).slice(0, 10);
  const anchor = Date.parse(`${localDate}T12:00:00Z`);
  const titles = {
    deep: [
      "Draft research outline",
      "Write proposal",
      "Review architecture",
      "Implement report"
    ],
    admin: [
      "Process invoices",
      "Update project tracker",
      "Sort inbox",
      "Prepare expenses"
    ],
    quick: ["Send follow-up", "Confirm appointment"],
    meeting: ["Weekly planning", "Project review"]
  };
  const kinds: TaskKind[] = [
    "deep",
    "admin",
    "deep",
    "admin",
    "quick",
    "meeting",
    "deep",
    "admin"
  ];
  const completed = Array.from({ length: 40 }, (_, index) => {
    const kind = kinds[index % kinds.length];
    const date = new Date(anchor - (1 + (index % 28)) * 86400000)
      .toISOString()
      .slice(0, 10);
    const hour =
      kind === "deep"
        ? 9 + (index % 3)
        : kind === "admin"
          ? 14 + (index % 3)
          : kind === "meeting"
            ? 11
            : 16;
    const at = localTimeToMs(
      date,
      `${String(hour).padStart(2, "0")}:00:00`,
      timezone
    );
    const estimate =
      kind === "deep"
        ? 60 + (index % 3) * 30
        : kind === "admin"
          ? 30
          : kind === "quick"
            ? 10
            : 45;
    return {
      ...newTask(
        {
          title: `[Demo] ${titles[kind][index % titles[kind].length]} ${index + 1}`,
          kind,
          est_minutes: estimate
        },
        ids[index],
        at - estimate * 60000
      ),
      status: "done" as const,
      actual_minutes: Math.round(estimate * (kind === "deep" ? 1.5 : 1)),
      completed_at: at
    };
  });
  const due = localTimeToMs(localDate, "23:00:00", timezone);
  return [
    ...completed,
    newTask(
      {
        title: "[Demo] Draft tomorrow's proposal",
        kind: "deep",
        priority: 1,
        est_minutes: 120,
        due_at: msToLocalIso(due, timezone)
      },
      ids[40],
      now
    ),
    newTask(
      {
        title: "[Demo] Process inbox",
        kind: "admin",
        priority: 2,
        est_minutes: 30,
        due_at: msToLocalIso(due, timezone)
      },
      ids[41],
      now
    )
  ];
}
