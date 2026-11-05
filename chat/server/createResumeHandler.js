import { detailsFrom, maskDetails } from "./details.js";
import { rejectCrossSite } from "./sameSite.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISITOR = /^[\w-]{1,64}$/;

// Answers "is there an earlier chat to continue, and what would we reuse?" with masked details only.
export function createResumeHandler(settings, { db }) {
  return async function handleResume(request) {
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { previousId, visitorId } = body ?? {};
    if (typeof previousId !== "string" || !UUID.test(previousId) || typeof visitorId !== "string" || !VISITOR.test(visitorId)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    try {
      const source = await db.carryOverSource({ site: settings.site, previousId, visitorId });
      return Response.json({ resume: source ? maskDetails(detailsFrom(source)) : null });
    } catch (error) {
      console.error("Chat resume lookup failed", error);
      return Response.json({ resume: null });
    }
  };
}
