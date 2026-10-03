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
