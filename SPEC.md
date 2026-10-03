# SPEC — Personal Todo Agent on Cloudflare

You are building a single-user, AI-powered todo agent on Cloudflare. Read this whole file before writing any code.

## START HERE — how to work through this spec

The user will only say something like "follow SPEC.md" or "continue". Everything you need is in this file; don't wait for more detailed instructions.

1. **Find where you are.** If `PROGRESS.md` doesn't exist, you're at Phase 0. Otherwise read it and continue with the first phase not marked done.
2. **Do exactly one phase** (§11), following the ground rules (§0). Don't start the next phase in the same session unless the user says "continue to the next phase".
3. **Keep the documents up to date as you go — the user won't remind you:**
   - `PROGRESS.md` — create in Phase 0. One section per phase: status (`done` / `in progress` / `blocked`), what was built, how acceptance was verified, open issues.
   - `NOTES.md` — create in Phase 0. Actual SDK names and signatures (see Phase 0). Update whenever you discover something new about the APIs.
   - `FRICTION_LOG.md` — create in Phase 0 (template in §12). Add an entry every time docs, types, errors, tooling or the model surprise you. Aim for honest, specific entries; this is a deliverable, not a chore.
   - `README.md` — create a stub in Phase 0 (title + one-line description), fill it fully in the last phase (§13).
4. **Git (rule 10 in §0):** create the private GitHub repo in Phase 0, commit + push at the end of every phase. `PROGRESS.md`, `NOTES.md` and `FRICTION_LOG.md` are committed together with the code of the phase.
5. **If you're blocked** (missing tool, missing login, a Cloudflare dashboard step, a decision this spec doesn't cover, acceptance criteria that can't be met): stop, mark the phase `blocked` in `PROGRESS.md` with the reason, and ask the user one clear question. Don't guess around it.
6. **End every phase with a report to the user**, in this format:
   ```
   Phase N — <name>: done | blocked
   Built: <2–4 bullets>
   Verified: <how each acceptance criterion was checked>
   Friction log: <number of new entries, one-line each>
   Needs from you: <manual steps for the user, or "nothing">
   Next: Phase N+1 — <name>
   ```

---

## 0. Ground rules (read twice)

1. **Do not trust API names from memory or from this spec.** The Agents SDK changes often. Before using any SDK function (`this.sql`, `this.schedule`, `this.setState`, `cancelSchedule`, `getSchedules`/`listSchedules`, `routeAgentRequest`, `useAgent`, `useAgentChat`, `AIChatAgent`, AI SDK `tool()` and its `inputSchema`/`parameters` field), confirm it in this order:
   1. the code the starter template generated (`src/server.ts`, `src/app.tsx` or equivalent),
   2. the type definitions in `node_modules/agents/` and `node_modules/ai/`,
   3. the docs at `https://developers.cloudflare.com/agents/llms.txt`.
   If these disagree with this spec, **the code and types win**. Write the discrepancy into `FRICTION_LOG.md` (see §9).
