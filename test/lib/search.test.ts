import { expect, it } from "vitest";
import { escapeLike } from "../../src/lib/search";
it("escapes the SQL LIKE metacharacters and escape character", () => {
  expect(escapeLike("100%_done!")).toBe("100!%!_done!!");
  expect(escapeLike("report")).toBe("report");
});
