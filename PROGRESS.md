# Progress

## Phase 0 — Scaffold & verify assumptions

- Status: done
- Built: Generated todo-agent/ with Cloudflare Agents starter and installed dependencies. Removed demo tools and handlers, kept React/Kumo/Tailwind chat. Added Vitest and three stream compatibility tests. Recorded actual APIs in NOTES.md. User approved switching from paid-only Kimi to Free-plan Llama 3.3. Added a narrow SSE compatibility adapter to prevent duplicated text. Git repository root is todo-agent/; documents mirrored in parent for discovery.
- Verification: Cloudflare authentication succeeds; local Vite server starts without errors (fresh-port restart at http://localhost:5174/). Browser shows Connected and persisted clean reply “Hello, how can I assist you today?” to “Say hello in one short sentence.” with tools empty. TypeScript, formatting and lint checks pass. npm test passes three tests, including UTF-8 and transport chunk boundary coverage. .dev.vars, .wrangler/, node_modules/, dist/ ignore behavior checked. Reviewed staged diff and scanned for credentials, emails and account ID settings: no matches. Commit a2d15eb pushed to private repository https://github.com/anastasiabutok/todo-agent; visibility verified PRIVATE. Local history endpoint also confirms clean persisted Paris reply.
- Open issues: Browser automation sometimes stalls after streaming; fresh-port load displayed clean greeting, and HTTP history confirms clean subsequent reply. Fresh starter npm audit reports 24 findings, not yet triaged. Compatibility adapter should be removed when upstream provider handles dual-format stream events. Cloudflare Free has daily inference limits. No deployment performed.
- Next: Phase 1 — Data layer + pure functions (wait for user continuation).

## Phase 1 — Data layer + pure functions

- Status: done
- Built: Task, Reminder, Notification, TaskView and AgentState types; versioned migration runner; typed task/reminder/notification SQL helpers. Agent extracted to src/agent.ts, migrations run atomically from onStart. Pure offset/timezone/day-boundary, postponement and literal search helpers with tests. No Phase 2 tools added.
- Verification: npx tsc --noEmit passes. npm test passes 29 tests: DST parsing/formatting, Prague 23/25-hour days (including 2026-10-25), invalid dates/offsets, postpone later/earlier/equal/null transitions, SQL constraints, parameter binding, literal LIKE matching, repeated migration, future version rejection, transaction rollback and persisted notification state. npm run check verifies formatting, lint and types. Local npm run dev starts without errors at port 5175. Temporary @callable debugSchema over WebSocket returned schema_version=1 and all three tables; confirms multi-statement SQL. Removed method and verified live RPC rejects it afterward. Staged review, commit and push finalize this phase.
- Open issues: Inherited Phase 0 audit findings and browser automation stalls remain. node:sqlite integration tests emit an experimental warning; live Workers verification passed. No deployment performed.
- Next: Phase 2 — Core tools + system prompt (wait for user continuation).

## Phase 2 — Core tools + system prompt

- Status: done
- Built: Eight Zod-validated tools (list/add/update/complete/log actual/drop/reopen/timezone), per-turn task lookup guard, private refreshState, typed initial state, shared mutation paths and cancellation guards. Pure task transforms and duration conversions with tests. Fresh local clock, weekday and timezone in system prompt, plus identity/ambiguity/attention/actual-time/brain-dump/planner rules. Extended provider stream compatibility to mirrored tool fragments.
- Verification: npx tsc --noEmit, npm test (36 tests), formatting and lint pass. Local dev starts without errors. Manually in browser chat: set Europe/Prague; “add write report due Friday 5pm, deep work, 2 hours” creates due 2026-11-06 17:00 +01:00, deep, estimate 120. “move the report to Monday” calls listTasks then updateTask, preserves 17:00, moves to 2026-11-09 and sets postponed_count=1. “done with the report, took 3 hours” eventually calls completeTask with numeric 180 after rejected model attempts (logged); read-only SQLite confirms done/actual 180/estimate 120/postponed_count 1. WebSocket synced state confirms timezone Europe/Prague and no open report. Added tested lookup guard and stronger numeric prompt after observing failures. Acceptance screenshot saved in parent outputs/phase-2-chat.png. No temporary debug method or stream probe remains.
- Friction: Five new entries covering mirrored tool fragments, code-owned duration conversion, string estimate, invented completion ID/string actual, and opaque local internal errors. Inherited audit findings and browser automation stalls remain. Successful writes and final data verified; model may still need retries after schema errors. Local dev logged three opaque internal errors without stack traces; root cause unestablished.
- Git: Staged diff reviewed for secrets; phase implementation committed and pushed as 57bc963. Final log observations recorded in a follow-up phase commit.
- Next: Phase 3 — Reminders + notifications + UI panel (wait for user continuation).

## Phase 3 — Reminders + notifications + UI panel

- Status: done
- Built: setReminder/cancelReminder tools and public fireReminder callback with persisted guards and atomic notification/fired updates. UI callables for completion, browser timezone initialization and notification dismissal. TaskPanel reads useAgent state directly; NotificationBanner shows persisted unread reminders and offers opt-in browser notifications. Desktop side panel and mobile tabs preserve Kumo/Tailwind. Relative reminder instants and second-resolution scheduling are computed in tested pure functions.
- Verification: TypeScript, lint and formatting pass; npm test passes 40 tests. Local dev starts without errors. Chat created two test tasks; panel updated live. Chat scheduled both in two minutes for 2026-11-03T19:07:23.282+01:00. Completed cancellation check via checkbox before due time; it disappeared immediately, and SQLite confirmed status done, cancelled=1. Closed browser tab before due time, reopened after more than three minutes, and saw exactly one persisted banner for reminder delivery check. SQLite confirms delivery fired=1 and one notification; cancellation fired=0 and no notification. Dismiss removed banner and persisted read_at. At 390x844, Chat and Tasks tabs both have document scrollWidth=clientWidth=390. Saved desktop/mobile screenshots in parent outputs. Browser notification permission was left unchanged; native OS notification delivery was not manually exercised.
- Friction: Five entries: useAgent overload, callable Promise union, recovered model string-limit retry, native typing alteration, and SDK second-resolution scheduling. Known model schema retries, audit findings and background browser automation stalls remain documented. Six opaque local internal errors also appeared in dev logs during the closed-tab test; no stack traces, root cause unestablished; acceptance checks passed.
- Git: Staged diff reviewed with no credentials, emails or account ID settings found. Implementation committed and pushed as 87309c7; final runtime log observations recorded in a follow-up phase commit. No deployment or dashboard changes.
- Next: Phase 4 — Planner (wait for user continuation).

## Phase 4 — Planner

- Status: done
- Built: Pure completion statistics and planning functions with ten-task cold threshold, five-pair per-kind medians, local-hour buckets, 1.3 underestimation warning, clamped estimate corrections, unknown-estimate handling and code-computed available windows. Typed SQL history/date/owner selection; getCompletionStats/proposeDayPlan tools with per-turn ordering guard. Focused final-response step preserves minute counts and distinguishes passed preferred windows from availability. Guarded, idempotent seedDemoData adds 40 completed demo tasks and two labeled open examples. Extended stream adapter for native numeric mirrors.
- Verification: npx tsc --noEmit, npm test (62 tests), lint and formatting pass. Local dev started on retry after a transient preview error. Before seeding, “plan my day” called stats then planner, returned enough_data:false at 2/10 history, and acknowledged insufficient history. seedDemoData was rejected without DEV_AUTH_BYPASS; enabling it only in ignored .dev.vars inserted 40 completed/2 open tasks; repeat call returned already_seeded:true. Seeded “plan my day” reported 42 completed tasks and deep ratio 1.5 with 16 samples; final reply identifies morning deep-work preference, switches to remaining evening today, warns about underestimation, and preserves corrected durations 180/30 and total 210 minutes. Persisted chat JSON verified those exact numbers and windows. Low-history result verified in visible browser tool output; final seeded screenshot saved in parent outputs/phase-4-plan.png. Temporary stream diagnostic and local .dev.vars flag removed; demo rows retained intentionally.
- Friction: Six new entries: transient preview error, string days retry, numeric stream mirrors, past preferred windows, minute-to-hour conversion, mixed tool-result typing. Earlier opaque local dev internal errors recurred without stack traces; final tool data and reply checks passed. Existing dependency audit findings remain untriaged.
- Git: Staged diff review, phase commit and push finalize the phase. No deployment or Cloudflare dashboard/resource changes.
- Next: Phase 5 — Brain-dump (wait for user continuation).

## Phase 5 — Brain-dump

- Status: not started

## Phase 6 — Auth + deploy prep

- Status: not started

## Phase 7 — AI Gateway (optional)

- Status: not started
