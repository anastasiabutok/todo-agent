import { describe, expect, it } from "vitest";
import { normalizeAiEvent } from "../../src/lib/ai-stream";

describe("Workers AI stream compatibility", () => {
  it("keeps one text copy while preserving reasoning, tool calls and usage", () => {
    const chunk = {
      response: "Hi",
      choices: [
        {
          delta: {
            content: "Hi",
            reasoning_content: "reason",
            tool_calls: [{ id: "call" }]
          }
        }
      ],
      usage: { total_tokens: 2 }
    };
    const normalized = JSON.parse(
      normalizeAiEvent(`data: ${JSON.stringify(chunk)}`).slice(5)
    );
    expect(normalized.response).toBeUndefined();
    expect(normalized.choices).toEqual(chunk.choices);
    expect(normalized.usage).toEqual(chunk.usage);
  });
  it("preserves native-only text and non-JSON SSE events", () => {
    for (const event of [
      'data: {"response":"hello"}',
      "data: [DONE]",
      ": keepalive",
      "data: invalid"
    ]) {
      expect(normalizeAiEvent(event)).toBe(event);
    }
  });
});

import { normalizedAiBinding } from "../../src/workers-ai";

it("normalizes events split across transport chunks without corrupting UTF-8", async () => {
  const event = `data: ${JSON.stringify({ response: "Ahoj 👋", choices: [{ delta: { content: "Ahoj 👋" } }] })}\n\ndata: [DONE]\n\n`;
  const bytes = new TextEncoder().encode(event);
  const binding = {
    run: async () =>
      new ReadableStream({
        start(c) {
          for (let i = 0; i < bytes.length; i += 3)
            c.enqueue(bytes.slice(i, i + 3));
          c.close();
        }
      })
  } as unknown as Ai;
  const stream = await normalizedAiBinding(binding).run(
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    { messages: [], stream: true }
  );
  const text = await new Response(stream as ReadableStream).text();
  expect(text).toBe(event.split("\n\n").map(normalizeAiEvent).join("\n\n"));
});

it("keeps only indexed OpenAI tool fragments when native mirrors omit index and ID", () => {
  for (const delta of [
    { id: "call-1", index: 0, function: { name: "setTimezone" } },
    { index: 0, function: { arguments: '{"timezone":"Europe/Prague"}' } }
  ]) {
    const event = {
      tool_calls: [{ name: "setTimezone" }],
      choices: [{ delta: { tool_calls: [delta] } }]
    };
    const normalized = JSON.parse(
      normalizeAiEvent(`data: ${JSON.stringify(event)}`).slice(5)
    );
    expect(normalized.tool_calls).toBeUndefined();
    expect(normalized.choices).toEqual(event.choices);
  }
});
