import { describe, expect, it } from "vitest";
import { hasUnsentFirstMessage, isVerified, textOf } from "./messages.js";

const user = (text) => ({ role: "user", parts: [{ type: "text", text }] });
const reply = (text) => ({ role: "assistant", parts: [{ type: "text", text }] });
const notice = (state) => ({ role: "assistant", parts: [{ type: "data-chat-state", data: { state } }, { type: "text", text: "x" }] });

describe("widget messages", () => {
  it("textOf joins text parts", () => {
    expect(textOf({ parts: [{ type: "text", text: "a" }, { type: "tool-x" }, { type: "text", text: "b" }] })).toBe("ab");
  });

  it("isVerified after an AI reply or a limit notice, not after offline or error", () => {
    expect(isVerified([user("hi"), reply("hello")])).toBe(true);
    expect(isVerified([user("hi"), notice("limit")])).toBe(true);
    expect(isVerified([user("hi"), notice("offline")])).toBe(false);
    expect(isVerified([user("hi"), notice("error")])).toBe(false);
  });

  it("hasUnsentFirstMessage when the only messages are an unverified user turn", () => {
    expect(hasUnsentFirstMessage([user("my brakes squeal")])).toBe(true);
    expect(hasUnsentFirstMessage([])).toBe(false);
    expect(hasUnsentFirstMessage([user("hi"), reply("hello"), user("again")])).toBe(false);
    expect(hasUnsentFirstMessage([user("hi"), notice("offline")])).toBe(false);
  });
});
