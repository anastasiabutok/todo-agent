# Friction log

Consolidated observations from Phases 0–6-lite. Related incidents are merged below; original request examples, approximate time estimates and unresolved issues are retained. Times are rough estimates, not measurements; slash-separated times refer to separate incidents.

## Current status

- Addressed in code: dual-format stream duplication, unknown-ID mutations, scheduler millisecond truncation, planner estimate transforms and available-window context.
- Mitigated, not guaranteed: model schema retries and planner narration. The Phase 5 statistics-only restriction passed compile/tests but has not been live-rechecked; brain-dump confirmation remains prompt-enforced.
- Open: original 24 dependency audit findings, opaque local internal errors, browser reload stalls, and generic tool error messages. Native OS notifications and production Access remain unverified.
- Delivery: no deployment, dashboard edits, JWT middleware or AI Gateway implementation. Phase 6 is documentation and log cleanup only.

## GitHub CLI unavailable

- Product: Tooling (GitHub CLI)
- Expected: `gh` is available to authenticate and create the required private repository.
- Actual: `command -v gh` found no executable; `gh auth status` returned `command not found`.
- Time lost: ~1 min
- Workaround: Stop Phase 0 as required by SPEC.md; ask the user to install and authenticate GitHub CLI.
- Suggested fix (docs / API / error message): Document GitHub CLI installation and authentication as prerequisites before scaffolding.

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
- Workaround: Preserved template config; subsequent TypeScript checks passed.
- Suggested fix (docs / API / error message): Include the precise config update failure and whether manual changes are needed.

## Scheduling APIs are asynchronous

- Product: Agents SDK
- Expected: Starter examples safely await scheduling operations.
- Actual: Starter calls schedule/cancelSchedule without await; installed types return Promises. getSchedules is deprecated in favor of listSchedules.
- Time lost: ~1 min
- Workaround: Implemented awaited scheduling and cancellation using the installed signatures.
- Suggested fix (docs / API / error message): Update starter scheduling tools to await operations and use listSchedules.

## Starter model unavailable on Workers Free

- Product: Workers AI
- Expected: Authenticated starter chat answers a basic greeting.
- Actual: UI connects, but inference returns 5035: @cf/moonshotai/kimi-k2.7-code is not available on Workers Free plan. No assistant reply appears in chat.
- Time lost: ~3 min
- Workaround: User authorized the Free-plan exception; switched to Llama 3.3. No plan upgrade was performed.
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

## Minute-only tools versus hour-based acceptance prompts

- Product: Tooling (application specification)
- Expected: Model must never do arithmetic while requests like “2 hours” populate minute-only tool inputs.
- Actual: Tool schemas accept minutes, while acceptance prompts supply hours; leaving conversion to the model would violate the arithmetic rule.
- Time lost: ~1 min
- Workaround: A tested pure helper extracts numeric duration expressions and provides code-computed conversions in each system prompt.
- Suggested fix (docs / API / error message): Specify a code-owned duration conversion path alongside minute-only tool inputs.

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

## Cloudflare local authentication and preview startup

- Product: Workers AI | Wrangler | Vite plugin
- Expected: Local dev starts with a usable Cloudflare login.
- Actual: Separate incidents involved sandbox port 9229 denial, missing credentials, expired OAuth that could not refresh, and a transient “Could not create remote preview session on your account.” error despite valid authentication. Startup sometimes replaced the useful OAuth error with generic API-token guidance.
- Time lost: ~4 min total across three incidents (~2 + ~1 + ~1).
- Workaround: Authenticate interactively with wrangler login and verify whoami outside the sandbox. One retry resolved the preview failure without configuration changes. No resources or dashboard settings were changed.
- Suggested fix (docs / API / error message): Document login prerequisites, preserve the underlying OAuth/preview error, and distinguish sandbox restrictions from account failures.

## Dual-format SSE duplicates text, numbers and tool fragments

