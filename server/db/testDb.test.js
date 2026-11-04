import { describe, expect, it } from "vitest";
import { sameDatabase } from "./testDb.js";

const pooled = "postgres://u:p@ep-cool-123-pooler.us-east-2.aws.neon.tech/db";
const direct = "postgres://u:p@ep-cool-123.us-east-2.aws.neon.tech/db";

describe("sameDatabase", () => {
  it("treats pooled and direct hosts of one endpoint as the same", () => {
    expect(sameDatabase(pooled, direct)).toBe(true);
  });
  it("allows different endpoints", () => {
    expect(sameDatabase(pooled, "postgres://u:p@ep-other-456.us-east-2.aws.neon.tech/db")).toBe(false);
  });
});
