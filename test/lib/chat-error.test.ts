import { expect, it } from "vitest";
import { chatErrorMessage } from "../../src/lib/chat-error";
it("explains quota exhaustion without exposing internal request details", () => {
  expect(
    chatErrorMessage(
      new Error(
        "4006: you have used up your daily free allocation of 10,000 neurons"
      )
    )
  ).toContain("daily free AI limit");
  expect(
    chatErrorMessage(new Error("internal secret diagnostic"))
  ).not.toContain("secret diagnostic");
});
