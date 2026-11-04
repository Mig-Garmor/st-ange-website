import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getSql } from "./client.js";

const migrationsDir = fileURLToPath(new URL("./migrations/", import.meta.url));

// Files contain no functions, so a `;` at a line end always closes a statement.
export function splitStatements(text) {
  return text
    .split(/;[ \t]*\r?\n/)
    .map((statement) => statement.trim().replace(/;$/, ""))
    .filter(Boolean);
}

export function pendingFiles(files, applied) {
  const done = new Set(applied);
  return files.filter((name) => name.endsWith(".sql") && !done.has(name)).sort();
}

export async function migrate(sql) {
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz default now())`;
  const applied = (await sql`select name from schema_migrations`).map((row) => row.name);
  const pending = pendingFiles(await readdir(migrationsDir), applied);

  for (const name of pending) {
    const statements = splitStatements(await readFile(migrationsDir + name, "utf8"));
    await sql.transaction((tx) => [
      ...statements.map((statement) => tx.query(statement)),
      tx`insert into schema_migrations (name) values (${name})`,
    ]);
  }
  return pending;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate(getSql())
    .then((applied) => {
      console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Nothing to apply");
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
