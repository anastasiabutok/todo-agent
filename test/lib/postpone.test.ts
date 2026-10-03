import { expect, it } from "vitest";
import { computePostpone } from "../../src/lib/postpone";

it.each([
  [100, 200, 2, 3],
  [200, 100, 2, 2],
  [100, 100, 2, 2],
  [null, 100, 2, 2],
  [100, null, 2, 2],
  [null, null, 2, 2],
  [0, 1, 0, 1]
])("postpone(%s,%s,%s) => %s", (oldDue, newDue, count, expected) => {
  expect(computePostpone(oldDue, newDue, count!)).toBe(expected);
});
