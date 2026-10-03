export function chatErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/4006|daily free allocation|10,000 neurons/i.test(message))
    return "The demo has reached Cloudflare's daily free AI limit. Please try again after the allowance resets. Existing tasks are still saved; this message did not finish processing.";
  return "The assistant could not finish this request. Check the task panel before retrying to avoid repeating a change that already succeeded.";
}
