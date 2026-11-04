import { describe, expect, it } from "vitest";
import { FIELDS, fieldError, initialForm, okCard, latestCardId } from "./card.js";

const card = { service: "brakes", name: "Ann", phone: "832-555-0100", email: "ann@example.com", vehicle: "Civic", notes: "" };
const part = (output, state = "output-available") => ({ type: "tool-proposeRequest", toolCallId: "t1", state, input: {}, output });

describe("request card", () => {
  it("okCard returns the card only for an available ok output", () => {
    expect(okCard(part({ ok: true, card }))).toEqual(card);
    expect(okCard(part({ ok: false, errors: { phone: "x" } }))).toBeNull();
    expect(okCard(part(undefined, "input-available"))).toBeNull();
    expect(okCard({ type: "tool-proposeRequest", state: "input-available", input: card })).toBeNull();
    expect(okCard({ type: "text", text: "hi" })).toBeNull();
  });

  it("a card built from an ok output starts filled in with no errors", () => {
    const form = initialForm(okCard(part({ ok: true, card })));
    expect(form).toEqual(card);
    const errors = Object.fromEntries(FIELDS.map((f) => [f, fieldError(f, form[f])]).filter(([, e]) => e));
    expect(errors).toEqual({});
  });

  it("fieldError flags a field edited into an invalid value", () => {
    expect(fieldError("phone", "555-0100")).toBe("Enter a 10-digit US phone number");
    expect(fieldError("phone", "+1 832 555 0100")).toBe("");
    expect(fieldError("email", "")).toBe("Email is required");
    expect(fieldError("email", "ann@")).toBe("Invalid email address");
    expect(fieldError("name", " ")).toBe("Name is required");
    expect(fieldError("vehicle", "")).toBe("Vehicle is required");
    expect(fieldError("notes", "")).toBe("");
  });
});

describe("latestCardId", () => {
  const card = (toolCallId, ok = true) => ({
    type: "tool-proposeRequest",
    state: "output-available",
    toolCallId,
    output: ok ? { ok: true, card: { name: "Bill" } } : { ok: false, errors: { phone: "x" } },
  });

  it("returns the newest valid card, ignoring invalid ones", () => {
    const messages = [
      { role: "assistant", parts: [card("a")] },
      { role: "user", parts: [{ type: "text", text: "my phone is wrong" }] },
      { role: "assistant", parts: [card("b"), card("c", false)] },
    ];
    expect(latestCardId(messages)).toBe("b");
  });

  it("is null when no valid card was shown", () => {
    expect(latestCardId([{ role: "assistant", parts: [card("a", false)] }])).toBeNull();
  });

  it("a 7-digit phone asks for the area code when the local codes are known", () => {
    expect(fieldError("phone", "572-7121", { localAreaCodes: ["281", "832"] })).toBe("Add the area code (281 or 832)");
    expect(fieldError("phone", "572-7121")).toBe("Enter a 10-digit US phone number");
  });
});
