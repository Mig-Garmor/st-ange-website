import { describe, expect, it } from "vitest";
import { migrate, pendingFiles, splitStatements } from "./migrate.js";
import { getSql } from "./client.js";

describe("migration helpers", () => {
  it("splits statements on semicolons at line ends", () => {
    const text = "create table a (x int);\ncreate table b (y text, z text);\n";
    expect(splitStatements(text)).toEqual(["create table a (x int)", "create table b (y text, z text)"]);
  });

  it("returns unapplied sql files in name order", () => {
    expect(pendingFiles(["002_b.sql", "001_a.sql", "notes.md"], ["001_a.sql"])).toEqual(["002_b.sql"]);
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("migrate", () => {
  const tables = ["playbooks", "chat_state", "ai_usage_daily", "requests", "messages", "conversations", "leads", "schema_migrations"];

  async function reset() {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const sql = getSql();
    for (const table of tables) await sql.query(`drop table if exists ${table} cascade`);
    return sql;
  }

  it("applies 001_init.sql once", async () => {
    const sql = await reset();
    expect(await migrate(sql)).toEqual(["001_init.sql"]);
    expect(await migrate(sql)).toEqual([]);
  });

  it("schema_migrations lists the file", async () => {
    const sql = await reset();
    await migrate(sql);
    const rows = await sql`select name from schema_migrations`;
    expect(rows.map((row) => row.name)).toEqual(["001_init.sql"]);
  });
});
