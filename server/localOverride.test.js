import { describe, expect, it } from "vitest";
import { localFlag, localOverride } from "./localOverride.js";

describe("localOverride", () => {
  it("uses the fallback when the variable is unset or not a usable number", () => {
    expect(localOverride("X", 40, {})).toBe(40);
    expect(localOverride("X", 40, { X: "" })).toBe(40);
    expect(localOverride("X", 40, { X: "lots" })).toBe(40);
    expect(localOverride("X", 40, { X: "-1" })).toBe(40);
  });

  it("applies the override in local development, including 0 to switch a limit off", () => {
    expect(localOverride("X", 40, { X: "0" })).toBe(0);
    expect(localOverride("X", 40, { X: "0", VERCEL_ENV: "development" })).toBe(0);
  });

  it("ignores the override on any Vercel deployment", () => {
    expect(localOverride("X", 40, { X: "0", VERCEL_ENV: "production" })).toBe(40);
    expect(localOverride("X", 40, { X: "0", VERCEL_ENV: "preview" })).toBe(40);
  });

  it("localFlag reads true/false locally, keeps the fallback for anything else, and ignores deployments", () => {
    expect(localFlag("Z", true, { Z: "false" })).toBe(false);
    expect(localFlag("Z", true, { Z: " FALSE " })).toBe(false);
    expect(localFlag("Z", false, { Z: "true" })).toBe(true);
    expect(localFlag("Z", true, { Z: "0" })).toBe(false);
    expect(localFlag("Z", true, { Z: "nope" })).toBe(true);
    expect(localFlag("Z", true, {})).toBe(true);
    expect(localFlag("Z", true, { Z: "false", VERCEL_ENV: "production" })).toBe(true);
    expect(localFlag("Z", true, { Z: "false", VERCEL_ENV: "preview" })).toBe(true);
  });
});
