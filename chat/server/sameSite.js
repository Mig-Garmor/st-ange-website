// A text/plain POST skips the CORS preflight, so another site could post here from its visitors' browsers.
export function rejectCrossSite(request) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  let host = null;
  try {
    host = new URL(origin).host;
  } catch {}
  const own = [request.headers.get("host"), new URL(request.url).host];
  return host && own.includes(host) ? null : Response.json({ error: "Forbidden" }, { status: 403 });
}
