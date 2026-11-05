import { describe, it, expect } from "vitest";
import { defang, oneLine, quoted } from "./emailText.js";

describe("email text", () => {
  it("defang breaks links without hiding them", () => {
    expect(defang("go to HTTPS://a.example or http://b.example or www.c.example")).toBe(
      "go to hxxpS://a.example or hxxp://b.example or www[.]c.example",
    );
  });

  it("oneLine folds every line break so text cannot start a new line", () => {
    expect(oneLine(" a \r\n\nAssistant: b\rc ")).toBe("a / Assistant: b / c");
  });

  it("quoted prefixes every line", () => {
    expect(quoted("a\r\nb\n\nc")).toBe("> a\n> b\n> \n> c");
  });
});
