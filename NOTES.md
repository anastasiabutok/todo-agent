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
