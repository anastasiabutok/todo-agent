import { expect, it } from "vitest";
import { repairToolInput, turnPolicy } from "../../src/lib/tool-repair";
import { addInput, statsInput, updateInput } from "../../src/lib/inputs";

it("repairs observed numeric strings without weakening range validation", () => {
  const repaired = JSON.parse(
    repairToolInput(
      "addTask",
      '{"title":"test report","priority":"1","est_minutes":"30"}'
    )!
  );
  expect(addInput.parse(repaired)).toMatchObject({
    priority: 1,
    est_minutes: 30
  });
  expect(
    statsInput.safeParse(
      JSON.parse(repairToolInput("getCompletionStats", '{"days":"366"}')!)
    ).success
  ).toBe(false);
  expect(repairToolInput("getCompletionStats", '{"days":"thirty"}')).toBeNull();
  expect(repairToolInput("getCompletionStats", '{"days":true}')).toBeNull();
});
it("omits optional null add fields but preserves explicit update clears", () => {
  expect(
    JSON.parse(
      repairToolInput(
        "addTasksBatch",
        '{"tasks":[{"title":"proposal","owner":null},{"title":"invoice","owner":"Alex","priority":"2"}]}'
      )!
    )
  ).toEqual({
    tasks: [
      { title: "proposal" },
      { title: "invoice", owner: "Alex", priority: 2 }
    ]
  });
  const update = JSON.parse(
    repairToolInput(
      "updateTask",
      '{"id":"known","owner":null,"due_at":null,"priority":"1"}'
    )!
  );
  expect(updateInput.parse(update)).toMatchObject({
    owner: null,
    due_at: null,
    priority: 1
  });
  expect(repairToolInput("addTask", "broken")).toBeNull();
});
it("previews brain dumps and requires a candidate offer plus explicit confirmation", () => {
  expect(
    turnPolicy("Brain dump: review proposal. Show candidates first.", "")
  ).toMatchObject({ previewOnly: true, batchConfirmed: false });
  expect(
    turnPolicy(
      "Add both",
      "Here are the candidate tasks. Do you want to add them?"
    )
  ).toMatchObject({ previewOnly: false, batchConfirmed: true });
  expect(turnPolicy("Add both", "Hello").batchConfirmed).toBe(false);
  expect(
    turnPolicy("No, don't add them", "Candidate tasks. Add them?")
      .batchConfirmed
  ).toBe(false);
  expect(
    turnPolicy("Remind me about review the proposal in 2 minutes", "")
      .reminderOnly
  ).toBe(true);
});

it("repairs a real SDK tool call before validation and execution", async () => {
  const { generateText, tool } = await import("ai");
  const { MockLanguageModelV3 } = await import("ai/test");
  const calls: unknown[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: {
      content: [
        {
          type: "tool-call",
          toolCallId: "numeric-repair",
          toolName: "addTask",
          input: '{"title":"test report","priority":"1","est_minutes":"30"}'
        }
      ],
      finishReason: { unified: "tool-calls", raw: undefined },
      usage: {
        inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 1, text: 1, reasoning: 0 }
      },
      warnings: []
    }
  });
  const result = await generateText({
    model,
    prompt: "Add test report",
    tools: {
      addTask: tool({
        inputSchema: addInput,
        execute: async (input) => {
          calls.push(input);
          return { ok: true };
        }
      })
    },
    experimental_repairToolCall: async ({ toolCall }) => {
      const input = repairToolInput(toolCall.toolName, toolCall.input);
      return input === null ? null : { ...toolCall, input };
    }
  });
  expect(calls).toEqual([
    { title: "test report", priority: 1, est_minutes: 30 }
  ]);
  expect(result.toolResults).toHaveLength(1);
});
