# Friction log

## GitHub CLI unavailable

- Product: Tooling (GitHub CLI)
- Expected: `gh` is available to authenticate and create the required private repository.
- Actual: `command -v gh` found no executable; `gh auth status` returned `command not found`.
- Time lost: ~1 min
- Workaround: Stop Phase 0 as required by SPEC.md; ask the user to install and authenticate GitHub CLI.
- Suggested fix (docs / API / error message): Document GitHub CLI installation and authentication as prerequisites before scaffolding.

## Entry template

- Product: Agents SDK | Workers AI | Durable Objects | Access | Wrangler | AI Gateway | Vite plugin
- Expected:
- Actual:
- Time lost: ~N min
- Workaround:
- Suggested fix (docs / API / error message):

## Sandbox hides valid GitHub authentication

- Product: Tooling
- Expected: gh auth status reflects the completed login.
- Actual: Sandbox reports invalid token; outside sandbox macOS keychain authentication succeeds.
- Time lost: ~1 min
- Workaround: Verified outside sandbox; do not request another login.
- Suggested fix (docs / API / error message): Distinguish keychain access failure from an invalid credential.

## Scaffold configuration warning

- Product: Wrangler
- Expected: create-cloudflare configures TypeScript cleanly.
- Actual: Reports failed to update tsconfig.json; template extends agents/tsconfig.
- Time lost: ~1 min
- Workaround: Preserve template config; TypeScript verification still pending.
- Suggested fix (docs / API / error message): Include the precise config update failure and whether manual changes are needed.

## Scheduling APIs are asynchronous

- Product: Agents SDK
- Expected: Starter examples safely await scheduling operations.
- Actual: Starter calls schedule/cancelSchedule without await; installed types return Promises. getSchedules is deprecated in favor of listSchedules.
- Time lost: ~1 min
- Workaround: Use installed signatures and await operations in future implementation.
- Suggested fix (docs / API / error message): Update starter scheduling tools to await operations and use listSchedules.

## Local development needs Cloudflare login

- Product: Workers AI | Vite plugin
- Expected: Starter local server starts after dependency installation.
- Actual: Sandbox first denies port 9229; outside sandbox remote AI binding fails because Cloudflare credentials are missing.
- Time lost: ~2 min
- Workaround: Ask user to run npx wrangler login; preserve remote model binding.
- Suggested fix (docs / API / error message): State remote binding authentication prerequisite before scaffold completion and offer interactive login guidance.

## Wrangler reports expired login after continuation

- Product: Wrangler
- Expected: Cloudflare login is usable after the user requests continuation.
- Actual: `wrangler whoami` outside sandbox says the auth token expired and could not be refreshed. Dev server still reports generic missing API token guidance.
- Time lost: ~1 min
- Workaround: Ask user to repeat interactive login and verify with whoami before resuming.
- Suggested fix (docs / API / error message): Remote binding startup should preserve the expired OAuth credential error instead of replacing it with API token guidance.

## Starter model unavailable on Workers Free

- Product: Workers AI
- Expected: Authenticated starter chat answers a basic greeting.
- Actual: UI connects, but inference returns 5035: @cf/moonshotai/kimi-k2.7-code is not available on Workers Free plan. No assistant reply appears in chat.
- Time lost: ~3 min
- Workaround: Stop for user decision on plan upgrade or explicit model exception; preserve starter model.
- Suggested fix (docs / API / error message): Document paid-plan prerequisite in starter and display inference errors in chat.

## Starter has no test runner

- Product: Tooling
- Expected: Phase completion can run npm test.
- Actual: Generated starter has no test script or Vitest dependency.
- Time lost: ~1 min
- Workaround: Added plain Vitest with isolated config; allow no test files during scaffold phase.
- Suggested fix (docs / API / error message): Include a test script or document testing setup in starter.

## Dependency audit findings in fresh starter

- Product: Tooling
- Expected: Fresh dependency installation has no reported audit findings.
- Actual: npm reports 24 vulnerabilities (1 low, 5 moderate, 14 high, 4 critical); dependency paths not yet investigated.
- Time lost: ~0 min
- Workaround: Recorded findings; no automatic breaking dependency upgrades.
- Suggested fix (docs / API / error message): Keep template dependencies updated and publish audit guidance.

## Duplicate stream text with Free-plan models

