import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it.each(["+1 (832) 572-7121", "832.572.7121", "8325727121", "1-832-572-7121"])("normalises %s", (input) => {
    expect(normalizePhone(input)).toBe("8325727121");
  });

  it.each(["572-7121", "+44 20 7946 0958", ""])("rejects %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
