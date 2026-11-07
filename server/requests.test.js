import { describe, it, expect, vi } from "vitest";
import { createRequestService } from "./requests.js";

function setup({ dbOverrides = {}, emailError = null, hub = null } = {}) {
  const calls = { upsert: [], record: [], status: [], sent: [] };
  const db = {
    upsertLead: async (a) => (calls.upsert.push(a), { id: 7 }),
    recordRequest: async (a) => (calls.record.push(a), { id: 11, duplicate: false, emailStatus: "pending" }),
    setRequestEmailStatus: async (id, s) => calls.status.push({ id, ...s }),
    ...dbOverrides,
  };
  const email = {
    send: async (m) => {
      calls.sent.push(m);
      if (emailError) throw emailError;
    },
  };
  const logger = { error: vi.fn() };
  calls.deferred = [];
  const waitUntil = (p) => calls.deferred.push(p);
  const service = createRequestService({ db, email, site: "st-ange", logger, hub, waitUntil });
  return { service, calls, logger };
}

const input = {
  source: "quote_form", service: "car-alignment", idempotencyKey: "k1",
  lead: { name: "Ann", phone: "8325727121", email: "", vehicle: "2015 Civic" },
  subject: "Quote", text: "body", message: "m", vehicle: "2015 Civic", pageUrl: "http://x/",
};

describe("request service", () => {
  it("sends the email and records sent", async () => {
    const { service, calls } = setup();
    const r = await service.submit(input);
    expect(r).toEqual({ emailStatus: "sent", duplicate: false, leadId: 7 });
    expect(calls.upsert[0]).toMatchObject({ site: "st-ange", phone: "8325727121" });
    expect(calls.record[0]).toMatchObject({ site: "st-ange", leadId: 7, source: "quote_form", service: "car-alignment" });
    expect(calls.sent).toEqual([{ subject: "Quote", text: "body" }]);
    expect(calls.status).toEqual([{ id: 11, status: "sent", error: null }]);
  });

  it("with requireRecord, a failed insert sends no email", async () => {
    const { service, calls } = setup({ dbOverrides: { recordRequest: async () => { throw new Error("index row too large"); } } });
    const r = await service.submit({ ...input, requireRecord: true });
    expect(r).toEqual({ emailStatus: "failed", duplicate: false, leadId: 7 });
    expect(calls.sent).toEqual([]);
  });

  it("without requireRecord, a failed insert still emails so a form lead is not lost", async () => {
    const { service, calls } = setup({ dbOverrides: { recordRequest: async () => { throw new Error("db down"); } } });
    expect((await service.submit(input)).emailStatus).toBe("sent");
    expect(calls.sent).toHaveLength(1);
  });

  it("records failed with the error when the email throws", async () => {
    const { service, calls } = setup({ emailError: new Error("brevo down") });
    const r = await service.submit(input);
    expect(r.emailStatus).toBe("failed");
    expect(calls.status).toEqual([{ id: 11, status: "failed", error: "brevo down" }]);
  });

  const dup = (emailStatus) => ({ recordRequest: async () => ({ id: 11, duplicate: true, emailStatus }) });

  it("duplicate of a failed request re-sends, records sent and reports resent", async () => {
    const { service, calls } = setup({ dbOverrides: dup("failed") });
    const r = await service.submit(input);
    expect(r).toEqual({ emailStatus: "sent", duplicate: true, resent: true, leadId: 7 });
    expect(calls.sent).toHaveLength(1);
    expect(calls.status).toEqual([{ id: 11, status: "sent", error: null }]);
  });

  it("duplicate of a sent request sends nothing", async () => {
    const { service, calls } = setup({ dbOverrides: dup("sent") });
    const r = await service.submit(input);
    expect(r).toEqual({ emailStatus: "sent", duplicate: true, leadId: 7 });
    expect(calls.sent).toHaveLength(0);
    expect(calls.status).toHaveLength(0);
  });

  it("duplicate still in flight sends nothing and reports sent", async () => {
    const { service, calls } = setup({ dbOverrides: dup(null) });
    const r = await service.submit(input);
    expect(r).toEqual({ emailStatus: "sent", duplicate: true, leadId: 7 });
    expect(calls.sent).toHaveLength(0);
  });

  it("email still sends when db.upsertLead throws", async () => {
    const { service, calls } = setup({ dbOverrides: { upsertLead: async () => { throw new Error("db"); } } });
    const r = await service.submit(input);
    expect(r.emailStatus).toBe("sent");
    expect(calls.sent).toHaveLength(1);
    expect(calls.record[0].leadId).toBeNull();
  });

  it("email still sends when db.recordRequest throws", async () => {
    const { service, calls } = setup({ dbOverrides: { recordRequest: async () => { throw new Error("db"); } } });
    const r = await service.submit(input);
    expect(r.emailStatus).toBe("sent");
    expect(calls.sent).toHaveLength(1);
    expect(calls.status).toHaveLength(0);
  });

  const fakeHub = (result = { ok: true, data: {} }) => ({ requests: { submit: vi.fn(async () => result) } });

  it("forwards the request to the hub in the background, after the email", async () => {
    const hub = fakeHub();
    const { service, calls } = setup({ hub });
    await service.submit({ ...input, pageUrl: "/contact-us" });
    await Promise.all(calls.deferred);
    expect(hub.requests.submit).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "k1", source: "quote_form", service: "car-alignment", contact: { name: "Ann", phone: "8325727121" }, pagePath: "/contact-us" }),
    );
  });

  it("forwards a duplicate too, so a retry fills in a forward that failed (the hub ignores repeats)", async () => {
    const hub = fakeHub();
    const { service, calls } = setup({ hub, dbOverrides: dup("sent") });
    await service.submit(input);
    await Promise.all(calls.deferred);
    expect(hub.requests.submit).toHaveBeenCalledOnce();
  });

  it("does not forward a chat request it could not record, since the shop never got it", async () => {
    const hub = fakeHub();
    const { service, calls } = setup({ hub, dbOverrides: { recordRequest: async () => { throw new Error("db"); } } });
    await service.submit({ ...input, requireRecord: true });
    expect(calls.deferred).toHaveLength(0);
    expect(hub.requests.submit).not.toHaveBeenCalled();
  });

  it("a hub failure is logged and changes nothing for the visitor", async () => {
    const hub = fakeHub({ ok: false, error: "unauthorized", status: 401 });
    const { service, calls, logger } = setup({ hub });
    expect((await service.submit(input)).emailStatus).toBe("sent");
    await Promise.all(calls.deferred);
    expect(logger.error).toHaveBeenCalledWith("Hub request not forwarded:", "unauthorized");
  });
});