- Product: Workers AI | Agents SDK
- Expected: Llama 3.3 greeting appears once.
- Actual: “Say hello in one short sentence.” produced “HelloHello,, how can I how can I help help you? you?” Qwen trial duplicated “The capital of France is Paris.” and fragmented reasoning. Installed provider emits native response and OpenAI delta content independently.
- Time lost: ~6 min
- Workaround: Normalize dual-format SSE text before provider parsing; preserve metadata and UTF-8. Added three regression tests. Selected Llama 3.3 with user-authorized model exception.
- Suggested fix (docs / API / error message): Provider should prefer one text representation when both appear in a stream event.

## Generated files fail starter formatting check

- Product: Tooling
- Expected: npm run check passes on untouched scaffold configuration.
- Actual: semgrep workflow, VS Code settings and Wrangler config fail oxfmt check.
- Time lost: ~1 min
- Workaround: Apply starter formatter.
- Suggested fix (docs / API / error message): Format generated output consistently with starter configuration.

## Verification browser stalls after dev restart

- Product: Vite plugin | Tooling
- Expected: Chat reload recovers after config formatting restarts Vite.
- Actual: Initial message fetch briefly returned 500, followed by blank pages and browser navigation timeouts, while local HTTP and module requests returned 200.
- Time lost: ~4 min
- Workaround: Restart dev server on a fresh port and retry verification.
- Suggested fix (docs / API / error message): Improve HMR recovery and surface initial message loading failures in the chat UI.

## Multi-statement migration support confirmed

- Product: Agents SDK | Durable Objects
- Expected: Verify whether this.sql accepts a multi-statement migration before splitting statements.
- Actual: Installed this.sql delegates to storage.sql.exec; live local migration creates all three tables and index in one call and stores schema_version=1.
- Time lost: ~1 min
- Workaround: No split needed; wrap migration and version update in storage.transactionSync.
- Suggested fix (docs / API / error message): Document multiple-statement behavior and atomic migration examples next to the tagged SQL API.

## Backslash escaping in tagged SQL

- Product: Tooling (SQLite / JavaScript)
- Expected: LIKE ESCAPE backslash is a single SQL escape character.
- Actual: JavaScript template literal escaping removed the intended character; real SQLite tests failed with “ESCAPE expression must be a single character”.
- Time lost: ~1 min
- Workaround: Use ! as the explicit escape character; escape !, % and \_ in a tested pure helper, while binding the search pattern.
- Suggested fix (docs / API / error message): Include a safe literal LIKE search example in SDK docs.

## Builtin SQLite test runner warning

- Product: Tooling (Node.js)
- Expected: Run real SQLite integration tests using the installed Node runtime.
- Actual: node:sqlite works on Node v24.13.0 but emits an ExperimentalWarning.
- Time lost: ~0 min
- Workaround: Keep the warning visible; verify actual Workers behavior separately with the temporary callable.
- Suggested fix (docs / API / error message): Document Node runtime requirements and stability status for local SQLite tests.

## Mirrored tool fragments lose arguments

- Product: Workers AI | Agents SDK
- Expected: “Set my timezone to Europe/Prague.” executes setTimezone once with the supplied timezone.
- Actual: Provider consumed native and OpenAI tool fragments together, creating calls with empty arguments and repeating errors. Raw stream showed correct indexed OpenAI fragments and unindexed native mirrors. Stopped the initial retries; no task mutation occurred.
- Time lost: ~3 min
- Workaround: Keep indexed OpenAI tool fragments when both formats appear, add regression coverage, remove temporary stream probe, and cap chat turns at six steps. Timezone tool then succeeded.
- Suggested fix (docs / API / error message): Provider should prefer one tool representation; UI should expose schema validation error details instead of “An error occurred.”

## Minute-only tools versus hour-based acceptance prompts

- Product: Tooling (application specification)
- Expected: Model must never do arithmetic while requests like “2 hours” populate minute-only tool inputs.
- Actual: Tool schemas accept minutes, while acceptance prompts supply hours; leaving conversion to the model would violate the arithmetic rule.
- Time lost: ~1 min
- Workaround: A tested pure helper extracts numeric duration expressions and provides code-computed conversions in each system prompt.
- Suggested fix (docs / API / error message): Specify a code-owned duration conversion path alongside minute-only tool inputs.

## Model sends string estimate before correcting it

- Product: Workers AI
- Expected: “add write report due Friday 5pm, deep work, 2 hours” supplies est_minutes as numeric 120 from the code-provided conversion.
- Actual: First addTask input used string "120" and failed validation; the model retried with numeric 120 and created exactly one task. Date, offset and kind were correct.
- Time lost: ~1 min
- Workaround: Preserve strict numeric validation; strengthen prompt to require JSON numbers. Record the recovered retry instead of reporting a clean first-attempt run.
- Suggested fix (docs / API / error message): Improve numeric schema adherence and expose useful validation details to the user/model.

