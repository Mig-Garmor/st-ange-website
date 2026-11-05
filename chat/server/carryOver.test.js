import { describe, expect, it } from "vitest";
import { buildCarryOver, olderInChat } from "./carryOver.js";

describe("carry-over", () => {
  it("prefers the earlier chat's summary", () => {
    expect(buildCarryOver({ summary: " Asked about  brakes on a 2018 Camry. ", userMessages: ["hi"] })).toBe("Asked about brakes on a 2018 Camry.");
  });

  it("otherwise uses the visitor's last six messages, one line each, and never what that chat itself carried", () => {
    expect(buildCarryOver({ carryOver: "Earlier: alignment", userMessages: ["my car\npulls left", "  ", "2018 Camry"] })).toBe(
      "my car pulls left / 2018 Camry",
    );
    const many = Array.from({ length: 9 }, (_, i) => `m${i}`);
    expect(buildCarryOver({ userMessages: many })).toBe("m3 / m4 / m5 / m6 / m7 / m8");
  });

  it("returns null when there is nothing to carry", () => {
    expect(buildCarryOver({ userMessages: [] })).toBeNull();
    expect(buildCarryOver({ summary: "  ", userMessages: [" "] })).toBeNull();
  });

  it("caps the length and keeps the newest words", () => {
    const text = buildCarryOver({ userMessages: ["a".repeat(500), "b".repeat(500)] }, 100);
    expect(text).toHaveLength(100);
    expect(text.startsWith("…")).toBe(true);
    expect(text.endsWith("b")).toBe(true);
  });

  it("olderInChat keeps only the visitor's messages from before the window the model sees", () => {
    const stored = [
      { role: "user", content: "my car pulls left" },
      { role: "assistant", content: "We can check that." },
      { role: "user", content: "2018 Camry" },
      { role: "assistant", content: "Thanks." },
      { role: "user", content: "how long?" },
    ];
    expect(olderInChat(stored, 3)).toBe("my car pulls left");
    expect(olderInChat(stored, 5)).toBeNull();
    expect(olderInChat(stored, 2)).toBe("my car pulls left / 2018 Camry");
  });
});
