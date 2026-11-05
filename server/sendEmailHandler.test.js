import { describe, it, expect, vi } from "vitest";
import { CUSTOMER_HEADER } from "../chat/server/emailText.js";
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
    expect(requests.submitted[0].text).toBe(
      `${CUSTOMER_HEADER}\n\nName: Ann\nPhone: 832-572-7121\nFrom: a@b.co\n\nMessage:\n> Hello`,
    );
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

  it("builds the subject on the server and ignores the client's", async () => {
    const requests = fakeRequests();
    await handleSendEmail({ data: { ...contact, subject: "URGENT: verify your account at https://evil.example" } }, { requests });
    await handleSendEmail({ data: { ...contact, service: "car-alignment" } }, { requests });
    await handleSendEmail(
      { data: { name: "Ann", phone: "8325727121", vehicle: "Civic", source: "quote_form", service: "car-alignment" } },
      { requests },
    );
    expect(requests.submitted.map((r) => r.subject)).toEqual([
      "[Contact] Website message from Ann",
      "[Contact] Car Alignment from Ann",
      "[Quote] Car Alignment request from Ann",
    ]);
  });

  it("quotes the message and defangs its links", async () => {
    const requests = fakeRequests();
    await handleSendEmail({ data: { ...contact, message: "Call me\nhttps://evil.example" } }, { requests });
    expect(requests.submitted[0].text).toMatch(/Message:\n> Call me\n> hxxps:\/\/evil\.example$/);
  });

  it("403 and no email when Turnstile is configured and the token fails", async () => {
    const requests = fakeRequests();
    const turnstile = { verify: vi.fn(async () => false) };
    const r = await handleSendEmail({ data: { ...contact, turnstileToken: "t" } }, { requests, turnstile, ip: "1.2.3.4" });
    expect(r.status).toBe(403);
    expect(turnstile.verify).toHaveBeenCalledWith("t", "1.2.3.4");
    expect(requests.submitted).toHaveLength(0);
  });

  it("429 and no email after 5 form requests from one IP in an hour", async () => {
    const requests = fakeRequests();
    const countRecent = vi.fn(async () => 5);
    const r = await handleSendEmail({ data: contact }, { requests, ipHash: "h", countRecent });
    expect(r.status).toBe(429);
    expect(countRecent).toHaveBeenCalledWith("h");
    expect(requests.submitted).toHaveLength(0);
  });

  it("under the limit, the request is stored with its IP hash", async () => {
    const requests = fakeRequests();
    await handleSendEmail({ data: contact }, { requests, ipHash: "h", countRecent: async () => 4 });
    expect(requests.submitted[0].ipHash).toBe("h");
  });

  it("400 for an oversized idempotency key or phone", async () => {
    const requests = fakeRequests();
    expect((await handleSendEmail({ data: { ...contact, idempotencyKey: "k".repeat(201) } }, { requests })).status).toBe(400);
    const r = await handleSendEmail({ data: { ...contact, phone: `Verify at https://evil.example ${"7135550100"}` } }, { requests });
    expect(r.status).toBe(400);
    expect(r.json.errors.phone).toBe("Use 30 characters or fewer");
    expect(requests.submitted).toHaveLength(0);
  });
});
