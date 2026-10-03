// Some Workers AI models emit both native and OpenAI-compatible text in one
// event. workers-ai-provider consumes both; retain only the OpenAI text copy.
export function normalizeAiEvent(event: string): string {
  return event
    .split("\n")
    .map((line) => {
      if (!line.startsWith("data:")) return line;
      try {
        const chunk = JSON.parse(line.slice(5));
        if (
          typeof chunk?.choices?.[0]?.delta?.content === "string" &&
          typeof chunk.response === "string"
        ) {
          delete chunk.response;
          return `data: ${JSON.stringify(chunk)}`;
        }
      } catch {
        // Preserve [DONE] and unrecognized events for the provider to handle.
      }
      return line;
    })
    .join("\n");
}
