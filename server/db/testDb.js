import { neon } from "@neondatabase/serverless";

export function endpointId(url) {
  return new URL(url).hostname.split(".")[0].replace(/-pooler$/, "");
}

export function sameDatabase(a, b) {
  return a === b || endpointId(a) === endpointId(b);
}

export function getTestSql() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const live = process.env.DATABASE_URL;
  if (live && sameDatabase(url, live)) {
    throw new Error("TEST_DATABASE_URL points at DATABASE_URL: refusing to drop tables");
  }
  return neon(url);
}
