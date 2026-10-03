import { DatabaseSync } from "node:sqlite";
import { beforeEach, afterEach, expect, it } from "vitest";
import type { Sql } from "../../src/db/sql";
import { runMigrations } from "../../src/db/migrate";
import {
  insertTask,
  getTask,
  updateTask,
  listTasks,
  listActiveReminders,
  insertReminder,
  listUnreadNotifications,
  insertNotification,
  markNotificationRead
} from "../../src/db/queries";
import type { Task } from "../../src/lib/types";
let db: DatabaseSync;
let sql: Sql;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  sql = <T>(
    strings: TemplateStringsArray,
    ...values: (string | number | boolean | null)[]
  ): T[] => {
    const query = strings.join("?");
    if (!values.length) {
      // DDL can contain multiple statements.
      if (!/^\s*SELECT/i.test(query)) {
        db.exec(query);
        return [];
      }
    }
    return db
      .prepare(query)
      .all(
        ...values.map((v) => (typeof v === "boolean" ? Number(v) : v))
      ) as T[];
  };
  runMigrations(sql);
});
afterEach(() => db.close());
const task = (id: string, title: string): Task => ({
  id,
  title,
  notes: null,
  status: "open",
  priority: 2,
  kind: null,
  owner: null,
  due_at: null,
  est_minutes: null,
  actual_minutes: null,
  parent_id: null,
  source: "chat",
  postponed_count: 0,
  created_at: 123,
  completed_at: null
});
it("migrates a fresh database and preserves data on repeated startup", () => {
  insertTask(sql, task("a", "Report"));
  expect(runMigrations(sql)).toBe(1);
  expect(
    sql<{
      value: string;
    }>`SELECT value FROM _meta WHERE key='schema_version'`[0].value
  ).toBe("1");
  expect(getTask(sql, "a")?.title).toBe("Report");
  expect(() =>
    insertTask(sql, { ...task("bad", "Bad"), priority: 4 as 1 })
  ).toThrow();
  expect(() =>
    insertTask(sql, { ...task("child", "Child"), parent_id: "missing" })
  ).toThrow();
});
it("binds user input and matches literal wildcard characters case-insensitively", () => {
  insertTask(sql, task("a", "Review 100%_done"));
  insertTask(sql, task("b", "Other task"));
  expect(listTasks(sql, { query: "REVIEW 100%_" }).map((t) => t.id)).toEqual([
    "a"
  ]);
  expect(listTasks(sql, { query: "' OR 1=1 --" })).toEqual([]);
  const original = getTask(sql, "a")!;
  updateTask(sql, {
    ...original,
    status: "done",
    actual_minutes: 180,
    completed_at: 1000
  });
  expect(listTasks(sql).map((t) => t.id)).toEqual(["b"]);
  expect(listTasks(sql, { status: "done" })[0].actual_minutes).toBe(180);
});
it("filters due dates and persists reminder and notification state", () => {
  insertTask(sql, { ...task("a", "Report"), due_at: 100 });
  insertTask(sql, task("b", "No date"));
  expect(listTasks(sql, { dueBefore: 200 }).map((t) => t.id)).toEqual(["a"]);
  insertReminder(sql, {
    id: "r",
    task_id: "a",
    remind_at: 200,
    schedule_id: null,
    fired: 0,
    cancelled: 0
  });
  expect(listActiveReminders(sql, "a")).toHaveLength(1);
  insertNotification(sql, {
    id: "n",
    task_id: "a",
    message: "Reminder",
    created_at: 200,
    read_at: null
  });
  expect(listUnreadNotifications(sql)).toHaveLength(1);
  markNotificationRead(sql, "n", 300);
  expect(listUnreadNotifications(sql)).toEqual([]);
});

it("rejects a future schema version without altering existing data", () => {
  insertTask(sql, task("a", "Keep me"));
  sql`UPDATE _meta SET value='99' WHERE key='schema_version'`;
  expect(() => runMigrations(sql)).toThrow(
    "Unsupported database schema version"
  );
  expect(getTask(sql, "a")?.title).toBe("Keep me");
});

it("rolls back DDL and version changes together when a migration fails", () => {
  db.exec(
    "DROP TABLE tasks; DROP TABLE reminders; DROP TABLE notifications; DELETE FROM _meta;"
  );
  db.exec("CREATE TABLE reminders (id TEXT PRIMARY KEY)");
  db.exec("BEGIN");
  try {
    expect(() => runMigrations(sql)).toThrow();
  } finally {
    db.exec("ROLLBACK");
  }
  expect(
    sql<{ name: string }>`SELECT name FROM sqlite_master WHERE name='tasks'`
  ).toEqual([]);
  expect(sql`SELECT * FROM _meta`).toEqual([]);
});
