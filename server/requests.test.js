import { describe, it, expect } from "vitest";
import { createRequestService } from "./requests.js";

function setup({ dbOverrides = {}, emailError = null } = {}) {
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
  const logger = { error: () => {} };
  const service = createRequestService({ db, email, site: "st-ange", logger });
  return { service, calls };
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
    expect(r).toEqual({ emailStatus: "sent", duplicate: false });
    expect(calls.upsert[0]).toMatchObject({ site: "st-ange", phone: "8325727121" });
    expect(calls.record[0]).toMatchObject({ site: "st-ange", leadId: 7, source: "quote_form", service: "car-alignment" });
    expect(calls.sent).toEqual([{ subject: "Quote", text: "body" }]);
    expect(calls.status).toEqual([{ id: 11, status: "sent", error: null }]);
  });

  it("records failed with the error when the email throws", async () => {
    const { service, calls } = setup({ emailError: new Error("brevo down") });
    const r = await service.submit(input);
    expect(r.emailStatus).toBe("failed");
    expect(calls.status).toEqual([{ id: 11, status: "failed", error: "brevo down" }]);
  });

  it("duplicate idempotency key sends no email", async () => {
    const { service, calls } = setup({
      dbOverrides: { recordRequest: async () => ({ id: 11, duplicate: true, emailStatus: "sent" }) },
    });
    const r = await service.submit(input);
    expect(r).toEqual({ emailStatus: "sent", duplicate: true });
    expect(calls.sent).toHaveLength(0);
    expect(calls.status).toHaveLength(0);
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
});
