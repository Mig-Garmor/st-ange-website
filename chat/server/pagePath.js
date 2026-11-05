const MAX = 200;
// The path reaches the model's instructions, so only URL-shaped paths pass; "/ignore%20the%20rules" does not.
const PATH = /^\/[a-z0-9\-_/.]*$/i;

export function toPagePath(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  let url;
  try {
    url = new URL(value.trim(), "http://local.invalid");
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const path = url.pathname;
  return path.length > MAX || !PATH.test(path) ? null : path;
}
