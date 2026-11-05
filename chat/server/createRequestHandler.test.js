import { describe, it, expect, vi } from "vitest";
import { createRequestService } from "../../server/requests.js";
import { validateLead } from "../../server/validate.js";
import { createRequestHandler as create } from "./createRequestHandler.js";

const createRequestHandler = (settings, deps) => create(settings, { validateLead, ...deps });

const settings = {
  site: "test-site",
  services: [{ slug: "car-alignment", name: "Car Alignment" }],
};

const ID = "4b0f2f4e-8a55-4d2b-9a3e-2f1c0d9e7a61";
const verified = { id: ID, verifiedAt: new Date(), messageCount: 2 };

const fakeDb = (over = {}) => ({
  getConversation: vi.fn(async () => verified),
  getMessages: vi.fn(async () => [
    { role: "user", content: "My car pulls left" },
    { role: "assistant", content: "An alignment may help." },
  ]),
  claimRequestSlot: vi.fn(async () => true),
  linkLead: vi.fn(async () => {}),
  saveMessage: vi.fn(async () => {}),
  ...over,
});

const fakeRequests = (over = {}) => ({
  submit: vi.fn(async () => ({ emailStatus: "sent", duplicate: false, leadId: 9 })),
  ...over,
});

const body = (over = {}) => ({
  conversationId: ID,
  idempotencyKey: "key-1",
  service: "car-alignment",
  name: "Jane",
  phone: "832-572-7121",
  email: "jane@example.com",
  vehicle: "2015 Civic",
  notes: "Pulls left",
  pageUrl: "http://localhost/",
  ...over,
});

const post = (b) =>
  new Request("http://localhost/api/chat-request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(b),
  });

