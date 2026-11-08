import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, suggestEmail } from "./lead.js";

describe("normalizePhone", () => {
  it.each(["+1 (832) 572-7121", "832.572.7121", "8325727121", "1-832-572-7121"])("normalises %s", (input) => {
    expect(normalizePhone(input)).toBe("8325727121");
  });

  it.each(["572-7121", "+44 20 7946 0958", ""])("rejects %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("uses the shop's display style", () => {
    expect(formatPhone("8325727121")).toBe("832-572-7121");
  });
});

describe("suggestEmail", () => {
  it.each([
    ["ann@gmial.com", "ann@gmail.com"],
    ["ann@gmail.con", "ann@gmail.com"],
    ["ann@yaho.com", "ann@yahoo.com"],
    ["ann@hotmal.com", "ann@hotmail.com"],
    ["ann@outlok.com", "ann@outlook.com"],
    ["ann@icloud.co", "ann@icloud.com"],
    ["Ann.Lee@GMIAL.COM", "Ann.Lee@gmail.com"],
    ["ann@baytownauto.con", "ann@baytownauto.com"],
    ["ann@example.nett", "ann@example.net"],
    ["ann@gmial.con", "ann@gmail.com"],
    ["ann@yahooo.cmo", "ann@yahoo.com"],
  ])("suggests a fix for %s", (typed, fixed) => {
    expect(suggestEmail(typed)).toBe(fixed);
  });

  it.each(["ann@gmail.com", "ANN@YAHOO.COM", "ann@baytownauto.com", "ann@sbcglobal.net", "ann@", "ann", "", "ann@gmail"])(
    "leaves %s alone",
    (typed) => {
      expect(suggestEmail(typed)).toBeNull();
    },
  );
});
