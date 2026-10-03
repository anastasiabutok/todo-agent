// Repair representation errors only. The original Zod schema still validates
// ranges, required fields, enums and dates before a repaired call can execute.
const numericFields = new Set([
  "days",
  "limit",
  "priority",
  "est_minutes",
  "actual_minutes"
]);
const optionalAddFields = new Set([
  "notes",
  "due_at",
  "priority",
  "kind",
  "est_minutes",
  "parent_id",
  "owner"
]);
export function repairToolInput(
  toolName: string,
  input: string
): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }
  const normalize = (value: unknown, isAdd: boolean): unknown => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return value;
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        if (isAdd && optionalAddFields.has(key) && item === null) return [];
        if (
          numericFields.has(key) &&
          typeof item === "string" &&
          /^\d+$/.test(item)
        )
          return [[key, Number(item)]];
        if (
          toolName === "addTasksBatch" &&
          key === "tasks" &&
          Array.isArray(item)
        )
          return [[key, item.map((task) => normalize(task, true))]];
        return [[key, item]];
      })
    );
  };
  const repaired = JSON.stringify(normalize(parsed, toolName === "addTask"));
  return repaired === JSON.stringify(parsed) ? null : repaired;
}

export function turnPolicy(text: string, previousAssistant: string) {
  const candidatesOffered =
    /\b(candidate|tasks?|brain dump)\b/i.test(previousAssistant) &&
    /\?|\b(confirm|add them|add both|add all)\b/i.test(previousAssistant);
  const batchConfirmed =
    candidatesOffered &&
    /^\s*(yes\b|confirm\b|add\s+(both|them|all|\d)|create\s+(both|them|all|\d))/i.test(
      text
    );
  return {
    batchConfirmed,
    previewOnly:
      !batchConfirmed &&
      (/\bbrain[ -]?dump\b|\bfrom these notes\b/i.test(text) ||
        text.length > 300),
    reminderOnly: /\bremind me\b/i.test(text)
  };
}
