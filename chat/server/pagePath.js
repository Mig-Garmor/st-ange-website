const MAX = 200;

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
  return path.length > MAX ? null : path;
}