- Product: Workers AI | Agents SDK
- Expected: Text, numeric tokens and tool arguments appear once.
- Actual: “Say hello in one short sentence.” yielded duplicated words and punctuation; a Qwen Paris trial also duplicated text and fragmented reasoning. “Set my timezone to Europe/Prague.” produced empty-argument calls because native and indexed OpenAI tool fragments were both consumed. Seeded “plan my day” displayed 180180, 3030, 210210 and duplicated date tokens; a probe showed native response fields can be numbers as well as strings.
- Time lost: ~11 min across three incidents (~6 + ~3 + ~2).
- Workaround: Prefer OpenAI text/tool representations when both exist, regardless of the native response type. Preserve metadata and UTF-8, keep regression coverage, cap turns at six steps, and remove diagnostic probes. Timezone and exact-number planner replies subsequently passed. Llama selection was authorized by the user.
- Suggested fix (docs / API / error message): Provider should consume one representation and expose precise tool errors.

## Numeric tool schema retries across task, reminder and planner requests

- Product: Workers AI
- Expected: Minute counts, list limits and days are JSON numbers.
- Actual: “add write report due Friday 5pm, deep work, 2 hours” first sent est_minutes:"120"; after correction, exactly one task had the correct date, offset and kind. “Remind me about. reminderdelivery check in 2 minutes and about cancellation check in 2 minutes.” first sent limit:"1", then scheduled both at the code-computed datetime. Seeded “plan my day” sometimes sent days:"30" before correcting to 30; the low-history request passed immediately. No invalid writes occurred.
- Time lost: ~3 min across these incidents (~1 each).
- Workaround: Retain strict validation, explicit numeric instructions and six-step limit. Verified successful tool results and final data; record recovered retries honestly.
- Suggested fix (docs / API / error message): Improve numeric schema adherence and show actionable validation errors instead of generic tool errors.

## Planner narration needs exact numbers and available windows

- Product: Workers AI
- Expected: “plan my day” preserves corrected minutes and distinguishes historical preferences from today's remaining windows.
- Actual: An evening seeded reply recommended morning deep work and afternoon admin despite the current clock. After stream normalization was fixed, another reply converted 180 minutes to 3 hours and 210 to 3.5 hours, violating the no-arithmetic rule.
- Time lost: ~3 min across two incidents (~1 + ~2).
- Workaround: Code supplies available buckets. A focused prepareStep system override after proposeDayPlan disables tools and requests exact minute labels, with passed windows described as future-day preferences. A subsequent live reply preserved 180/30/210 minutes and current evening availability.
- Suggested fix (docs / API / error message): Improve fidelity to numeric tool outputs and provide constrained summaries with explicit time-window availability.

## Worker-level Access does not support this app's WebSockets

- Product: Access
- Expected: Protecting the Worker directly in the dashboard can secure the app without changing chat transport.
- Actual: Current official Workers Access documentation says Worker-level policies reject WebSocket upgrades with 403 and recommends hostname-based Access for real-time apps. This was found during documentation review, not a deployed failure.
- Time lost: ~1 min
- Workaround: README specifies a hostname-based self-hosted application and covering or disabling every alternate hostname. No dashboard settings were changed.
- Suggested fix (docs / API / error message): Keep the WebSocket limitation prominent in dashboard setup and link directly to hostname-based setup.
- Source: [Workers Access documentation](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).

## CI rejected the replacement spec's formatting

- Product: Tooling (GitHub Actions / oxfmt)
- Expected: The completed reduced-spec phases also pass the starter's Sanity Check workflow.
- Actual: Run 41728959701 failed at oxfmt --check because the replacement SPEC.md had unformatted Markdown. The required reduced-phase typecheck and tests had passed, but those omit the formatting gate.
- Time lost: ~2 min
- Workaround: Format SPEC.md; keep its scope unchanged. Pin CI to Node 24, use npm ci and run npm test alongside npm run check. Local formatting, lint, typecheck and all 62 tests pass. The first clean CI install then exposed a missing @emnapi/runtime@1.11.3 transitive lock entry; added its exact registry version, integrity and tslib dependency without changing direct dependencies.
- Suggested fix (docs / API / error message): Align phase completion checks with all repository CI gates.
