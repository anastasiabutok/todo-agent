import { normalizeAiEvent } from "./lib/ai-stream";

export function normalizedAiBinding(binding: Ai): Ai {
  return new Proxy(binding, {
    get(target, property) {
      if (property !== "run") return Reflect.get(target, property, target);
      return async (...args: unknown[]) => {
        const result = await Reflect.apply(target.run, target, args);
        if (!(result instanceof ReadableStream)) return result;
        let pending = "";
        return result
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(
            new TransformStream<string, string>({
              transform(chunk, controller) {
                pending += chunk;
                let end: number;
                while ((end = pending.indexOf("\n\n")) !== -1) {
                  controller.enqueue(
                    normalizeAiEvent(pending.slice(0, end)) + "\n\n"
                  );
                  pending = pending.slice(end + 2);
                }
              },
              flush(controller) {
                if (pending) controller.enqueue(normalizeAiEvent(pending));
              }
            })
          )
          .pipeThrough(new TextEncoderStream());
      };
    }
  });
}
