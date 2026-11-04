import { neon } from "@neondatabase/serverless";

export function getTestSql() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const live = process.env.DATABASE_URL;
  if (live && (url === live || new URL(url).host === new URL(live).host)) {
    throw new Error("TEST_DATABASE_URL points at DATABASE_URL: refusing to drop tables");
  }
  return neon(url);
}
