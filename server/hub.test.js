import { describe, expect, it, vi } from "vitest";
import { chatForwarder, createHub, hubConversation, hubRequest } from "./hub.js";

describe("hubRequest", () => {
  it("maps a form request, leaving out empty contact fields", () => {
    const now = new Date("2026-11-07T10:00:00Z");
    expect(
      hubRequest(
        {
          source: "quote_form", service: "car-alignment", idempotencyKey: "k1",
          lead: { name: "Ann", phone: "8325727121", email: "", vehicle: "2015 Civic" },
          message: "Pulls left", vehicle: "2015 Civic", pageUrl: "/contact-us", consentText: "You may call me",
        },
        now,
      ),
    ).toEqual({
      idempotencyKey: "k1", source: "quote_form", service: "car-alignment",
      contact: { name: "Ann", phone: "8325727121" },
      message: "Pulls left", details: { vehicle: "2015 Civic" }, pagePath: "/contact-us",
      consentText: "You may call me", consentAt: "2026-11-07T10:00:00.000Z",
    });
  });

  it("sends no contact, details or consent when there are none", () => {
    expect(hubRequest({ source: "contact_form", idempotencyKey: "k2", lead: { email: "" }, message: "" })).toEqual({
      idempotencyKey: "k2", source: "contact_form",
    });
  });
});

describe("hubConversation", () => {
  const at = new Date("2026-11-07T09:00:00Z");
  const chat = {
    id: "8c1f9a4e-2b3d-4c5e-8f6a-7b8c9d0e1f2a", startedAt: at, pagePath: "/services/brake-repair",
    lead: { name: "Ann", phone: null, email: "owner@example.com" },
    insights: { summary: "Asked about brakes.", services: ["brake-repair"], intent: "quote", unanswered: [], outcome: "request_sent" },
    messages: [
      { role: "user", content: "How much are brakes?", at },
      { role: "assistant", content: "[Request card shown: brake-repair]", at },
      { role: "assistant", content: "x".repeat(5000), at },
    ],
  };

  it("maps the chat, drops transcript notes and keeps messages within the hub's limit", () => {
    const out = hubConversation(chat);
    expect(out).toMatchObject({
      id: chat.id, startedAt: "2026-11-07T09:00:00.000Z", pagePath: "/services/brake-repair",
      contact: { name: "Ann", email: "owner@example.com" }, insights: chat.insights,
    });
    expect(out.messages).toHaveLength(2);
    expect(out.messages[0]).toEqual({ role: "user", content: "How much are brakes?", at: "2026-11-07T09:00:00.000Z" });
    expect(out.messages[1].content).toHaveLength(4000);
  });

  it("leaves out empty insight fields, and returns null for a missing chat or one with only notes", () => {
    const bare = hubConversation({ ...chat, pagePath: null, lead: {}, insights: { summary: null, services: null, intent: null, unanswered: null, outcome: "abandoned" } });
    expect(bare.insights).toEqual({ outcome: "abandoned" });
    expect(bare).not.toHaveProperty("contact");
    expect(bare).not.toHaveProperty("pagePath");
    expect(hubConversation(null)).toBeNull();
    expect(hubConversation({ ...chat, messages: [chat.messages[1]] })).toBeNull();
  });
});

describe("createHub", () => {
  it("posts with the secret and never throws when the hub is down", async () => {
    const fetch = vi.fn(async () => Response.json({ id: "r1" }));
    const hub = createHub({ secret: "hub_sk_test", endpoint: "https://hub.example.com/", fetch });
    expect(await hub.requests.submit({ idempotencyKey: "k", source: "chat" })).toEqual({ ok: true, data: { id: "r1" } });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://hub.example.com/api/v1/requests");
    expect(init.headers.authorization).toBe("Bearer hub_sk_test");

    const down = createHub({ secret: "s", endpoint: "https://hub.example.com", fetch: async () => { throw new Error("ECONNREFUSED"); } });
    expect(await down.conversations.push({})).toEqual({ ok: false, error: "ECONNREFUSED" });
  });
});

describe("chatForwarder", () => {
  const at = new Date("2026-11-04T09:00:00Z");
  const chat = { id: "c1", startedAt: at, lead: {}, insights: { outcome: "info_only" }, messages: [{ role: "user", content: "hi", at }] };

  it("pushes the chat, and logs instead of throwing when the database or the hub fails", async () => {
    const logger = { error: vi.fn() };
    const push = vi.fn(async () => ({ ok: true, data: {} }));
    await chatForwarder({ db: { conversationForHub: async () => chat }, hub: { conversations: { push } }, logger })("c1");
    expect(push.mock.calls[0][0]).toMatchObject({ id: "c1", startedAt: "2026-11-04T09:00:00.000Z" });

    const down = { conversations: { push: async () => ({ ok: false, error: "timeout" }) } };
    await chatForwarder({ db: { conversationForHub: async () => chat }, hub: down, logger })("c1");
    await chatForwarder({ db: { conversationForHub: async () => { throw new Error("db"); } }, hub: down, logger })("c2");
    expect(logger.error.mock.calls.map((c) => c.slice(0, 2))).toEqual([["Hub chat not forwarded", "c1"], ["Hub chat not forwarded", "c2"]]);
  });
});
