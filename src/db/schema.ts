export const MIGRATIONS: string[] = [
  /* v1 */ `
  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dropped')),
    priority INTEGER NOT NULL DEFAULT 2 CHECK (priority IN (1,2,3)),
    kind TEXT CHECK (kind IN ('deep','admin','quick','meeting')),
    owner TEXT,                       -- null = me; otherwise delegated to this person
    due_at INTEGER,
    est_minutes INTEGER CHECK (est_minutes IS NULL OR est_minutes > 0),
    actual_minutes INTEGER CHECK (actual_minutes IS NULL OR actual_minutes > 0),
    parent_id TEXT REFERENCES tasks(id),
    source TEXT NOT NULL DEFAULT 'chat' CHECK (source IN ('chat','braindump')),
    postponed_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  );
  CREATE INDEX idx_tasks_status_due ON tasks(status, due_at);
  CREATE TABLE reminders (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    remind_at INTEGER NOT NULL,
    schedule_id TEXT,
    fired INTEGER NOT NULL DEFAULT 0,
    cancelled INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    read_at INTEGER
  );
  `
];
