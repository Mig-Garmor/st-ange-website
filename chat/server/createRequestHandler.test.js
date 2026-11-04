import { describe, it, expect, vi } from "vitest";
import { createRequestService } from "../../server/requests.js";
import { createRequestHandler } from "./createRequestHandler.js";

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
  email: "",
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
    expect(text).toMatch(/Conversation:\nCustomer: My car pulls left\nAssistant: An alignment may help\./);
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
});
