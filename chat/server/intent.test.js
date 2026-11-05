import { describe, expect, it } from "vitest";
import { wantsForm } from "./intent.js";

const offer = "We can check that. Would you like to send a request so we can call you back?";

describe("wantsForm", () => {
  it("is true for a yes to our offer", () => {
    for (const text of ["yes", "Yes please", "sure", "ok let's do it", "go ahead"]) expect(wantsForm(text, offer)).toBe(true);
  });

  it("is true when the visitor asks outright, whatever came before", () => {
    for (const text of ["yes please send a request for that", "can I request a quote?", "I'd like to submit a request"]) expect(wantsForm(text, "")).toBe(true);
  });

  it("is false when yes starts a new topic, or the message is about someone else", () => {
    expect(wantsForm("yes my friend asked about an alignment", offer)).toBe(false);
    expect(wantsForm("yes, how much is it?", offer)).toBe(false);
    expect(wantsForm("send a request for my friend", "")).toBe(false);
    expect(wantsForm("can my neighbour request a quote?", "")).toBe(false);
    expect(wantsForm("yes thanks!", offer)).toBe(true);
    expect(wantsForm("thanks", offer)).toBe(false);
    expect(wantsForm("Yes, please.", offer)).toBe(true);
  });

  it("is false for a yes to something else, a no, or a question", () => {
    expect(wantsForm("yes", "Does it pull to the left?")).toBe(false);
    expect(wantsForm("no thanks", offer)).toBe(false);
    expect(wantsForm("how long does it take?", offer)).toBe(false);
  });
});
