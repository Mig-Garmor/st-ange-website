import { describe, expect, it } from "vitest";
import { FIELDS, STEPS, displayPhone, fieldError, mergeDraft, firstIncompleteStep, initialForm, okCard, latestCardId, stepErrors } from "./card.js";

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

  it("splits the request into three steps of one to three fields, covering every field once", () => {
    expect(STEPS.map((s) => s.fields.length)).toEqual([3, 2, 1]);
    expect(STEPS.flatMap((s) => s.fields).sort()).toEqual([...FIELDS].sort());
  });

  it("stepErrors checks only that step's fields", () => {
    const form = initialForm({ service: "", vehicle: "", name: "", phone: "555-0100", email: "x" });
    expect(stepErrors(form, 0)).toEqual({ vehicle: "Vehicle is required" });
    expect(stepErrors(form, 1, { localAreaCodes: ["281"] })).toEqual({ name: "Name is required", phone: "Add the area code (281)" });
    expect(stepErrors(form, 2)).toEqual({ email: "Invalid email address" });
  });

  it("firstIncompleteStep opens at the first step that needs something, or at the last step when all is filled", () => {
    expect(firstIncompleteStep(initialForm({}))).toBe(0);
    expect(firstIncompleteStep(initialForm({ vehicle: "Civic" }))).toBe(1);
    expect(firstIncompleteStep(initialForm({ vehicle: "Civic", name: "Ann", phone: "8325550100" }))).toBe(2);
    expect(firstIncompleteStep(initialForm({ service: "brakes", vehicle: "Civic", name: "Ann", phone: "832-555-0100", email: "ann@example.com" }))).toBe(2);
  });

  it("mergeDraft keeps what the visitor typed and lets the prefill fill only the gaps", () => {
    const prefill = initialForm({ service: "car-alignment", notes: "pulls right", vehicle: "" });
    const draft = { vehicle: "2018 Camry", name: "Sam", notes: "  ", phone: "" };
    expect(mergeDraft(prefill, draft)).toEqual({ service: "car-alignment", name: "Sam", phone: "", email: "", vehicle: "2018 Camry", notes: "pulls right" });
    expect(mergeDraft(prefill, {})).toEqual(prefill);
    expect(mergeDraft(prefill, null)).toEqual(prefill);
  });

  it("displayPhone shows a US number in the shop's style and leaves anything else as typed", () => {
    expect(displayPhone("8234738223")).toBe("823-473-8223");
    expect(displayPhone("+1 (823) 473 8223")).toBe("823-473-8223");
    expect(displayPhone("555-0142")).toBe("555-0142");
    expect(displayPhone("")).toBe("");
  });
});
