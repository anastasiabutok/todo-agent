# SDK notes

Verified against generated source and installed type definitions during Phase 0.

- Agent: `AIChatAgent` from `@cloudflare/ai-chat`; generated `ChatAgent extends AIChatAgent<Env>`.
- `onChatMessage(_onFinish: StreamTextOnFinishCallback<ToolSet>, _options?: OnChatMessageOptions): Promise<Response | undefined>`; starter uses `_onFinish: unknown`.
- `streamText({ model, system, messages, tools: { ... }, stopWhen: stepCountIs(20), abortSignal: options?.abortSignal })`; return `result.toUIMessageStreamResponse()`.
- `tool` from `ai`, schema field `inputSchema`, schema library Zod ^4.4.3; use v4 date/datetime APIs when implementing.
- `schedule<T = string>(when: Date | string | number, callback: keyof this, payload?: T, options?: { retry?: RetryOptions; idempotent?: boolean }): Promise<Schedule<T>>`.
- `cancelSchedule(id: string): Promise<boolean>`.
- `getSchedules<T = string>(criteria?: ScheduleCriteria): Schedule<T>[]` is deprecated; use `listSchedules(criteria?: ScheduleCriteria): Promise<Schedule<unknown>[]>`.
- `setState(state: State): void`.
- `callable` from `agents`, used as `@callable()` on public class methods; modern ClassMethodDecoratorContext signature. Starter tsconfig extends `agents/tsconfig`; Vite Babel decorator configuration comes from starter.
- `useAgent` from `agents/react`; starter `useAgent<ChatAgent>({ agent: "ChatAgent", ... })`.
- `useAgentChat` from `@cloudflare/ai-chat/react`; starter passes agent, experimental_throttle, onToolCall.
- `createWorkersAI` from `workers-ai-provider`; starter model `@cf/moonshotai/kimi-k2.7-code`, sessionAffinity from agent. User approved Free plan exception; selected `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
- Starter dependencies: agents ^0.17.4; @cloudflare/ai-chat ^0.9.3; ai ^6.0.197; workers-ai-provider ^3.2.1.
- Starter uses Kumo and Tailwind; preserve these.
- `wrangler.jsonc`: AI binding `remote: true`, requires Cloudflare login even for local dev. No deployment performed.
- Starter had no test script. Installed plain Vitest; test script uses vitest run with three compatibility regression tests, include `test/**/*.test.ts`.
- Authenticated Workers AI inference returns error 5035: starter Kimi model requires paid Workers plan; user subsequently authorized switching to a Free-plan model.

Environment: Node v24.13.0; npm 11.6.2.

## Free-plan model and stream compatibility

- User explicitly selected Free plan after being asked to authorize a model exception.
- Cloudflare model docs: https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/ (function calling supported).
- Cloudflare pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/ (10,000 neurons/day on Free; Kimi requires paid billing).
- Installed workers-ai-provider is 3.3.1 (starter ^3.2.1 range). Its getMappedStream emits both `response` and `choices[0].delta.content` when both are present, duplicating text. App adapter drops native text only when OpenAI text is present; keeps other metadata, passes nonstreaming results through. Tested with split transport chunks and UTF-8.
- Qwen3 trial also duplicated text and fragmented reasoning; selected nonreasoning Llama model with compatibility adapter.
- Project/repository root is todo-agent/. Tracking documents are also mirrored in the parent workspace for discovery.

## Phase 1 — database and time APIs

- `Agent.sql<T>(strings: TemplateStringsArray, ...values: (string | number | boolean | null)[]): T[]` is a tagged template. Installed implementation reduces interpolations to `?` placeholders and delegates to `this.ctx.storage.sql.exec(query, ...values)`.
- Live local Durable Object verification: one migration string containing CREATE TABLE tasks, CREATE INDEX, CREATE TABLE reminders and CREATE TABLE notifications succeeds in a single this.sql call. No semicolon splitting needed. Dynamic DDL is application-owned; query values remain bound through tagged templates.
- `this.ctx.storage.transactionSync<T>(closure: () => T): T` is available in generated Workers runtime types. Agent wraps `runMigrations(this.sql.bind(this))` in transactionSync during onStart, so DDL and schema version commit together.
- Extracted ChatAgent to src/agent.ts; server.ts re-exports it, preserving Wrangler binding and client import. Existing MCP setup and chat kept.
- Zod v4 `z.iso.datetime({ offset: true })` rejects missing offsets and invalid calendar dates; `z.iso.date()` validates local dates.
- Time helpers accept explicit IANA timezone; day boundary search uses Intl calendar dates instead of assuming 24 hours. Tested Europe/Prague DST changes, skipped midnight, skipped date, offsets and millisecond roundtrips.
- Node 24 builtin `node:sqlite` DatabaseSync provides real SQLite integration tests without another runtime dependency; Node emits an experimental warning. These complement the live Workers schema check.
- Temporary @callable debugSchema returned schema_version “1” plus tasks/reminders/notifications. Removed afterward; live RPC now returns “Method debugSchema does not exist”.

## Phase 2 — tools and state

- Confirmed installed AIChatAgent signature is `AIChatAgent<Env, State, Props>`; state snapshot uses `AIChatAgent<Env, AgentState>` with typed initialState.
- `this.setState(state: State): void` persists and broadcasts snapshots; `refreshState` queries SQLite and derives views through pure helpers after mutations and at startup.
- Confirmed AI SDK `tool({ inputSchema, execute })` against installed definitions. Each execute closes over the current agent through createTools(this) inside onChatMessage. No approval-only tools are used.
- Scheduler cancellation is `cancelSchedule(id): Promise<boolean>`; completion/drop first persist cancelled=1 guards before awaiting cancellation. Tool rejects invalid transitions with ok:false; no hard deletion.
- Pure helpers handle task creation/patches/status transitions/views, timezone validation, and hour-to-minute conversions supplied in the system prompt. IDs come from crypto.randomUUID in code, times from Date.now/parseIsoToMs.
- Multi-step system prompt includes fresh local ISO, weekday, IANA timezone, identity lookup, ambiguous matching, reminder warning, actual-time follow-up, postponement attention, and future planner/brain-dump constraints. Phase 2 exposes eight core tools only.
- Streaming compatibility additionally removes top-level tool_calls when indexed choices[0].delta.tool_calls exists. Raw local test stream contained mirrored native tool fragments without IDs/indexes; consuming both caused empty-argument calls. Preserved OpenAI fragments keep valid arguments. Temporary raw-stream logging removed.
- Chat steps limited to six per turn to bound retry loops; normal lookup plus mutation requires two tool steps.

- A per-turn lookup guard in createTools prevents update/complete/log/drop/reopen from writing IDs not returned by listTasks in that turn. This protects against model-invented IDs even when history contains old IDs. Regression test verifies both unknown-ID rejection and reset across turns.
- refreshState is private; mutation service methods call it after writes. Tool closures call those methods, preserving the spec's single refresh path without exposing it as a remote callable.
- Required acceptance conversation used Europe/Prague on Tuesday 2026-11-03: Friday resolved to 2026-11-06T17:00:00+01:00; Monday to 2026-11-09T17:00:00+01:00. Stored estimate=120, actual=180, postponed_count=1, status=done; WebSocket snapshot has timezone Europe/Prague and openTasks=[]. No debug callable added for this phase; SQLite inspected read-only.

## Phase 3 — scheduling and client state

- Rechecked `schedule<T>(when: Date | string | number, callback: keyof this, payload?: T, options?): Promise<Schedule<T>>` and `cancelSchedule(id): Promise<boolean>` in installed Agents types. Scheduled callbacks use a public method name and the supplied payload; fireReminder is public but not a client callable.
- `useAgent<ChatAgent, AgentState>` returns `state: AgentState | undefined` directly. The one-generic form can select the state-only overload; two generics keep state and stub methods typed. TaskPanel reads that state; no separate task array is stored in React.
- UI callables use existing `@callable()` decorator. completeTaskFromUi is async so the typed SDK stub returns a flattened Promise instead of a union containing a nested Promise.
- Reminder rows are inserted before awaiting schedule, so a near alarm cannot miss its row. schedule_id is merged into the latest row to preserve concurrent fired/cancelled flags. Schedule errors persist cancelled guards and return a small error result.
- fireReminder checks persisted guards and task status, writes notification plus fired flag inside transactionSync, then refreshes state. No notification depends on broadcast-only delivery.
- Browser notifications require an explicit button click to request permission; if permission was already granted, unread notifications create native notifications with stable tags. Persisted in-app banners remain available even if browser notifications are unsupported or denied.
- Relative reminder datetime facts are computed in code from the latest user message and current clock, including DST transitions. The model uses these values rather than adding minutes.

- Observed scheduler Date resolution: installed implementation floors Date milliseconds to Unix seconds. setReminder now schedules a code-rounded-up second while retaining exact requested remind_at in SQLite. Tested scheduleAtMs prevents delivery before the intended millisecond instant.

- Live acceptance: two reminders at the same target; task checkbox cancelled one before delivery. Browser closed for more than three minutes; reopen showed exactly one banner. Read-only SQLite confirmed cancelled reminder never fired, delivery fired once, and banner dismissal persisted read_at. Mobile 390x844 task/chat tabs both had no document horizontal overflow. Browser permission was left at default; native OS notification delivery not manually tested.

## Phase 4 — planner and demo data

- Existing tool/inputSchema, @callable and transactionSync signatures rechecked from installed starter/types; no new SDK API assumptions needed.
- Completion statistics use a bounded completed_at window (including now, excluding future completions). Ten completed tasks unlock patterns; five valid estimate/actual pairs per kind unlock a median ratio rounded to two decimals. Hour bucketing uses Intl in the persisted IANA timezone.
- Planner selection stays in typed SQL: open tasks owned by me, due through the end of the requested local date, plus undated priority-one tasks. Date end is DST-aware. Pure functions correct estimates with [0.5,3] clamping, preserve nulls, sort overdue/priority/due, and compute totals. Unknown estimates are counted separately and not invented.
- Best bucket ties use stable order morning, afternoon, evening, night. Per-turn tools require getCompletionStats before proposeDayPlan and reuse that exact result, so history thresholds and ratios cannot silently differ between the two tool outputs.
- seedDemoData checks DEV_AUTH_BYPASS exactly equals "true", runs in a transaction, and writes a \_meta demo_seeded marker for idempotence. It adds 40 completed demo tasks over the previous 28 days, plus two explicitly labeled open demo tasks to make the plan visible. Deep work has 1.5x estimates and morning completions; admin is afternoons. All IDs are generated in code, and fixture transforms are pure.
- Optional Env flag is declared in src/env.d.ts; it is never added to wrangler.jsonc. Local .dev.vars is ignored and used only temporarily for seed verification.

- Native SSE response mirrors may be JSON numbers, not only strings. Stream normalization now drops any native response mirror when OpenAI delta content is present; live probe confirmed values 202, 6, 11, 180, 30 and 210. Probe removed after regression and live verification.
- Seed guard was verified with the flag absent, then local .dev.vars enabled it for a 40-completed/2-open seed; a repeated call returned already_seeded:true. Before seed, chat reported 2/10 history; after seed, tools reported 42 completed tasks, deep ratio 1.5 with 16 samples, morning deep work, afternoon admin, corrected estimates 180/30 and total 210.

- AI SDK installed `PrepareStepFunction` receives steps including staticToolResults; it may return per-step system and toolChoice overrides. toolResults additionally contains dynamic results with unknown output, so use staticToolResults to narrow known application tool outputs.
- After a successful proposeDayPlan, prepareStep supplies a focused plan-only system prompt and toolChoice:"none". Planner output includes code-computed remaining local buckets; final narration must keep exact minute counts and distinguish passed preferred buckets from availability today.

- Final live planner response was verified against persisted chat JSON: morning deep-work preference, current evening availability, explicit underestimation warning, task durations 180/30 minutes and total 210 minutes, with no conversion to hours. Temporary numeric stream diagnostic removed. Temporary .dev.vars file removed after verification; seed fixture rows and idempotence marker remain local.
