import { describe, expect, it } from "vitest";
import { detailsFrom, extractDetails, maskDetails } from "./details.js";

describe("visitor details", () => {
  it("finds the car, phone, email and name in the visitor's own words", () => {
    expect(
      extractDetails(["my name is Dana Test, phone 281-555-0166, email dana.test@mailinator.com. My 2015 Ford F-150 pulls to the right"]),
    ).toEqual({ name: "Dana Test", phone: "2815550166", email: "dana.test@mailinator.com", vehicle: "2015 Ford F-150" });
  });

  it("keeps the latest mention and skips a lowercase word after the make", () => {
    expect(extractDetails(["it's a 2017 Honda Accord", "sorry, a 2019 honda makes noise", "call (832) 555-0100"])).toEqual({
      vehicle: "2019 honda",
      phone: "8325550100",
    });
  });

  it("ignores numbers that are not US phone numbers", () => {
    expect(extractDetails(["it has 120000 miles", "+34 643 84 75 84"])).toEqual({});
  });

  it("prefers a sent request's details and fills gaps from the chat", () => {
    const lead = { name: "Dana", phone: "2815550166", email: null, vehicle: null };
    expect(detailsFrom({ lead, userMessages: ["dana@mailinator.com, 2015 Ford F-150"] })).toEqual({
      name: "Dana", phone: "2815550166", email: "dana@mailinator.com", vehicle: "2015 Ford F-150",
    });
    expect(detailsFrom({ userMessages: [] })).toEqual({ name: null, phone: null, email: null, vehicle: null });
  });

  it("masks the phone and email and never returns the name", () => {
    expect(maskDetails({ name: "Dana", vehicle: "2015 Ford F-150", phone: "2815550166", email: "dana.test@mailinator.com" })).toEqual({
      vehicle: "2015 Ford F-150", phone: "ending 0166", email: "d***@mailinator.com",
    });
    expect(maskDetails({})).toEqual({});
  });
});