## Model invents ID and string actual time before recovery

- Product: Workers AI
- Expected: “done with the report, took 3 hours” calls listTasks first, then completeTask with the returned ID and numeric 180.
- Actual: First attempted completeTask with invented id "report_id" and string "180"; schema rejected it. Then listTasks returned the real ID; another string-valued attempt failed before a numeric 180 call succeeded. Final stored status/time were correct.
- Time lost: ~1 min
- Workaround: Add a per-turn lookup guard that blocks mutation for any ID not returned by listTasks; test that the guard resets each turn. Strengthen numeric prompt and retain strict validation.
- Suggested fix (docs / API / error message): Improve tool sequencing and schema adherence; show actual schema errors rather than generic errors.

## Opaque internal errors in local dev logs

- Product: Vite plugin | Durable Objects
- Expected: Failed local requests include actionable errors and stack traces.
- Actual: Final server log inspection showed three “Error: internal error; reference = …” lines without stack traces, alongside successful chat results and HMR updates. Root cause not established; browser automation had also stalled during this run.
- Time lost: ~0 min
- Workaround: Verified acceptance through visible tool outputs, read-only SQLite and synced WebSocket state. Recorded as an open issue rather than guessing the cause. Phase 3 also logged six opaque internal errors during the closed-tab test; delivery, cancellation and dismissal still passed. Similar opaque errors recurred in Phase 4 during browser/dev testing; final planner data and reply checks passed.
- Suggested fix (docs / API / error message): Include request path and an actionable local stack trace for internal failures.

## Typed useAgent overload needs both generics

- Product: Agents SDK
- Expected: useAgent<ChatAgent> exposes typed agent state and callable stubs.
- Actual: Installed overloads also accept a single state generic; useAgent<ChatAgent, AgentState> is needed to keep this app's state and methods typed together.
- Time lost: ~1 min
- Workaround: Read installed react.d.ts and supply both generics; render agent.state directly.
- Suggested fix (docs / API / error message): Include a typed agent-and-state example and make overload selection easier to identify.

## Callable union exposes a nested promise type

- Product: Agents SDK
- Expected: completeTaskFromUi returns the resolved result of completeTask through the typed stub.
- Actual: A non-async wrapper returning either an immediate validation error or a Promise produces a stub type with a nested Promise union; TypeScript rejected the TaskPanel handler.
- Time lost: ~1 min
- Workaround: Make completeTaskFromUi async so every return path resolves to one flattened result type.
- Suggested fix (docs / API / error message): Use Awaited in stub result mapping or document that callable wrappers should be async.

## Reminder request needs one numeric-schema retry

- Product: Workers AI
- Expected: “Remind me about. reminderdelivery check in 2 minutes and about cancellation check in 2 minutes.” performs lookups and schedules both using code-computed ISO datetimes.
- Actual: Initial listTasks input used limit:"1" and failed numeric schema validation; model corrected it and then looked up both tasks and scheduled both for the same exact code-computed datetime. No incorrect reminder was created.
- Time lost: ~1 min
- Workaround: Retain strict schemas and the six-step limit; record the recovered retry. Both schedule results were verified before closing the browser.
- Suggested fix (docs / API / error message): Improve numeric schema adherence and expose precise validation errors instead of generic UI errors.

## Native typing changes the reminder test phrase

- Product: Tooling (browser automation)
- Expected: Native typing enters “Remind me about reminder delivery check in 2 minutes and about cancellation check in 2 minutes.” verbatim.
- Actual: Persisted user message was “Remind me about. reminderdelivery check in 2 minutes and about cancellation check in 2 minutes.” The model still matched the intended tasks and used the exact code-computed datetime.
- Time lost: ~0 min
- Workaround: Use paste for subsequent multiword native test input; verify persisted text when recording model behavior.
- Suggested fix (docs / API / error message): Make typeText deterministic with OS text replacement, or recommend paste for exact test phrases.

## Date schedules truncate milliseconds

- Product: Agents SDK
- Expected: schedule(new Date(ms)) preserves the millisecond timestamp stored in reminders.
- Actual: Installed scheduler uses Math.floor(when.getTime()/1000). First live reminder fired about 265 ms before its stored millisecond deadline.
- Time lost: ~1 min
- Workaround: A tested pure helper rounds scheduled instants up to the next second while retaining the original requested remind_at in SQLite. Delivery is at most one second later and never early due to truncation.
- Suggested fix (docs / API / error message): Document second-level schedule resolution or round future deadlines up instead of down.

