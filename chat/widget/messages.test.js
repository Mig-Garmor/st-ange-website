import { describe, expect, it } from "vitest";
import { SENT_FOLLOW_UP, displayParts, hasUnsentFirstMessage, nextBurst, isLocal, isVerified, lastReplyMissing, localExchange, sentNote, textOf } from "./messages.js";

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

  it("nextBurst sends quick messages together up to the turn limit and keeps the rest queued", () => {
    expect(nextBurst(["hi", "my brakes squeal", "2018 Camry"])).toEqual({ burst: ["hi", "my brakes squeal", "2018 Camry"], rest: [] });
    const long = ["a".repeat(500), "b".repeat(499), "c"];
    expect(nextBurst(long)).toEqual({ burst: [long[0], long[1]], rest: ["c"] });
    expect(nextBurst(["x".repeat(1200)]).burst).toHaveLength(1);
    expect(nextBurst([])).toEqual({ burst: [], rest: [] });
  });

  it("displayParts puts the bot's line above its form, and leaves other messages alone", () => {
    const card = { type: "tool-proposeRequest", toolCallId: "t1", state: "output-available", output: { ok: true, card: {} } };
    const step = { type: "step-start" };
    const text = { type: "text", text: "You can finish the request in the form." };
    expect(displayParts({ parts: [step, card, step, text] })).toEqual([text, step, card, step]);
    const plain = { parts: [text, step] };
    expect(displayParts(plain)).toBe(plain.parts);
  });

  it("a reply pointing at a form that never opened counts as missing", () => {
    expect(lastReplyMissing([user("hi"), reply("Hello."), user("quote"), reply("Fill in the form below, it takes three quick steps.")])).toBe(true);
  });

  it("sentNote adds one local follow-up per card and keeps the chat open", () => {
    const list = [user("brakes"), reply("Check the card.")];
    const once = sentNote("call-1", list);
    expect(once).toHaveLength(3);
    expect(once.at(-1)).toMatchObject({ role: "assistant", metadata: { local: true } });
    expect(textOf(once.at(-1))).toBe(SENT_FOLLOW_UP);
    expect(sentNote("call-1", once)).toBe(once);
    expect(lastReplyMissing(once)).toBe(false);
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
    const plain = { type: "text", text: "Once that's fixed you can send requests any time." };
    expect(lastReplyMissing([...verified, user("ok"), { role: "assistant", parts: [plain] }])).toBe(false);
    const below = { type: "text", text: "Check the details and use the Send request button." };
    expect(lastReplyMissing([...verified, user("ok"), { role: "assistant", parts: [below] }])).toBe(true);
    const earlier = { role: "assistant", parts: [cardPart({ ok: true, card })] };
    expect(lastReplyMissing([...verified, user("book"), earlier, user("ok?"), { role: "assistant", parts: [claim] }])).toBe(false);
    expect(lastReplyMissing([user("hi")])).toBe(false);
    expect(lastReplyMissing([])).toBe(false);
  });
});
