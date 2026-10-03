import { expect, it, vi } from "vitest";
import { createTools } from "../../src/tools";
import type { ChatAgent } from "../../src/agent";

it("requires a lookup in each turn and never writes an unlisted ID", async () => {
  const complete = vi.fn(async () => ({ ok: true }));
  const agent = {
    findTasks: () => ({ tasks: [{ id: "known" }] }),
    completeTask: complete
  } as unknown as ChatAgent;
  const tools = createTools(agent);
  const options = { toolCallId: "test", messages: [] };
  expect(
    await tools.completeTask.execute!(
      { id: "known", actual_minutes: 180 },
      options
    )
  ).toMatchObject({ ok: false });
  expect(complete).not.toHaveBeenCalled();
  await tools.listTasks.execute!({ status: "open", limit: 20 }, options);
  expect(
    await tools.completeTask.execute!({ id: "other" }, options)
  ).toMatchObject({ ok: false });
  expect(
    await tools.completeTask.execute!(
      { id: "known", actual_minutes: 180 },
      options
    )
  ).toMatchObject({ ok: true });
  expect(complete).toHaveBeenCalledExactlyOnceWith("known", 180);
  const nextTurn = createTools(agent);
  expect(
    await nextTurn.completeTask.execute!({ id: "known" }, options)
  ).toMatchObject({ ok: false });
  expect(complete).toHaveBeenCalledTimes(1);
});

it("requires completion statistics before planning in every turn", async () => {
  const stats = {
    enough_data: false as const,
    completed_count: 0,
    message: "Not enough"
  };
  const propose = vi.fn(() => ({ tasks: [] }));
  const agent = {
    getCompletionStats: () => stats,
    proposeDayPlan: propose
  } as unknown as ChatAgent;
  const tools = createTools(agent);
  const options = { toolCallId: "plan", messages: [] };
  expect(
    await tools.proposeDayPlan.execute!({ date: "2026-11-03" }, options)
  ).toMatchObject({ ok: false });
  expect(propose).not.toHaveBeenCalled();
  await tools.getCompletionStats.execute!({ days: 30 }, options);
  await tools.proposeDayPlan.execute!({ date: "2026-11-03" }, options);
  expect(propose).toHaveBeenCalledExactlyOnceWith("2026-11-03", stats);
});