## Transient remote preview session failure

- Product: Vite plugin | Wrangler
- Expected: Local dev starts with the authenticated remote Workers AI binding.
- Actual: First Phase 4 startup failed with “Could not create remote preview session on your account.” Authentication was still valid; a single retry started successfully without configuration changes.
- Time lost: ~1 min
- Workaround: Retry once and verify the existing login; no dashboard or resource changes.
- Suggested fix (docs / API / error message): Include the underlying account/subdomain parse error and indicate whether a retry is appropriate.

## Planner requests use string-valued days

- Product: Workers AI
- Expected: “plan my day” calls getCompletionStats with numeric days:30.
- Actual: The low-history request passed immediately, but seeded requests initially used days:"30", failed strict validation, then corrected to numeric 30. Read-only calls made no data changes.
- Time lost: ~1 min
- Workaround: Keep strict validation and explicitly name all numeric tool fields in the system prompt. Record recovered schema retries rather than reporting a clean first attempt.
- Suggested fix (docs / API / error message): Improve JSON numeric schema adherence and show precise tool validation errors.

## Numeric tokens appear in two stream formats

- Product: Workers AI | Agents SDK
- Expected: Planner reply preserves corrected estimates 180 and 30 and total 210 exactly.
- Actual: Seeded “plan my day” reply displayed 180180, 3030 and 210210 and a duplicated date. A temporary diagnostic confirmed native response fields can be numbers while the same token also appears as OpenAI text; prior normalization only removed string mirrors.
- Time lost: ~2 min
- Workaround: Prefer OpenAI text whenever a native response field is present, regardless of its type. Added regression coverage; rerun reply preserved all numbers and the date. Temporary diagnostic removed.
- Suggested fix (docs / API / error message): Emit a single stream representation and keep response field types consistent; provider should avoid consuming both mirrors.

## Preferred time windows already passed

- Product: Workers AI
- Expected: Evening “plan my day” uses observed morning/afternoon patterns as future-day preferences and proposes remaining work for today.
- Actual: Initial seeded reply recommended deep work in the morning and admin in the afternoon despite the supplied current evening clock.
- Time lost: ~1 min
- Workaround: Add code-computed available buckets to planner output and a focused final-response system step after the plan tool. Past preferred windows are future-day preferences, not available slots today.
- Suggested fix (docs / API / error message): Supply and enforce time-window availability alongside completion-pattern guidance.

## Planner converts minutes to hours despite instructions

- Product: Workers AI
- Expected: “plan my day” copies corrected_est_minutes 180 and 30 and total_corrected_minutes 210 exactly as minutes.
- Actual: After the numeric stream fix, another reply still rewrote durations as 3 hours and a 3.5-hour total, violating the no-arithmetic/no-conversion instruction.
- Time lost: ~2 min
- Workaround: A focused prepareStep override after proposeDayPlan limits the final response to verified plan data and exact minute labels; tools are disabled for that final summarization step.
- Suggested fix (docs / API / error message): Improve numeric fidelity to tool outputs and support constrained final summaries without moving calculations to the model.

## Mixed static/dynamic tool results hide output types

- Product: AI SDK
- Expected: Matching proposeDayPlan by toolName narrows a prepareStep tool result to its known output type.
- Actual: toolResults also includes dynamic results with output:unknown, so matching the name alone still fails TypeScript narrowing.
- Time lost: ~1 min
- Workaround: Confirmed prepareStep, system/toolChoice overrides, and staticToolResults in installed ai/dist/index.d.ts. Use staticToolResults for the application's known tools.
- Suggested fix (docs / API / error message): Show typed prepareStep examples using staticToolResults when dynamic tool output is not relevant.

## Statistics-only request also produced a day plan
- Product: Workers AI
- Expected: “show completion stats for the last 30 days” returns a statistics summary only.
- Actual: After one failed getCompletionStats attempt, the model recovered with numeric days=30, returned valid statistics, then unnecessarily called proposeDayPlan and narrated a plan. Explicit “plan my day” also recovered after one failed stats attempt and preserved the returned 30-minute task and total, morning preference and underestimation warning.
- Time lost: ~2 min
- Workaround: Phase 5-lite restricts recognized statistics-only turns to getCompletionStats, then disables tools for the final summary. This prevents the extra planner call for those requests; compile/tests pass, live model behavior not rechecked.
- Suggested fix (docs / API / error message): Restrict planner availability for statistics-only requests and expose validation errors clearly.
