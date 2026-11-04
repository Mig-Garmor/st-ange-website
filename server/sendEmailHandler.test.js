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
    expect(requests.submitted[0]).toMatchObject({ source: "quote_form", service: "car-alignment", idempotencyKey: "k", pageUrl: "/" });
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

  it("an unknown service slug is stored as null", async () => {
    const requests = fakeRequests();
    const data = { name: "Ann", phone: "8325727121", vehicle: "Civic", source: "quote_form", service: "x".repeat(3000) };
    await handleSendEmail({ data }, { requests });
    expect(requests.submitted[0].service).toBeNull();
  });

  it("pageUrl is reduced to a same-site path", async () => {
    const requests = fakeRequests();
    await handleSendEmail({ data: { ...contact, pageUrl: "https://x.co/contact-us?a=1" } }, { requests });
    await handleSendEmail({ data: { ...contact, pageUrl: `/${"a".repeat(10_000)}` } }, { requests });
    expect(requests.submitted.map((r) => r.pageUrl)).toEqual(["/contact-us", null]);
  });

  it("400 with field errors over the name, email, vehicle and message caps", async () => {
    const requests = fakeRequests();
    const data = {
      ...contact,
      name: "n".repeat(101),
      email: `${"e".repeat(195)}@x.com`,
      vehicle: "v".repeat(101),
      message: "m".repeat(2001),
    };
    const r = await handleSendEmail({ data }, { requests });
    expect(r.status).toBe(400);
    expect(Object.keys(r.json.errors).sort()).toEqual(["email", "message", "name", "vehicle"]);
    expect(requests.submitted).toHaveLength(0);
  });

  it("accepts values exactly at the caps", async () => {
    const requests = fakeRequests();
    const data = { ...contact, name: "n".repeat(100), email: `${"e".repeat(194)}@x.com`, message: "m".repeat(2000) };
    expect((await handleSendEmail({ data }, { requests })).status).toBe(200);
  });
});
