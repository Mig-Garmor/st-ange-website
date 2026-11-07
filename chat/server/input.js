export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const VISITOR = /^[\w-]{1,64}$/;
// Postgres rejects unique-index entries over about 2.7 KB, which made oversized keys skip the request row.
export const KEY = /^[\w:.-]{1,200}$/;
export const str = (v) => (typeof v === "string" ? v.trim() : "");
