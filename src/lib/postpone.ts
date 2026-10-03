export function computePostpone(
  oldDue: number | null,
  newDue: number | null,
  count: number
): number {
  return oldDue !== null && newDue !== null && newDue > oldDue
    ? count + 1
    : count;
}