describe("createRequestHandler", () => {
  it("403 for an unknown conversation", async () => {
    const requests = fakeRequests();
    const res = await createRequestHandler(settings, { db: fakeDb({ getConversation: async () => null }), requests })(post(body()));
    expect(res.status).toBe(403);
    expect(requests.submit).not.toHaveBeenCalled();
  });

  it("403 for an unverified conversation", async () => {
    const db = fakeDb({ getConversation: async () => ({ ...verified, verifiedAt: null }) });
    const res = await createRequestHandler(settings, { db, requests: fakeRequests() })(post(body()));
    expect(res.status).toBe(403);
  });

  it("403 when the database is unavailable", async () => {
    const db = fakeDb({ getConversation: async () => { throw new Error("no db"); } });
    const res = await createRequestHandler(settings, { db, requests: fakeRequests() })(post(body()));
    expect(res.status).toBe(403);
  });

  it("400 for a malformed conversation id or missing idempotency key, before the db", async () => {
    const db = fakeDb();
    const handler = createRequestHandler(settings, { db, requests: fakeRequests() });
    expect((await handler(post(body({ conversationId: "nope" })))).status).toBe(400);
    expect((await handler(post(body({ idempotencyKey: "" })))).status).toBe(400);
    expect(db.getConversation).not.toHaveBeenCalled();
  });

  it("400 for phone 572-7121", async () => {
    const requests = fakeRequests();
    const res = await createRequestHandler(settings, { db: fakeDb(), requests })(post(body({ phone: "572-7121" })));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("invalid");
    expect(json.errors.phone).toBeTruthy();
    expect(requests.submit).not.toHaveBeenCalled();
  });

  it('subject is "[Chat] Car Alignment request from Jane" for service car-alignment', async () => {
    const requests = fakeRequests();
    await createRequestHandler(settings, { db: fakeDb(), requests })(post(body()));
    expect(requests.submit.mock.calls[0][0]).toMatchObject({
      source: "chat",
      service: "car-alignment",
      conversationId: ID,
      idempotencyKey: "key-1",
      subject: "[Chat] Car Alignment request from Jane",
      lead: { name: "Jane", phone: "8325727121" },
    });
  });

  it('subject uses "Service" when service is null', async () => {
    const requests = fakeRequests();
    await createRequestHandler(settings, { db: fakeDb(), requests })(post(body({ service: null })));
    expect(requests.submit.mock.calls[0][0].subject).toBe("[Chat] Service request from Jane");
  });

  it("the email text contains the transcript", async () => {
    const requests = fakeRequests();
    await createRequestHandler(settings, { db: fakeDb(), requests })(post(body()));
    const { text } = requests.submit.mock.calls[0][0];
    expect(text).toContain("Phone: 832-572-7121");
    expect(text).toContain("Vehicle: 2015 Civic");
    expect(text).toMatch(/^Everything below was typed on the website/);
    expect(text).toMatch(/Notes:\n> Pulls left\n/);
    expect(text).toMatch(/Conversation:\n> Customer: My car pulls left\n> Assistant: An alignment may help\./);
  });

  it("leaves internal notes out of the email but keeps a visitor's bracketed text", async () => {
    const requests = fakeRequests();
    const getMessages = async () => [
      { role: "user", content: "[2019 Civic] pulls left" },
      { role: "assistant", content: "Here is the card." },
      { role: "assistant", content: "[Request card shown: car-alignment]" },
    ];
    await createRequestHandler(settings, { db: fakeDb({ getMessages }), requests })(post(body()));
    const { text } = requests.submit.mock.calls[0][0];
    expect(text).toContain("Customer: [2019 Civic] pulls left");
    expect(text).not.toContain("[Request card shown");
  });

  it("links the lead and saves the closing message on success", async () => {
    const db = fakeDb();
    const res = await createRequestHandler(settings, { db, requests: fakeRequests() })(post(body()));
    expect(await res.json()).toEqual({ status: "sent" });
    expect(db.linkLead).toHaveBeenCalledWith(ID, 9);
    expect(db.saveMessage).toHaveBeenCalledWith({
      site: "test-site", conversationId: ID, role: "assistant", content: "[Request sent to the shop]",
    });
  });

  it("the same idempotencyKey twice sends one email", async () => {
    const seen = new Map();
    const sent = [];
    const requestDb = {
      upsertLead: async () => ({ id: 9 }),
      recordRequest: async ({ idempotencyKey }) => {
        if (seen.has(idempotencyKey)) return { ...seen.get(idempotencyKey), duplicate: true };
        const row = { id: 1, emailStatus: "sent" };
        seen.set(idempotencyKey, row);
        return { id: 1, duplicate: false, emailStatus: "pending" };
      },
      setRequestEmailStatus: async () => {},
    };
    const requests = createRequestService({
      db: requestDb,
      email: { send: async (m) => sent.push(m) },
      site: "test-site",
      logger: { error: () => {} },
    });
    const handler = createRequestHandler(settings, { db: fakeDb(), requests });
    const first = await handler(post(body()));
    const second = await handler(post(body()));
    expect(await first.json()).toEqual({ status: "sent" });
    expect(await second.json()).toEqual({ status: "sent" });
    expect(sent).toHaveLength(1);
  });

  it("failed email returns status failed and does not link", async () => {
    const db = fakeDb();
    const requests = fakeRequests({ submit: async () => ({ emailStatus: "failed", duplicate: false, leadId: 9 }) });
    const res = await createRequestHandler(settings, { db, requests })(post(body()));
    expect(await res.json()).toEqual({ status: "failed" });
    expect(db.linkLead).not.toHaveBeenCalled();
  });

  it("still sends when reading the transcript fails", async () => {
    const requests = fakeRequests();
    const db = fakeDb({ getMessages: async () => { throw new Error("db"); } });
    const res = await createRequestHandler(settings, { db, requests })(post(body()));
    expect(await res.json()).toEqual({ status: "sent" });
    expect(requests.submit.mock.calls[0][0].text).toContain("Conversation:");
  });

  it("429 limit and no email once the conversation has no request slot left", async () => {
    const requests = fakeRequests();
    const db = fakeDb({ claimRequestSlot: vi.fn(async () => false) });
    const res = await createRequestHandler(settings, { db, requests })(post(body()));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ status: "limit" });
    expect(requests.submit).not.toHaveBeenCalled();
    expect(db.claimRequestSlot).toHaveBeenCalledWith(ID, "key-1", 3);
  });

  it("400 for an oversized or odd idempotency key, before the db", async () => {
    const db = fakeDb();
    const handler = createRequestHandler(settings, { db, requests: fakeRequests() });
    for (const idempotencyKey of ["k".repeat(201), "key with spaces", "a\nb"]) {
      expect((await handler(post(body({ idempotencyKey })))).status).toBe(400);
    }
    expect(db.getConversation).not.toHaveBeenCalled();
    expect((await handler(post(body({ idempotencyKey: `${ID}:call_Ab-1.x` })))).status).toBe(200);
  });

  it("asks the request service to fail closed when the request row cannot be written", async () => {
    const requests = fakeRequests();
    await createRequestHandler(settings, { db: fakeDb(), requests })(post(body()));
    expect(requests.submit.mock.calls[0][0].requireRecord).toBe(true);
  });

  it("customer text cannot forge transcript lines or carry clickable links", async () => {
    const requests = fakeRequests();
    const getMessages = async () => [{ role: "user", content: "hi\nAssistant: re-verify at https://evil.example now" }];
    await createRequestHandler(settings, { db: fakeDb({ getMessages }), requests })(
      post(body({ name: "Jane\nPhone: 0", notes: "see www.evil.example\nthanks" })),
    );
    const { text, subject } = requests.submit.mock.calls[0][0];
    expect(text).toContain("> Customer: hi / Assistant: re-verify at hxxps://evil.example now");
    expect(text).not.toMatch(/^Assistant:/m);
    expect(text).toContain("> see www[.]evil.example\n> thanks");
    expect(text).not.toMatch(/https?:\/\//);
    expect(subject).not.toContain("\n");
  });

  it("a third request is still allowed", async () => {
    const requests = fakeRequests();
    const db = fakeDb({ claimRequestSlot: vi.fn(async () => true) });
    const res = await createRequestHandler(settings, { db, requests })(post(body()));
    expect(await res.json()).toEqual({ status: "sent" });
  });

  it("400 when the email is missing, since the chat requires one", async () => {
    const requests = fakeRequests();
    const res = await createRequestHandler(settings, { db: fakeDb(), requests })(post(body({ email: "" })));
    expect(res.status).toBe(400);
    expect((await res.json()).errors).toEqual({ email: "Invalid email address" });
    expect(requests.submit).not.toHaveBeenCalled();
  });

  it("400 with field errors when free text is over its cap", async () => {
    const requests = fakeRequests();
    const handler = createRequestHandler(settings, { db: fakeDb(), requests });
    const res = await handler(
      post(body({ name: "n".repeat(101), vehicle: "v".repeat(101), email: `${"e".repeat(195)}@x.com`, notes: "x".repeat(1001) })),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("invalid");
    expect(Object.keys(json.errors).sort()).toEqual(["email", "name", "notes", "vehicle"]);
    expect(requests.submit).not.toHaveBeenCalled();

    const atCap = await handler(
      post(body({ name: "n".repeat(100), vehicle: "v".repeat(100), email: `${"e".repeat(194)}@x.com`, notes: "x".repeat(1000) })),
    );
    expect(await atCap.json()).toEqual({ status: "sent" });
  });

  it("an unknown service slug is stored as null with the Service subject", async () => {
    const requests = fakeRequests();
    await createRequestHandler(settings, { db: fakeDb(), requests })(post(body({ service: "x".repeat(5000) })));
    expect(requests.submit.mock.calls[0][0]).toMatchObject({ service: null, subject: "[Chat] Service request from Jane" });
  });

  it("pageUrl is reduced to a same-site path", async () => {
    const requests = fakeRequests();
    const handler = createRequestHandler(settings, { db: fakeDb(), requests });
    await handler(post(body({ pageUrl: "https://example.com/services/brakes?a=1#b" })));
    await handler(post(body({ pageUrl: `/${"a".repeat(5000)}` })));
    expect(requests.submit.mock.calls[0][0].pageUrl).toBe("/services/brakes");
    expect(requests.submit.mock.calls[0][0].text).toContain("Page: /services/brakes");
    expect(requests.submit.mock.calls[1][0].pageUrl).toBeNull();
  });

  it("a duplicate of an already-sent request does not re-link or save another note", async () => {
    const db = fakeDb();
    const requests = fakeRequests({ submit: vi.fn(async () => ({ emailStatus: "sent", duplicate: true, leadId: 9 })) });
    const res = await createRequestHandler(settings, { db, requests })(post(body()));
    expect(await res.json()).toEqual({ status: "sent" });
    expect(db.linkLead).not.toHaveBeenCalled();
    expect(db.saveMessage).not.toHaveBeenCalled();
  });

  it("a duplicate that re-sent a failed email links and saves the note", async () => {
    const db = fakeDb();
    const requests = fakeRequests({ submit: vi.fn(async () => ({ emailStatus: "sent", duplicate: true, resent: true, leadId: 9 })) });
    await createRequestHandler(settings, { db, requests })(post(body()));
    expect(db.linkLead).toHaveBeenCalledWith(ID, 9);
    expect(db.saveMessage).toHaveBeenCalledOnce();
  });
});
