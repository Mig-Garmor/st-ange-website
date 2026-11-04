import { describe, it, expect } from "vitest";
import { handleSendEmail } from "./sendEmailHandler.js";

function fakeRequests(emailStatus = "sent") {
  const submitted = [];
  return { submitted, submit: async (i) => (submitted.push(i), { emailStatus, duplicate: false }) };
}

const contact = { subject: "Hi", name: "Ann", email: "a@b.co", phone: "(832) 572-7121", message: "Hello" };

describe("handleSendEmail", () => {
  it("400 for phone 572-7121", async () => {
    const requests = fakeRequests();
    const r = await handleSendEmail({ data: { ...contact, phone: "572-7121" } }, { requests });
    expect(r.status).toBe(400);
    expect(r.json.errors.phone).toBeTruthy();
    expect(requests.submitted).toHaveLength(0);
  });

  it("200 for a valid contact form", async () => {
    const requests = fakeRequests();
    const r = await handleSendEmail({ data: contact }, { requests });
    expect(r).toEqual({ status: 200, json: { message: "Email sent successfully" } });
    expect(requests.submitted[0].text).toBe("Name: Ann\nMessage: Hello\nFrom: a@b.co\nPhone: (832) 572-7121");
    expect(requests.submitted[0].lead.phone).toBe("8325727121");
    expect(requests.submitted[0].idempotencyKey).toBeTruthy();
  });

  it("quote_form with service car-alignment is passed through", async () => {
    const requests = fakeRequests();
    const data = { name: "Ann", email: "", phone: "8325727121", vehicle: "2015 Civic", source: "quote_form", service: "car-alignment", idempotencyKey: "k", pageUrl: "http://x/" };
    const r = await handleSendEmail({ data }, { requests });
    expect(r.status).toBe(200);
    expect(requests.submitted[0]).toMatchObject({ source: "quote_form", service: "car-alignment", idempotencyKey: "k", pageUrl: "http://x/" });
  });

  it("missing source defaults to contact_form", async () => {
    const requests = fakeRequests();
    await handleSendEmail({ data: contact }, { requests });
    expect(requests.submitted[0].source).toBe("contact_form");
  });

  it("400 for an unknown source", async () => {
    const requests = fakeRequests();
    const r = await handleSendEmail({ data: { ...contact, source: "chat" } }, { requests });
    expect(r.status).toBe(400);
    expect(r.json.errors.source).toBeTruthy();
    expect(requests.submitted).toHaveLength(0);
  });

  it("500 when the email failed", async () => {
    const r = await handleSendEmail({ data: contact }, { requests: fakeRequests("failed") });
    expect(r).toEqual({ status: 500, json: { error: "Email failed" } });
  });
});
