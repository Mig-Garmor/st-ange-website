import { describe, expect, it } from "vitest";
import { hasUnsentFirstMessage, isLocal, isVerified, lastReplyMissing, localExchange, textOf } from "./messages.js";

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

  it("localExchange builds a local question and answer pair", () => {
    let n = 0;
    const pair = localExchange("Hours & location", "Open 8 to 6.", () => `id-${++n}`);
    expect(pair).toEqual([
      { id: "id-1", role: "user", metadata: { local: true }, parts: [{ type: "text", text: "Hours & location" }] },
      { id: "id-2", role: "assistant", metadata: { local: true }, parts: [{ type: "text", text: "Open 8 to 6." }] },
    ]);
    expect(pair.every(isLocal)).toBe(true);
    expect(isLocal(user("hi"))).toBe(false);
    expect(localExchange("a", "b").map((m) => m.id)).toHaveLength(2);
  });

  it("a local answer does not verify the chat, so the next real message is still the first", () => {
    const local = localExchange("Hours & location", "Open 8 to 6.");
    expect(isVerified(local)).toBe(false);
    expect(hasUnsentFirstMessage(local)).toBe(false);
    expect(hasUnsentFirstMessage([...local, user("my brakes squeal")])).toBe(true);
    expect(isVerified([...local, user("my brakes squeal"), reply("Sorry to hear")])).toBe(true);
  });

  it("lastReplyMissing when a verified chat ends without anything the visitor can see", () => {
    const cardPart = (output) => ({ type: "tool-proposeRequest", toolCallId: "t1", state: "output-available", input: {}, output });
    const card = { service: null, name: "Ann", phone: "832-555-0100", email: "a@b.co", vehicle: "Civic", notes: "" };
    const verified = [user("hi"), reply("Hello")];
    expect(lastReplyMissing([...verified, user("brakes")])).toBe(true);
    expect(lastReplyMissing([...verified, user("brakes"), { role: "assistant", parts: [] }])).toBe(true);
    expect(lastReplyMissing([...verified, user("brakes"), reply("  ")])).toBe(true);
    expect(lastReplyMissing([...verified, user("book"), { role: "assistant", parts: [cardPart({ ok: false, errors: { phone: "x" } })] }])).toBe(true);
    expect(lastReplyMissing([...verified, user("book"), { role: "assistant", parts: [cardPart({ ok: true, card })] }])).toBe(false);
    expect(lastReplyMissing([...verified, user("book"), { role: "assistant", parts: [cardPart({ ok: false, errors: {} }), { type: "text", text: "Your US number?" }] }])).toBe(false);
    expect(lastReplyMissing(verified)).toBe(false);
    const claim = { type: "text", text: "Here are your details, tap Send request to confirm." };
    expect(lastReplyMissing([...verified, user("832-572-7121"), { role: "assistant", parts: [claim] }])).toBe(true);
    expect(lastReplyMissing([...verified, user("832-572-7121"), { role: "assistant", parts: [cardPart({ ok: false, errors: {} }), claim] }])).toBe(true);
    expect(lastReplyMissing([...verified, user("832-572-7121"), { role: "assistant", parts: [cardPart({ ok: true, card }), claim] }])).toBe(false);
    const earlier = { role: "assistant", parts: [cardPart({ ok: true, card })] };
    expect(lastReplyMissing([...verified, user("book"), earlier, user("ok?"), { role: "assistant", parts: [claim] }])).toBe(false);
    expect(lastReplyMissing([user("hi")])).toBe(false);
    expect(lastReplyMissing([])).toBe(false);
  });
});