2. **Zod version:** check `package.json`. In Zod v3 use `z.string().datetime({ offset: true })`; in Zod v4 use `z.iso.datetime({ offset: true })`. Use whichever matches. Same for `z.string().date()` vs `z.iso.date()`.
3. **Never** run `wrangler deploy`, create Cloudflare resources, or touch the Cloudflare dashboard. Ask the user to do it. Local dev (`npm run dev` / `wrangler dev`) is fine.
4. **Never** commit secrets. `.dev.vars` must be in `.gitignore`.
5. All business logic that does maths or data transforms lives in **pure functions in `src/lib/`** with unit tests. The agent class only wires SQL ↔ pure functions ↔ tools.
6. The LLM never does arithmetic, date maths, or ID generation. Code does. The LLM only decides which tool to call and writes text.
7. Times: store as **unix ms UTC (INTEGER)**. IDs: `crypto.randomUUID()`. Tool inputs accept ISO 8601 strings **with offset**; convert in code.
8. Keep the starter's styling system and component library. Don't add a new UI framework.
10. **Git & GitHub:** in Phase 0, after scaffolding, `git init`, verify `.gitignore` contains `.dev.vars`, `.wrangler/`, `node_modules/`, `dist/`, then create a **private** repo with `gh repo create todo-agent --private --source=. --push` (if `gh` isn't installed or authenticated, stop and ask the user). Commit at the end of every phase with a message `phase N: <summary>` and push. Before every commit run `git diff --cached` and make sure no secrets, tokens, account IDs or emails are staged. Never force-push, never rewrite history. Don't make the repo public; the user does that.
9. Definition of done for every phase: `npx tsc --noEmit` passes, `npm test` passes, `npm run dev` starts without errors, and the phase's acceptance criteria are manually verified (describe how you verified them).

---

## 1. Stack

| Concern | Choice |
|---|---|
| Runtime | Cloudflare Workers + Durable Objects (via Agents SDK) |
| Agent base class | `AIChatAgent` from the starter (it persists chat messages and streams). Not the bare `Agent`. |
| Storage | The agent's built-in SQLite (`this.sql`) for tasks; agent state (`this.setState`) for a small UI snapshot |
| Model | Workers AI via `workers-ai-provider`, **using the model the starter is configured with**. Don't change it in phase 1–4. |
| Scheduling | `this.schedule(...)` |
| UI | The starter's React app (Vite), served as Workers static assets |
| Auth | Cloudflare Access in front of the Worker; Worker verifies the Access JWT |
| Tests | Vitest. Use `@cloudflare/vitest-pool-workers` only if the starter already has it; otherwise plain Vitest for `src/lib/` pure functions is enough |

---

## 2. Target file structure

Adapt names to what the starter generates, but keep this separation:

```
src/
  server.ts            # Worker entry: auth check, routeAgentRequest, export agent class
  agent.ts             # TodoAgent extends AIChatAgent — onStart, onChatMessage, schedule callbacks
  tools.ts             # createTools(agent) -> tools object (closures over the agent instance)
  prompt.ts            # buildSystemPrompt({ nowIso, timezone, ... })
  db/
    schema.ts          # migrations array
    migrate.ts         # runMigrations(sql)
    queries.ts         # typed SQL helpers (insertTask, updateTask, listTasks, ...)
  lib/
    time.ts            # parseIsoToMs, msToLocalIso, startOfLocalDay, ...
    postpone.ts        # computePostpone(oldDue, newDue, count)
    stats.ts           # completionStats(rows), estimateRatio(rows, kind)
    plan.ts            # correctEstimates(tasks, ratios)
    types.ts           # Task, Reminder, Notification, AgentState
  auth.ts              # verifyAccessJwt(request, env) -> { email } | null
  app.tsx              # (starter) chat UI + task panel
  components/
    TaskPanel.tsx
    NotificationBanner.tsx
test/
  lib/*.test.ts
SPEC.md
FRICTION_LOG.md
README.md
```

---

## 3. Data model

### 3.1 Migrations (not just `CREATE TABLE IF NOT EXISTS`)

`CREATE TABLE IF NOT EXISTS` silently ignores schema changes, so use a tiny migration runner:

```ts
// db/schema.ts
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
  `,
];
```

`migrate.ts`: create `CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT)`, read `schema_version` (default 0), apply each migration with index ≥ version in order, then store the new version. If `this.sql` can't run multiple statements in one call, split each migration on `;` and run statements one by one (check this — note the result in FRICTION_LOG.md). Call `runMigrations` from `onStart()`.

### 3.2 Agent state (synced to UI)

```ts
type AgentState = {
  timezone: string;              // IANA, e.g. "Europe/Prague"; default "UTC"
  openTasks: TaskView[];         // open tasks, sorted: overdue, then due_at asc, then priority
  unreadNotifications: Notification[];
};
```

After **every** mutation (any tool that writes, any schedule callback, marking notifications read) call a single private method `refreshState()` that re-queries SQLite and calls `this.setState(...)`. The UI renders only from this state. Never keep a second copy of tasks in React state.

`TaskView` = Task plus derived fields computed in code: `isOverdue: boolean`, `needsAttention: boolean` (`postponed_count >= 3`).

---

## 4. Auth (Cloudflare Access)

- The user (not you) creates an Access self-hosted application for the Worker's hostname and an allow policy for their own email.
- `auth.ts`: verify the `Cf-Access-Jwt-Assertion` header using `jose` (`createRemoteJWKSet` against `https://<TEAM_DOMAIN>/cdn-cgi/access/certs`, check `aud` = `ACCESS_AUD`). Env vars: `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ALLOWED_EMAIL`.
- Local dev bypass: only if `env.DEV_AUTH_BYPASS === "true"` (set only in `.dev.vars`, never in `wrangler.jsonc`), return `{ email: env.ALLOWED_EMAIL }`.
- In `server.ts`, before `routeAgentRequest`: if auth fails or email ≠ `ALLOWED_EMAIL` → 403. Static assets may be served without auth only if the starter's asset config forces it; the agent routes (HTTP + WebSocket) must always be checked.
- Agent instance name is fixed server-side: the client always connects with name `"me"`. In `server.ts`, reject any agent request whose instance name is not `"me"`. (Single user = single instance. Don't build multi-tenancy.)

---

## 5. Tools

Define tools in `tools.ts` as `createTools(agent: TodoAgent)` and call it inside `onChatMessage`, so every `execute` closes over the real agent instance. **Do not** reference an undefined `agent` variable (the original sketch had that bug). Every tool:
- validates input with Zod,
- returns a small JSON object (never the whole DB),
- on a "not found" or invalid state returns `{ ok: false, error: "<human readable>" }` instead of throwing,
- calls `agent.refreshState()` after writing.

Times in outputs are returned as **local ISO strings in the user's timezone** (via `lib/time.ts`) so the model reads them correctly.

| Tool | Input | Behaviour |
|---|---|---|
| `listTasks` | `status: "open"\|"done"\|"all"` (default open), `due_before?: datetime`, `query?: string` (case-insensitive LIKE on title), `limit?: int 1..50` (default 20) | SELECT. Returns `{ tasks: [{id,title,status,priority,kind,owner,due_at_local,est_minutes,postponed_count,needs_attention}] }`. Description must say: *"Always call this first to find a task's id before changing a task the user refers to by name. If several tasks match, ask the user which one."* |
| `addTask` | `title` (1..200 chars), `notes?`, `due_at?`, `priority?: 1..3`, `kind?: enum`, `est_minutes?: int 1..1440`, `parent_id?`, `owner?` | If `parent_id` given and doesn't exist → error. INSERT with `created_at = Date.now()`, `source='chat'`. Return `{ ok, id, title, due_at_local }`. |
| `updateTask` | `id`, any of `title?`, `notes?`, `due_at?: datetime \| null`, `priority?`, `kind?`, `est_minutes?`, `owner?` | Only open tasks. Postpone logic via `lib/postpone.ts`: if old due_at is not null and new due_at is later → `postponed_count + 1`. Setting null or earlier doesn't change the count. If due_at changes and there are active reminders for the task, **do not** move them — return `{ reminder_note: "Task has a reminder at X; ask the user whether to move it." }`. |
| `completeTask` | `id`, `actual_minutes?: int 1..1440` | Only from `open`. Set `status='done'`, `completed_at=Date.now()`. Cancel the task's unfired reminders (see §6). If `actual_minutes` missing, return `{ ok, ask_actual_minutes: true }`; the prompt tells the model to ask once, and if the user answers, call `logActualMinutes`. |
| `logActualMinutes` | `id`, `actual_minutes` | Only for `done` tasks. UPDATE. |
| `dropTask` | `id`, `reason?` | `status='dropped'`. Cancel reminders. Reversible. |
| `reopenTask` | `id` | `done`/`dropped` → `open`, clear `completed_at`. |
| `setReminder` | `task_id`, `remind_at: datetime` | Error if task not open or `remind_at` ≤ now. `const s = await agent.schedule(new Date(ms), "fireReminder", { reminderId })`. INSERT reminder with `schedule_id = s.id`. Return `{ ok, reminder_id, remind_at_local }`. |
| `cancelReminder` | `reminder_id` | Cancel the schedule (verify the exact method name in the SDK), set `cancelled=1`. |
| `getCompletionStats` | `days: int 7..365` (default 30) | See §7. |
| `proposeDayPlan` | `date: date (YYYY-MM-DD, user's local date)` | See §7. |
| `addTasksBatch` | `tasks: array (1..30) of { title, owner?, due_at?, kind?, est_minutes?, priority? }` | See §8. Single transaction if the SDK supports it; otherwise insert sequentially and report partial failures. `source='braindump'`. |
| `setTimezone` | `timezone: string` | Validate with `Intl.DateTimeFormat(undefined, { timeZone })` in a try/catch. Store in state. |

There is **no hard-delete tool**, and the UI has no delete either.

If the AI SDK version uses a human-in-the-loop/approval pattern in the starter (tools without `execute`), **don't** use it for these tools in phase 1–4; all of these execute directly. Confirmation for the brain-dump happens in conversation (§8).

---

## 6. Reminders and notifications

- `fireReminder(payload: { reminderId: string })` is a public method on the agent class (scheduled callbacks are invoked by method name — verify the signature the SDK expects).
- In `fireReminder`: load the reminder; if `fired=1` or `cancelled=1` → return. Load the task; if it's not `open` → mark fired, return. Otherwise INSERT a notification (`"Reminder: <title>"`), set `fired=1`, `refreshState()`.
- Because notifications live in SQLite and state, the user sees them **even if the browser was closed when the reminder fired**. A `broadcast` alone would lose them.
- The UI shows `unreadNotifications` as a banner and, if the tab is open and permission was granted, a browser `Notification`. Expose a `@callable()` method `markNotificationsRead(ids: string[])` (verify `@callable` usage in the starter; it may need decorator config in tsconfig).
- Cancelling reminders: when a task is completed/dropped, cancel each unfired reminder's schedule and set `cancelled=1`. The guard in `fireReminder` makes this safe even if cancel fails.

---

## 7. Energy-aware planner

All maths in `src/lib/stats.ts` and `src/lib/plan.ts`, with unit tests.

**`getCompletionStats({ days })`**
- Query done tasks with `completed_at` in the last `days` days.
- If fewer than **10** such tasks → return `{ enough_data: false, completed_count: n, message: "Not enough history yet (n/10 completed tasks)." }`.
- Otherwise return:
  - `by_hour`: counts per local hour 0–23 (in the user's timezone), only hours with > 0,
  - `by_kind_and_hour_bucket`: counts per kind × bucket (`morning` 06–12, `afternoon` 12–18, `evening` 18–24, `night` 00–06),
  - `estimate_ratio_by_kind`: for each kind with **≥ 5** tasks that have both `est_minutes` and `actual_minutes`: the **median** of `actual/est`, rounded to 2 decimals, plus `sample_size`. Kinds below 5 samples are omitted.
  - `underestimation_warning`: kinds whose median ratio ≥ 1.3.

**`proposeDayPlan({ date })`**
- Select open tasks owned by me (`owner IS NULL`) that are due on or before the end of that local date, plus open tasks with no due date and priority 1.
- For each, `corrected_est_minutes = round(est_minutes × ratio[kind])`, ratio clamped to `[0.5, 3.0]`, default 1.0 if the kind has no ratio. If `est_minutes` is null, return null (don't invent).
- Return tasks sorted by: overdue first, then priority, then due_at. Also return `total_corrected_minutes` and the best bucket per kind from stats (if enough data).
- The model writes the human plan ("deep work at 10:00…") from this output. The model must not change the numbers.

---

## 8. Brain-dump to tasks

Flow is enforced by the system prompt, not by code:
1. User pastes a long text (heuristic in prompt: > ~300 characters, or the user says "brain dump"/"from these notes").
2. Model extracts candidate tasks and shows them as a numbered list with title, owner, due date (or "no deadline").
3. Model asks **only** about missing deadlines it thinks matter and genuinely unclear items. One message, not a questionnaire.
4. Only after the user explicitly confirms (e.g. "yes", "add them", "add 1–4") does it call `addTasksBatch` with exactly the confirmed items.

Code-level guard: `addTasksBatch` rejects batches > 30 and dedupes titles that exactly match an existing open task (return them under `skipped_duplicates`).

---

## 9. System prompt (`prompt.ts`)

Rebuild on every `onChatMessage` call. Include:
- Current date-time as local ISO with offset, weekday name, and the IANA timezone. (Models resolve "Friday" badly without this.)
- "Next Friday" etc.: resolve relative to the given date; if ambiguous, ask.
- Rules: always `listTasks` before modifying a task by name; never invent ids; never do date maths beyond resolving the user's words into an ISO datetime with offset; keep replies short; after tool calls, confirm what changed in one sentence.
- Postponement: if a task in a tool result has `needs_attention: true`, ask once whether to split, drop or delegate it.
- Planner: call `getCompletionStats` before proposing a plan; if `enough_data` is false, say so and plan by priority/due date only, without claiming patterns.
- Brain-dump flow from §8.
- Completion: if `ask_actual_minutes` is returned, ask "How long did it take?" once; don't nag.

---

## 10. UI

Keep the starter's chat. Add:
- `TaskPanel` (right side on desktop, tab on mobile): renders `state.openTasks` from `useAgent`'s state; overdue in red, `needsAttention` with a small badge, due dates shown in local time. Clicking a checkbox calls a `@callable()` `completeTaskFromUi(id)` that reuses the same code path as the tool. No other editing in the UI for now — editing happens through chat.
- `NotificationBanner`: shows unread notifications, "dismiss" calls `markNotificationsRead`.
- On first connect, send the browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) via a `@callable()` `setTimezoneFromUi(tz)` if state.timezone is still the default.
- Mobile width works (no horizontal scroll).

---

## 11. Phases

Each phase ends with: checks from §0.9 → commit → short report to the user → wait.

**Phase 0 — Scaffold & verify assumptions**
- `npm create cloudflare@latest -- todo-agent --template=cloudflare/agents-starter`, install, run `npm run dev`, confirm the demo chat works.
- Read the generated server and client code. Write `NOTES.md` listing the *actual* names/signatures for: agent base class & import path, `onChatMessage` signature, how tools are passed to `streamText`, tool schema field name, `schedule` / cancel / list schedules, `setState`, `@callable`, `useAgent` & `useAgentChat` import paths, the Workers AI model id, Zod version.
- Remove the demo tools (weather, calculate, starter scheduling tools) and their imports.
- Create `FRICTION_LOG.md` with the template in §12.
- ✅ Accept: app runs with no tools, chat still answers.

**Phase 1 — Data layer + pure functions**
- Migrations, queries, `lib/time.ts`, `lib/postpone.ts`, types.
- Unit tests: time parsing with offsets incl. DST change in Europe/Prague (e.g. 2026-10-25), postpone logic (later / earlier / null → value / value → null).
- ✅ Accept: tests pass; agent starts and `_meta.schema_version = 1` (verify via a temporary `@callable` debug method, then remove it).

**Phase 2 — Core tools + system prompt**
- `listTasks`, `addTask`, `updateTask`, `completeTask`, `logActualMinutes`, `dropTask`, `reopenTask`, `setTimezone`, `refreshState`.
- ✅ Accept (manually in chat): "add write report due Friday 5pm, deep work, 2 hours" → task with correct local due date; "move the report to Monday" → listTasks then updateTask, postponed_count = 1; "done with the report, took 3 hours" → done, actual 180.

**Phase 3 — Reminders + notifications + UI panel**
- `setReminder`, `cancelReminder`, `fireReminder`, notifications, `TaskPanel`, `NotificationBanner`, callables.
- ✅ Accept: "remind me about X in 2 minutes" → close tab → reopen after 3 minutes → banner shows reminder. Completing a task with a pending reminder → reminder never fires. Task list updates live when changed via chat.

**Phase 4 — Planner**
- `lib/stats.ts`, `lib/plan.ts` with tests (fewer than 10 → not enough data; median ratio; clamping; null estimates; timezone-correct hour bucketing).
- Add a dev-only `@callable seedDemoData()` guarded by `DEV_AUTH_BYPASS === "true"` that inserts ~40 realistic completed tasks over the past 30 days (deep work mostly mornings, admin afternoons, deep tasks underestimated ~1.5×).
- ✅ Accept: "plan my day" with seed data mentions mornings for deep work and warns about deep-work underestimation; without data it says there's not enough history.

**Phase 5 — Brain-dump**
- `addTasksBatch` + prompt flow.
- ✅ Accept: paste a fake meeting transcript → numbered list → one clarifying message → confirm → tasks created with `source='braindump'`, owners set; nothing is created before confirmation.

**Phase 6 — Auth + deploy prep**
- `auth.ts`, server checks, instance-name check, env vars documented in README.
- Write deployment steps for the user in README (create Access app, set vars, `wrangler deploy`). **Do not deploy.**
- ✅ Accept: with bypass off and no JWT locally, agent routes return 403.

**Phase 7 (optional) — AI Gateway**
- Route Workers AI through AI Gateway (gateway id via env var). Document what you see in the gateway logs in FRICTION_LOG.md.

---

## 12. FRICTION_LOG.md (keep updated throughout)

This is a first-class deliverable. Every time docs, types, error messages or tooling surprise you, add an entry:

```
## <short title>
- Product: Agents SDK | Workers AI | Durable Objects | Access | Wrangler | AI Gateway | Vite plugin
- Expected:
- Actual:
- Time lost: ~N min
- Workaround:
- Suggested fix (docs / API / error message):
```

Also log every case where the model called the wrong tool or produced a bad date, with the user message that caused it.

---

## 13. README.md (final phase)

Sections: what it does (3 sentences), demo GIF placeholder, architecture diagram (Mermaid), product decisions and why (no delete tool, SQL does maths not the model, cold-start threshold, notifications persisted), what I'd build next, how to run locally, how to deploy.
